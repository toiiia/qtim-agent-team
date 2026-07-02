#!/bin/sh
# SessionStart-hook плагина qtim: анонс команды + детектор дрейфа версий charter <-> плагин.
# stdout инжектится в контекст сессии. Fail-soft: любая проблема -> обычный анонс или тишина.
# Формат штампа charter — контракт с setup 4.1 и /qtim:team-sync: generated-by: qtim vX.Y.Z · mode: ...

PLUGIN_ROOT="${1:-$CLAUDE_PLUGIN_ROOT}"

[ -f .claude/team-charter.md ] || exit 0

PLUGIN_V=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$PLUGIN_ROOT/.claude-plugin/plugin.json" 2>/dev/null | head -n 1)
CHARTER_V=$(grep -m 1 -o 'generated-by: qtim v[0-9][0-9A-Za-z.-]*' .claude/team-charter.md 2>/dev/null | sed 's/.*qtim v//; s/[.-]*$//')

if [ -z "$PLUGIN_V" ] || [ "$CHARTER_V" = "$PLUGIN_V" ]; then
  echo "[qtim] Команда агентов настроена (charter найден). /qtim:feature — хотелка до плана (если настроена PM-дорожка), /qtim:team-up — полная, /qtim:team-lazy — по требованию, /qtim:team-down — свернуть."
else
  echo "[qtim] Команда настроена, но собрана по версии плагина ${CHARTER_V:-«до 1.3.0, штампа нет»}, а установлена v$PLUGIN_V — сгенерированные файлы (charter/агенты/settings) могли разойтись с движком. Запусти /qtim:team-sync: миграция подтянет изменения, не трогая проектную конкретику и memory/. Работать можно и без этого: /qtim:team-up | /qtim:team-lazy | /qtim:team-down (+ /qtim:feature, если настроена PM-дорожка)."
fi

exit 0
