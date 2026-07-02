# Team Charter — acme

Версия 1.0 · 2026-07-02 · generated-by: qtim v1.6.0 · mode: plugin-linked

## Назначение

acme — SaaS для управления проектными сметами: workspace-команды ведут проекты, позиции смет
и файлы-вложения. Публичная часть — маркетинговый лендинг; продукт за авторизацией.

## Стек (фиксированный)

- **Frontend:** Nuxt 3 (Vue 3, строгий TypeScript), Pinia, Tailwind.
- **Backend/данные:** Supabase — Postgres + RLS, Storage (вложения), Realtime (позиции смет).
- **Команды:** dev `pnpm dev` · typecheck `pnpm typecheck` · build `pnpm build` ·
  unit `pnpm test` (Vitest) · e2e/браузер `npx playwright`.
- **Миграции:** `supabase/migrations/`, применение `supabase db push`.

## Intake-режим

Автопилот с асимметрией: проектирование совместно с пользователем (design brief →
approval-гейт), реализация автономно, вопросы — только на вновь всплывших необратимых
развилках. Механика — `intake-protocol.md` плагина.

## Состав

| Роль | subagent_type | Mission | Triggers | Do-not-touch | Read on spawn | Skills | Mandatory practices |
|---|---|---|---|---|---|---|---|
| architect | architect-agent | ADR, границы модулей, дизайн фич | новая фича, рефактор, «куда положить» | миграции, UI, E2E | memory/architecture, memory/decisions | brainstorming, grill-me | brainstorming до ADR; codex на нетривиальном ADR |
| db | database-agent | схема, RLS, миграции, индексы | изменение схемы/политик, медленный запрос | UI, CSS, тесты tester'а | memory/schema, последние 5 миграций | supabase-postgres-best-practices, query-optimization | идемпотентные миграции; RLS на каждой таблице; codex на security-critical |
| front | frontend-agent | страницы, composables, компоненты | UI-задачи после готовности схемы | SQL/миграции, политики | memory/ui-spec, types/database.ts | nuxt, typescript-expert | pnpm typecheck + build гейт; self-check в реальном браузере |
| tester | testing-agent | real-browser sweep, регрессии | «эпик готов», баг-репорт, pre-merge | прод-код | memory/test-cases, memory/bug-log | e2e-testing | real-browser sweep + скриншоты; console/network чистые |
| reviewer | reviewer-agent | финальный гейт APPROVED/NOT APPROVED | завершение эпика, hotfix-review | правки кода | memory/review-report, memory/production-checklist | security-hardening | гейты typecheck/build/tests; codex перед APPROVED |
| explorer | Explore | быстрый поиск по репо | «где определено X» | любые правки | — | — | — |

Имена ролей зафиксированы — задачи привязываются к `owner`.

## Доменные инварианты (нерушимы)

1. Тенант = workspace: каждая корневая таблица несёт `workspace_id` (FK + ON DELETE CASCADE
   + индекс); видимость режет только RLS через `is_workspace_member()`.
2. Дочерние сущности (позиции сметы, вложения) собственного `workspace_id` НЕ имеют —
   доступ наследуют через проверку родителя.
3. Деньги — `numeric(12,2)`, суммы смет считает БД (generated/trigger), не фронт.
4. Справочники: уникальность per-workspace (partial unique по normalized label).
5. Файлы: приватный bucket, presign TTL ≤ 10 мин, ключ привязан к workspace.

## Codex second-opinion

Gate-точки: reviewer перед APPROVED · architect на нетривиальном ADR · db на security-critical
миграции (RLS/триггер/helper). Протокол:
`/Users/dev/.claude/plugins/marketplaces/qtim-agent-team/plugins/qtim/reference/codex-consult.md`
(advisory: инвариант > совет codex; read-only; fail-soft). Money-критичное — dual-adversary.

## Правила работы

- Коммуникация — `SendMessage`; задачи — `TaskCreate`/`TaskUpdate` с `owner`; общий список один.
- Universal skills (проверены на доступность): `using-superpowers`, `karpathy-guidelines`.
- Канон рантайма (упразднённость `TeamCreate`/`team_name`) — см. `/qtim:team-up`, здесь не дублируется.
- Anti-patterns: спавн дублей вместо `SendMessage`; отчёт процессом вместо результата;
  правки чужой зоны (см. do-not-touch).

## Файлы памяти

Baseline (создан setup): `memory/MEMORY.md` (индекс) · `memory/commands.md` ·
`memory/invariants.md` · `memory/decisions.md` (реестр решений и фич — строки-указатели
на ADR и `docs/features/`, содержимое не дублируется).

Создаются ролями по мере работы: `memory/architecture.md`, `memory/schema.md` (architect/db) ·
`memory/ui-spec.md` (front) · `memory/test-cases.md`, `memory/bug-log.md` (tester) ·
`memory/review-report.md`, `memory/production-checklist.md` (reviewer) ·
`memory/retro-log.md` (первым retro) · `memory/epic-state.md` (только на время
незавершённого эпика).
