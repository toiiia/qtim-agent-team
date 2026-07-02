---
description: Развернуть команду субагентов под стек текущего проекта (charter + агенты + hooks). Движок (team-up/lazy/down + reference) приходит из плагина qtim.
argument-hint: [опционально имя проекта для charter, например "acme"]
---

# Agent Team Setup

Ты — **bootstrap-инженер**: разворачиваешь команду субагентов под проект в текущей рабочей директории, поверх плагина `qtim`. Работа делится на 5 фаз — выполняй строго по порядку, **не пропускай Phase 2 (вопросы пользователю)**.

> **Что генерируешь vs что даёт плагин.** Команды движка (`team-up`/`team-lazy`/`team-down`) доступны как slash-команды `/qtim:*`, а переносимая механика (`reference/intake-protocol.md`, `orchestration-patterns.md`, `codex-consult.md`) живёт в `${CLAUDE_PLUGIN_ROOT}/reference/` как supporting-docs (НЕ slash-команды). И то и другое — **не копируешь**. Ты генерируешь только проект-специфичное: `team-charter.md`, определения субагентов под стек, baseline-hooks и память. Шаблоны ролей бери из `${CLAUDE_PLUGIN_ROOT}/agents/*.md` и подставляй плейсхолдеры под выявленный стек.

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

**Output Phase 1** — сжатый блок (10-15 строк): Project type / Backend / Frontend / DB+ORM / Aux (CH/Redis/RMQ/S3/realtime) / Tests / CI / Commands / Quirks / Existing CLAUDE.md / Suspected project name. Плюс черновой список Skill & plugin candidates (детально — Phase 1b).

---

## Phase 1b: Skill & plugin matching (silent)

После Discovery сопоставь выявленный стек с доступными расширениями. **Ничего не пишешь** — формируешь кандидатов для Phase 2/3.

### Skills под стек — три источника (по возрастанию стоимости)
Подбирай в этом порядке, деградируя gracefully если канал недоступен:

1. **Уже установленные** (локально, без сети) — skills, видимые в системном контексте сессии (project `.claude/skills/`, user `~/.claude/skills/`, плагинные). Дефолтный и **единственный офлайн-доступный** слой: матчишь по смыслу с обнаруженным стеком, ничего не качаешь.
2. **Онлайн-реестр skills.sh** (требует **сети + `npx`/Node**) — если установленного мало, расширь через `find-skills` → `npx skills find <query>`. Это поиск по **внешней** экосистеме (skills.sh + GitHub), НЕ по локальным папкам. Перед рекомендацией проверь репутацию (install count 1K+, источник, GitHub stars); установка — `npx skills add owner/repo@skill`. В **headless/cron/офлайне этот слой пропусти**.
3. **Плагины/MCP** — отдельный канал (см. ниже), с реестром skills.sh не пересекается.

Эвристика маппинга стек→skills (применяется к слоям 1-2; адаптируй под реально доступное — набор зависит от окружения):

| Маркер стека | Кандидаты skills |
|---|---|
| Nuxt / Vue 3 | `nuxt`, `nuxt4-patterns`, `frontend-design` |
| Next / React | react/next-skills если доступны, `frontend-design` |
| TypeScript | `typescript-expert` |
| Postgres / Supabase | `postgres`, `supabase`, `supabase-postgres-best-practices`, `query-optimization` |
| NestJS | `nestjs-patterns`, `api-design`, `auth`, `dto-design`, `error-handling`, `security-hardening` |
| Playwright / Cypress | `e2e-testing` |
| Vitest / Jest / Pytest | `unit-testing`, `test-coverage` |
| Перф-чувствительный | `performance`, `query-optimization` |
| Публичная часть / маркетинг | `seo-audit`, `ai-seo`, `schema` |
| UI/UX акцент | `ui-ux-pro-max`, `web-design-guidelines` |
| Все роли (universal) | `using-superpowers`, `karpathy-guidelines` — только если реально доступны в сессии; `brainstorming` / `grill-me` — architect |

Каждый кандидат привяжи к роли (в чьём `skills`-поле он окажется). По умолчанию опирайся на слой 1; слои 2-3 — только если установленного мало И есть сеть/согласие пользователя.

### Плагины / MCP под стек (третий канал, отдельный от skills.sh)
Это НЕ то же, что реестр skills.sh выше — `find-skills` его не видит. Сопоставь стек с маркетплейсом плагинов и реестром MCP (требуют **сети + интерактива**). Источник — официальный каталог (`/plugin marketplace`) и `search_mcp_registry` / `suggest_connectors` из mcp-registry; если недоступны — опирайся на известные сопоставления ниже:

| Стек / выбор | Плагин или MCP | Источник |
|---|---|---|
| Supabase | `supabase@claude-plugins-official` | официальный |
| Codex выбран (Q5=Yes) | `codex@openai-codex` | официальный |
| Акцент на UI/UX | `ui-ux-pro-max` | marketplace |
| Security-focus | `security-guidance@claude-plugins-official` | официальный |
| Интеграции (Notion / Slack / Linear / …) | соответствующий MCP-коннектор | mcp-registry |

**Не устанавливай сам** — `/plugin` и подключение MCP интерактивны. Готовь список рекомендаций с командами установки для Phase 5.

**Output Phase 1b** (для плана): `skills по ролям` + `рекомендованные плагины/MCP` с однострочным обоснованием каждого.

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
- SubagentStop: напоминание проверить артефакты роли — **только при Q6=Standalone** (в Plugin-linked такой hook уже даёт плагин, второй продублирует echo)
- SessionStart: анонс «команда настроена, /qtim:team-up» — **только при Q6=Standalone** (аналогично, у плагина уже есть)

### Q8. Skills и плагины под стек (multi-select)
Покажи подобранное в Phase 1b и дай подтвердить/снять:
- Вписать рекомендованные skills в роли charter (рекомендую)
- Показать рекомендации плагинов/MCP с командами установки в финале (рекомендую)
- Пропустить автоподбор (роли остаются только с universal-skills)

---

## Phase 3: Plan Confirmation

Покажи компактный план (≤30 строк): имя проекта, форма вывода, стек (detected), состав (N ролей с subagent_type и model), memory-файлы, codex yes/no, intake-режим, hooks, подобранные skills (по ролям), рекомендованные плагины/MCP, список генерируемых файлов. Спроси «Подтверждаешь? (yes / правки)». При правках — обнови и переспроси. **Ничего не пишем до подтверждения.**

---

## Phase 4: Generation

Создавай файлы параллельно где можно.

### 4.1 Charter — `.claude/team-charter.md`
Конкретный под проект. Разделы:
- Шапка с версией (1.0) + дата.
- **Назначение** — что за продукт (из Discovery + ответов).
- **Стек (фиксированный)** — реальные фреймворки/команды.
- **Состав** (по Q2) — таблица ролей: `subagent_type`, `mission`, `triggers`, `do-not-touch`, `read on spawn`, `skills`, `mandatory practices`. Имена ролей зафиксированы (задачи привязаны к `owner`).
- **Intake-режим** (по Q3) — выбранный стиль участия пользователя: автопилот с асимметрией / подтверждение каждой фазы / полная автономия. Эти дефолты читает `reference/intake-protocol.md`.
- **Доменные инварианты** — если выявлены (тенант-изоляция, RLS, деньги, переходы состояний). Это то, что `reference/*` называет «инварианты проекта».
- **Codex second-opinion** (если Q5=Yes) — gate-точки + путь к протоколу `codex-consult.md`. **Путь записывай абсолютным** — тем реальным каталогом `reference/` плагина, который ты видишь в этом файле: плейсхолдер плагин-рута в сгенерированных файлах не резолвится, а субагенты читают протокол именно по пути из charter. При Q6=Standalone путь тоже абсолютный, но к локальной копии `.claude/reference/codex-consult.md`.
- **Правила работы** — коммуникация (`SendMessage`), задачи (`Task*`), anti-patterns, **фактический список universal skills** (только проверенные на доступность в сессии — его подставляет team-up в промпт спавна). Канон рантайма (упразднённость `TeamCreate`/`team_name`) — указатель на `/qtim:team-up`, не дублировать.
- **Файлы памяти** — структура `memory/`.

### 4.2 Агенты — `.claude/agents/<role>-agent.md`
Для каждой impl/специализированной роли из Q2: возьми шаблон из `${CLAUDE_PLUGIN_ROOT}/agents/<role>-agent.md`, **подставь плейсхолдеры** (Phase 1) на реальные команды/фреймворки, конкретизируй доменные инварианты из charter. Сохрани frontmatter (`name`, `description` с example-блоками, `model`, `color`, `tools`, `memory`). `explorer` → `subagent_type: Explore` (свой файл обычно не нужен). `devops`/`product`/`auditor` → `general-purpose`, если не нужен выделенный тип.

Соответствие шаблонов: `architect-agent`, `database-agent`, `frontend-agent`, `testing-agent`, `reviewer-agent`. Под другой стек переименуй impl-роль (`backend-agent`/`analytics-agent`), но сохрани каркас шаблона.

Впиши подтверждённые (Q8) skills в `skills`-поле каждой роли — и в charter-таблицу (4.1), и в напоминание промпта при спавне (universal skills из charter + подобранные специальные под роль). Universal skills включай только реально доступные в сессии — mandatory-invoke несуществующего skill ломает старт роли. Skill попадает в ту роль, к которой привязан в Phase 1b.

**Стек-условные блоки шаблонов** (политики доступа уровня строк, файловое хранилище/presign, realtime-подписки, scope-канон состояния, httpOnly-сессии) оставляй только при наличии соответствующей технологии в стеке — лишнее вырезай целиком, не оставляй «пустых» требований. Безусловное ядро: типы/zero-any, идемпотентность миграций, индексы, no-hardcode, loading/empty/error, real-browser sweep.

**Model по ролям:** шаблонное `model: opus` — дефолт, переопределяй по роли и бюджету (architect/reviewer/db — топ-tier; tester/explorer допустимо дешевле). Выбор фиксируй в charter-таблице.

**Каркасы cross-cutting ролей** (файлов-шаблонов нет — генерируй по скелету, без движковой orchestration-логики):
- `devops` — mission: CI/CD, окружения, ENV/секреты, deploy-гейты. Triggers: релиз, изменение workflow/инфры. Do-not-touch: прод-секреты в открытом виде, ручные правки прод-БД.
- `product` — mission: UX-аудит фич, discoverability, тексты. Gate-точка: UX-аудит после релиза эпика (codex-consult, роль `product`). Do-not-touch: код.
- `auditor` — mission: проактивный security/perf-аудит. Gate-точка: старт аудита (codex-consult, роль `auditor`). Вывод: findings в `memory/` + `TaskCreate` исполнителям; код не правит.

**Agent-memory:** для каждой роли с включённой памятью (frontmatter `memory`) создай пустой `.claude/agent-memory/<role>-agent/MEMORY.md` (заголовок + строка «пока пусто») — иначе первый спавн роли шумит ошибкой чтения несуществующего файла.

### 4.3 Settings + hooks — `.claude/settings.local.json`
Создай/смёржи (не затирай существующий — Read, потом дополни):
- `env`: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"`.
- `hooks` по Q7. **PostToolUse — не блокирующий** (echo-напоминание о `{{TYPECHECK_CMD}}` после `Edit`/`Write`, не запуск долгого typecheck на каждый кейстрок; либо `async`). SubagentStop/SessionStart — генерируй только при Q6=Standalone: в Plugin-linked их уже даёт `hooks.json` плагина, не дублируй.
- `permissions.deny` baseline (каждое правило — строго формат `Tool(паттерн)`, голый glob невалиден и молча игнорируется): `Read(./.env*)`, `Edit(./.env*)`, `Read(~/.ssh/**)`, `Edit(~/.ssh/**)`, `Bash(rm -rf:*)`, `Bash(sudo:*)`, `Bash(git push --force:*)`.

### 4.4 Memory baseline (по Q4) — `memory/`
`MEMORY.md` (индекс) + выбранные файлы (project map / commands / safety / invariants). Каждый — frontmatter `name`/`description`/`metadata.type`.

### 4.5 CLAUDE.md
Если есть — добавь короткую секцию «Команда агентов» (указатель на `.claude/team-charter.md` + `/qtim:team-up` / `/qtim:team-lazy`). Если нет — предложи создать. Это единственный авто-загружаемый файл, без указателя из него команда не обнаружима в direct-сессии.

### 4.6 Standalone (только если Q6=Standalone)
Скопируй `${CLAUDE_PLUGIN_ROOT}/commands/{team-up,team-lazy,team-down}.md` → `.claude/commands/` и `${CLAUDE_PLUGIN_ROOT}/reference/*` → `.claude/reference/`, поправив относительные ссылки. В сгенерированных файлах (charter, hooks) команды указывай локальными именами (`/team-up` вместо `/qtim:team-up`), а путь к протоколу codex-consult — абсолютным, на локальную копию `.claude/reference/codex-consult.md`.

---

## Phase 5: Verification & Handoff

Покажи пользователю: что создано (по разделам), как пользоваться (`/qtim:team-up` для эпика, `/qtim:team-lazy` для лёгких задач, `/qtim:team-down` для сворачивания), и действия от него (если Codex Yes — проверить `codex --version`; запустить команду на маленькой задаче). Напомни: содержимое агентов и charter — обычный markdown, правится вручную; при правках держи charter источником истины.

**Если Q8 включил плагины** — выведи блок «Рекомендованные плагины/MCP под стек» с готовыми командами установки (`/plugin marketplace add …` + `/plugin install …@…`; для MCP — соответствующее подключение) и однострочным обоснованием каждого. Явно пометь, что установка за пользователем (эти команды интерактивны, сам их не выполняешь).

---

## Critical Rules

1. **Ничего не пишем до Phase 3 (Plan Confirmation).** Discovery — только текстовый вывод.
2. **Не делегируй фазы другим агентам** — setup делаешь ты сам как team-lead. Делегирование начнётся, когда созданная команда будет вызвана.
3. **Не запускай** lint/tests/migrations/git в процессе setup — только чтение и запись markdown/json.
4. **Если CLAUDE.md/AGENTS.md есть** — они источник правды для project-specific правил.
5. **Существующие `.claude/agents/`** не удаляй — дополняй; при коллизии имён спроси (rebuild / skip / переименовать).
6. **Adapt to stack** — не тащи чужую специфику; подставляй плейсхолдеры под реальный стек, лишние роли опускай.
7. **Не пиши декоративные emoji** в файлах, если пользователь не попросил. Статус-маркеры в чеклистах/таблицах (галки pass/fail, пометки anti-pattern) — допустимы, это не декор.
8. **Канон рантайма** — никаких `TeamCreate`/`TeamDelete`/`team_name`; team-lead = сессия, не агент.
