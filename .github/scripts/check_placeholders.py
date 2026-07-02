#!/usr/bin/env python3
"""Плейсхолдеры {{...}} в plugins/ должны входить в белый список из commands/setup.md.

Дополнительно ловит деформированные плейсхолдеры ({{ BUILD_CMD }}, {{build_cmd}}) и
несбалансированные скобки ({{BUILD_CMD} / {BUILD_CMD}}), которые строгий паттерн молча
пропустил бы. Литерал-иллюстрация `{{...}}` допустим.

Обратная проверка examples/ (*.md и *.json — settings тоже генерируется):
это «сгенерированный» вид — плейсхолдеров там быть не должно вовсе.
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
# {{FOO} (нет закрывающей пары) или {FOO}} (нет открывающей) — потерянная скобка в шаблоне.
UNBALANCED = re.compile(r"\{\{[A-Z0-9_]+\}(?!\})|(?<!\{)\{[A-Z0-9_]+\}\}")


def example_files():
    root = pathlib.Path("examples")
    return sorted(list(root.rglob("*.md")) + list(root.rglob("*.json")))


bad = []
for path in sorted(pathlib.Path("plugins").rglob("*.md")):
    text = path.read_text(encoding="utf-8")
    for m in re.finditer(r"\{\{[^{}]*\}\}", text):
        token = m.group(0)
        strict = STRICT.match(token)
        if strict:
            if strict.group(1) not in ALLOWED:
                bad.append(f"{path}: {token} — не из белого списка")
        elif re.search(r"[A-Za-z0-9]", token):
            bad.append(f"{path}: {token} — деформированный плейсхолдер (пробелы/регистр?)")
    for m in UNBALANCED.finditer(text):
        bad.append(f"{path}: {m.group(0)} — несбалансированные скобки плейсхолдера")

for path in example_files():
    text = path.read_text(encoding="utf-8")
    for m in re.finditer(r"\{\{[^{}]*\}\}", text):
        if re.search(r"[A-Za-z0-9]", m.group(0)):
            bad.append(f"{path}: {m.group(0)} — в examples/ плейсхолдеры должны быть подставлены")
    for m in UNBALANCED.finditer(text):
        bad.append(f"{path}: {m.group(0)} — в examples/ остаток битого плейсхолдера")

if bad:
    print("Проблемные плейсхолдеры (обнови белый список в setup.md и в этом скрипте — или шаблон):")
    print("\n".join(bad))
    sys.exit(1)

print(f"OK: плейсхолдеры plugins/ из белого списка ({len(ALLOWED)} имён), деформированных и несбалансированных нет, examples/ (*.md + *.json) без плейсхолдеров")
