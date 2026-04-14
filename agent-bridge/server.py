from __future__ import annotations

import argparse
import json
import logging
import re
import secrets
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from fastmcp import FastMCP

logger = logging.getLogger("uagc-agent-bridge")

LevelFilter = Literal["associate", "bachelor", "master", "doctorate", "certificate"]
AreaFilter = Literal[
    "business",
    "education",
    "health-care",
    "information-technology",
    "criminal-justice",
    "liberal-arts",
    "social-behavioral-science",
]
def _error(code: str, message: str, **details: Any) -> dict[str, Any]:
    out: dict[str, Any] = {"error": {"code": code, "message": message}}
    if details:
        out["error"]["details"] = details
    return out


def _norm_compact(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _load_json_file(path: Path) -> Any | None:
    try:
        with path.open(encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(
            f"Warning: cache file not found at {path}. "
            "Run `python scraper.py` first to populate the cache.",
            file=sys.stderr,
        )
        return None
    except json.JSONDecodeError as exc:
        print(f"Warning: invalid JSON in {path}: {exc}", file=sys.stderr)
        return None
    except OSError as exc:
        print(f"Warning: could not read {path}: {exc}", file=sys.stderr)
        return None


def _normalize_programs(raw: Any) -> list[dict[str, Any]]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [p for p in raw if isinstance(p, dict)]
    if isinstance(raw, dict):
        for key in ("programs", "data", "items", "results"):
            inner = raw.get(key)
            if isinstance(inner, list):
                return [p for p in inner if isinstance(p, dict)]
    return []


def _program_id(program: dict[str, Any]) -> str:
    pid = program.get("id") if program.get("id") is not None else program.get("programId")
    return str(pid) if pid is not None else ""


def _program_text(program: dict[str, Any]) -> str:
    parts: list[str] = []
    for key in ("name", "title", "description", "briefDescription", "summary"):
        val = program.get(key)
        if isinstance(val, str):
            parts.append(val)
    return " ".join(parts)


def _brief_description(program: dict[str, Any]) -> str:
    for key in ("briefDescription", "summary", "shortDescription", "description"):
        val = program.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return ""


def _summarize_program(program: dict[str, Any]) -> dict[str, Any]:
    pid = _program_id(program)
    return {
        "id": pid,
        "name": str(program.get("name") or program.get("title") or ""),
        "level": str(program.get("level") or program.get("degreeLevel") or ""),
        "area": str(program.get("area") or program.get("areaOfInterest") or ""),
        "college": str(program.get("college") or program.get("school") or ""),
        "url": str(program.get("url") or program.get("link") or ""),
        "description": _brief_description(program),
    }


def _level_matches(program: dict[str, Any], level: LevelFilter) -> bool:
    raw = str(program.get("level") or program.get("degreeLevel") or "")
    return _norm_compact(raw).startswith(level) or level in _norm_compact(raw)


def _area_matches(program: dict[str, Any], area: AreaFilter) -> bool:
    raw = str(program.get("area") or program.get("areaOfInterest") or "")
    return _norm_compact(raw) == _norm_compact(area) or area.replace("-", "") in _norm_compact(raw)


def _keyword_matches(program: dict[str, Any], words: list[str]) -> bool:
    haystack = _program_text(program).lower()
    return all(w.lower() in haystack for w in words)


@dataclass
class BridgeCache:
    programs: list[dict[str, Any]]
    programs_by_id: dict[str, dict[str, Any]]
    admissions: dict[str, Any]
    financial_aid: dict[str, Any]


def load_bridge_cache(cache_dir: Path) -> BridgeCache:
    programs_path = cache_dir / "programs.json"
    admissions_path = cache_dir / "admissions.json"
    financial_path = cache_dir / "financial-aid.json"

    programs_raw = _load_json_file(programs_path)
    admissions_raw = _load_json_file(admissions_path)
    financial_raw = _load_json_file(financial_path)

    programs = _normalize_programs(programs_raw)
    programs_by_id: dict[str, dict[str, Any]] = {}
    for p in programs:
        pid = _program_id(p)
        if pid:
            programs_by_id[pid] = p

    admissions: dict[str, Any] = admissions_raw if isinstance(admissions_raw, dict) else {}
    financial_aid: dict[str, Any] = financial_raw if isinstance(financial_raw, dict) else {}

    return BridgeCache(
        programs=programs,
        programs_by_id=programs_by_id,
        admissions=admissions,
        financial_aid=financial_aid,
    )


def build_mcp(cache: BridgeCache) -> FastMCP:
    instructions = (
        "This is the UAGC Agent Bridge: a Model Context Protocol server that provides "
        "structured access to University of Arizona Global Campus public information, "
        "including academic programs, admissions guidance, financial aid context, and "
        "request-for-information handling in bridge mode (RFI calls are logged only)."
    )

    mcp = FastMCP(name="UAGC Agent Bridge", instructions=instructions)

    @mcp.tool(
        name="searchPrograms",
        description=(
            "Search the UAGC academic program catalog by keyword, with optional filters "
            "for degree level and area of interest."
        ),
    )
    def searchPrograms(
        keyword: str,
        level: LevelFilter | None = None,
        area: AreaFilter | None = None,
    ) -> dict[str, Any]:
        try:
            words = [w for w in re.split(r"\s+", keyword.strip()) if w]
            if not words:
                return _error("INVALID_INPUT", "keyword must contain at least one non-empty word.")

            matches: list[dict[str, Any]] = []
            for program in cache.programs:
                if level is not None and not _level_matches(program, level):
                    continue
                if area is not None and not _area_matches(program, area):
                    continue
                if not _keyword_matches(program, words):
                    continue
                matches.append(_summarize_program(program))
                if len(matches) >= 20:
                    break

            return {"programs": matches}
        except Exception as exc:  # noqa: BLE001
            logger.exception("searchPrograms failed")
            return _error("INTERNAL_ERROR", "searchPrograms failed.", reason=str(exc))

    @mcp.tool(
        name="getProgramDetails",
        description=(
            "Get full details for a specific UAGC degree program including description, "
            "requirements, outcomes, and cost."
        ),
    )
    def getProgramDetails(programId: str) -> dict[str, Any]:
        try:
            pid = programId.strip()
            if not pid:
                return _error("INVALID_INPUT", "programId is required.")
            program = cache.programs_by_id.get(pid)
            if program is None:
                return _error("NOT_FOUND", f"No program found for id {pid!r}.")
            return dict(program)
        except Exception as exc:  # noqa: BLE001
            logger.exception("getProgramDetails failed")
            return _error("INTERNAL_ERROR", "getProgramDetails failed.", reason=str(exc))

    @mcp.tool(
        name="getAdmissionsSteps",
        description="Get the step-by-step admissions process for UAGC by student type.",
    )
    def getAdmissionsSteps(studentType: str = "new") -> dict[str, Any]:
        try:
            requested = str(studentType).strip() or "new"
            type_aliases = {
                "new": "traditional",
                "transfer": "traditional",
                "returning": "traditional",
                "military": "traditional",
                "working-adult": "traditional",
                "adult": "traditional",
            }
            key = type_aliases.get(requested.lower(), requested)
            data = cache.admissions.get(key)
            if data is None:
                key = "traditional"
                data = cache.admissions.get(key)
            if data is None:
                return _error(
                    "NOT_FOUND",
                    "Admissions cache is empty or missing the default 'new' student type.",
                    studentType=requested,
                )

            steps_raw: Any
            if isinstance(data, list):
                steps_raw = data
            elif isinstance(data, dict) and isinstance(data.get("steps"), list):
                steps_raw = data["steps"]
            else:
                return _error(
                    "INVALID_CACHE",
                    "Admissions cache entry has an unexpected shape.",
                    studentType=key,
                )

            steps_out: list[dict[str, str]] = []
            for i, step in enumerate(steps_raw):
                if not isinstance(step, dict):
                    continue
                title = str(
                    step.get("title")
                    or step.get("name")
                    or step.get("heading")
                    or f"Step {i + 1}"
                )
                description = str(step.get("description") or step.get("body") or step.get("text") or "")
                link = str(step.get("link") or step.get("url") or step.get("href") or "")
                steps_out.append({"title": title, "description": description, "link": link})

            return {"studentType": key, "steps": steps_out}
        except Exception as exc:  # noqa: BLE001
            logger.exception("getAdmissionsSteps failed")
            return _error("INTERNAL_ERROR", "getAdmissionsSteps failed.", reason=str(exc))

    @mcp.tool(
        name="getFinancialAidEstimate",
        description=(
            "Get tuition information, financial aid ranges, and scholarship details for a UAGC program."
        ),
    )
    def getFinancialAidEstimate(programId: str) -> dict[str, Any]:
        try:
            pid = programId.strip()
            if not pid:
                return _error("INVALID_INPUT", "programId is required.")
            program = cache.programs_by_id.get(pid)
            if program is None:
                return _error("NOT_FOUND", f"No program found for id {pid!r}.")

            fa = cache.financial_aid
            name = str(program.get("name") or program.get("title") or "")

            tuition = (
                program.get("tuition")
                or program.get("cost")
                or program.get("pricing")
                or program.get("tuitionInfo")
            )

            aid_ranges = (
                fa.get("aidRanges")
                or fa.get("financialAidRanges")
                or fa.get("ranges")
                or fa.get("estimatedAidRanges")
            )
            scholarships = fa.get("scholarships") or fa.get("scholarshipPrograms")
            next_steps = fa.get("nextSteps") or fa.get("next_steps") or fa.get("recommendedNextSteps")

            return {
                "programName": name,
                "programId": pid,
                "tuition": tuition,
                "financialAidRanges": aid_ranges,
                "scholarships": scholarships,
                "nextSteps": next_steps,
            }
        except Exception as exc:  # noqa: BLE001
            logger.exception("getFinancialAidEstimate failed")
            return _error("INTERNAL_ERROR", "getFinancialAidEstimate failed.", reason=str(exc))

    @mcp.tool(
        name="submitRFI",
        description=(
            "Submit a Request for Information about a UAGC program. In bridge mode this logs "
            "the request but does not submit to the live site."
        ),
    )
    def submitRFI(
        firstName: str,
        lastName: str,
        email: str,
        programInterest: str,
        phone: str | None = None,
        state: str | None = None,
    ) -> dict[str, Any]:
        try:
            fn = firstName.strip()
            ln = lastName.strip()
            em = email.strip()
            prog = programInterest.strip()
            ph = phone.strip() if phone else None
            st = state.strip() if state else None

            missing = [
                label
                for label, val in (
                    ("firstName", fn),
                    ("lastName", ln),
                    ("email", em),
                    ("programInterest", prog),
                )
                if not val
            ]
            if missing:
                return _error("VALIDATION_ERROR", "Missing required fields.", fields=missing)

            local_part, at_sep, domain = em.partition("@")
            if not local_part or not at_sep or "." not in domain:
                return _error("VALIDATION_ERROR", "email does not appear to be valid.")

            ref = f"UAGC-2026-{secrets.randbelow(100_000):05d}"
            payload = {
                "referenceNumber": ref,
                "firstName": fn,
                "lastName": ln,
                "email": em,
                "phone": ph,
                "programInterest": prog,
                "state": st,
            }
            logger.info("RFI (bridge mode, not posted): %s", json.dumps(payload, default=str))

            return {
                "referenceNumber": ref,
                "status": "logged",
                "message": "Request recorded in bridge mode; no data was sent to uagc.edu.",
                "followUpTimeline": "If this were production, an advisor would typically follow up within 1–2 business days.",
            }
        except Exception as exc:  # noqa: BLE001
            logger.exception("submitRFI failed")
            return _error("INTERNAL_ERROR", "submitRFI failed.", reason=str(exc))

    return mcp


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")

    parser = argparse.ArgumentParser(description="UAGC Agent Bridge MCP server (SSE).")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind (default: 8000).")
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=Path("./cache"),
        help="Directory containing programs.json, admissions.json, financial-aid.json.",
    )
    args = parser.parse_args()
    cache_dir = args.cache_dir.expanduser().resolve()

    cache = load_bridge_cache(cache_dir)
    mcp = build_mcp(cache)

    mcp.run(transport="streamable-http", host="0.0.0.0", port=args.port)


if __name__ == "__main__":
    main()
