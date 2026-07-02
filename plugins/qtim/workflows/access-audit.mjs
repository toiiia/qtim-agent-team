// access-audit — fan-out аудита модели доступа по сущностям → карта видимости + щели на стыках.
// Запуск (только по opt-in пользователя!): Workflow({ scriptPath: '<каталог плагина qtim>/workflows/access-audit.mjs',
//   args: { entities: ['workspace', 'project', ...], focus?: 'что особенно проверить' } })
// Барьер перед синтезом оправдан: карта и щели на стыках требуют ВСЕХ находок разом.
// Итоговую карту оркестратор коммитит в memory/ сам (workflow-агенты эфемерны).

export const meta = {
  name: 'access-audit',
  description: 'Параллельный аудит модели доступа по сущностям, синтез карты видимости и щелей на стыках',
  whenToUse: 'Периодический security-аудит видимости данных или проверка после изменения модели доступа',
  phases: [
    { title: 'Аудит', detail: 'агент на сущность' },
    { title: 'Синтез', detail: 'карта видимости + щели' },
  ],
}

if (!args || !Array.isArray(args.entities) || args.entities.length === 0) {
  throw new Error('args.entities обязателен: список сущностей для аудита, например { entities: ["workspace", "project"] }')
}
const FOCUS = (args && args.focus) ? `Особый фокус: ${args.focus}.` : ''

const ACCESS_FINDINGS = {
  type: 'object', required: ['entity', 'findings'],
  properties: {
    entity: { type: 'string' },
    findings: { type: 'array', items: {
      type: 'object', required: ['summary', 'severity'],
      properties: {
        file: { type: 'string' }, line: { type: 'number' },
        summary: { type: 'string' }, severity: { enum: ['P0', 'P1', 'P2', 'P3'] },
        fix: { type: 'string' },
      } } },
  },
}
const VISIBILITY_MAP = {
  type: 'object', required: ['map', 'gaps'],
  properties: { map: { type: 'string' }, gaps: { type: 'array', items: { type: 'string' } } },
}

const found = (await parallel(args.entities.map(e => () =>
  agent(
    `Аудит модели доступа сущности «${e}»: включён ли контроль доступа и есть ли политика/гард
     на каждой операции; наследование scope дочерними сущностями (нет ли собственного владельца
     в обход канона); утечка чужих данных; обходные пути (серверные routes мимо политики,
     привилегированный клиент без гарда). ${FOCUS}
     Сверься с memory/ + .claude/team-charter.md. Read-only. Findings с file:line.`,
    { label: `audit: ${e}`, phase: 'Аудит', schema: ACCESS_FINDINGS })))).filter(Boolean)

log(`Аудит завершён: ${found.length}/${args.entities.length} сущностей, ${found.reduce((n, r) => n + r.findings.length, 0)} находок`)

const map = await agent(
  `Собери из находок ниже карту видимости по ролям/акторам и перечисли щели на стыках
   (дочерние сущности, наследующие scope; пересечения политик; обходные пути).
   Находки:\n${JSON.stringify(found)}`,
  { phase: 'Синтез', schema: VISIBILITY_MAP })

return { map: map && map.map, gaps: (map && map.gaps) || [], raw: found }
