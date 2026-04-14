from __future__ import annotations

import argparse
import asyncio
import json
import re
import time
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, Tag

BASE = "https://www.uagc.edu"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 UAGC-AgentBridge-Scraper/1.0"
)
DEFAULT_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

_use_curl_after_block = False
PROGRAM_PATH_RE = re.compile(
    r"^/online-degrees/(?P<level>associate|bachelors|masters|doctoral|certificates)/(?P<slug>[^/?#]+)/?$",
    re.I,
)
CREDIT_LINE_RE = re.compile(
    r"\b\d{1,3}\s*credits?\b[^.]{0,200}\.",
    re.I | re.DOTALL,
)


class RequestThrottle:
    def __init__(self, interval_sec: float) -> None:
        self._interval = interval_sec
        self._lock = asyncio.Lock()
        self._last = 0.0

    async def wait_turn(self) -> None:
        async with self._lock:
            now = time.monotonic()
            wait = self._interval - (now - self._last)
            if wait > 0:
                await asyncio.sleep(wait)
            self._last = time.monotonic()


def _norm_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _slugify_area(name: str) -> str:
    s = name.lower().replace("&", "and")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def _normalize_level(segment: str) -> str:
    s = segment.lower()
    if s == "associate":
        return "associate"
    if s == "bachelors":
        return "bachelor"
    if s == "masters":
        return "master"
    if s == "doctoral":
        return "doctorate"
    if s == "certificates":
        return "certificate"
    return s


def _program_id_from_parts(level_seg: str, slug: str) -> str:
    return f"{level_seg.lower()}-{slug.lower()}"


def _extract_drupal_settings(html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    for script in soup.find_all("script", attrs={"data-drupal-selector": "drupal-settings-json"}):
        raw = script.string or script.get_text()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if data.get("uagc_module"):
            return data
    return {}


def _interest_map(lfs: dict[str, Any]) -> dict[int, str]:
    out: dict[int, str] = {}
    for item in lfs.get("interests") or []:
        if isinstance(item, dict) and "i" in item:
            out[int(item["i"])] = str(item.get("n") or "").strip()
    return out


def parse_program_catalog(html: str) -> list[dict[str, Any]]:
    data = _extract_drupal_settings(html)
    lfs = (data.get("uagc_module") or {}).get("lead_flow_system") or {}
    interests = _interest_map(lfs)
    programs: list[dict[str, Any]] = []
    seen: set[str] = set()

    for row in lfs.get("degrees") or []:
        if not isinstance(row, dict):
            continue
        url = (row.get("url") or "").strip()
        if not url:
            continue
        m = PROGRAM_PATH_RE.match(urlparse(url).path if url.startswith("/") else urlparse(url).path)
        if not m:
            continue
        level_seg = m.group("level").lower()
        slug = m.group("slug").lower()
        pid = _program_id_from_parts(level_seg, slug)
        if pid in seen:
            continue
        seen.add(pid)
        name = str(row.get("n") or "").strip()
        if not name or name.lower() == "undecided":
            continue
        desc = str(row.get("desc") or "").strip()
        idx = row.get("in")
        area_name = ""
        if isinstance(idx, int):
            area_name = interests.get(idx, "")
        programs.append(
            {
                "id": pid,
                "name": name,
                "level": _normalize_level(level_seg),
                "area": _slugify_area(area_name) if area_name else "undecided",
                "college": "",
                "description": desc,
                "url": urljoin(BASE, url),
                "credits": None,
                "tuition": None,
                "outcomes": None,
                "requirements": None,
            }
        )

    if programs:
        programs.sort(key=lambda p: p["url"])
        return programs

    soup = BeautifulSoup(html, "html.parser")
    for a in soup.find_all("a", href=True):
        href = a["href"].split("#")[0]
        path = urlparse(href).path
        m = PROGRAM_PATH_RE.match(path)
        if not m:
            continue
        level_seg = m.group("level").lower()
        slug = m.group("slug").lower()
        pid = _program_id_from_parts(level_seg, slug)
        if pid in seen:
            continue
        seen.add(pid)
        name = _norm_ws(a.get_text(" ", strip=True))
        if not name or name.lower() == "undecided":
            continue
        programs.append(
            {
                "id": pid,
                "name": name,
                "level": _normalize_level(level_seg),
                "area": "unknown",
                "area_label": "",
                "college": "",
                "description": "",
                "url": urljoin(BASE, href),
                "credits": None,
                "tuition": None,
                "outcomes": None,
                "requirements": None,
            }
        )
    programs.sort(key=lambda p: p["url"])
    return programs


def _canonical_url(soup: BeautifulSoup) -> str | None:
    link = soup.find("link", rel=lambda v: v and "canonical" in (v if isinstance(v, list) else [v]))
    if link and link.get("href"):
        return urljoin(BASE, link["href"])
    return None


def _text(el: Tag | None) -> str:
    if el is None:
        return ""
    return _norm_ws(el.get_text(" ", strip=True))


def _paid_hero_college(soup: Tag | BeautifulSoup) -> str:
    p = soup.select_one(".paid-hero-space__copy")
    return _text(p)


def _what_you_learn(soup: Tag | BeautifulSoup) -> tuple[str, list[str]]:
    for banner in soup.select(".paragraph--paid_text_banner.paid-text-banner"):
        h = banner.select_one(".paid-text-banner__heading")
        if not h:
            continue
        title = _text(h).lower()
        if "what you" not in title or "learn" not in title:
            continue
        w = banner.select_one(".paid-text-banner__wysiwyg")
        if not w:
            return "", []
        intro = ""
        bullets: list[str] = []
        first_p = w.find("p")
        if first_p:
            intro = _text(first_p)
        for li in w.find_all("li"):
            t = _text(li)
            if t:
                bullets.append(t)
        return intro, bullets
    return "", []


def _degree_journey_intro(soup: Tag | BeautifulSoup) -> str:
    sec = soup.select_one("section.paragraph--completion_journey_")
    if not sec:
        return ""
    intro = sec.select_one(".intro-block__content")
    return _text(intro)


def _course_map(soup: Tag | BeautifulSoup) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    section = soup.select_one("section.paragraph--completion_journey_")
    if not section:
        return out
    for step in section.select(".completion-journey__step"):
        header = step.select_one(".completion-journey__step-items-header")
        phase = _text(header) or "Courses"
        names: list[str] = []
        for btn in step.select("button.accordion-items__item-toggle"):
            t = _text(btn)
            if t:
                names.append(t)
        if names:
            out[phase] = names
    return out


def _credit_breakdown(soup: Tag | BeautifulSoup) -> dict[str, Any]:
    tab = soup.select_one(".zes-two-column-tabs")
    if not tab:
        return {}
    blocks: dict[str, str] = {}
    for col in tab.select(".zes-two-column-tabs__credit-column"):
        label_el = col.select_one(".zes-two-column-tabs__credit-label")
        circle = col.select_one(".zes-two-column-tabs__credit-circle")
        label = _text(label_el)
        val = _text(circle)
        if label and val:
            blocks[label] = val
    wys = tab.select_one(".zes-two-column-tabs__wysiwyg")
    narrative = _text(wys) if wys else ""
    return {"totals": blocks, "narrative": narrative}


def _career_block(soup: Tag | BeautifulSoup) -> str:
    fit = soup.select_one(".floating-image-text__text-wrapper")
    if not fit:
        return ""
    h = fit.select_one("h2, .floating-image-text__heading")
    if h and "career" in _text(h).lower():
        w = fit.select_one(".floating-image-text__wysiwyg")
        if w:
            raw = str(w)
            if "iframe" in raw.lower():
                return _norm_ws(
                    "Career outcomes are presented via an embedded Lightcast widget on the live page; "
                    "open the program URL in a browser to view interactive career data."
                )
            return _text(w)
    for block in soup.select(".paragraph--floating_image_text.floating-image-text"):
        h = block.select_one("h2, .floating-image-text__heading")
        if h and "career" in _text(h).lower():
            w = block.select_one(".floating-image-text__wysiwyg")
            return _text(w) if w else ""
    return ""


def _tuition_snippets(soup: Tag | BeautifulSoup) -> dict[str, Any]:
    snippets: list[str] = []
    for el in soup.select(".icon-text-block__icon-text"):
        t = _text(el)
        if "$" in t or "fee" in t.lower():
            snippets.append(t)
    dollar_hits = re.findall(r"\$[\d,]+(?:\.\d{2})?(?:\s*/\s*credit)?", soup.get_text(" ", strip=True))
    return {"highlights": snippets[:12], "currency_mentions": sorted(set(dollar_hits))[:20]}


def _requirements_block(soup: Tag | BeautifulSoup) -> dict[str, Any]:
    intro = soup.select_one("section.paragraph--completion_journey_ .intro-block")
    links: list[dict[str, str]] = []
    intro_text = ""
    if intro:
        ic = intro.select_one(".intro-block__content")
        intro_text = _text(ic)
        for a in intro.find_all("a", href=True):
            links.append({"text": _text(a), "href": urljoin(BASE, a["href"])})
    return {"intro": intro_text or _degree_journey_intro(soup), "links": links}


def scrape_program_detail(html: str, listing_row: dict[str, Any]) -> dict[str, Any]:
    full_soup = BeautifulSoup(html, "html.parser")
    article = full_soup.select_one("article.site-layout__article.degree") or full_soup.select_one(
        "article.site-layout__article"
    )
    scope: Tag | BeautifulSoup = article if article else full_soup

    intro_learn, bullets = _what_you_learn(scope)
    journey = _degree_journey_intro(scope)
    full_description = _norm_ws(" ".join(x for x in [journey, intro_learn] if x))
    if not full_description:
        full_description = listing_row.get("description") or ""

    credit_block = _credit_breakdown(scope)
    credits: dict[str, Any] = {
        "degree_journey": journey,
        "courses_by_term": _course_map(scope),
        "credit_breakdown": credit_block,
    }
    narrative = (credit_block or {}).get("narrative") or ""
    if narrative:
        m = CREDIT_LINE_RE.search(narrative)
        if m:
            credits["summary_line"] = _norm_ws(m.group(0))

    tuition = _tuition_snippets(scope)

    outcomes = {
        "learning_intro": intro_learn,
        "learning_outcomes": bullets,
        "career_outcomes": _career_block(scope),
    }

    requirements = _requirements_block(scope)

    college = _paid_hero_college(scope) or listing_row.get("college", "")
    name_el = scope.select_one(".paid-hero-space__main-heading")
    page_name = _text(name_el) or listing_row["name"]

    row = {**listing_row}
    row.pop("area_label", None)
    row["name"] = page_name
    row["college"] = college
    row["description"] = full_description or listing_row.get("description", "")
    row["url"] = _canonical_url(full_soup) or listing_row["url"]
    row["credits"] = credits
    row["tuition"] = tuition
    row["outcomes"] = outcomes
    row["requirements"] = requirements
    return row


def parse_admissions_traditional(html: str) -> dict[str, list[dict[str, Any]]]:
    max_steps = 48
    soup = BeautifulSoup(html, "html.parser")
    article = soup.select_one("article.site-layout__article") or soup
    steps: list[dict[str, Any]] = []
    order = 0

    def push(step: dict[str, Any]) -> bool:
        nonlocal order
        if len(steps) >= max_steps:
            return False
        order += 1
        step["order"] = order
        steps.append(step)
        return True

    hero_h1 = article.select_one(".paid-hero-space__main-heading")
    hero_kicker = article.select_one(".paid-hero-space__heading")
    if hero_h1 or hero_kicker:
        if not push(
            {
                "title": _text(hero_h1) or "Admissions",
                "subtitle": _text(hero_kicker),
                "body": "",
                "links": [],
            }
        ):
            return {"traditional": steps, "source_url": f"{BASE}/admissions/traditional"}

    for banner in article.select(".paragraph--paid_text_banner.paid-text-banner"):
        w = banner.select_one(".paid-text-banner__wysiwyg")
        h = banner.select_one(".paid-text-banner__heading")
        if w and h:
            if not push(
                {
                    "title": _text(h),
                    "subtitle": "",
                    "body": _text(w),
                    "links": [{"text": _text(a), "href": urljoin(BASE, a["href"])} for a in w.find_all("a", href=True)],
                }
            ):
                break

    block = article.select_one(".paragraph--three_column_text_block .column-text-block__wrapper")
    if block:
        for col in block.select(".column-text-block__container"):
            heading = _text(col.select_one(".column-text-block__heading"))
            body = _text(col.select_one(".column-text-block__copy"))
            cta = col.select_one("a.column-text-block__cta")
            links = []
            if cta and cta.get("href"):
                links.append({"text": _text(cta), "href": urljoin(BASE, cta["href"])})
            if heading or body:
                if not push({"title": heading or "Transfer option", "subtitle": "", "body": body, "links": links}):
                    break

    accordion_items_budget = 22
    used_acc = 0
    for acc in article.select("section.paragraph--accordion_faq"):
        header = acc.select_one(".accordion-faq__header")
        content_root = acc.select_one(".accordion-faq__content")
        section_title = _text(header)
        intro_text = ""
        if content_root:
            first_p = content_root.find("p", recursive=False)
            if first_p is None:
                first_p = content_root.find("p")
            intro_text = _text(first_p) if first_p else ""
        if section_title:
            if not push(
                {
                    "title": section_title,
                    "subtitle": "Accordion section",
                    "body": intro_text[:1200],
                    "links": [],
                }
            ):
                break
        for li in acc.select(".accordion-items__item"):
            if used_acc >= accordion_items_budget or len(steps) >= max_steps:
                break
            btn = li.select_one("button.accordion-items__item-toggle")
            content = li.select_one(".accordion-items__item-content")
            t = _text(btn)
            b = _text(content)[:800] if content else ""
            if t:
                used_acc += 1
                if not push({"title": t, "subtitle": section_title, "body": b, "links": []}):
                    break

    return {"traditional": steps, "source_url": f"{BASE}/admissions/traditional"}


def parse_financial_aid(html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    article = soup.select_one("article.site-layout__article") or soup

    tuition_tables: list[dict[str, Any]] = []
    for table_wrap in article.select(".tuitionandfees__table-container .tuitionandfees__table"):
        title = table_wrap.get("data-cta") or "Program costs"
        rows: list[dict[str, str]] = []
        for row in table_wrap.select(".tuitionandfees__row"):
            if "--divider-row" in row.get("class", []):
                continue
            h = row.select_one(".tuitionandfees__row-header")
            v = row.select_one(".tuitionandfees__row-value")
            label = _text(h)
            val = _text(v)
            if label:
                rows.append({"item": label, "value": val})
        if rows:
            tuition_tables.append({"group": title, "rows": rows})

    aid_stats: list[dict[str, str]] = []
    for item in article.select(".stats-banner__item"):
        label = _text(item.select_one(".stats-banner__item-header"))
        num = _text(item.select_one(".stats-banner__number"))
        if label:
            aid_stats.append({"metric": label, "value": num})

    intro = ""
    pd = article.select_one(".partner-divider__content")
    if pd:
        intro = _text(pd)

    scholarships: list[dict[str, str]] = []
    for card in article.select("a.paid-cards__card-container"):
        href = card.get("href") or ""
        title_el = card.select_one(".paid-cards__card-heading p")
        body_el = card.select_one(".paid-cards__card-text")
        title = _text(title_el)
        if not title:
            continue
        scholarships.append(
            {
                "title": title,
                "summary": _text(body_el)[:500],
                "href": urljoin(BASE, href),
            }
        )

    next_steps: list[dict[str, str]] = []
    for cta in article.select(".partner-divider__cta, a.tuitionandfees__costs-link"):
        if cta.name == "a" and cta.get("href"):
            next_steps.append({"text": _text(cta), "href": urljoin(BASE, cta["href"])})

    footnotes = ""
    fn = article.select_one(".tuitionandfees__footnotes")
    if fn:
        footnotes = _text(fn)[:4000]

    page_text = article.get_text(" ", strip=True)
    aid_ranges = sorted(set(re.findall(r"\$[\d,]+(?:\.\d{2})?(?:\s*[-–]\s*\$[\d,]+(?:\.\d{2})?)?", page_text)))[:30]

    return {
        "canonical_url": _canonical_url(BeautifulSoup(html, "html.parser")) or f"{BASE}/tuition-financial-aid",
        "intro": intro,
        "tuition_tables": tuition_tables,
        "aid_statistics": aid_stats,
        "aid_currency_snippets": aid_ranges,
        "scholarships": scholarships,
        "footnotes_excerpt": footnotes,
        "next_steps": next_steps[:25],
    }


async def _curl_fetch(url: str) -> str:
    proc = await asyncio.create_subprocess_exec(
        "curl",
        "-sL",
        "--compressed",
        "-A",
        USER_AGENT,
        "-H",
        f"Accept: {DEFAULT_HEADERS['Accept']}",
        "-H",
        f"Accept-Language: {DEFAULT_HEADERS['Accept-Language']}",
        url,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        err = stderr.decode("utf-8", "replace")[:500]
        raise RuntimeError(f"curl exit {proc.returncode}: {err}")
    return stdout.decode("utf-8", "replace")


async def throttled_fetch(client: httpx.AsyncClient, throttle: RequestThrottle, url: str) -> str:
    global _use_curl_after_block
    await throttle.wait_turn()
    print(f"GET {url}")
    if _use_curl_after_block:
        return await _curl_fetch(url)
    r = await client.get(url, follow_redirects=True)
    if r.status_code == 403:
        print("WARN: httpx returned 403 (common bot-fingerprint block); using curl for this and later URLs")
        _use_curl_after_block = True
        return await _curl_fetch(url)
    r.raise_for_status()
    return r.text


async def run_scraper(cache_dir: Path, detail_limit: int | None) -> None:
    global _use_curl_after_block
    _use_curl_after_block = False
    cache_dir.mkdir(parents=True, exist_ok=True)
    throttle = RequestThrottle(1.0)
    limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
    async with httpx.AsyncClient(
        headers=DEFAULT_HEADERS,
        timeout=httpx.Timeout(60.0),
        limits=limits,
    ) as client:
        listing_html = await throttled_fetch(client, throttle, f"{BASE}/online-degrees")
        catalog = parse_program_catalog(listing_html)
        print(f"Catalog: {len(catalog)} programs")

        adm_html = await throttled_fetch(client, throttle, f"{BASE}/admissions/traditional")
        admissions = parse_admissions_traditional(adm_html)

        fin_html = await throttled_fetch(client, throttle, f"{BASE}/tuition-financial-aid")
        financial = parse_financial_aid(fin_html)

        targets = catalog if detail_limit is None else catalog[: max(0, detail_limit)]

        async def one(p: dict[str, Any]) -> dict[str, Any] | None:
            try:
                html = await throttled_fetch(client, throttle, p["url"])
            except Exception as e:
                print(f"ERROR program detail {p['url']}: {e!r}")
                return None
            try:
                return scrape_program_detail(html, p)
            except Exception as e:
                print(f"ERROR parse program {p['url']}: {e!r}")
                return None

        tasks = [one(p) for p in targets]
        detailed = await asyncio.gather(*tasks)
        merged: list[dict[str, Any]] = []
        detail_by_url = {d["url"]: d for d in detailed if d}
        for p in catalog:
            hit = detail_by_url.get(p["url"])
            if hit:
                merged.append(hit)
            else:
                merged.append(p)

        (cache_dir / "programs.json").write_text(json.dumps(merged, indent=2), encoding="utf-8")
        (cache_dir / "admissions.json").write_text(json.dumps(admissions, indent=2), encoding="utf-8")
        (cache_dir / "financial-aid.json").write_text(json.dumps(financial, indent=2), encoding="utf-8")
        print(f"Wrote {cache_dir / 'programs.json'} ({len(merged)} programs)")
        print(f"Wrote {cache_dir / 'admissions.json'}")
        print(f"Wrote {cache_dir / 'financial-aid.json'}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--cache-dir",
        default="./cache",
        help="Output directory for JSON files (default: ./cache)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        metavar="N",
        help="Only scrape detail pages for the first N programs (for testing)",
    )
    args = parser.parse_args()
    cache_dir = Path(args.cache_dir).resolve()
    asyncio.run(run_scraper(cache_dir, args.limit))


if __name__ == "__main__":
    main()
