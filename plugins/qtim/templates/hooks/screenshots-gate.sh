#!/bin/sh
# Блокирующий screenshots-gate (SubagentStop). Опция Q7 setup, по умолчанию выключена.
# Копируется в .claude/hooks/ проекта; каталог скриншотов и имя роли подставляет setup.
#
# Аргументы: $1 — каталог скриншотов, $2 — agent_type роли-тестера, $3 — окно свежести (мин, по умолчанию 180).
# Вход: JSON события на stdin. Выход: 0 — выпустить роль, 2 — вернуть в работу с текстом из stderr.
#
# Три правила блокирующего гейта (замер CLI 2.1.220, reference/runtime-compat.md):
#   1) проверяем объективный признак — файлы на диске, а не утверждение роли в отчёте;
#   2) в stderr — выполнимое ролью действие, потому что этот текст роль принимает за новую
#      задачу и теряет исходную;
#   3) счётчик попыток: роль, которая физически не может закрыть гейт, иначе не выйдет из него
#      до конца сессии.
# Всё остальное — fail-soft: гейт молчит и выпускает роль.

SHOTS_DIR="${1:-}"
TESTER_TYPE="${2:-testing-agent}"
WINDOW_MIN="${3:-180}"
MAX_BLOCKS=1

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
[ -n "$SHOTS_DIR" ] || exit 0
[ -f .claude/team-charter.md ] || exit 0

PAYLOAD=$(cat 2>/dev/null)
[ -n "$PAYLOAD" ] || exit 0

# Гейт касается только роли-тестера: остальные роли скриншотов не производят.
AGENT_TYPE=$(printf '%s' "$PAYLOAD" | sed -n 's/.*"agent_type"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
[ "$AGENT_TYPE" = "$TESTER_TYPE" ] || exit 0

# Self-check-снимки ролей гейт не закрывают — конвенция: имя содержит "-selfcheck-"
# (front-selfcheck-*, designer-selfcheck-*, proto-selfcheck-*, любые будущие роли).
# Гейт закрывают только sweep-снимки tester'а; его конвенция <epic>-<phase>-<viewport>-<screen>
# подстроку "selfcheck" не содержит.
FRESH=$(find "$SHOTS_DIR" -type f \
  \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.webp' \) \
  ! -name '*-selfcheck-*' \
  -mmin "-$WINDOW_MIN" 2>/dev/null | head -n 1)
[ -n "$FRESH" ] && exit 0

SESSION=$(printf '%s' "$PAYLOAD" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
COUNTER="${TMPDIR:-/tmp}/qtim-screenshots-gate-${SESSION:-nosession}"
BLOCKS=$(cat "$COUNTER" 2>/dev/null || echo 0)
case "$BLOCKS" in *[!0-9]*|'') BLOCKS=0 ;; esac
[ "$BLOCKS" -ge "$MAX_BLOCKS" ] && exit 0
echo $((BLOCKS + 1)) > "$COUNTER" 2>/dev/null

cat >&2 <<EOF
Гейт скриншотов не пройден: в $SHOTS_DIR нет снимков за последние $WINDOW_MIN мин
(self-check-снимки ролей — имена с "-selfcheck-" — не считаются).

Доделай текущую задачу так: прогони затронутые экраны в реальном браузере, сохрани снимки
по конвенции <epic>-<phase>-<viewport>-<screen> в $SHOTS_DIR, открой каждый через Read
и опиши увиденное в отчёте.

Если в этой задаче UI не затрагивался (проверка API, данных, миграции) — напиши это
в отчёте и завершай: повторно гейт не сработает.
EOF
exit 2
