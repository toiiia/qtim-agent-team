// flaky-hunt — прогонять сценарий, пока flaky-fail не пойман с воспроизводимым trace.
// Запуск (только по opt-in пользователя!): Workflow({ scriptPath: '<каталог плагина qtim>/workflows/flaky-hunt.mjs',
//   args: { scenario: 'описание сценария и как его гонять', maxRuns?: 25, minBudget?: 40000, testerType?: 'testing-agent' } })
// Stop-условия: trace пойман / maxRuns / бюджет-guard. Trace оркестратор коммитит в memory/bug-log сам.

export const meta = {
  name: 'flaky-hunt',
  description: 'Loop-until-trace: гонять сценарий в реальном браузере/раннере, пока flaky-fail не пойман с trace',
  whenToUse: 'Тест или сценарий падает «раз в N прогонов» и нужен воспроизводимый trace для фикса',
  phases: [{ title: 'Прогоны', detail: 'цикл до поимки trace' }],
}

if (!args || !args.scenario) {
  throw new Error('args.scenario обязателен: что воспроизводим и как гонять (команда/шаги/URL)')
}
const MAX_RUNS = (args && args.maxRuns) || 25
const MIN_BUDGET = (args && args.minBudget) || 40_000
const TESTER = (args && args.testerType) || 'general-purpose'

const RUN = {
  type: 'object', required: ['failed'],
  properties: {
    failed: { type: 'boolean' },
    tracePath: { type: 'string' },
    notes: { type: 'string' },
  },
}

let trace = null
let i = 0
while (!trace && i < MAX_RUNS && budget.remaining() > MIN_BUDGET) {
  i += 1
  const r = await agent(
    `Прогон #${i}. Воспроизведи сценарий: ${args.scenario}
     Лови flaky-fail / гонку. При fail сохрани артефакты (trace, скриншот, console+network лог)
     в каталог скриншотов/логов проекта (memory/screenshots/ или принятый в проекте) и верни
     failed=true + tracePath. Зелёный прогон — failed=false. Код не правь.`,
    { label: `run #${i}`, phase: 'Прогоны', agentType: TESTER, schema: RUN })
  if (r && r.failed) trace = r.tracePath || '(fail пойман, tracePath не указан — см. notes)'
  log(`#${i}: ${r && r.failed ? 'ПОЙМАН → ' + trace : 'зелёный'}${r && r.notes ? ' · ' + r.notes : ''}`)
}

if (!trace) log(`Не пойман за ${i} прогонов (лимит ${MAX_RUNS}, бюджет-guard ${MIN_BUDGET}) — увеличь maxRuns или измени условия среды`)
return { caught: !!trace, trace, runs: i }
