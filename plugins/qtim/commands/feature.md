---
description: Провести хотелку от идеи до плана реализации — intake → PRD → декомпозиция → оценка → план → handoff (PM-конвейер с артефактами в docs/features/)
argument-hint: [опционально короткое имя фичи, например "избранное для товаров"]
---

# /qtim:feature — PM-конвейер «хотелка → план»

> **Этот файл читает только team-lead (оркестратор).** Субагенты его не открывают. Канон рантайма
> (`Agent`/`SendMessage`/`Task*`, упразднённые `TeamCreate`/`team_name`) — в [`team-up.md`](team-up.md).
> Механика конвейера (артефакты, статусы, правила оценки, handoff) —
> в [`../reference/feature-pipeline.md`](../reference/feature-pipeline.md); её суть также в charter,
> секция «PM-конвейер».

Ты ведёшь хотелку от сырой идеи до утверждённого плана. Production code в этом конвейере не
пишется — выход это документы в `docs/features/<slug>/` и handoff в
[`/qtim:team-up`](team-up.md) / [`/qtim:team-lazy`](team-lazy.md).

## Preconditions

1. Прочитай `.claude/team-charter.md`. Нет charter — сначала `/qtim:setup`. Charter есть, но без
   секции «PM-конвейер» или роли `product` в составе — предложи дополнить через `/qtim:setup`
   (он дописывает недостающее, не пересоздавая) и остановись.
2. Прочитай [`../reference/feature-pipeline.md`](../reference/feature-pipeline.md).
3. Определи slug: kebab-case от `$ARGUMENTS` или короткого имени фичи из запроса.
4. Если `docs/features/<slug>/` уже существует — прочитай Status артефактов и **продолжи с первой
   стадии, чей артефакт не в статусе Approved и выше** (Approved / In Development / Done).
   С нуля не перезапускай.

## Стадии

Checkpoint после каждой стадии — через `AskUserQuestion` (или прямой вопрос): без подтверждения
на следующую стадию не переходишь; **после подтверждения переведи артефакт стадии в
`Status: Approved`** — иначе resume по статусам откатит конвейер на эту стадию. Intake-режим
charter влияет на форму и детальность подтверждений, но checkpoints не отменяет.

### 1. Intake

Перед вопросами прочитай продуктовую память, если создана (`memory/product-map.md`,
`product-actors.md`, `product-glossary.md`, `product-metrics.md` — её наполняет
[`/qtim:product-onboard`](product-onboard.md)): говори терминами продукта и не спрашивай то,
что уже известно из памяти. Если памяти нет и кодовая база существует — предложи прогнать
`/qtim:product-onboard` (не блокирует: можно продолжать без него).

Задай пользователю структурированные вопросы одним блоком: какую проблему решаем и кто её
испытывает; желаемый результат; критерии успеха; ограничения (сроки, зависимости, совместимость);
что явно вне scope. Запиши `docs/features/<slug>/intake.md`. **Checkpoint:** сводка понимания.

### 2. PRD

Спавни `product` (`subagent_type` из charter) в режиме PRD — на входе `intake.md`, на выходе
`prd.md`: цели, не-цели, сценарии с acceptance criteria, UX-заметки, метрики, риски, open
questions. Метрики успеха привязываются к реальным событиям аналитики из
`memory/product-metrics.md`, когда память создана; отсутствующее событие — задача на трекинг,
не факт. **Checkpoint:** пользователь утверждает или правит; Status → Approved.

### 3. Decomposition (grounded)

Точность важнее скорости — декомпозиция строится на consult dev-ролей, не на предположениях:

1. Параллельный fan-out (одним сообщением, read-only consult): `architect` в режиме CONSULT —
   слои, data flow, инварианты; профильные `db` / `front` / `tester` — каждый по своему слою:
   затронутые файлы, интеграционные точки, похожие существующие фичи, риски. Широкий поиск —
   `explorer` (`subagent_type: Explore`). Уже поднятых в сессии продолжай через `SendMessage`,
   не переспавнивай.
2. Передай consult-выводы `product` (режим DECOMPOSE) — он собирает `decomposition.md`:
   таблица `id | название | слой/роль | зависимости | evidence (файлы)`.

**Checkpoint:** пользователь утверждает состав work items.

### 4. Estimation (grounded)

Размер каждого work item даёт профильная dev-роль — владелец слоя (`SendMessage` поднятым в
стадии 3): S / M / L / XL + confidence + риск-факторы, каждая оценка с evidence. Оценка без
evidence не принимается; XL = разрезать work item и вернуться к декомпозиции. `product`
(режим ESTIMATE) сводит `estimate.md` с итоговой таблицей и суммарным риском.
**Checkpoint:** пользователь принимает оценки.

### 5. Plan

`product` (режим PLAN) + `architect` собирают `plan.md`: фазы/milestones с составом work items;
что параллелится (независимые единицы работы); verification gates по фазам (typecheck, build,
tests, real-browser для UI); rollout/rollback и обратимость; критерий Done.
**Checkpoint:** финальное approval; Status → Approved.

### 6. Handoff

1. Добавь строку-указатель на фичу в реестр решений и фич `memory/decisions.md` (нет файла → создай по формату setup 4.4).
2. `plan.md` заканчивается секцией `## Handoff` с готовой формулировкой:

```
/qtim:team-up, реализуй Phase 1 из docs/features/<slug>/plan.md.
PRD и acceptance criteria: docs/features/<slug>/prd.md.
Обнови Status артефактов: In Development при старте, Done после gates.
```

3. Рекомендация: многофазные фичи — `/qtim:team-up`; S/M в одну фазу — `/qtim:team-lazy`.
   Если charter собран PM-составом (Q0 = PM/Analyst, без `reviewer`) — предупреди в handoff:
   перед реализацией состав дополняется dev-дорожкой (повторный `/qtim:setup`), иначе петля
   режима D остаётся без финального гейта.
4. Если реализацию запускает не пользователь-PM — сообщи, что разработчик выполняет эту
   формулировку в своей сессии.

## Anti-patterns

- Декомпозиция или оценки без consult профильных dev-ролей по реальному коду.
- Production code, SQL или тесты из этого конвейера.
- Пропуск checkpoint «потому что очевидно».
- PRD и решения только в чате или `memory/` вместо `docs/features/`.
- Перезапуск конвейера с нуля при существующем slug.
- Полный прогрев команды ради конвейера — спавнь только нужные роли (это режим C, не D).
