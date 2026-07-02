# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это за репозиторий

Маркетплейс плагинов Claude Code с единственным плагином `qtim` — движком bootstrap и оркестрации команды специализированных субагентов под любой проект. Исполняемого кода, сборки и тестов здесь нет: репозиторий целиком состоит из markdown-промптов и JSON-манифестов. «Код» — это промпты; правки к ним предъявляют те же требования консистентности, что и к коду.

Весь контент — на русском языке. Коммиты — conventional commits с русским описанием: `feat(setup): …`, `docs(readme): …`, `fix: …`, `chore: …`. При содержательных изменениях плагина бампай `version` в `plugins/qtim/.claude-plugin/plugin.json`.

## Структура

- `.claude-plugin/marketplace.json` — манифест маркетплейса, регистрирует плагин из `./plugins/qtim`.
- `plugins/qtim/commands/` — slash-команды `/qtim:*`: `setup` (генератор команды под проект), `team-up` / `team-lazy` / `team-down` (движок).
- `plugins/qtim/agents/` — generic-шаблоны ролей (`architect`, `database`, `frontend`, `testing`, `reviewer`) с плейсхолдерами `{{...}}`.
- `plugins/qtim/reference/` — переносимая механика: `intake-protocol.md`, `orchestration-patterns.md`, `codex-consult.md`. Это supporting-docs, НЕ slash-команды.
- `plugins/qtim/hooks/hooks.json` — hooks плагина (SessionStart-анонс при наличии charter, SubagentStop-напоминание про артефакты).

## Архитектура: движок vs генерируемое

Центральное разделение, на котором держится плагин:

- **Движок живёт в плагине** и в проекты не копируется: команды `team-up`/`team-lazy`/`team-down` и `reference/*` доступны целевому проекту из `${CLAUDE_PLUGIN_ROOT}`. Единственное исключение — Standalone-режим setup (Q6), когда движок копируется в `.claude/` проекта.
- **`/qtim:setup` генерирует только проект-специфичное** в целевом проекте: `.claude/team-charter.md` (контракт команды — источник истины по составу ролей), `.claude/agents/<role>-agent.md`, `.claude/settings.local.json`, `memory/`.

Шаблоны в `agents/` — generic: плейсхолдеры `{{FRONTEND_FRAMEWORK}}`, `{{BACKEND}}`, `{{DATABASE}}`, `{{FILE_STORAGE}}`, `{{BUILD_CMD}}`, `{{TYPECHECK_CMD}}`, `{{TEST_RUNNER}}`, `{{E2E_TOOL}}` подставляет генератор setup под стек целевого проекта. При правке шаблонов сохраняй frontmatter (`name`, `description` с example-блоками, `model`, `color`, `memory`, `tools`) и стиль плейсхолдеров; специфику конкретного стека в шаблоны не тащить.

## Канон рантайма Agent Teams — единый по всем файлам

Канонический источник — «Модель оркестрации» в `plugins/qtim/commands/team-up.md`; остальные файлы ссылаются на него, не дублируя. При любой правке соблюдай:

- Сессия = одна неявная команда. Примитивы `TeamCreate`/`TeamDelete`/`team_name` **упразднены** и не должны появляться ни в одном файле (ни в промптах, ни в примерах) — только как упоминание об упразднённости.
- Член команды = `Agent({ name, subagent_type, prompt })`; продолжение поднятого агента — `SendMessage` (повторный `Agent` с тем же `name` = старт с нуля); общий список задач — `Task*`.
- Team-lead = главная сессия; отдельный orchestrator-агент не создаётся.
- Liveness привязан к текущей сессии CLI, не к файлам на диске.

## Три ортогональные оси — каждая описана ровно в одном файле

- «**Сколько** оркестрации» — Decision Matrix A/B/C/D по глубине координации (наличие петель impl↔test↔review) — `commands/team-up.md`.
- «**Риск/обратимость** → дизайн-фаза + approval-гейт» — `reference/intake-protocol.md` (тест «развилка?»).
- «**Какая форма**» — 6 паттернов на движке Workflow (opt-in пользователя обязателен) — `reference/orchestration-patterns.md`.

Не дублируй логику одной оси в файле другой — файлы ссылаются друг на друга относительными ссылками (`../commands/…`, `../reference/…`), они должны оставаться валидными.

## Прочие инварианты контента

- `commands/team-*.md` и `reference/*` читает **только team-lead**: orchestration-логика не должна попадать в промпты субагентов (риск рекурсии). Шаблоны `agents/` — наоборот, промпты субагентов: движковой логики там быть не должно.
- Codex-протокол (`reference/codex-consult.md`): advisory (доменный инвариант проекта > совет codex), consult всегда read-only (`-s read-only`), fail-soft (недоступность codex не блокирует эпик), execution lane — отдельная полоса ровно с двумя триггерами. Для money/security-кода — нейтральные defect-review формулировки, сырой вывод codex в тред не ретранслируется.
- Декоративные emoji не добавлять; статус-маркеры (❌ anti-pattern, галки чеклистов) допустимы.

## Проверка изменений

CI (`.github/workflows/validate.yml`) на каждый push/PR: валидность JSON, запрет call-синтаксиса упразднённых примитивов (`TeamCreate(` / `TeamDelete(` / `team_name:`), плейсхолдеры шаблонов по белому списку (`.github/scripts/check_placeholders.py`), целостность относительных ссылок (`.github/scripts/check_links.py`). Локально — те же скрипты плюс руками:

- Валидность JSON: `python3 -m json.tool .claude-plugin/marketplace.json plugins/qtim/.claude-plugin/plugin.json plugins/qtim/hooks/hooks.json`.
- Канон рантайма: `grep -rn "TeamCreate\|TeamDelete\|team_name" plugins/` — вхождения только в контексте «упразднено».
- Кросс-ссылки между `commands/` и `reference/` не битые.
- Ручная проверка установки: `/plugin marketplace add toiiia/qtim-agent-team` → `/plugin install qtim@qtim-agent-team`; рантайму нужен флаг `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` в `settings.json`.

## Чеклист при обновлении Claude Code

Плагин привязан к экспериментальному рантайму Agent Teams — при апгрейде CLI перепроверь:

- имена инструментов в `tools:` frontmatter шаблонов `agents/` — инструменты появляются и упраздняются (прецедент: `MultiEdit` слит в `Edit`); отдельно сверяй командные (`Skill`, `SendMessage`, `TaskCreate`/`TaskUpdate`) — доступны ли они субагентам через whitelist `tools:` или выдаются рантаймом иначе;
- поведение hooks: какие события инжектят stdout в контекст модели (SessionStart — да), а какие видны только в transcript (SubagentStop);
- поле `memory` frontmatter агентов и путь agent-memory (`.claude/agent-memory/<name>/`);
- канон «Модели оркестрации» в `commands/team-up.md` — не изменились ли примитивы рантайма.
