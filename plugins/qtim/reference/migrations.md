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

- **Роль `product`** — если сгенерирована по старому каркасу (Extended-состав до 1.4.0),
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
