---
description: Диагностика окружения и собранной команды — флаг Agent Teams, charter, агенты, settings, память, codex; с конкретными фиксами
---

# /qtim:doctor — самодиагностика

> Читает только team-lead. Read-only диагностика: ничего не чинит без подтверждения.
> Запускай при «что-то не работает», после обновления Claude Code или при онбординге коллеги.

## Чеклист (прогони все пункты, собери в таблицу pass / warn / fail)

1. **Рантайм Agent Teams.** В инструментах текущей сессии есть `SendMessage` / `TaskCreate`?
   Нет → флаг не включён: добавить `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"` в `env`
   settings.json (глобального `~/.claude/` или проектного `.claude/`) и перезапустить CLI.
2. **Плагин.** `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` читается? Зафиксируй версию.
3. **Charter.** `.claude/team-charter.md` существует (нет → `/qtim:setup`); штамп `generated-by`
   есть и совпадает с версией плагина (нет или расходится → `/qtim:team-sync`); обязательные
   секции на месте (Состав, Intake-режим, Правила работы, Файлы памяти).
4. **Агенты.** Для каждой роли из charter (кроме встроенных типов `Explore` / `general-purpose` — им свой файл не требуется): файл `.claude/agents/<subagent_type>.md` существует;
   frontmatter парсится и `name` совпадает с `subagent_type` из charter; в `tools` нет
   упразднённых (`MultiEdit`, `Computer`, голый `Task`); в теле не осталось плейсхолдеров
   `{{...}}` (остались → генерация не подставила стек: `/qtim:team-sync` или поправить руками).
5. **Settings.** `.claude/settings.local.json` — валидный JSON; правила `permissions.deny`
   в формате `Tool(паттерн)` (голые glob'ы молча игнорируются); при plugin-linked нет дублей
   SessionStart/SubagentStop с hooks плагина.
6. **Память.** `memory/MEMORY.md` существует; для ролей с `memory` во frontmatter созданы
   `.claude/agent-memory/<role>-agent/MEMORY.md`; `memory/epic-state.md` не содержит заведомо
   устаревшего «в полёте» (эпик давно завершён → warn, предложить убрать).
7. **Codex** (если включён в charter). Путь к протоколу из секции «Codex second-opinion»
   резолвится в существующий файл; `codex --version` отрабатывает; плагин codex установлен
   или доступен raw-канал `codex exec` (для gate-точек субагентов плагин не обязателен).
   Codex недоступен → **warn, не fail** (протокол fail-soft).
8. **Reference-пути.** Абсолютные пути на `reference/*` из charter существуют.

## Вывод

Таблица: пункт · статус · что именно не так · конкретный фикс (команда или правка файла).
После таблицы предложи применить **безопасные** фиксы (создание недостающих `MEMORY.md`,
формат `deny`-правил, устаревший `epic-state`) — по подтверждению пользователя, по одному
классу за раз. Ничего не удаляй сам; сомнительное — только показывай.
