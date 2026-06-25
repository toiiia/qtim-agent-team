# qtim-agent-team

Личный плагин-маркетплейс для Claude Code: **движок для bootstrap и оркестрации постоянной команды специализированных субагентов** под любой проект.

Плагин `qtim` упаковывает то, что раньше жило россыпью в `~/.claude/commands/setup-agent-team.md` и в `.claude/` отдельного проекта, и приводит к актуальному рантайму Agent Teams (`Agent({name})` / `SendMessage` / `Task*`; устаревшие `TeamCreate`/`team_name` не используются).

## Что внутри

```
plugins/qtim/
├── commands/
│   ├── setup.md        # генератор: разворачивает команду под стек текущего проекта
│   ├── team-up.md      # поднять полную команду (warm-up всех ролей)
│   ├── team-lazy.md    # без прогрева — роли по требованию
│   └── team-down.md    # свернуть фоновые роли (TaskStop)
├── agents/             # 5 stack-agnostic шаблонов ролей
│   ├── architect-agent.md
│   ├── database-agent.md
│   ├── frontend-agent.md
│   ├── testing-agent.md
│   └── reviewer-agent.md
├── reference/          # переносимая механика оркестрации
│   ├── intake-protocol.md
│   ├── orchestration-patterns.md
│   └── codex-consult.md
└── hooks/
    └── hooks.json      # универсальные hooks-гейты качества
```

## Требования

- **Claude Code с включённым Agent Teams.** Движок опирается на мультиагентный рантайм (`Agent({name})` / `SendMessage` / `Task*`) — он за экспериментальным флагом. Включи в `settings.json` (user-level `~/.claude/settings.json` или project-level `.claude/settings.json`):
  ```json
  {
    "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }
  }
  ```
  Без него `/qtim:team-up` и `/qtim:team-lazy` не смогут спавнить членов команды. Генератор `/qtim:setup` прописывает этот флаг в проектный `.claude/settings.local.json` автоматически — но для самих `team-*` команд он должен быть активен в сессии.
- **(опционально) `npx` / Node** — для онлайн-подбора skills через `find-skills` (реестр skills.sh). Без сети генератор использует только уже установленные skills.
- **(опционально) плагин `codex@openai-codex`** — если включаешь Codex-полосу (second-opinion / execution lane).

## Установка

```bash
# 1. зарегистрировать маркетплейс
#    вариант A — из GitHub (рекомендую):
/plugin marketplace add toiiia/qtim-agent-team
#    вариант B — из локального пути:
/plugin marketplace add ~/Desktop/Projects/qtim-agent-team

# 2. установить плагин
/plugin install qtim@qtim-agent-team
```

После установки команды доступны под namespace плагина: `/qtim:setup`, `/qtim:team-up`, `/qtim:team-lazy`, `/qtim:team-down`.

## Использование

```
/qtim:setup            # в корне нового проекта — развернуть команду под его стек
/qtim:team-up          # поднять полную команду (эпик с циклами impl↔test↔review)
/qtim:team-lazy        # лёгкий режим: спавнить роли по мере надобности
/qtim:team-down        # остановить фоновые роли
```

Генератор `setup` анализирует стек проекта, задаёт несколько ключевых вопросов и генерирует в проект: `team-charter.md`, определения субагентов под стек, проектные slash-команды и baseline-память. Шаблоны в `agents/` и методички в `reference/` — источник, который генератор адаптирует.

## Обновление

```bash
/plugin marketplace update qtim-agent-team
```

Поскольку плагин — git-репозиторий, любые правки шаблонов/команд версионируются здесь, и проблема дрейфа («генератор отстал от обвязки») закрывается одним источником истины.
