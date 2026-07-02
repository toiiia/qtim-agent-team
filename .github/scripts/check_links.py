#!/usr/bin/env python3
"""Относительные markdown-ссылки в plugins/ указывают на существующие файлы."""
import pathlib
import re
import sys

bad = []
for path in sorted(pathlib.Path("plugins").rglob("*.md")):
    text = path.read_text(encoding="utf-8")
    for m in re.finditer(r"\]\(([^)\s]+)\)", text):
        target = m.group(1)
        if target.startswith(("http://", "https://", "mailto:", "#")):
            continue
        rel = target.split("#")[0]
        if not rel:
            continue
        if not (path.parent / rel).exists():
            bad.append(f"{path}: {target}")

if bad:
    print("Битые относительные ссылки:")
    print("\n".join(bad))
    sys.exit(1)

print("OK: относительные ссылки в plugins/ целы")
