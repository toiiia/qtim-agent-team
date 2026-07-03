# Реестр миграций сгенерированного — для /qtim:team-sync

> Generic reference плагина. Читает **только team-lead** при [`/qtim:team-sync`](../commands/team-sync.md).
> Каждая запись описывает, что изменилось в engine-managed частях сгенерированных файлов
> и как подтянуть существующий проект. Контракт maintainer'а: правка, меняющая сгенерированное
> (шаблоны `agents/`, структура charter в setup 4.1, settings/hooks-baseline), обязана добавить
> сюда запись `## → <версия>` (см. «Версионирование и миграции» в CLAUDE.md репозитория).

Порядок применения: все записи от версии charter (исключительно) до текущей версии плагина
(включительно), сверху вниз. Charter без штампа `generated-by` = версия `< 1.3.0`, применяются
все записи.

## → 1.2.0

- **Агенты, `tools:` frontmatter** — привести к актуальным спискам шаблонов: убрать `MultiEdit`
  (слит в `Edit`), `Computer` (не существует), `Task` (двусмысленный legacy); добавить `Skill`,
  `TaskCreate`, `TaskUpdate`, `SendMessage` всем ролям, reviewer'у также `Write`.
- **Charter** — добавить секцию «Intake-режим» (выбор пользователя неизвестен → один точечный
  вопрос или дефолт «автопилот с асимметрией» с пометкой); в «Правила работы» — фактический
  список universal skills (включать только проверенные на доступность в сессии).
- **Charter, Codex second-opinion** — путь к `codex-consult.md` заменить на абсолютный:
  каталог `reference/` установленного плагина; при standalone — абсолютный путь к локальной
  копии `.claude/reference/codex-consult.md`.
- **`.claude/settings.local.json`** — `permissions.deny` привести к формату `Tool(паттерн)`:
  `Read(./.env*)`, `Edit(./.env*)`, `Read(~/.ssh/**)`, `Edit(~/.ssh/**)`, `Bash(rm -rf:*)`,
  `Bash(sudo:*)`, `Bash(git push --force:*)`; голые glob'ы удалить (они молча игнорируются).
  При plugin-linked убрать сгенерированные дубли SessionStart/SubagentStop-hooks — их даёт плагин.
- **Agent-memory** — создать недостающие `.claude/agent-memory/<role>-agent/MEMORY.md` для ролей
  с включённой памятью (frontmatter `memory`).

## → 1.3.0

- **Charter, шапка** — добавить штамп `generated-by: qtim v<версия> · mode: <plugin-linked|standalone>`.
  По нему SessionStart-hook детектит дрейф версий, а `/qtim:team-sync` определяет диапазон
  миграций. Функциональных поломок без штампа нет — но без него hook будет предлагать sync
  при каждом старте сессии.

## → 1.4.0

- **Агенты (косметика, по желанию)** — header-note шаблона («Это generic-шаблон роли…») в
  сгенерированные файлы больше не переносится (setup 4.2); в ранее сгенерированных агентах
  эту цитату можно удалить — на работу ролей она не влияет.
- **Standalone** — при пере-копировании движка добавь каталог `.claude/workflows/`
  (готовые Workflow-скрипты появились в 1.4.0) и докопируй новые команды
  `commands/{team-retro,onboard,doctor}.md` (тоже появились в 1.4.0).

## → 1.5.0

- **Роль `product`** — если сгенерирована по старому каркасу (Extended-состав до 1.5.0),
  предложи заменить на шаблон `product-agent.md` (PM-конвейер INTAKE/PRD/DECOMPOSE/ESTIMATE/PLAN +
  прежний UX-аудит как режим UX-AUDIT; frontmatter `memory: "project"` — создай
  `.claude/agent-memory/product-agent/MEMORY.md`, если отсутствует). Ручные правки старого
  каркаса не затирай молча — покажи diff.
- **Charter, секция «PM-конвейер»** — опциональна: добавляй только если пользователь хочет
  PM-дорожку (`/qtim:feature`); спроси. Содержимое — суть `reference/feature-pipeline.md`
  (стадии с checkpoint, схема `docs/features/<slug>/` со статусами, правило dev-consult и
  grounded-оценок, handoff-контракт) + абсолютный путь к файлу протокола (как у codex-consult;
  standalone — локальная копия `.claude/reference/feature-pipeline.md`). Dev-only команды без
  PM-дорожки менять не нужно — движок backward-tolerant: `/qtim:feature` без секции отправляет
  в `/qtim:setup`.
- **Standalone** — докопировать `commands/feature.md` и `reference/feature-pipeline.md`
  в `.claude/`.

## → 1.6.0

- **Агенты (шаблонные правки)** — у `reviewer` маршрутизация findings расширена до
  `db`/`front`/`tester`/`devops` (из реально существующих в charter ролей), screenshots-gate
  принимает только tester-скриншоты по конвенции `<epic>-<phase>-<viewport>-<screen>`;
  у `front` self-check-скриншоты получили префикс `front-selfcheck-`; у `tester`
  `color: cyan` (был дубль `green` с front); read-on-spawn `architect`/`product` ссылаются
  на реестр решений и фич по каноническому имени `memory/decisions.md`.
- **Память** — канонизирован реестр решений и фич: `memory/decisions.md` (опция Q4, генерация
  в setup 4.4; его читают architect/product, пишут approval-гейт intake-протокола и handoff
  `/qtim:feature`). Создай файл (заголовок + формат «дата · решение/фича · указатель»), если
  отсутствует, и перенеси в него строки-указатели из файлов с другими именами (реестр фич и т.п.);
  упомяни его в charter-секции «Файлы памяти».
- **Q5=No-проекты** — codex-блоки в сгенерированных агентах теперь вырезаются при отказе
  от codex, а charter получает секцию-заглушку «выключен (Q5=No)». В ранее собранных без codex
  проектах: удали codex-цитаты из ролей (или оставь осознанно) и добавь заглушку в charter —
  team-up по ней перестанет вписывать codex-строку в промпты спавна.
- **Standalone** — пере-скопируй движок с локализацией командных имён: во всех скопированных
  файлах `/qtim:<cmd>` → `/<cmd>` (кроме упоминаний `/qtim:setup` — он остаётся плагинным);
  без этого handoff-шаблон feature записывает в `plan.md` несуществующую команду.

## → 1.7.0

- **Роль `product`, шаблон** — обнови сгенерированный `product-agent.md` по текущему template:
  продуктовая память (`memory/product-map.md` / `product-actors.md` / `product-glossary.md` /
  `product-metrics.md`) в read-on-spawn («если созданы»), секция «Продуктовая память» (термины
  из глоссария, метрики PRD — к реальным событиям из product-metrics, предложения обновлений
  памяти в финальном выходе). Ручные правки не затирай молча — покажи diff.
- **Charter, PM-дорожка** — в `read on spawn` роли `product` допиши файлы продуктовой памяти
  с пометкой «если созданы» и объясни их в секции «Файлы памяти» с пометкой «создаёт
  `/qtim:product-onboard`» (инвариант 1.6.0: всё из `read on spawn` объяснено в «Файлах
  памяти»). Dev-only команды менять не нужно — движок backward-tolerant: без этих файлов
  роль работает как раньше.
- **Рекомендация** — на существующей кодовой базе предложи пользователю прогнать
  `/qtim:product-onboard` (наполняет продуктовую память; сами файлы memory команда создаёт
  сама, миграция их не пишет).
- **Standalone** — докопировать `commands/product-onboard.md` в `.claude/commands/`
  с локализацией командных имён, как в 1.6.0 (`/qtim:<cmd>` → `/<cmd>`, упоминания
  `/qtim:setup` не трогать). Относится и к dev-only standalone — движковая копия остаётся
  полной; без PM-дорожки команда просто останавливается на шаге 1 с предложением setup.
