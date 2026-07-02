---
name: acme-invariants
description: Доменные инварианты acme (тенант, деньги, файлы) с прецедентами в коде
metadata:
  type: project
---

# Доменные инварианты acme

1. Тенант = workspace: корневые таблицы несут `workspace_id` (FK + cascade + индекс);
   видимость режет только RLS через `is_workspace_member()` — прецедент: `supabase/migrations/0003_estimates.sql`.
2. Дочерние сущности без собственного `workspace_id` — доступ через родителя:
   `estimate_items` → `estimates` (см. политику в `0004_estimate_items.sql`).
3. Деньги `numeric(12,2)`; сумма сметы — generated/trigger в БД, фронт не считает.
4. Справочники unique per-workspace: partial unique по `lower(label)`.
5. Storage: приватный bucket `attachments`, presign TTL ≤ 10 мин, ключ `workspace_id/estimate_id/...`.

Конфликт задачи с инвариантом — не «исправлять молча», а выносить пользователю (intake-протокол).
