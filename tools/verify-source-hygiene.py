#!/usr/bin/env python3
"""Fail closed on common committed credential files and high-confidence secret patterns."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
SKIP = {".git", "node_modules", "dist", "target", "coverage", "e2e-results", "e2e-report", "playwright-report", "__pycache__"}
ALLOWED_ENV_SUFFIXES = (".example", ".sample", ".template")
SENSITIVE_EXTENSIONS = {".pem", ".key", ".p12", ".pfx", ".p7b", ".p7c", ".jks", ".dump", ".backup", ".bak"}
RULES = [
    ("private-key-block", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("aws-access-key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("github-token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b")),
    ("jwt-literal", re.compile(r"\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{8,}\b")),
    ("absolute-home-path", re.compile(r"/(?:Users|home)/[A-Za-z0-9._-]+/")),
]

findings: list[str] = []
for path in ROOT.rglob("*"):
    if not path.is_file() or any(part in SKIP for part in path.relative_to(ROOT).parts):
        continue
    rel = path.relative_to(ROOT).as_posix()
    if path.name.startswith(".env") and not path.name.endswith(ALLOWED_ENV_SUFFIXES):
        findings.append(f"credential-file: {rel}")
        continue
    if path.suffix.lower() in SENSITIVE_EXTENSIONS:
        findings.append(f"sensitive-artifact: {rel}")
        continue
    try:
        if path.stat().st_size > 8_000_000:
            continue
        content = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue
    if path.name == Path(__file__).name:
        continue
    for name, rule in RULES:
        if rule.search(content):
            findings.append(f"{name}: {rel}")

if findings:
    print("Source hygiene scan failed:")
    print("\n".join(sorted(set(findings))))
    raise SystemExit(1)
print(f"Source hygiene scan passed for {sum(1 for p in ROOT.rglob('*') if p.is_file() and not any(x in SKIP for x in p.relative_to(ROOT).parts))} files.")
