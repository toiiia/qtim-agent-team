# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это за репозиторий

Маркетплейс плагинов Claude Code с единственным плагином `qtim` — движком bootstrap и оркестрации команды специализированных субагентов под любой проект. Исполняемого кода, сборки и тестов здесь нет: репозиторий целиком состоит из markdown-промптов и JSON-манифестов. «Код» — это промпты; правки к ним предъявляют те же требования консистентности, что и к коду.

Весь контент — на русском языке. Коммиты — conventional commits с русским описанием: `feat(setup): …`, `docs(readme): …`, `fix: …`, `chore: …`. При содержательных изменениях плагина бампай `version` в `plugins/qtim/.claude-plugin/plugin.json`.

## Структура

- `.claude-plugin/marketplace.json` — манифест маркетплейса, регистрирует плагин из `./plugins/qtim`.
- `plugins/qtim/commands/` — slash-команды `/qtim:*`: `setup` (генератор команды под проект, первый вопрос — роль пользователя), `feature` (PM-конвейер «хотелка → план»), `design` (дизайн-конвейер «пустая папка → направления → прототип → экраны → DS → handoff»), `team-up` / `team-lazy` / `team-down` (движок), `team-sync` (миграция собранной команды на новую версию плагина), `team-retro` (дистилляция уроков эпика в память), `onboard` (глубокое наполнение memory/ инженерной линзой), `product-onboard` (продуктовая память: разделы/акторы/словарь/аналитика), `doctor` (диагностика + сопоставление состава команды с фактами репозитория).
- `plugins/qtim/templates/roles/` — generic-шаблоны ролей (`architect`, `database`, `frontend`, `testing`, `reviewer`, `product`; дизайн-трек — `designer`, `proto`, `ds`, `reviewer-design`) с плейсхолдерами `{{...}}`. **Каталог намеренно не называется `agents/`:** рантайм регистрирует `plugins/<name>/agents/*` как готовых субагентов плагина, и шаблоны с неподставленными `{{...}}` оказались бы вызываемыми в любом проекте ещё до `/qtim:setup` — а после него дублировали бы сгенерированные роли.
- `plugins/qtim/reference/` — переносимая механика: `intake-protocol.md`, `orchestration-patterns.md`, `codex-consult.md`, `feature-pipeline.md` (механика PM-конвейера), `design-pipeline.md` (контракты дизайн-конвейера), `migrations.md` (реестр миграций для team-sync), `runtime-compat.md` (журнал замеров поведения рантайма по версиям CLI). Это supporting-docs, НЕ slash-команды.
- `plugins/qtim/workflows/` — готовые параметризованные Workflow-скрипты (`ensemble-review.mjs`, `access-audit.mjs`, `flaky-hunt.mjs`); запуск по `scriptPath` из каталога плагина, opt-in пользователя обязателен; ESM, без `Date.now()`/`Math.random()` (ломают resume).
- `plugins/qtim/skills/` — собственные скилы плагина (`debug-loop`, `prototype`, `brainstorm`, `grill`, `minimal-diff`, `codex-consult`, `design-prototype`): дисциплины и протоколы, доступные и team-lead'у, и субагентам через `Skill` как `qtim:<skill>` — в отличие от `reference/*` (только team-lead) и внешних скилов из окружения (наличие не гарантировано, ссылки только fail-soft «если доступен»). При Standalone копируются в `.claude/skills/` проекта с локализацией имён (setup 4.6). Движковой orchestration-логики в скилах быть не должно — их читают субагенты.
- `plugins/qtim/hooks/` — hooks плагина: `hooks.json` + `session-start.sh` (SessionStart-анонс при наличии charter + детектор дрейфа версий charter↔плагин; SubagentStop-напоминание про артефакты — advisory). Всё, что здесь, действует во **всех** проектах с charter, поэтому блокирующего среди них нет.
- `plugins/qtim/templates/hooks/` — hook-скрипты, которые setup копирует в проект (`screenshots-gate.sh`). Здесь живёт всё **блокирующее**: гейт включается пользователем (Q7), лежит в его `.claude/`, там же и выключается. Правило для любого нового: объективная проверка вместо доверия отчёту роли, выполнимое действие в stderr, счётчик попыток — обоснование в `reference/runtime-compat.md`.
- `examples/` — golden-референсы сгенерированного: `nuxt-supabase/` (dev-состав) и `greenfield-design/` (дизайн-состав, пустая папка, DS-target deferred). При правке шаблонов `templates/roles/` или структуры charter (setup 4.1) обнови **каждый эталон, содержащий затронутые роли**, и сверь дифф; CI проверяет отсутствие плейсхолдеров в examples и семантику обоих charter.

## Архитектура: движок vs генерируемое

Центральное разделение, на котором держится плагин:

- **Движок живёт в плагине** и в проекты не копируется: команды `team-up`/`team-lazy`/`team-down`, `reference/*` и `skills/*` доступны целевому проекту из `${CLAUDE_PLUGIN_ROOT}`. Единственное исключение — Standalone-режим setup (Q6), когда движок копируется в `.claude/` проекта.
- **`/qtim:setup` генерирует только проект-специфичное** в целевом проекте: `.claude/team-charter.md` (контракт команды — источник истины по составу ролей), `.claude/agents/<role>-agent.md`, `.claude/settings.local.json`, `memory/`.

Шаблоны в `templates/roles/` — generic: плейсхолдеры `{{FRONTEND_FRAMEWORK}}`, `{{BACKEND}}`, `{{DATABASE}}`, `{{FILE_STORAGE}}`, `{{BUILD_CMD}}`, `{{TYPECHECK_CMD}}`, `{{TEST_RUNNER}}`, `{{E2E_TOOL}}`, `{{TOKENS_PATH}}`, `{{SHOWCASE_CMD}}` подставляет генератор setup под стек целевого проекта. При правке шаблонов сохраняй frontmatter (`name`, `description` с example-блоками, `model`, `color`, `memory`, `tools`) и стиль плейсхолдеров; специфику конкретного стека в шаблоны не тащить.

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

## Версионирование и миграции сгенерированного

Сгенерированное в проектах (charter, агенты, settings) не обновляется вместе с плагином — за стык версий отвечают три точки с общим контрактом:

- **Штамп** `generated-by: qtim v<версия> · mode: <plugin-linked|standalone>` в шапке charter: пишет setup (4.1), читает `hooks/session-start.sh` (детектор дрейфа) и `/qtim:team-sync` (диапазон миграций). Формат строки менять только синхронно во всех трёх точках.
- **Backward-tolerant движок:** новое ожидание движка от charter — всегда с fallback на дефолт; старый charter не должен ломать новый team-up/team-lazy.
- **Правка, меняющая сгенерированное** (шаблоны `templates/roles/`, структура charter в setup 4.1, settings/hooks-baseline), обязана: добавить запись `## → <версия>` в `reference/migrations.md`, строку «team-sync: требуется/рекомендуется» в CHANGELOG и минорный бамп версии. Первое из трёх проверяет CI (`check_migrations.py`) — строка в CHANGELOG и бамп по-прежнему на авторе. Правки только движка (`commands/*` кроме структуры charter в setup 4.1, `reference/*` кроме migrations) миграции не требуют — Plugin-linked проекты получают их автоматически.

## Прочие инварианты контента

- `commands/*.md` и `reference/*` читает **только team-lead**: orchestration-логика не должна попадать в промпты субагентов (риск рекурсии). Шаблоны `templates/roles/` — наоборот, промпты субагентов: движковой логики там быть не должно. Роли получают переносимую механику через **скилы** (`skills/*`), а не через reference: так граница держится инструментом, а не обещанием, и не требует машинозависимых путей в charter. Прецедент 1.12.0 — consult-часть `codex-consult.md` выделена в скил `qtim:codex-consult`, в reference осталась только оркестрация (каналы, dual-adversary, execution lane).
- Codex-протокол (consult-часть — скил `skills/codex-consult/`, оркестрация — `reference/codex-consult.md`): advisory (доменный инвариант проекта > совет codex), consult всегда read-only (`-s read-only`), fail-soft (недоступность codex не блокирует эпик), execution lane — отдельная полоса ровно с двумя триггерами. Для money/security-кода — нейтральные defect-review формулировки, сырой вывод codex в тред не ретранслируется.
- **Механизм платформы предпочитаем самодельному, но только после замера.** Доставка контекста ролям стоит на трёх каналах рантайма: `@`-импорт charter из `CLAUDE.md` (setup 4.5), `.claude/rules/` с `paths:` (4.5a), hooks. У каждого есть граница, которую видно только в замере, а не в документации: `paths`-правило поднимается на `Read` и **не** поднимается на `Bash` (`git diff`, `cat`), `CLAUDE.md` не доходит до `Explore`/`Plan`, а `exit 2` возвращает роль в работу, подменяя ей задачу текстом из stderr. Поэтому инструкции ролям («прочитай charter на спавне», чеклист `reviewer`) механизмами не заменяются, а страхуются ими. Замеры и процедура — [`reference/runtime-compat.md`](plugins/qtim/reference/runtime-compat.md).
- Скил, адаптированный из стороннего, требует двух вещей: строки атрибуции в шапке `SKILL.md`
  (что адаптировано, откуда, под какой лицензией) **и** записи в [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)
  с полным copyright и permission notice апстрима — MIT требует их при распространении, одной
  ссылки в шапке недостаточно.
- Декоративные emoji не добавлять; статус-маркеры (❌ anti-pattern, галки чеклистов) допустимы.

## Проверка изменений

CI (`.github/workflows/validate.yml`) на каждый push/PR: валидность JSON, запрет call-синтаксиса упразднённых примитивов (`TeamCreate(` / `TeamDelete(` / `team_name:`) в `plugins/` **и** `examples/`, синтаксис **всех** hook-скриптов (`sh -n` по `find plugins/qtim -name '*.sh'`, включая `templates/hooks/`; ноль найденных файлов = fail, иначе проверка деградирует молча), плейсхолдеры шаблонов по белому списку + детектор несбалансированных скобок, их отсутствие в `examples/` включая `*.json` (`.github/scripts/check_placeholders.py`), целостность относительных ссылок (`.github/scripts/check_links.py`), **резолвимость ссылок на скилы** (`.github/scripts/check_skill_refs.py` — `name:` во frontmatter равен каталогу, каждое `qtim:<name>` без слэша в `plugins/` и `examples/` резолвится в скил или команду; опечатка в имени скила иначе молча отключает пункт чеклиста роли), **семантику golden-эталона** (`.github/scripts/check_golden.py` — обязательные секции и штамп версии charter, `name`/`model`/`tools`/`memory` во frontmatter ролей, `Skill` у ролей со скилами, наличие `agent-memory/<role>/MEMORY.md`, строки схемы отчёта `reviewer`), **обязательность записи в реестр миграций** (`.github/scripts/check_migrations.py` — правка `templates/**` или Phase 4 `setup.md` без записи `## → <версия>` роняет сборку; нужен `fetch-depth: 0`), Workflow-скрипты (`.github/scripts/check_workflows.mjs` — AsyncFunction-парсинг, как в движке Workflow: top-level return/await легальны, обычный `node --check` тут даёт ложный fail; плюс лексический запрет `Date.now()`/`Math.random()`/безаргументного `new Date()` — ломают resume). Локально — те же скрипты плюс руками:

- Валидность JSON: `python3 -m json.tool .claude-plugin/marketplace.json plugins/qtim/.claude-plugin/plugin.json plugins/qtim/hooks/hooks.json`.
- Канон рантайма: `grep -rn "TeamCreate\|TeamDelete\|team_name" plugins/ examples/` — вхождения только в контексте «упразднено».
- Кросс-ссылки между `commands/` и `reference/` не битые.
- Ручная проверка установки: `/plugin marketplace add toiiia/qtim-agent-team` → `/plugin install qtim@qtim-agent-team`; рантайму нужен флаг `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` в `settings.json`.

## Чеклист при обновлении Claude Code

Плагин привязан к экспериментальному рантайму Agent Teams — при апгрейде CLI перепроверь:

- имена инструментов в `tools:` frontmatter шаблонов `templates/roles/` — инструменты появляются и упраздняются (прецедент: `MultiEdit` слит в `Edit`). Набор, который роль реально получает, зависит не от whitelist, а от того, кем она поднята: [фоновый субагент](https://code.claude.com/docs/en/sub-agents#available-tools) теряет всё сверх фиксированного набора **включая заявленное в `tools:`**, тиммейт вдобавок сохраняет `Task*`/`Cron*`. Действующие правила: `Skill` роль получает только если он в её `tools:` — роли со ссылками на скилы обязаны его перечислять; `tools:` считаем allowlist'ом, но не гарантией; проверяем **только фактическим вызовом**. Процедура замера и журнал наблюдений по версиям — [`reference/runtime-compat.md`](plugins/qtim/reference/runtime-compat.md);
- поведение hooks: какие события инжектят stdout в контекст модели (SessionStart — да), а какие видны только в transcript (SubagentStop);
- поле `memory` frontmatter агентов и путь agent-memory (`user` → `~/.claude/agent-memory/<agentType>/`, `project` → `.claude/agent-memory/<agentType>/`, `local` → `.claude/agent-memory-local/<agentType>/`). **Рантайм при этом сам инжектит в промпт роли блок агентской памяти** — типы записей, формат файлов, `MEMORY.md` как индекс, лимит на него: шаблоны `templates/roles/` не должны его дублировать и тем более противоречить ему (прецедент 1.12.0 — свой блок диктовал другой формат и несуществующие лимиты). Проверять эмпирически: спавн роли + просьба процитировать эту часть системного промпта;
- канон «Модели оркестрации» в `commands/team-up.md` — не изменились ли примитивы рантайма;
- при смене поколения моделей — перечитай шаблоны `templates/roles/` с вопросом «какие инструкции компенсируют слабости прошлых моделей» (пошаговые рецепты, разжёванные детали): компенсирующий скаффолдинг выпиливай, инварианты оставляй; `model:` в шаблонах — **явный тир алиасом** (`opus` интеллект-ёмким ролям, `sonnet`/`haiku` механическим), не `inherit` (привязал бы роль к модели сессии team-lead'а) и не ID поколения (`claude-opus-5`) — алиас едет на актуальную модель тира сам. При появлении модели вне тир-неймспейса раскладку пересматривать руками.
