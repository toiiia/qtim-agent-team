# Codex second-opinion — протокол вызова

> Generic reference плагина agent-team. Проектные инварианты и пути живут в charter проекта
> (генерируется setup); здесь — переносимая механика.

> Единый протокол для агентов команды, которым charter предписывает консультироваться с
> **Codex** (другая фронтир-модель, headless). Codex — другая модель → реальная альтернативная
> точка зрения, ловит blind spots, которые одна модель пропускает систематически.
>
> Применяют: `reviewer`, `architect`, `db`, `auditor`, `product`. Кому и когда — таблица ниже.
> Codex имеет **две полосы**: second-opinion (read-only, этот протокол) и **execution lane**
> (write, отдельная секция в конце) — не смешивать.

## Принципы (читать перед первым вызовом)

1. **Advisory, не authoritative.** Codex даёт input — финальное решение за агентом + `memory/`.
2. **Source of truth при конфликте — `memory/` и доменные инварианты проекта (определены в
   charter + memory/).** Codex не знает всех тонкостей модели доступа/домена проекта. Если его
   совет противоречит инварианту — инвариант побеждает, совет отбрасывается (с пометкой почему).
   Если codex нашёл реальный баг/щель — агент верифицирует сам и чинит/делегирует.
3. **Не доверять слепо.** Каждый finding codex агент проверяет своей головой. Codex может
   галлюцинировать file:line или «находить» несуществующее. **Verify file:line самому.**
4. **Read-only.** Codex консультирует, не редактирует код проекта. Всегда `-s read-only`.
5. **Fail-soft.** Codex недоступен / таймаут / ненулевой exit → **НЕ блокировать эпик**.
   Записать `codex-consult skipped: <reason>` и продолжить на своём суждении. Это второе
   мнение, а не обязательный gate-блокер.
6. **Только на gate-точках.** Codex на максимальном reasoning — это десятки секунд–минуты и
   стоит денег. Не дёргать на каждый шаг — только в момент из таблицы.

## Базовые правила вызова

- Всегда `-s read-only` (sandbox: codex читает репо, но не пишет).
- Всегда из корня репо: `-C "$(git rev-parse --show-toplevel)"` → codex подхватит корневой
  `AGENTS.md` + сможет открыть `CLAUDE.md` / `memory/*`.
- Вердикт забираем в файл: `-o /tmp/codex-<role>.md`. **Для платёжного / security-кода НЕ
  ретранслировать сырой вывод Codex в тред Claude.** Формулировки вида «exploit / attack chain /
  как обойти» в связке с деньгами request-классификатор ловит как false positive и режет ответ.
  В тред вносим только обезличенную выжимку: issue → impact → fix. Сырой файл читаем out-of-band
  (терминалом), не подкладывая его текст в контекст Claude.
- В промпт класть **конкретику** (diff / список файлов / текст ADR / конкретный инвариант),
  не «посмотри проект». Чем уже скоуп — тем полезнее ответ.
- В промпте фиксировать роль: «Ты independent <X>. НЕ редактируй код. Верни findings:
  file:line, severity (P0..P3), конкретный fix. Сверяйся с инвариантами из AGENTS.md/CLAUDE.md».
- Ускорение, когда максимальный reasoning избыточен: понизить уровень reasoning_effort
  (например `-c model_reasoning_effort="high"`).

### Структура промпта (рекомендации OpenAI, skill `codex:gpt-5-4-prompting`)

Codex промптится «как оператор»: компактные блоки в XML-тегах вместо длинного текста.
Минимум для gate-точек:

```
<task>конкретная задача + скоуп (diff / файлы / текст ADR)</task>
<structured_output_contract>findings: file:line, severity P0..P3, конкретный fix</structured_output_contract>
<grounding_rules>каждое утверждение опирается на код, который реально открыл;
гипотеза помечается как гипотеза; не нашёл в контексте — так и скажи</grounding_rules>
```

`grounding_rules` — обязателен (типовая боль: галлюцинации file:line). Для review добавлять
`dig_deeper_nudge` (second-order failures, empty-state, retries, rollback, гонки).
Шаблоны ниже остаются валидными — при использовании оборачивай их содержимое в эти блоки.

## Каналы вызова (плагин `codex@openai-codex`)

| Канал | Кто использует | Что даёт |
|---|---|---|
| **Raw CLI** `codex exec ... -s read-only` | Субагенты (`reviewer`/`architect`/`db`/`auditor`/`product`) на gate-точках | Стабильный путь без зависимости от плагин-окружения; шаблоны ниже |
| **Slash-команды плагина** `/codex:review`, `/codex:adversarial-review` (+`--background`, `/codex:status`, `/codex:result`, `/codex:cancel`) | **Только team-lead** (слэш-команды недоступны субагентам) | Background-механика: запустить ревью параллельно с QA-gate и забрать результат позже |
| **Агент `codex:codex-rescue`** (`Agent`/`agent({agentType})`) | Team-lead и Workflow-скрипты | Делегирование задачи Codex как агенту; в промпте ЯВНО писать «read-only, не правь код» для consult-сценариев — иначе форвардер даст Codex право записи (`--write` у него дефолт) |

Правила выбора: субагент на gate-точке → raw CLI (как раньше). Team-lead перед мержем
крупного эпика → `/codex:adversarial-review --background` со своим focus-текстом.
Workflow dual-adversary → `agentType: 'codex:codex-rescue'` с read-only промптом.

**Money/security-critical (биллинг, модель доступа, платёжные вебхуки) — исключение
(request-safety):** не использовать `/codex:review` / `/codex:adversarial-review` — они форсят
verbatim-ретрансляцию вывода Codex в тред Claude, и request-классификатор режет
платёжно-security findings как false positive. Вместо них — raw
`codex exec ... -s read-only -o /tmp/codex-*.md` с **нейтральным defect-review** промптом (без
«attack / сломай / exploit» — формулировать как обычное ревью на корректность, не как
weaponized-задачу); файл читать out-of-band, в тред Claude вносить только выжимку issue → fix.

**Stop-review-gate плагина (`/codex:setup --enable-review-gate`) НЕ включать:** это хук
на каждый Stop главного треда (длинный timeout) — в мультиагентных сессиях даст
постоянные блокировки и сожжёт лимиты; его роль уже закрывают `reviewer` + QA-gate.

## Когда вызывать (per-role gate-точки)

| Роль | Gate-точка (когда) | Инструмент |
|---|---|---|
| `reviewer` | Перед вердиктом APPROVED, после прохождения всех gate'ов | `codex exec review` |
| `architect` | Нетривиальный ADR (после своего draft, до старта эпика). НЕ на CONSULT-режим | `codex exec` |
| `db` | Security-critical миграция (новая политика доступа / триггер / helper-функция) | `codex exec` |
| `auditor` | Старт проактивного security/perf-аудита (diversity находок) | `codex exec` |
| `product` | UX-аудит фичи после релиза эпика (вторая пара глаз на discoverability) | `codex exec` |

## Шаблоны

### reviewer — финальный pre-merge review (встроенный `review`)

```bash
codex exec review --uncommitted -s read-only -o /tmp/codex-review.md \
  "Финальный pre-merge review. Сверь с доменными инвариантами проекта (charter + memory/) и
   production-checklist. Фокус: щели модели доступа (непреднамеренная видимость), безопасность
   сессии/токенов, presign/TTL ограничения, индексы на FK, N+1, zero-any, no-hardcode
   (env/config), привилегированные операции только за гардом авторизации.
   Верни findings: file:line, severity P0..P3, конкретный fix."
```
Фича в отдельной ветке → вместо `--uncommitted` использовать `--base main`.

### architect — stress-test ADR

```bash
codex exec -s read-only -C "$(git rev-parse --show-toplevel)" -o /tmp/codex-adr.md \
  "Ты independent staff-архитектор. Прочитай CLAUDE.md + memory/architecture + memory/decisions.
   Мой ADR-черновик: <вставить суть>. Stress-test: какие open questions я упустил?
   Где доменный инвариант / модель доступа под угрозой? Есть ли более простой альтернативный подход?
   НЕ пиши код — только разбор и вопросы."
```

### db — review security-critical миграции

```bash
codex exec -s read-only -C "$(git rev-parse --show-toplevel)" -o /tmp/codex-db.md \
  "Ты independent database security reviewer. Миграция: <path или diff>.
   Проверь: щели модели доступа (непреднамеренная видимость), идемпотентность (create or replace /
   drop if exists перед create), индекс на каждый FK и колонку фильтра/сортировки, корректность
   security definer / search_path, каскады по FK, уникальность словарей в нужном скоупе.
   Сверь с memory/architecture. Верни findings: severity + fix. НЕ правь миграцию."
```

### auditor — diversity security/perf-аудита

```bash
codex exec -s read-only -C "$(git rev-parse --show-toplevel)" -o /tmp/codex-audit.md \
  "Ты independent security+perf auditor. Скоуп: <модуль/сущности/роуты>.
   Найди: OWASP-проблемы, щели модели доступа, N+1, отсутствие индексов, CVE-риски зависимостей,
   гипотезы для профайлинга. НЕ правь код — только findings + severity + что бенчмаркать."
```

### product — UX-вторая-пара-глаз

```bash
codex exec -s read-only -C "$(git rev-parse --show-toplevel)" -o /tmp/codex-ux.md \
  "Ты independent product/UX-критик. Фича: <описание>. Прочитай UI-спеку + memory/decisions (реестр решений и фич).
   Оцени discoverability (как юзер находит фичу), empty states, UI copy (целевая локаль), navigation hints.
   Что пользователь не найдёт или не поймёт? Верни находки с приоритетом P0..P3."
```

## Интеграция ответа

1. Прочитать `/tmp/codex-*.md` (для платёжного / security-кода — out-of-band, не подкладывая
   сырой текст в тред Claude; в тред Claude — только выжимка issue → fix).
2. Каждый finding — **верифицировать самому** (открыть file:line, проверить логику).
3. Разрешение конфликта: инвариант/`memory/` > мнение codex. Отброшенные советы — с причиной.
4. Подтверждённые находки — в работу: `reviewer` → `memory/review-report`;
   `db`/`auditor` → `memory/bug-log` + TaskCreate исполнителю; `architect` →
   учесть в ADR + `memory/decisions`; `product` → `memory/ux-audit` (P0..P3) + TaskCreate `front`.
5. В отчёте эпика одной строкой: «codex-consult: N findings, M подтверждено, K отброшено
   (конфликт с инвариантом X)» — или «skipped: <reason>» при fail-soft.

## Dual-adversary (паттерн 5 — claude + codex)

> Расширение этого протокола из single-opponent (advisory second-opinion) в
> **dual-adversary**: к исполнителю подключаются ДВА независимых оппонента разных моделей —
> `claude-adversary` (через `agent()`) + `codex-adversary` (этот протокол). Каталог и скелет —
> [`orchestration-patterns.md`](orchestration-patterns.md) § 5. Применяется для
> security-critical выводов (миграции модели доступа, триггеры, helper-функции, платёжные пути).

- Оба рецензента независимо **ищут дефекты и нарушения инвариантов** в выводе (стартовая
  презумпция: считать некорректным, пока корректность не подтверждена), не видя находок друг друга.
- **Голосование:** оба подтвердили P0/P1 → блок до фикса. Расходятся → team-lead арбитр.
  Все правила выше в силе: исполнитель верифицирует каждый finding сам; **инвариант важнее
  обоих оппонентов**; codex `-s read-only`.
- **codex-ветка fail-soft.** Codex недоступен → паттерн деградирует до
  **single-adversary (claude)** — запись `codex-consult skipped: <reason>`, эпик не
  блокируется. Перед skip — реально попробовать вызов (не скипать по памяти о старой поломке
  credentials).
- В Workflow codex-оппонента удобнее дёргать через `agent({ agentType: 'codex:codex-rescue' })`
  с явным «read-only, не правь код» в промпте (см. «Каналы вызова»), чем через
  general-purpose + ручной CLI-вызов.
- В отчёте: «adversarial: claude N / codex M findings, K подтверждено» или «codex skipped».

## Execution lane — Codex как эскалационный исполнитель

> Отдельная полоса, НЕ second-opinion. Здесь Codex **пишет код** (`codex:codex-rescue`
> форвардит в companion-runtime с `--write`).

**Когда разрешено (ровно два триггера):**
1. Исполнитель (`front`/`db`/team-lead) **застрял**: 2+ неудачные итерации на одной проблеме
   (фикс не сходится, root cause не найден). Решение об эскалации принимает team-lead.
2. **Пользователь явно попросил** отдать задачу Codex («отдай codex», `/codex:rescue`).

**Обязательные правила:**
- Любой код Codex проходит штатный пайплайн: `tester` (real-browser для UI) → `reviewer`
  (полный чеклист). Никаких прямых мержей результата rescue.
- Перед запуском team-lead формулирует задачу со ссылками на инварианты (Codex прочитает
  `AGENTS.md` сам, но конкретный инвариант задачи — в промпт).
- Долгие задачи — `--background`, прогресс через `/codex:status`, результат `/codex:result`.
- Резюме прогона (что делал, какие файлы тронул, вердикт reviewer'а) — в `memory/` по
  обычным правилам эпика.
- Second-opinion gate-точки это НЕ заменяет: на ревью кода, написанного Codex,
  codex-consult не зовётся (нет смысла спрашивать автора) — хватает claude-reviewer.

## Anti-patterns

- ❌ Слепо применять совет codex без верификации.
- ❌ Блокировать эпик из-за недоступности codex (см. fail-soft).
- ❌ Давать codex `-s workspace-write` / `--dangerously-bypass-*` — он консультант, не исполнитель.
- ❌ Вызывать на каждый шаг вместо gate-точки (latency + $).
- ❌ Промпт «посмотри проект и скажи что не так» без скоупа — получишь generic-воду.
- ❌ Weaponized-промпт («сломай / attack / exploit») для money/security-кода — request-классификатор
  режет ответ; формулировать как нейтральный defect-review.
