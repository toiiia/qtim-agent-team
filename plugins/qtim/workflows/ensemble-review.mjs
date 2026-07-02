// ensemble-review — мульти-линзовый pre-merge review: параллельные линзы → скептик-верификация → синтез.
// Запуск (только по opt-in пользователя!): Workflow({ scriptPath: '<каталог плагина qtim>/workflows/ensemble-review.mjs',
//   args: { scope?: 'что ревьюим', lenses?: [...], reviewerType?: 'reviewer-agent' } })
// Workflow-агенты эфемерны: итоговый report оркестратор коммитит в memory/review-report сам.
// Гейт fail-closed: сбой скептика/линзы не превращается в «дефекта нет», а правило
// «approved=false при любом P0/P1» продублировано детерминированно — LLM-синтез может
// только ужесточить вердикт, но не ослабить.

export const meta = {
  name: 'ensemble-review',
  description: 'Мульти-линзовый pre-merge review: линзы параллельно, скептик на каждый finding, синтез-вердикт',
  whenToUse: 'Перед мержем крупного или рискованного эпика; для money/security-critical — обязателен до APPROVED',
  phases: [
    { title: 'Линзы', detail: 'параллельные ревью по измерениям' },
    { title: 'Верификация', detail: 'скептик пытается опровергнуть каждый finding' },
    { title: 'Синтез', detail: 'дедуп, маршрутизация, вердикт' },
  ],
}

const SCOPE = (args && args.scope) || 'незакоммиченные изменения рабочего дерева (git status + git diff)'
const REVIEWER = (args && args.reviewerType) || 'general-purpose'
const LENSES = (args && args.lenses) || [
  'модель доступа и видимость данных: обход политик/гардов, утечка чужих данных, наследование scope дочерними сущностями',
  'гонки и идемпотентность: конкурентные write-пути (все ветки, не только основная), повторный прогон миграций',
  'производительность: N+1, отсутствующие индексы на FK и колонках фильтра, лишние запросы',
  'типы и контракты: any, локальные дубли типов, hardcode URL/ключей вместо конфига',
  'UX-поверхность: loading/empty/error, тексты на языке UI, тестовые селекторы на интерактиве',
]

const FINDINGS = {
  type: 'object', required: ['findings'],
  properties: { findings: { type: 'array', items: {
    type: 'object', required: ['file', 'summary', 'severity'],
    properties: {
      file: { type: 'string' }, line: { type: 'number' },
      summary: { type: 'string' }, severity: { enum: ['P0', 'P1', 'P2', 'P3'] },
      fix: { type: 'string' },
    } } } },
}
const VERDICT = {
  type: 'object', required: ['real'],
  properties: { real: { type: 'boolean' }, reason: { type: 'string' } },
}
const REPORT = {
  type: 'object', required: ['approved', 'report'],
  properties: { approved: { type: 'boolean' }, report: { type: 'string' } },
}

const MAX_VERIFY_PER_LENS = 12
const SEVERITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 }

const perLens = await pipeline(
  LENSES,
  lens => agent(
    `Ревью изменений (${SCOPE}) строго через одну линзу: ${lens}.
     Сверься с доменными инвариантами проекта (.claude/team-charter.md + memory/). Read-only,
     код не правь. Только реальные дефекты с file:line — не стилистика и не пожелания.`,
    { label: `линза: ${lens.slice(0, 40)}`, phase: 'Линзы', agentType: REVIEWER, schema: FINDINGS }),
  (r, lens) => {
    if (!r) {
      log(`Линза «${lens.slice(0, 40)}» упала — измерение НЕ проверено, вердикт будет NOT APPROVED`)
      return { lens, lensFailed: true, verified: [], unverified: [] }
    }
    const fs = (r.findings || []).slice()
      .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))
    const overflow = fs.slice(MAX_VERIFY_PER_LENS)
      .map(f => ({ ...f, real: true, unverified: true, verifyReason: 'сверх лимита верификации — скептиком не проверялся' }))
    if (overflow.length) log(`Линза «${lens.slice(0, 40)}»: ${fs.length} findings, скептик проверит топ-${MAX_VERIFY_PER_LENS} по severity, остальные ${overflow.length} уйдут в отчёт неверифицированными`)
    return parallel(fs.slice(0, MAX_VERIFY_PER_LENS).map(f => () =>
      agent(
        `Попробуй ОПРОВЕРГНУТЬ finding: «${f.summary}» (${f.file}:${f.line ?? '?'}).
         Открой код и проверь фактически. Не смог подтвердить по коду → real=false.`,
        { label: `verify: ${f.file}`, phase: 'Верификация', schema: VERDICT })
        .then(v => v
          ? { ...f, real: !!v.real, verifyReason: v.reason }
          : { ...f, real: true, unverified: true, verifyReason: 'скептик недоступен — finding НЕ опровергнут, требует ручной проверки' })))
      .then(vs => ({ lens, lensFailed: false, verified: vs.filter(Boolean), unverified: overflow }))
  },
)

const lensResults = perLens.filter(Boolean)
const failedLenses = lensResults.filter(l => l.lensFailed).map(l => l.lens)
const checked = lensResults.flatMap(l => l.verified).filter(f => f.real)
const confirmed = checked.filter(f => !f.unverified)
const unverified = checked.filter(f => f.unverified).concat(lensResults.flatMap(l => l.unverified))
log(`Линз отработало: ${lensResults.length - failedLenses.length}/${LENSES.length}; подтверждено скептиками: ${confirmed.length}; не проверено (сбой/лимит): ${unverified.length}`)

const verdict = await agent(
  `Сведи findings в один review-отчёт: дедуп (одна проблема, найденная разными линзами, = одна
   запись), группировка по severity, маршрутизация (db / front / tester / devops / архитектура),
   итог approved=false при любом P0/P1. Подтверждённые скептиками findings:\n${JSON.stringify(confirmed)}
   Неверифицированные findings (сбой скептика или сверх лимита — НЕ опровергнуты, выдели их в отчёте отдельным блоком «требуют ручной проверки»):\n${JSON.stringify(unverified)}${failedLenses.length ? `\n   Линзы, упавшие целиком (эти измерения не проверялись — отчёт неполон, отрази это): ${JSON.stringify(failedLenses)}` : ''}`,
  { phase: 'Синтез', schema: REPORT })

// Детерминированный гейт: сбой инфраструктуры и неопровергнутый P0/P1 блокируют независимо от мнения синтезатора.
const blocking = f => f.severity === 'P0' || f.severity === 'P1'
const approved = !!(verdict && verdict.approved)
  && !confirmed.some(blocking)
  && !unverified.some(blocking)
  && failedLenses.length === 0

log(`Вердикт: ${approved ? 'APPROVED' : 'NOT APPROVED'}${failedLenses.length ? ` (упавших линз: ${failedLenses.length})` : ''}${unverified.some(blocking) ? ' (неверифицированный P0/P1 блокирует)' : ''}`)
return { approved, report: verdict && verdict.report, confirmed, unverified, failedLenses }
