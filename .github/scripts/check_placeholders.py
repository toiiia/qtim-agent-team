#!/usr/bin/env python3
"""Плейсхолдеры {{...}} в plugins/ должны входить в белый список из commands/setup.md.

Дополнительно ловит деформированные плейсхолдеры ({{ BUILD_CMD }}, {{build_cmd}}),
которые строгий паттерн молча пропустил бы. Литерал-иллюстрация `{{...}}` допустим.
"""
import pathlib
import re
import sys

ALLOWED = {
    "FRONTEND_FRAMEWORK",
    "BACKEND",
    "DATABASE",
    "FILE_STORAGE",
    "BUILD_CMD",
    "TYPECHECK_CMD",
    "TEST_RUNNER",
    "E2E_TOOL",
}

STRICT = re.compile(r"^\{\{([A-Z0-9_]+)\}\}$")

bad = []
for path in sorted(pathlib.Path("plugins").rglob("*.md")):
    for m in re.finditer(r"\{\{[^{}]*\}\}", path.read_text(encoding="utf-8")):
        token = m.group(0)
        strict = STRICT.match(token)
        if strict:
            if strict.group(1) not in ALLOWED:
                bad.append(f"{path}: {token} — не из белого списка")
        elif re.search(r"[A-Za-z0-9]", token):
            bad.append(f"{path}: {token} — деформированный плейсхолдер (пробелы/регистр?)")

if bad:
    print("Проблемные плейсхолдеры (обнови белый список в setup.md и в этом скрипте — или шаблон):")
    print("\n".join(bad))
    sys.exit(1)

print(f"OK: все плейсхолдеры из белого списка ({len(ALLOWED)} имён), деформированных нет")
