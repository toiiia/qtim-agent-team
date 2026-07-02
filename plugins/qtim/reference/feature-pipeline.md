# PM-конвейер (feature pipeline) — механика для /qtim:feature

> Generic reference плагина. Читает **только team-lead** при [`/qtim:feature`](../commands/feature.md);
> setup (4.1) переносит суть в charter-секцию «PM-конвейер» и записывает абсолютный путь к этому
> файлу (как с `codex-consult.md`). Субагенты читают правила из charter, не отсюда.

## Принцип

PM-трек документирует, dev-трек реализует. Хотелка проходит фиксированные стадии с checkpoint
у пользователя; артефакты — версионируемые файлы в `docs/features/<slug>/` проекта. `memory/`
хранит только решения и указатели, не содержимое документов.

Точность описания важнее скорости: декомпозиция и оценка обязаны опираться на consult профильных
dev-ролей по реальному коду, а не на предположения product-роли.

## Артефакты и статусы

Канонический набор `docs/features/<slug>/` (slug — kebab-case от короткого имени фичи):

| Файл | Содержимое |
|---|---|
| `intake.md` | исходная хотелка + уточнения пользователя |
| `prd.md` | PRD: цели, сценарии, acceptance criteria |
| `decomposition.md` | work items с привязкой к слоям и файлам |
| `estimate.md` | сводка оценок S/M/L/XL по work items |
| `plan.md` | фазы реализации, gates, handoff |

Шапка каждого файла: `Feature / Slug / Status: Draft | Approved | In Development | Done / Дата`;
в конце — секция «История изменений» (append-only, строка на ревизию).

**Resume-правило:** если `docs/features/<slug>/` уже существует — продолжать с первой стадии,
чей артефакт не в статусе Approved и выше. Конвейер с нуля не перезапускается.

## Стадии и checkpoints

| Стадия | Кто работает | Выход | Checkpoint |
|---|---|---|---|
| 1 Intake | team-lead / `product` | `intake.md` | пользователь подтверждает понимание |
| 2 PRD | `product` | `prd.md` | пользователь утверждает PRD |
| 3 Decomposition | `product` + dev-consult | `decomposition.md` | пользователь утверждает work items |
| 4 Estimation | профильные dev-роли + `product` | `estimate.md` | пользователь принимает оценки |
| 5 Plan | `product` + `architect` | `plan.md` | финальное approval |
| 6 Handoff | team-lead | указатель в `memory/` | — |

**Правило dev-consult (стадии 3-4):** `architect` смотрит слои, data flow и инварианты (его режим
CONSULT); `db` / `front` / `tester` — каждый свой слой: затронутые файлы, интеграционные точки,
похожие существующие фичи, риски. Consult read-only — dev-роли в этих стадиях не правят файлы,
их вывод — evidence для `product`. `explorer` — для широкого read-heavy поиска.

## Правила grounded-оценки

- Шкала только относительная: **S / M / L / XL** + confidence (high / medium / low) + риск-факторы.
  Часы и дни не выдумывать.
- XL означает «work item нужно разрезать», а не «очень долго».
- Размер work item даёт профильная dev-роль — владелец слоя, не product.
- Каждая оценка обязана ссылаться на evidence: конкретные файлы, покрытие тестами, число
  интеграционных точек, похожие прошлые фичи (реестр фич в `memory/`, git log) как reference class.
- Оценка без evidence не принимается в `estimate.md`.

## Handoff contract

- `plan.md` заканчивается секцией `## Handoff` с готовой формулировкой задачи для
  [`/qtim:team-up`](../commands/team-up.md) (многофазные фичи) или
  [`/qtim:team-lazy`](../commands/team-lazy.md) (S/M в одну фазу).
- Dev-команда читает `plan.md` (scope, фазы, gates) и `prd.md` (acceptance criteria) как источник
  требований.
- Кто реализует — обновляет Status артефактов: `In Development` при старте, `Done` после gates.
- В реестр решений `memory/` добавляется одна строка-указатель на утверждённую фичу.

## Anti-patterns

- Оценки и декомпозиция без consult профильных ролей по реальному коду.
- `product` пишет production code, SQL или тесты.
- Пропуск checkpoint «потому что и так очевидно».
- PRD и решения только в чате или `memory/` вместо `docs/features/`.
- Перезапуск конвейера с нуля при существующем slug.
- Дублирование содержимого артефактов в `memory/` вместо указателей.
