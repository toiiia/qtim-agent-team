---
name: acme-commands
description: Команды dev/build/test/миграций проекта acme
metadata:
  type: project
---

# Команды acme

- dev: `pnpm dev` (Nuxt, порт 3000; требует `supabase start`)
- typecheck: `pnpm typecheck` — обязателен перед передачей задачи
- build: `pnpm build`
- unit: `pnpm test` (Vitest)
- browser/e2e: `npx playwright test`; headed-прогон — `npx playwright test --headed`
- миграции: новые файлы в `supabase/migrations/`, применение `supabase db push`
- типы из схемы: `supabase gen types typescript --local > types/database.ts`
