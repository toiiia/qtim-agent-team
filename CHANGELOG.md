# Changelog

Версии соответствуют `version` в `plugins/qtim/.claude-plugin/plugin.json` (semver).

## 1.2.0 — 2026-07-02

### Исправлено

- **Workflow-примеры теряли данные между стадиями** (`reference/orchestration-patterns.md`): judge/synth/filter/classifier в паттернах 1, 3, 4, 5, 6 теперь получают результаты предыдущих стадий интерполяцией в промпт; добавлены жёсткое правило движка B и anti-pattern «судья вслепую».
- **Субагенты не находили протокол codex-consult**: setup теперь записывает в charter абсолютный путь к `reference/codex-consult.md` (плейсхолдер плагин-рута вне файлов плагина не резолвится); промпт спавна в team-up и шаблоны ролей ссылаются на путь из charter; в Standalone — на локальную копию.
- **Невалидный `permissions.deny` baseline** в setup: голые glob'ы (`.env*`, `~/.ssh/**`) заменены на формат `Tool(паттерн)` — `Read(./.env*)`, `Edit(./.env*)`, `Read(~/.ssh/**)`, `Edit(~/.ssh/**)`.
- **SubagentStop-hook плагина** срабатывал во всех проектах — теперь, как и SessionStart, только при наличии `.claude/team-charter.md`; в description честно помечен как advisory для человека (stdout SubagentStop в контекст модели не инжектится).
- **`tools` шаблонов ролей**: убраны несуществующие/упразднённые `Computer`, `MultiEdit` и двусмысленный `Task`; добавлены `TaskCreate`/`TaskUpdate`/`SendMessage`, которых требуют промпты ролей (баг-флоу tester'а, маршрутизация reviewer'а, нотификации db→front), а по итогам независимого ревью — ещё `Skill` во все роли (промпты предписывают mandatory-invoke skills) и `Write` reviewer'у (пишет review-report в `memory/`).
- **Дубль hooks**: Q7 SessionStart/SubagentStop генерируются только при Q6=Standalone — в Plugin-linked их уже даёт `hooks.json` плагина.
- **Universal skills больше не захардкожены** в team-up: фактический список — из charter («Правила работы»), недоступные в окружении skills в промпты спавна не включаются (mandatory-invoke несуществующего skill ломал старт ролей); при пустом списке строка опускается целиком. `brainstorming`/`grill-me` в шаблоне architect помечены «если доступен».
- Из PostToolUse-примера setup убран упразднённый `MultiEdit`; указатель канона в charter — `/qtim:team-up` вместо пути файла; в Standalone команды указываются локальными именами, а путь к codex-протоколу — абсолютным и на локальную копию; в перечень сохраняемого frontmatter (setup 4.2) добавлен `color`.
- Удалён несуществующий `$schema` из `marketplace.json`.

### Добавлено

- **CI-валидация** (`.github/workflows/validate.yml` + `.github/scripts/`): JSON-манифесты, запрет call-синтаксиса упразднённых примитивов, плейсхолдеры по белому списку (включая детектор деформированных — пробелы/нижний регистр), целостность относительных ссылок; push-триггер только для `main`, чтобы PR не гонял job дважды.
- `CHANGELOG.md`.
- Секция **Intake-режим** (ответ Q3) в структуре charter — раньше ответ было некуда записывать, а `intake-protocol.md` читает дефолты именно из charter.
- **Каркасы cross-cutting ролей** `devops`/`product`/`auditor` в setup 4.2 — Extended-состав больше не генерируется «с нуля».
- **Стек-условные пометки** в шаблонах ролей + явный список условных блоков и безусловного ядра в setup 4.2 (шаблоны несут терминологию RLS/presign/realtime, нерелевантную части стеков).
- Setup создаёт `.claude/agent-memory/<role>-agent/MEMORY.md` для ролей с включённой памятью (первый спавн больше не шумит ошибкой чтения).
- Рекомендация по выбору `model` per-роль в setup 4.2.
- Чеклист «при обновлении Claude Code» в `CLAUDE.md`.

## 1.1.x и ранее

См. `git log` (conventional commits): автоподбор skills и плагинов/MCP под стек (1.1.x), исходный движок team-up/team-lazy/team-down + генератор setup + hooks (1.0.0).
