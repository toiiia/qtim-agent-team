# Changelog

Версии соответствуют `version` в `plugins/qtim/.claude-plugin/plugin.json` (semver). Пометка «team-sync» у версии говорит, нужно ли в собранных проектах запускать `/qtim:team-sync` (реестр миграций — `plugins/qtim/reference/migrations.md`).

## 1.7.0 — 2026-07-03

> team-sync: рекомендуется командам с PM-дорожкой — обновит шаблон роли `product` и read-on-spawn в charter под продуктовую память; dev-only команды работают без изменений (standalone-форме — только докопировать `product-onboard.md` в движковую копию). Перечень — `reference/migrations.md`, запись «→ 1.7.0».

### Добавлено

- **`/qtim:product-onboard`** — продуктовый онбординг памяти: fan-out read-only исследователей по продуктовым линзам (разделы/экраны из роутера, акторы/права из auth, словарь домена из схемы, события аналитики и фичефлаги) + синтез материалов ПМа из опциональной `docs/product-context/` (интервью, тикеты, метрики — каждый вывод со ссылкой на источник). Выход: `memory/product-map.md`, `product-actors.md`, `product-glossary.md`, `product-metrics.md`; пишет только team-lead, факты с прецедентами `file:line`, гипотезы помечаются. Дополняет `/qtim:onboard`: тот — инженерная линза, этот — глазами пользователя.
- **Роль `product` использует и пополняет память**: продуктовая память в read-on-spawn; термины из глоссария, метрики PRD привязываются к реальным событиям из `product-metrics.md` (отсутствующее событие — задача на трекинг, не факт); обновления project-памяти — предложениями в финальном выходе (пишет team-lead), личные наблюдения и калибровка оценок — в agent-memory роли.
- **Интеграция с конвейером**: `/qtim:feature` Stage 1 читает продуктовую память до вопросов пользователю и предлагает `/qtim:product-onboard`, если памяти нет; setup рекомендует его после генерации PM-дорожки; Standalone копирует новую команду.
- Запись «→ 1.7.0» в migrations.md.

## 1.6.0 — 2026-07-02

> team-sync: рекомендуется — подтянет правки шаблонов ролей (маршрутизация reviewer, tester-конвенция screenshots-gate, префикс self-check у front, цвет tester), канонизацию реестра решений `memory/decisions.md`, а для Q5=No-проектов — вырезание codex-блоков; standalone-проектам — пере-копирование движка с локализацией имён. Перечень — `reference/migrations.md`, запись «→ 1.6.0».

### Исправлено

По итогам глубокого аудита плагина (9 измерений, каждая находка верифицирована адверсариально; P1 не найдено, закрыты все подтверждённые P2/P3):

- **`ensemble-review.mjs` — гейт стал fail-closed.** Сбой скептик-агента или целой линзы больше не превращается молча в «дефекта нет»: неверифицированные findings идут в отчёт отдельным блоком и блокируют APPROVED при P0/P1, упавшие линзы логируются и возвращаются в `failedLenses`; правило «approved=false при любом P0/P1» продублировано детерминированно в скрипте (LLM-синтез может только ужесточить вердикт); findings сверх лимита верификации не теряются, а помечаются неверифицированными.
- **`flaky-hunt.mjs`:** сбой tester-агента больше не логируется как «зелёный» прогон — считается отдельно (`errors` в return), серия сбоев даёт честное «ни один прогон не состоялся» вместо ложного «стабильно».
- **Канон и паттерны (`orchestration-patterns.md`):** резюме «Связь с decision matrix» больше не пересказывает ось A/B/C/D как «сколько ролей» (канон team-up меряет её глубиной координации и объявляет счёт ролей anti-pattern'ом); классификатор паттерна 3 не просит субагента выбирать режим A/B/C/D (матрица ему недоступна, выбор режима — работа team-lead); правило budget-guard уточнено семантикой движка (`remaining()` без бюджета = `Infinity`; форма с `budget.total &&` — только для loop-until-budget без собственного лимита); в скелете паттерна 2 добавлен null-guard результата агента.
- **Setup:** ветка Q5=No согласована по всему конвейеру — charter получает секцию-заглушку «выключен (Q5=No)», codex-блоки шаблонов вырезаются при генерации, team-up не вписывает codex-строку в промпты спавна при неактивной секции; канонизирован реестр решений и фич `memory/decisions.md` (опция Q4, генерация в 4.4, единое имя во всех потребителях: feature, feature-pipeline, onboard, intake-protocol, architect, product, codex-consult); Q6=Standalone упоминает `workflows/*`; Q7 честно описывает дубль SessionStart/SubagentStop-hooks в standalone при установленном плагине; PM-состав (Q0) получил пометку о доукомплектовании dev-дорожкой перед реализацией (в PM-составе нет `reviewer` для петли режима D) — предупреждение продублировано в handoff `/qtim:feature`; Phase 5 предупреждает о перезапуске CLI, если флаг Agent Teams не был активен в сессии setup; standalone-копирование (4.6) локализует `/qtim:*`-имена во всех движковых файлах, включая handoff-шаблон feature.
- **Doctor / team-sync:** doctor получил standalone-ветку (недоступный плагин — info, не fail; фиксы «→ team-sync» помечаются «требуется плагин») и проверяет дубли hooks в обоих режимах; team-sync при совпадении версий проверяет резолвинг абсолютных путей протоколов из charter — machine-specific пути чинятся точечно при переносе проекта на другую машину.
- **team-retro / team-down:** уроки, адресованные ролям с `memory: false` (tester), направляются в `memory/retro-log.md` и рабочие файлы роли вместо никогда не загружаемого agent-memory; team-down больше не называет персистентную agent-memory «сбрасываемой между сессиями» (сбрасывается контекст).
- **Reviewer/front/tester (шаблоны):** маршрутизация findings reviewer'а включает `tester` и оговаривает опциональность `devops`; screenshots-gate различает tester-скриншоты и self-check front по префиксу `front-selfcheck-`; у tester `color: cyan` вместо дубля `green` с front.
- **Hooks:** `session-start.sh` и SubagentStop-hook якорятся на `$CLAUDE_PROJECT_DIR` — работают при запуске CLI не из корня проекта.
- **CI:** канон-grep упразднённых примитивов распространён на `examples/`; добавлен `sh -n` для `session-start.sh`; `check_workflows.mjs` лексически запрещает `Date.now()`/`Math.random()`/безаргументный `new Date()` (ломают resume); `check_placeholders.py` ловит несбалансированные скобки (`{{FOO}` / `{FOO}}`) и проверяет в `examples/` также `*.json`.
- **README:** шкала оценок PM-конвейера — S/M/L/XL (была занижена до S/M/L); «Что появится в проекте» упоминает `.claude/settings.local.json` (флаг, hooks, deny-baseline) — setup меняет настройки проекта не «неожиданно».
- **Golden-пример:** секция «Файлы памяти» charter согласована с `read on spawn` ролей (decisions / ui-spec / production-checklist), добавлен `memory/decisions.md`, штамп обновлён до v1.6.0.

## 1.5.0 — 2026-07-02

> team-sync: опционально — dev-only команды работают без изменений (движок backward-tolerant); запускай, если хочешь добавить PM-дорожку в собранный проект или заменить старый каркас роли `product` на полноценный шаблон. Перечень — `reference/migrations.md`, запись «→ 1.5.0».

### Добавлено

- **Ролевой вход**: `/qtim:setup` первым вопросом (Q0) спрашивает роль пользователя — Developer / PM-Analyst / Оба — и генерирует команду под неё; PM-состав фиксируется стеком (`product` + `architect` + профильные impl/`tester`, без `reviewer`) — dev-роли нужны конвейеру как read-only консультанты. При существующем charter с другой дорожкой setup дописывает недостающее, не пересоздавая.
- **`/qtim:feature`** — PM-конвейер: intake → PRD → декомпозиция → оценка → план → handoff в `/qtim:team-up`/`/qtim:team-lazy`; checkpoint у пользователя после каждой стадии; resume по статусам артефактов при существующем slug.
- **Шаблон `agents/product-agent.md`** — роль `product` выросла из Extended-каркаса в полноценный шаблон: режимы INTAKE / PRD / DECOMPOSE / ESTIMATE / PLAN + прежний UX-аудит (режим UX-AUDIT); production code не пишет; `memory: "project"` (200 строк).
- **`reference/feature-pipeline.md`** — механика конвейера: артефакты `docs/features/<slug>/` (intake/prd/decomposition/estimate/plan) со статусной машиной Draft → Approved → In Development → Done, правило dev-consult на декомпозиции/оценке, grounded-оценки S/M/L/XL + confidence только с evidence (без выдуманных часов), handoff-контракт. Setup переносит суть в charter-секцию «PM-конвейер» + абсолютный путь к протоколу (паттерн codex-consult).
- **Интеграция с dev-флоу**: team-up/team-lazy читают `docs/features/<slug>/plan.md` и `prd.md` как источник scope и acceptance criteria и обновляют Status артефактов; SessionStart-анонс упоминает `/qtim:feature`.

Интеграция [PR #1](https://github.com/toiiia/qtim-agent-team/pull/1) (@trushhh777): фича обкатана в Codex-адаптации плагина и портирована под конвенции Claude Code-версии; при слиянии адаптирована к 1.4.0 (team-retro/onboard/doctor/workflows в Standalone-копировании и Phase 5, golden-пример помечен как dev-дорожка).

## 1.4.0 — 2026-07-02

> team-sync: не требуется (функциональных миграций нет); по желанию — косметическая запись `→ 1.4.0` в migrations.md (удаление header-note из ранее сгенерированных агентов; standalone — докопировать workflows/). Plugin-linked проекты получают движок автоматически.

### Добавлено

- **`/qtim:team-retro`** — ретроспектива эпика: анализ петель/блокеров/повторяющихся классов проблем по фактам сессии и дистилляция уроков «триггер → действие» в `memory/retro-log.md` и в agent-memory конкретных ролей. Команда теперь умнеет от эпика к эпику, а не только в пределах сессии.
- **Epic-state / handoff между сессиями:** `team-down` при незавершённом эпике пишет `memory/epic-state.md` (фаза, сделано, «в полёте», следующий шаг), `team-up` в новой сессии читает его и предлагает продолжить, восстановив задачи с owner'ами. Liveness по-прежнему сессионный, но эпик больше не теряется.
- **Комплект готовых Workflow-скриптов** в `plugins/qtim/workflows/` (запуск по `scriptPath`, opt-in обязателен): `ensemble-review.mjs` (линзы → скептик-верификация → вердикт), `access-audit.mjs` (fan-out по сущностям → карта видимости + щели), `flaky-hunt.mjs` (loop-until-trace с бюджет-guard'ом). Named workflows из orchestration-patterns теперь поставляются, а не только описываются; в standalone копируются в `.claude/workflows/`.
- **`/qtim:onboard`** — глубокое наполнение памяти существующего проекта: план → подтверждение объёма → fan-out исследователей по подсистемам (read-only) → синтез карты/инвариантов/конвенций в `memory/` с прецедентами file:line.
- **`/qtim:doctor`** — read-only диагностика с фиксами: флаг Agent Teams, версия/штамп charter, целостность агентов (frontmatter, tools, неподставленные плейсхолдеры), settings, память, codex, reference-пути.
- **`examples/nuxt-supabase/`** — golden-референс сгенерированного (charter, роль db, settings, baseline-память) как живая документация и эталон для сверки при правках шаблонов; CI проверяет отсутствие плейсхолдеров в examples.
- CI: синтакс-проверка Workflow-скриптов (`check_workflows.mjs` — AsyncFunction-парсинг, как исполняет движок; обычный `node --check` даёт ложный fail на легальном top-level return); обратная проверка examples в `check_placeholders.py`.
- Setup: header-note шаблона не переносится в сгенерированные агенты; Phase 5 рекомендует onboard/doctor; Standalone копирует новые команды и workflows.

## 1.3.0 — 2026-07-02

> team-sync: рекомендуется — добавит в charter версионный штамп; без него функциональных поломок нет, но SessionStart-hook будет предлагать sync при каждом старте.

### Добавлено

- **`/qtim:team-sync`** — миграция собранной команды на текущую версию плагина: подтягивает engine-managed части сгенерированных файлов (tools агентов, канонические блоки шаблонов, структура charter, settings-baseline), не трогая проектную конкретику, `memory/` и `.claude/agent-memory/`. План показывается до записи; конфликты с ручными правками — на решение пользователя.
- **Версионный штамп** `generated-by: qtim v<версия> · mode: <plugin-linked|standalone>` в шапке charter — пишет setup, обновляет team-sync.
- **Детектор дрейфа версий** в SessionStart-hook (`hooks/session-start.sh` вместо inline-команды): charter собран по другой версии → анонс подсказывает запустить `/qtim:team-sync`; версии совпадают → обычный анонс.
- **`reference/migrations.md`** — реестр миграций по версиям (читает team-sync); заполнен записями `→ 1.2.0` и `→ 1.3.0`.
- Инварианты версионирования в CLAUDE.md: контракт штампа (setup / hook / team-sync), backward-tolerant чтение charter движком, обязательность migration-записи при правках сгенерированного.
- README: раздел «Обновление» + `/qtim:team-sync` в таблице команд.

## 1.2.0 — 2026-07-02

> team-sync: требуется — проектам, собранным до 1.2.0 (tools агентов, deny-формат, секции charter, путь codex-consult); перечень — `reference/migrations.md`, запись «→ 1.2.0».

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
