"""Utility script to bulk-create GitHub issues for the aktonz2 repository.

Run this script with a valid ``GITHUB_TOKEN`` environment variable that has the
``repo`` scope. Use the ``--dry-run`` flag to preview the payload that will be
sent to the GitHub API without actually creating any issues.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Iterable, MutableMapping, Optional

import requests

# === CONFIGURATION ===
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")  # set this in your environment
REPO_OWNER = "ewebtechsuk"
REPO_NAME = "aktonz2"

# List of tasks to create as issues
ISSUE_LIST = [
    {
        "title": "Task 1.1: Create conversation flow - “Let my property” landing path",
        "body": "Create chat conversation flow for landlords: collect postcode, property type, bedrooms, rent expectation, service preference (let-only / full management).",
        "labels": ["enhancement", "landlord-onboarding"],
    },
    {
        "title": "Task 1.2: Build Valuation Module",
        "body": "Backend service to estimate market rent based on postcode, size and recent data. Integrate into chatbot flow.",
        "labels": ["enhancement", "backend", "valuation"],
    },
    # … (add remaining tasks similarly)
]


def create_github_issue(
    title: str,
    body: str,
    labels: Optional[Iterable[str]] = None,
    *,
    dry_run: bool = False,
) -> bool:
    """Create a single GitHub issue.

    Parameters
    ----------
    title:
        The title for the GitHub issue.
    body:
        The issue body in Markdown format.
    labels:
        Optional iterable of labels to attach to the new issue.
    dry_run:
        If ``True`` the payload is printed instead of sent to GitHub.

    Returns
    -------
    bool
        ``True`` when an issue was created successfully or when in dry-run
        mode, ``False`` otherwise.
    """

    payload: MutableMapping[str, object] = {
        "title": title,
        "body": body,
        "labels": list(labels or ()),
    }

    if dry_run:
        print(f"📝 Dry run – would create issue: {title}")
        print(json.dumps(payload, indent=2))
        return True

    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
    except requests.RequestException as exc:  # pragma: no cover - network safety
        print(f"❌ Network error while creating '{title}': {exc}")
        return False

    if response.status_code == 201:
        print(f"✅ Created issue: {title}")
        return True

    print(f"❌ Failed to create: {title}")
    print(f"Response {response.status_code}: {response.text}")
    return False


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the payload instead of creating issues",
    )
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)

    if not GITHUB_TOKEN:
        print("Error: Please set the GITHUB_TOKEN environment variable.")
        return 1

    success = True
    for issue in ISSUE_LIST:
        result = create_github_issue(
            issue["title"],
            issue["body"],
            issue.get("labels"),
            dry_run=args.dry_run,
        )
        success = success and result

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
