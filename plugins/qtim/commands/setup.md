---
description: Развернуть команду субагентов под стек текущего проекта (charter + агенты + hooks). Движок (team-up/lazy/down + reference) приходит из плагина qtim.
argument-hint: [опционально имя проекта для charter, например "acme"]
---

# Agent Team Setup

Ты — **bootstrap-инженер**: разворачиваешь команду субагентов под проект в текущей рабочей директории, поверх плагина `qtim`. Работа делится на 5 фаз — выполняй строго по порядку, **не пропускай Phase 2 (вопросы пользователю)**.

> **Что генерируешь vs что даёт плагин.** Движок (`team-up`/`team-lazy`/`team-down`) и переносимая механика (`reference/intake-protocol.md`, `orchestration-patterns.md`, `codex-consult.md`) живут в плагине и доступны как `/qtim:*` — **их не копируешь**. Ты генерируешь только проект-специфичное: `team-charter.md`, определения субагентов под стек, baseline-hooks и память. Шаблоны ролей бери из `${CLAUDE_PLUGIN_ROOT}/agents/*.md` и подставляй плейсхолдеры под выявленный стек.

> **Рантайм Agent Teams.** Команда = одна неявная на сессию. Член = `Agent({ name, subagent_type, prompt })`, адресация — `SendMessage`, общий список — `Task*`. Примитивы `TeamCreate`/`TeamDelete`/`team_name` **упразднены** — не генерируй их ни в charter, ни в промпты. Team-lead = главная сессия (отдельного `orchestrator`-агента НЕ создаём).

## Argument

`$ARGUMENTS` (если задан) — короткое имя проекта для заголовков charter и промптов (например `acme`). Если пуст — выведи из имени директории / package-манифеста и подтверди в Phase 2.

---

## Phase 1: Discovery (silent, без вопросов)

За 5-10 tool calls составь картину проекта. **Никаких вопросов и файлов в этой фазе** — только чтение.

Запускай параллельно где можно:

1. **Структура корня:** `ls -la`. Маркеры стека: `package.json`, `tsconfig.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`, `composer.json`.
2. **Документация:** прочитай `CLAUDE.md`, `AGENTS.md`, `README.md` (top-level) — источник правды по стеку и правилам.
3. **Monorepo/workspace?** `find . -maxdepth 3 -name "package.json" -not -path "*/node_modules/*"` (≥2 → монорепо); `.git`-каталоги (≥2 → workspace независимых репо).
4. **Backend:** NestJS (`@nestjs/core`) / Express / Fastify / Hono / Nitro / Django / Flask / FastAPI / Go / Rails.
5. **Frontend:** `nuxt` / `next` / `react` / `vue` / `svelte` / `@angular/core`. Версии важны (Vue 2 vs 3 — разные стеки).
6. **БД и ORM/клиент:** TypeORM / Prisma / Drizzle / Sequelize / SQLAlchemy / GORM / supabase-js. Аналитика: ClickHouse / BigQuery / Snowflake.
7. **Тесты:** Jest / Vitest / Playwright / Cypress / Pytest / RSpec.
8. **CI:** `.github/workflows/`, `.gitlab-ci.yml`, `circleci/`.
9. **Команды:** dev / build / typecheck / test / migrations — из `scripts` манифеста.
10. **Особенности:** legacy в подпапках, BFF-слои, отдельные admin/customer фронты, файловое хранилище (S3/совместимое), realtime.

**Сведи плейсхолдеры шаблонов** (`${CLAUDE_PLUGIN_ROOT}/agents/*.md`) к фактам проекта:
`{{FRONTEND_FRAMEWORK}}` · `{{BACKEND}}` · `{{DATABASE}}` · `{{FILE_STORAGE}}` · `{{BUILD_CMD}}` · `{{TYPECHECK_CMD}}` · `{{TEST_RUNNER}}` · `{{E2E_TOOL}}`. Если чего-то нет в проекте — роль/секцию опусти (нет ORM → у `db` другой акцент; нет фронта → нет `front`).

**Output Phase 1** — сжатый блок (10-15 строк): Project type / Backend / Frontend / DB+ORM / Aux (CH/Redis/RMQ/S3/realtime) / Tests / CI / Commands / Quirks / Existing CLAUDE.md / Suspected project name.

---

## Phase 2: Interactive Decisions

**Не пропускай.** Задавай через `AskUserQuestion`, по ≤4 вопроса за вызов. Каждый ответ влияет на план. Для каждого давай рекомендованный дефолт первым.

### Q1. Имя проекта (если `$ARGUMENTS` пуст)
Короткое имя для charter/промптов. Опции: detected name / dir name / custom.

### Q2. Состав команды
- **Compact (4-5):** `architect` · `<impl>` (1-2 под стек) · `tester` · `reviewer`. Для небольших/одно-слойных проектов.
- **Standard (6):** `architect` · `db` · `front` · `tester` · `reviewer` · `explorer`. Дефолт для fullstack.
- **Extended (9):** Standard + cross-cutting `devops` · `product` · `auditor`. Для зрелых продуктов с prod-гейтами, UX и проактивным perf/security-аудитом.

Рекомендация — **Standard**, **Extended** если discovery выявил CI/deploy + публичную часть + накопленный backlog. Адаптируй impl-роли под стек (нет фронта → убери `front`; есть аналитика → добавь `analytics`).

### Q3. Intake / автономность
Как команда принимает задачи (это управляет `reference/intake-protocol.md`):
- **Автопилот с асимметрией (рекомендую)** — проектирование совместно с пользователем (design brief → approval-гейт), реализация автономно, вопросы только на необратимых развилках.
- **Подтверждение каждой фазы** — больше контроля, медленнее.
- **Полная автономия + финальный review** — минимум вопросов.

### Q4. Memory baseline (multi-select)
Что преднаполнить в `memory/`:
- Project map & entry points (рекомендую)
- Commands (dev/test/build/migrations)
- Safety rules (что не делать)
- Domain invariants (если есть — RLS/тенант/деньги)

### Q5. Codex second-opinion
- **Yes** — read-only consult на gate-точках (reviewer/architect/db) + execution lane по двум триггерам, через плагин `codex@openai-codex` + `reference/codex-consult.md`. Рекомендую, если установлен codex-плагин / есть подписка.
- **No** — пропустить (можно добавить позже; charter оставит секцию-заглушку).

### Q6. Форма вывода
- **Plugin-linked (рекомендую)** — charter+агенты в `.claude/` проекта, движок и reference из плагина `qtim` (`/qtim:team-up` и т.д.). Один источник истины, нет дрейфа. Требует установленного плагина.
- **Standalone** — дополнительно скопировать `commands/*` и `reference/*` в `.claude/` проекта. Самодостаточно (работает без плагина), но обновления движка вручную.

### Q7. Hooks-гейты (multi-select)
- PostToolUse: после правок кода — напоминание/запуск `{{TYPECHECK_CMD}}` (не блокирующий, рекомендую)
- SubagentStop: напоминание проверить артефакты роли
- SessionStart: анонс «команда настроена, /qtim:team-up» (рекомендую)

---

## Phase 3: Plan Confirmation

Покажи компактный план (≤30 строк): имя проекта, форма вывода, стек (detected), состав (N ролей с subagent_type и model), memory-файлы, codex yes/no, intake-режим, hooks, список генерируемых файлов. Спроси «Подтверждаешь? (yes / правки)». При правках — обнови и переспроси. **Ничего не пишем до подтверждения.**

---

## Phase 4: Generation

Создавай файлы параллельно где можно.

### 4.1 Charter — `.claude/team-charter.md`
Конкретный под проект. Разделы:
- Шапка с версией (1.0) + дата.
- **Назначение** — что за продукт (из Discovery + ответов).
- **Стек (фиксированный)** — реальные фреймворки/команды.
- **Состав** (по Q2) — таблица ролей: `subagent_type`, `mission`, `triggers`, `do-not-touch`, `read on spawn`, `skills`, `mandatory practices`. Имена ролей зафиксированы (задачи привязаны к `owner`).
- **Доменные инварианты** — если выявлены (тенант-изоляция, RLS, деньги, переходы состояний). Это то, что `reference/*` называет «инварианты проекта».
- **Codex second-opinion** (если Q5=Yes) — gate-точки + ссылка на `reference/codex-consult.md`.
- **Правила работы** — коммуникация (`SendMessage`), задачи (`Task*`), anti-patterns. Канон рантайма (упразднённость `TeamCreate`/`team_name`) — указатель на `commands/team-up.md`.
- **Файлы памяти** — структура `memory/`.

### 4.2 Агенты — `.claude/agents/<role>-agent.md`
Для каждой impl/специализированной роли из Q2: возьми шаблон из `${CLAUDE_PLUGIN_ROOT}/agents/<role>-agent.md`, **подставь плейсхолдеры** (Phase 1) на реальные команды/фреймворки, конкретизируй доменные инварианты из charter. Сохрани frontmatter (`name`, `description` с example-блоками, `model`, `tools`, `memory`). `explorer` → `subagent_type: Explore` (свой файл обычно не нужен). `devops`/`product`/`auditor` → `general-purpose`, если не нужен выделенный тип.

Соответствие шаблонов: `architect-agent`, `database-agent`, `frontend-agent`, `testing-agent`, `reviewer-agent`. Под другой стек переименуй impl-роль (`backend-agent`/`analytics-agent`), но сохрани каркас шаблона.

### 4.3 Settings + hooks — `.claude/settings.local.json`
Создай/смёржи (не затирай существующий — Read, потом дополни):
- `env`: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"`.
- `hooks` по Q7. **PostToolUse — не блокирующий** (echo-напоминание о `{{TYPECHECK_CMD}}` после `Edit`/`Write`/`MultiEdit`, не запуск долгого typecheck на каждый кейстрок; либо `async`). SubagentStop — напоминание проверить артефакты. SessionStart — анонс.
- `permissions.deny` baseline: `.env*`, `~/.ssh/**`, `Bash(rm -rf:*)`, `Bash(sudo:*)`, `Bash(git push --force:*)`.

### 4.4 Memory baseline (по Q4) — `memory/`
`MEMORY.md` (индекс) + выбранные файлы (project map / commands / safety / invariants). Каждый — frontmatter `name`/`description`/`metadata.type`.

### 4.5 CLAUDE.md
Если есть — добавь короткую секцию «Команда агентов» (указатель на `.claude/team-charter.md` + `/qtim:team-up` / `/qtim:team-lazy`). Если нет — предложи создать. Это единственный авто-загружаемый файл, без указателя из него команда не обнаружима в direct-сессии.

### 4.6 Standalone (только если Q6=Standalone)
Скопируй `${CLAUDE_PLUGIN_ROOT}/commands/{team-up,team-lazy,team-down}.md` → `.claude/commands/` и `${CLAUDE_PLUGIN_ROOT}/reference/*` → `.claude/reference/`, поправив относительные ссылки.

---

## Phase 5: Verification & Handoff

Покажи пользователю: что создано (по разделам), как пользоваться (`/qtim:team-up` для эпика, `/qtim:team-lazy` для лёгких задач, `/qtim:team-down` для сворачивания), и действия от него (если Codex Yes — проверить `codex --version`; запустить команду на маленькой задаче). Напомни: содержимое агентов и charter — обычный markdown, правится вручную; при правках держи charter источником истины.

---

## Critical Rules

1. **Ничего не пишем до Phase 3 (Plan Confirmation).** Discovery — только текстовый вывод.
2. **Не делегируй фазы другим агентам** — setup делаешь ты сам как team-lead. Делегирование начнётся, когда созданная команда будет вызвана.
3. **Не запускай** lint/tests/migrations/git в процессе setup — только чтение и запись markdown/json.
4. **Если CLAUDE.md/AGENTS.md есть** — они источник правды для project-specific правил.
5. **Существующие `.claude/agents/`** не удаляй — дополняй; при коллизии имён спроси (rebuild / skip / переименовать).
6. **Adapt to stack** — не тащи чужую специфику; подставляй плейсхолдеры под реальный стек, лишние роли опускай.
7. **Не пиши emoji** в файлах, если пользователь не попросил.
8. **Канон рантайма** — никаких `TeamCreate`/`TeamDelete`/`team_name`; team-lead = сессия, не агент.
