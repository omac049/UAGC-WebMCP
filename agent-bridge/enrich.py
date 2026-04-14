#!/usr/bin/env python3
"""Enrich programs.json by fetching program pages (curl + BeautifulSoup) and merging missing fields."""

from __future__ import annotations

import argparse
import asyncio
import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper import BASE, DEFAULT_HEADERS, USER_AGENT, scrape_program_detail

CURL_HEADERS = [
    "-H",
    f"Accept: {DEFAULT_HEADERS['Accept']}",
    "-H",
    f"Accept-Language: {DEFAULT_HEADERS['Accept-Language']}",
]


def _is_empty(val: Any) -> bool:
    if val is None:
        return True
    if isinstance(val, str) and not val.strip():
        return True
    if isinstance(val, (list, dict)) and len(val) == 0:
        return True
    return False


def _needs_enrichment(program: dict[str, Any]) -> bool:
    return _is_empty(program.get("credits")) or _is_empty(program.get("outcomes"))


def _credits_from_scraper(raw: dict[str, Any]) -> dict[str, Any]:
    """Map scrape_program_detail credits shape to programs.json cache shape."""
    cb = raw.get("credit_breakdown") or {}
    totals = cb.get("totals") or cb.get("breakdown") or {}
    narrative = cb.get("narrative") or ""
    out: dict[str, Any] = {
        "degree_journey": raw.get("degree_journey") or "",
        "courses_by_term": raw.get("courses_by_term") or {},
        "breakdown": {"breakdown": totals, "narrative": narrative},
    }
    sl = raw.get("summary_line")
    if sl:
        out["summary_line"] = sl
    else:
        text = narrative or ""
        m = re.search(r"\b\d{1,3}\s*credits?\b[^.]{0,200}\.", text, re.I | re.DOTALL)
        if m:
            out["summary_line"] = re.sub(r"\s+", " ", m.group(0)).strip()
    return out


def _normalize_scraped_row(scraped: dict[str, Any]) -> dict[str, Any]:
    """Produce cache-shaped fields from scrape_program_detail output."""
    credits_raw = scraped.get("credits") or {}
    if isinstance(credits_raw, dict) and "credit_breakdown" in credits_raw:
        credits = _credits_from_scraper(credits_raw)
    elif isinstance(credits_raw, dict) and "breakdown" in credits_raw:
        credits = credits_raw
    else:
        credits = credits_raw if isinstance(credits_raw, dict) else {}

    return {
        "name": scraped.get("name"),
        "college": scraped.get("college"),
        "description": scraped.get("description"),
        "url": scraped.get("url"),
        "credits": credits if credits else None,
        "tuition": scraped.get("tuition"),
        "outcomes": scraped.get("outcomes"),
        "requirements": scraped.get("requirements"),
    }


def _merge_program(existing: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    out = dict(existing)
    for key in ("name", "college", "description", "url", "credits", "tuition", "outcomes", "requirements"):
        if key not in patch:
            continue
        cur = out.get(key)
        new_val = patch[key]
        if _is_empty(cur) and not _is_empty(new_val):
            out[key] = new_val
    return out


async def _curl_fetch(url: str) -> str:
    proc = await asyncio.create_subprocess_exec(
        "curl",
        "-sL",
        "--compressed",
        "-A",
        USER_AGENT,
        *CURL_HEADERS,
        url,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        err = stderr.decode("utf-8", "replace")[:500]
        raise RuntimeError(f"curl exit {proc.returncode}: {err}")
    return stdout.decode("utf-8", "replace")


def _fallback_credits_from_html(html: str) -> dict[str, Any] | None:
    """Regex fallback when layout lacks zes-two-column-tabs."""
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ", strip=True)
    m = re.search(r"\bcomplete\s+(\d{1,3})\s+credits?\b", text, re.I)
    if not m:
        m = re.search(r"\b(\d{1,3})\s+credits?\s+to\s+(?:earn|graduate)", text, re.I)
    if not m:
        return None
    n = m.group(1)
    narrative = ""
    for pat in (
        rf"must complete {n} credits[^.]*\.",
        rf"complete {n} credits[^.]*\.",
        rf"{n} credits[^.]*\.",
    ):
        nm = re.search(pat, text, re.I)
        if nm:
            narrative = re.sub(r"\s+", " ", nm.group(0)).strip()
            break
    if not narrative:
        narrative = f"Must complete {n} credits."
    return {
        "degree_journey": "",
        "courses_by_term": {},
        "breakdown": {"breakdown": {"Total Credits": n}, "narrative": narrative},
        "summary_line": f"{n} credits.",
    }


def _fallback_outcomes_from_html(html: str) -> dict[str, Any] | None:
    soup = BeautifulSoup(html, "html.parser")
    learning: list[str] = []
    for banner in soup.select(".paragraph--paid_text_banner.paid-text-banner"):
        h = banner.select_one(".paid-text-banner__heading")
        if not h:
            continue
        title = re.sub(r"\s+", " ", h.get_text(" ", strip=True)).lower()
        if "what you" in title and "learn" in title:
            w = banner.select_one(".paid-text-banner__wysiwyg")
            if w:
                for li in w.find_all("li"):
                    t = re.sub(r"\s+", " ", li.get_text(" ", strip=True)).strip()
                    if t:
                        learning.append(t)
            break
    if not learning:
        for h2 in soup.find_all(["h2", "h3"]):
            t = re.sub(r"\s+", " ", h2.get_text(" ", strip=True)).lower()
            if "program outcomes" in t or "what you'll learn" in t:
                sec = h2.find_parent(["section", "div"])
                if sec:
                    for li in sec.find_all("li"):
                        item = re.sub(r"\s+", " ", li.get_text(" ", strip=True)).strip()
                        if item and len(item) > 15:
                            learning.append(item)
                break
    if not learning:
        return None
    intro = ""
    career = (
        "Career outcomes are presented via an embedded Lightcast widget on the live page; "
        "open the program URL in a browser to view interactive career data."
    )
    return {"learning_intro": intro, "learning_outcomes": learning, "career_outcomes": career}


def _enrich_one(program: dict[str, Any], html: str) -> dict[str, Any]:
    try:
        scraped = scrape_program_detail(html, program)
    except Exception:
        scraped = dict(program)
    patch = _normalize_scraped_row(scraped)

    if _is_empty(patch.get("credits")):
        fb = _fallback_credits_from_html(html)
        if fb:
            patch["credits"] = fb

    if _is_empty(patch.get("outcomes")):
        fo = _fallback_outcomes_from_html(html)
        if fo:
            patch["outcomes"] = fo

    if _is_empty(patch.get("requirements")):
        soup = BeautifulSoup(html, "html.parser")
        article = soup.select_one("article.site-layout__article.degree") or soup.select_one(
            "article.site-layout__article"
        )
        scope = article or soup
        intro = ""
        links: list[dict[str, str]] = []
        intro_el = scope.select_one("section.paragraph--completion_journey_ .intro-block__content")
        if intro_el:
            intro = re.sub(r"\s+", " ", intro_el.get_text(" ", strip=True)).strip()
        for a in scope.select("section.paragraph--completion_journey_ a[href]"):
            href = a.get("href") or ""
            txt = re.sub(r"\s+", " ", a.get_text(" ", strip=True)).strip()
            if "admission" in txt.lower() or "admission" in href.lower():
                links.append({"text": txt or "Admissions", "href": urljoin(BASE, href)})
        if intro or links:
            patch["requirements"] = {"intro": intro, "links": links}

    if _is_empty(patch.get("tuition")):
        snippets: list[str] = []
        soup = BeautifulSoup(html, "html.parser")
        for el in soup.select(".icon-text-block__icon-text"):
            t = re.sub(r"\s+", " ", el.get_text(" ", strip=True)).strip()
            if "$" in t or "fee" in t.lower():
                snippets.append(t)
        dollars = sorted(
            set(re.findall(r"\$[\d,]+(?:\.\d{2})?(?:\s*/\s*credit)?", soup.get_text(" ", strip=True)))
        )[:20]
        if snippets or dollars:
            patch["tuition"] = {"highlights": snippets[:12], "currency_mentions": dollars}

    return patch


async def _fetch_and_patch(program: dict[str, Any], sem: asyncio.Semaphore) -> tuple[str, dict[str, Any] | None]:
    url = program.get("url") or ""
    pid = program.get("id", url)
    async with sem:
        try:
            html = await _curl_fetch(url)
        except Exception as e:
            print(f"  FAIL fetch {pid}: {e!r}")
            return pid, None
        try:
            patch = _enrich_one(program, html)
        except Exception as e:
            print(f"  FAIL parse {pid}: {e!r}")
            return pid, None
    return pid, patch


async def run_enrich(cache_dir: Path, limit: int, batch_size: int, batch_delay: float) -> None:
    programs_path = cache_dir / "programs.json"
    raw = json.loads(programs_path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise SystemExit("programs.json must be a JSON array")

    need = [p for p in raw if isinstance(p, dict) and _needs_enrichment(p)]
    targets = need[: max(0, limit)]
    print(f"Programs in cache: {len(raw)}; need enrichment: {len(need)}; processing: {len(targets)}")

    sem = asyncio.Semaphore(batch_size)
    updated = {p["id"]: dict(p) for p in raw if isinstance(p, dict) and "id" in p}

    for i in range(0, len(targets), batch_size):
        batch = targets[i : i + batch_size]
        print(f"Batch {i // batch_size + 1}: {len(batch)} program(s) …")
        results = await asyncio.gather(*[_fetch_and_patch(p, sem) for p in batch])
        for pid, patch in results:
            if patch is None:
                print(f"  skip {pid} (no patch)")
                continue
            if pid not in updated:
                print(f"  skip {pid} (unknown id)")
                continue
            before = updated[pid]
            merged = _merge_program(before, patch)
            updated[pid] = merged
            print(f"  ok {pid}")
        if i + batch_size < len(targets):
            await asyncio.sleep(batch_delay)

    out_list = [updated.get(p["id"], p) if isinstance(p, dict) and "id" in p else p for p in raw]
    programs_path.write_text(json.dumps(out_list, indent=2), encoding="utf-8")
    print(f"Wrote {programs_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich programs.json via curl + BeautifulSoup merge.")
    parser.add_argument("--cache-dir", default="./cache", help="Directory containing programs.json")
    parser.add_argument("--limit", type=int, default=58, help="Max programs needing enrichment to process")
    parser.add_argument("--batch-size", type=int, default=5, help="Concurrent curl fetches per batch")
    parser.add_argument("--batch-delay", type=float, default=2.0, help="Seconds to sleep between batches")
    args = parser.parse_args()
    cache_dir = Path(args.cache_dir).resolve()
    asyncio.run(run_enrich(cache_dir, args.limit, args.batch_size, args.batch_delay))


if __name__ == "__main__":
    main()
