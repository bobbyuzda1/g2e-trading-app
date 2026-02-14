#!/usr/bin/env python3
"""Fetch and display logs from Render for the G2E backend service."""

import argparse
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone


API_BASE = "https://api.render.com/v1"
MAX_PAGES = 20


def parse_duration(s: str) -> timedelta | None:
    """Parse a duration string like '30m', '4h', '1d' into a timedelta."""
    m = re.match(r"^(\d+)([mhd])$", s)
    if not m:
        return None
    val, unit = int(m.group(1)), m.group(2)
    if unit == "m":
        return timedelta(minutes=val)
    elif unit == "h":
        return timedelta(hours=val)
    elif unit == "d":
        return timedelta(days=val)
    return None


def fetch_logs(api_key: str, owner_id: str, service_id: str,
               start_time: str | None = None, end_time: str | None = None,
               limit: int = 100, direction: str = "backward") -> list[dict]:
    """Fetch logs from Render API with pagination."""
    all_logs = []

    for _ in range(MAX_PAGES):
        params = f"ownerId={owner_id}&resource={service_id}&direction={direction}&limit={limit}"
        if start_time:
            params += f"&startTime={start_time}"
        if end_time:
            params += f"&endTime={end_time}"

        url = f"{API_BASE}/logs?{params}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {api_key}"})

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
        except Exception as e:
            print(f"API request failed: {e}", file=sys.stderr)
            break

        logs = data.get("logs") or []
        all_logs.extend(logs)

        if not data.get("hasMore", False):
            break

        # Use pagination cursors
        if direction == "backward":
            next_end = data.get("nextEndTime")
            if not next_end:
                break
            end_time = next_end
        else:
            next_start = data.get("nextStartTime")
            if not next_start:
                break
            start_time = next_start

    return all_logs


def format_entry(entry: dict) -> tuple[str, str]:
    """Format a log entry. Returns (level, formatted_line)."""
    ts = entry.get("timestamp", "")[:19].replace("T", " ")
    msg = entry.get("message", "").strip()
    level = ""
    log_type = ""

    for label in entry.get("labels", []):
        if label["name"] == "level":
            level = label["value"]
        elif label["name"] == "type":
            log_type = label["value"]

    if not msg:
        return level, ""

    level_tag = f"[{level.upper()}]" if level else ""
    type_tag = f"({log_type})" if log_type else ""
    return level, f"{ts}  {level_tag:8s} {type_tag:8s} {msg}"


def main():
    parser = argparse.ArgumentParser(description="Fetch Render logs for G2E backend")
    parser.add_argument("--api-key", required=True)
    parser.add_argument("--service-id", required=True)
    parser.add_argument("--owner-id", required=True)
    parser.add_argument("--project-root", default=".")
    parser.add_argument("positional", nargs="*", help="Time window (30m/4h/1d), 'errors', 'warn', 'save'")

    args = parser.parse_args()

    # Parse positional args
    level_filter = ""
    time_window = None
    save_mode = False

    for a in args.positional:
        if a in ("errors", "error"):
            level_filter = "error"
        elif a in ("warn", "warning"):
            level_filter = "warning"
        elif a == "save":
            save_mode = True
        elif parse_duration(a):
            time_window = a

    # Build time range
    now = datetime.now(timezone.utc)
    end_time = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    start_time = None

    if time_window:
        delta = parse_duration(time_window)
        start_time = (now - delta).strftime("%Y-%m-%dT%H:%M:%SZ")
        time_desc = f"last {time_window}"
    else:
        time_desc = "most recent entries"

    print("=== G2E Backend Logs ===")
    print(f"Time range: {time_desc}")
    if level_filter:
        print(f"Filter: {level_filter} only")
    print("=" * 24)
    print()

    # Fetch logs (backward = newest first)
    raw_logs = fetch_logs(
        api_key=args.api_key,
        owner_id=args.owner_id,
        service_id=args.service_id,
        start_time=start_time,
        end_time=end_time,
        direction="backward",
    )

    # Reverse to chronological order and format
    raw_logs.reverse()

    lines = []
    for entry in raw_logs:
        level, line = format_entry(entry)
        if not line:
            continue
        if level_filter and level != level_filter:
            continue
        lines.append(line)

    if not lines:
        print("(No log entries found)")
        return

    output = "\n".join(lines)

    if save_mode:
        log_dir = os.path.join(args.project_root, "logs")
        os.makedirs(log_dir, exist_ok=True)
        filename = os.path.join(log_dir, f"render-{datetime.now().strftime('%Y%m%d-%H%M%S')}.log")
        with open(filename, "w") as f:
            f.write(output + "\n")
        print(f"Saved {len(lines)} lines to {filename}")
    else:
        print(output)


if __name__ == "__main__":
    main()
