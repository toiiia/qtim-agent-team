# Паттерны оркестрации — каталог

> Generic reference плагина agent-team. Проектные инварианты и пути живут в charter проекта
> (генерируется setup); здесь — переносимая механика.

> Канон 6 паттернов оркестрации поверх команды агентов. Читает **только оркестратор
> (team-lead)** при выборе формы исполнения задачи — субагентам не транслируется (как
> `../commands/team-up.md`). Дополняет decision matrix (`../commands/team-up.md`) и
> `codex-consult.md`. Источник истины по составу ролей — charter проекта.

---

## Два движка (читать перед первым применением)

У команды **два** механизма исполнения. Выбор движка — первое решение, до выбора паттерна.

### A. Agent/Task (model-driven, long-lived)

`Agent({ name })` + `SendMessage` + общий `Task*` list (команда на сессию одна и неявная;
`TeamCreate`/`team_name` упразднены). Агенты сами решают, кому передать дальше. Это **штатный
эпик-флоу** (например `architect → db → front → tester → reviewer` + async cross-cutting роли).
Сильная сторона — долгоживущая координация и общий task list как след работы. Слабая — нет
детерминированного control flow (циклов, fan-out, судейства, голосования). Описан в charter
проекта + `../commands/team-up.md`.

### B. Workflow (deterministic, ephemeral)

Детерминированный JS-оркестратор (инструмент `Workflow`): `agent()` / `parallel()` /
`pipeline()` + `while`. Control flow известен заранее. **Именно сюда ложатся 5 из 6
паттернов ниже.** Ключевое: `agent(prompt, { agentType })` резолвится из **того же реестра**,
что и обычный `Agent` → Workflow дёргает charter-агентов проекта (по их `agentType`) с их
родными системными промптами; `schema` форсит структурированный вывод (валидация на tool-layer,
агент ретраит при mismatch).

**Жёсткие правила движка B:**
- **Opt-in обязателен.** `Workflow` запускается только при явном согласии пользователя
  (`ultracode` в промпте или прямая просьба «запусти workflow / fan-out»). Может поднять
  десятки агентов — не инферить из «задача выиграла бы».
- **Эфемерность.** Workflow-агенты **не пишут в team task list** и исчезают после прогона.
  Любой синтез/находку оркестратор **явно коммитит в `memory/`** (как при Team-флоу).
- **`meta` — чистый литерал** (без переменных/вызовов). Первый statement скрипта (шапка-комментарий выше допустима).
- **Данные между стадиями — только интерполяцией в промпт.** Workflow-агент стартует с чистым
  контекстом: judge/synth/filter не видит ни переменных скрипта, ни результатов прошлых стадий,
  пока они не вставлены в его промпт (`${JSON.stringify(...)}`).
- **`pipeline()` по умолчанию**, `parallel()` только когда нужен барьер (synth по всем
  результатам). Результаты `parallel()` фильтровать `.filter(Boolean)` (упавший thunk → `null`).
- **Loop всегда с явным stop-условием:** собственный лимит итераций (`i < MAX`) и/или budget-guard
  `budget.remaining() > N`. Семантика движка: без заданного бюджета `remaining()` = `Infinity`,
  guard пропускает — цикл держит лимит итераций. Форма `while (budget.total && budget.remaining() > N)`
  — **только** для loop-until-budget без собственного лимита (без бюджета такой цикл не стартует);
  циклу с лимитом итераций `budget.total &&` не добавляй — при незаданном бюджете он заблокирует
  цикл целиком. Без стоп-условий — упор в 1000-агентный backstop.
- **Мутации в параллель → `isolation: 'worktree'`** (несколько агентов правят файлы). Для
  read-only оппонентов/судей не нужно.

**Named workflows:** плагин поставляет три готовых параметризованных скрипта в каталоге
`workflows/` плагина:
- `ensemble-review.mjs` — мульти-линзовый pre-merge review + скептик-верификация каждого
  finding + синтез-вердикт; для money/security-critical эпиков — перед APPROVED;
- `access-audit.mjs` — fan-out аудита модели доступа по сущностям → карта видимости + щели
  на стыках (args.entities обязателен);
- `flaky-hunt.mjs` — loop-until-trace: гонять сценарий, пока flaky-fail не пойман (args.scenario
  обязателен; бюджет-guard и maxRuns встроены).

Запуск — по пути из каталога плагина: `Workflow({ scriptPath: '<каталог плагина qtim>/workflows/ensemble-review.mjs', args: {...} })`.
В standalone-проектах setup копирует их в `.claude/workflows/`, где они доступны и как
`Workflow({ name: '...' })`. Opt-in правило в силе. Результат коммитит в `memory/` оркестратор.
Проект может добавлять свои скрипты рядом в `.claude/workflows/`.

---

## Соответствие паттерн → движок → агенты

| # | Паттерн | Движок | Агенты | Типовой пример |
|---|---|---|---|---|
| 1 | Tournament | B | architect/front-агент ×N + judge | N подходов к схеме/архитектуре → судья по доменным инвариантам |
| 2 | Loop until done | B (`while`) | testing-агент | Поймать flaky-баг / race до воспроизводимого trace |
| 3 | Classify-and-act | A+B гибрид | classifier → Team-роутинг | Триаж бэклога по severity + входящих багов |
| 4 | Fan-out-and-synthesize | B (`parallel`/`pipeline`) | general-purpose/Explore ×N + synth | Аудит всех таблиц/роутов параллельно → карта/вердикт |
| 5 | Adversarial verification | B / gate | исполнитель + claude-opp + **codex-opp** | Security-critical миграцию/триггер ломают 2 оппонента |
| 6 | Generate-and-filter | B | general-purpose (product) gen + filter | N вариантов copy → топ-K по рубрике |

**Инвариант рубрики:** любой judge / filter / opponent ОБЯЗАН иметь рубрику, привязанную к
доменным инвариантам проекта (определены в charter + memory/) или к UI-спеке/`memory/`. Рубрика
«выбери лучший» без критериев → generic-вода (то же anti-pattern, что у codex).

---

## 1. Tournament

**Когда:** несколько валидных решений, важен выбор лучшего, а не первого. Нетривиальный ADR,
стратегия видимости/авторизации нового скоупа, вёрстка сложного компонента. Дороже
generate-and-filter (полные решения, не варианты) — применять только когда цена ошибки выбора
высока.

**Судейство:** N≤4 — один judge ранжирует все сразу + «что взять у проигравших»; большой N —
bracket (попарные сравнения). Победитель синтезируется с графтом лучших идей из runner-up.

**Рубрика (пример для ADR):** доменные инварианты > идемпотентность миграции > индексы на FK >
чистота модели доступа > простота (karpathy). Сначала диверсифицировать углы атаки, не плодить
копии.

```js
const ANGLES = ['MVP-first', 'risk-first (идемпотентность критичного пути)', 'минимум-сущностей']
const drafts = await parallel(ANGLES.map(a => () =>
  agent(`ADR схемы <модуль>, угол: ${a}. Сверься с доменными инвариантами из charter + memory/architecture.`,
        { agentType: 'architect-agent', phase: 'Draft', schema: ADR_SCHEMA })))
const valid = drafts.filter(Boolean)
const winner = await agent(
  `Сравни ADR-кандидаты попарно. Рубрика: инварианты > идемпотентность
   > индексы > чистота модели доступа > простота. Верни победителя + графт лучших идей проигравших.
   Кандидаты (${valid.length}):\n${JSON.stringify(valid)}`,
  { phase: 'Judge', schema: VERDICT_SCHEMA })
// → оркестратор коммитит winner в memory/decisions + specs/<epic>-adr
```

---

## 2. Loop until done

**Когда:** сходимость к условию вместо фиксированного числа проходов. Канон — **flaky-hunt**
(падает раз в N прогонов, ловим воспроизводимый trace) и tuning (крутить индекс/запрос под
профайлером, пока latency не упадёт ниже порога). Усиливает штатный fix→reverify-цикл
`tester`'а, который сам по себе фиксированный.

**Stop-условия (явные!):** успех / `budget.remaining()` исчерпан / max итераций / trace пойман
/ K сухих раундов. Без guard — упор в 1000-агентный backstop.

```js
let trace = null, i = 0
while (!trace && i++ < 50 && budget.remaining() > 40_000) {
  const r = await agent(
    `Прогон #${i}: headed-браузер, воспроизвести <сценарий>, лови flaky-fail / race.
     При fail сохрани trace + console+network в memory/screenshots/.`,
    { agentType: 'testing-agent', schema: RUN_SCHEMA })
  if (r && r.failed) trace = r.tracePath
  log(`#${i}: ${r ? (r.failed ? 'ПОЙМАН → ' + trace : 'зелёный') : 'сбой прогона (не зелёный)'}`)
}
// → оркестратор: trace в memory/bug-log, TaskCreate db/front на фикс
```

---

## 3. Classify-and-act

**Когда:** маршрутизация входящих. Это **автоматизация таблицы `triggers`** (слой / severity /
владелец) — агент-классификатор вместо keyword-match. Выбор режима A/B/C/D классификатору НЕ
делегируется: матрица живёт в team-lead-only `team-up.md` и субагенту недоступна — режим по
результатам триажа выбирает team-lead сам. Два сценария: триаж одного бага (лёгкий classifier →
team-lead роутит в Team) и разбор пачки (бэклог P1..P3, open-баги — классифицировать по
слою/severity/владельцу).

**Гибрид движков:** один баг → Team (classifier-agent + ручной роутинг). Пачка → Workflow
`pipeline` (классифицировал → сразу действие, без барьера). P0 чинится сразу, остальное → backlog.

```js
await pipeline(incomingBugs,
  bug => agent(`Классифицируй: слой (data/SQL→db | UI→front | infra→devops | sec→auditor),
                severity P0..P3. Сверься с triggers в charter.
                Баг:\n${JSON.stringify(bug)}`, { schema: TRIAGE }),
  (t, bug) => t.severity === 'P0'
    ? agent(`Хотфикс ${bug.id} (${t.severity}, слой ${t.owner}):\n${JSON.stringify(bug)}`,
            { agentType: { db: 'database-agent', front: 'frontend-agent' }[t.owner] ?? 'general-purpose' })
    : log(`→ backlog: ${bug.id} (${t.severity}, ${t.owner})`))
```

---

## 4. Fan-out-and-synthesize

**Когда:** широкий параллельный разбор + сборка в один вывод. Самый прямой fit под Workflow и
под cross-cutting `auditor`/`reviewer`. Аналог «обработать N резюме» — N таблиц / N роутов / N
линз:
- **Audit модели доступа:** агент на сущность → synth-карта видимости + щели на стыках дочерних
  сущностей (которые наследуют scope, а не имеют собственного).
- **Security-sweep серверных роутов:** гард авторизации перед привилегированной операцией,
  валидация входа, ограничения presign/TTL.
- **Ансамблевый reviewer:** N линз (видимость / N+1 / no-hardcode / zero-any / a11y) параллельно
  → synth-вердикт.

**Барьер оправдан**, когда synth нужны ВСЕ находки разом (дедуп, карта на стыках). Иначе `pipeline`.

```js
const ENTITIES = ['<сущность1>','<сущность2>','<сущность3>','<сущность4>']
const found = (await parallel(ENTITIES.map(e => () =>
  agent(`Аудит модели доступа сущности ${e}: bypass, scope-наследование, утечка чужих данных,
         включён ли RLS/гард. Сверься с memory/architecture.`,
        { agentType: 'general-purpose', phase: 'Audit', schema: ACCESS_FINDINGS })))).filter(Boolean)
const map = await agent(
  `Собери карту видимости по ролям из находок ниже. Где щели на стыках дочерних сущностей?
   Находки:\n${JSON.stringify(found)}`,
  { phase: 'Synth', schema: VISIBILITY_MAP })
// → оркестратор: map в memory/review-report, находки P0/P1 → bug-log + TaskCreate db
```

---

## 5. Adversarial verification (claude + codex)

**Когда:** к каждому исполнителю — **два независимых оппонента разных моделей**
(claude-критик + codex-критик), независимо ищущих дефекты и нарушения инвариантов. Diversity
моделей ловит систематические blind-spots одной модели. Это **апгрейд** существующего
`codex-consult.md` (single-opponent advisory) до dual-adversary.

**Каноничная мишень:** security-critical изменения (миграции модели доступа, триггеры,
helper-функции; платёжные пути; публичные контракты). Исполнитель пишет изменение → оба
оппонента независимо ищут: обход правила доступа, гонку на конкурентном пути, утечку чужих
данных, не-идемпотентность. Исполнитель **верифицирует каждый finding сам** (оппонент
галлюцинирует file:line — правило из codex-consult).

**Голосование:** оба подтвердили P0/P1 → блок до фикса. Расходятся → team-lead арбитр.
**Инвариант важнее обоих оппонентов** (advisory, не authoritative).

```js
const m = await agent(`Security-critical миграция <описание>.
  В финальном тексте верни суть изменения + список затронутых файлов.`, { agentType: 'database-agent' })
const REVIEW_PROMPT = `Критическое ревью изменения на корректность инвариантов: непреднамеренная
  видимость данных (щель в модели доступа), соблюдение запретов/гардов, корректность при гонке
  на конкурентном пути, идемпотентность повторного прогона. Покрой ВСЕ write-пути ветки, не
  только основной. Read-only, код НЕ правь. Стартовая презумпция: считать дефект присутствующим,
  пока корректность не подтверждена. Findings: file:line, severity, fix.
  Изменение исполнителя (сверь с фактическим diff в репо):\n${m}`
const [claudeReview, codexReview] = await parallel([
  () => agent(REVIEW_PROMPT, { schema: FINDINGS }),
  () => agent(REVIEW_PROMPT, { agentType: 'codex:codex-rescue', schema: FINDINGS }), // плагин-форвардер к Codex
])
// db верифицирует оба; конфликт с доменным инвариантом → инвариант побеждает
// codexReview === null (codex упал) → fail-soft: single-reviewer, запись «codex skipped»
```

> **Статус codex:** перед skip **пробовать вызов** — не скипать по памяти о старой поломке
> credentials. Канал — `agentType: 'codex:codex-rescue'` (плагин `codex@openai-codex`; в промпте
> ЯВНО «read-only, код не правь», иначе форвардер даст Codex `--write`) или raw
> `codex exec -s read-only` per `codex-consult.md`. Fail-soft остаётся: codex недоступен →
> single-adversary (claude) + `codex-consult skipped: <reason>`.

---

## 6. Generate-and-filter

**Когда:** много **дешёвых** вариантов → отбор рубрикой до top-K. Отличие от tournament:
варианты, а не полные решения; один generator + один filter (дешевле панели судей). Пара
`product` + локализация:
- N вариантов copy (empty-state / toast / текст ошибки) → топ-K: тон (деловой, не казённый),
  длина ≤ N, ясность, грамматика целевой локали, без англицизмов.
- N имён composable/модуля → топ-K: конвенция проекта (`useXxx` и т.п.), регистрация без
  префикса папки, ясность.

```js
const cand = await agent(`30 вариантов текста пустого состояния <экран> (целевая локаль).`,
                         { agentType: 'general-purpose', schema: { type:'object', properties:{ items:{...} } } })
const top = await agent(
  `Отфильтруй кандидатов до 5. Рубрика: тон (деловой, не казённый) > длина ≤80 символов > ясность
   > без англицизмов > грамматика целевой локали. Верни топ-5 с обоснованием.
   Кандидаты:\n${JSON.stringify(cand.items)}`, { schema: RANKED })
// → оркестратор: топ-5 пользователю на выбор / TaskCreate front на интеграцию
```

---

## Глобальные anti-patterns

- ❌ Запускать `Workflow` без явного opt-in пользователя (десятки агентов, $).
- ❌ Судья/фильтр/оппонент без рубрики, привязанной к инвариантам → generic-вода.
- ❌ Промпт judge/synth/filter без интерполяции результатов прошлых стадий — агент «судит» вслепую.
- ❌ Забыть закоммитить synth Workflow-прогона в `memory/` (эфемерные агенты ничего не оставят).
- ❌ Loop без budget-guard / явного stop-условия.
- ❌ `parallel()` (барьер) там, где достаточно `pipeline()` — теряется wall-clock.
- ❌ Доверять оппоненту/судье слепо без верификации (особенно codex — file:line галлюцинации).
- ❌ Конфликт «совет агента vs инвариант» решать в пользу совета. Инвариант всегда побеждает.
- ❌ Поднимать паттерн там, где хватает штатного Team-флоу (overhead не окупится на тривиале).

## Связь с decision matrix

`../commands/team-up.md` отвечает на «**сколько** оркестрации» (A/B/C/D — по **глубине
координации**, т.е. наличию петель impl↔test↔review; НЕ по числу ролей и не по объёму — выбор
режима числом ролей канон объявляет anti-pattern'ом). Этот файл — ортогональное измерение
«**какая форма** оркестрации». Сначала глубина координации (A/B/C/D), затем — нужен ли паттерн
отсюда. Большинство задач паттерна не требуют: штатный Team-флоу остаётся дефолтом, паттерны —
для задач с явной структурой (выбор/сходимость/широкий разбор/состязание).
