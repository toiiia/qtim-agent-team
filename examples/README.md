# Examples — golden-референс генератора

`nuxt-supabase/` — эталонный вывод `/qtim:setup` для вымышленного проекта **acme**
(роль Developer (Q0), Nuxt 3 + Supabase, состав Standard, intake «автопилот с асимметрией»,
Codex Yes, форма Plugin-linked). Показан полный dev-состав: charter целиком, все пять ролей
с собственными файлами (`architect`, `db`, `front`, `tester`, `reviewer`; `explorer` — встроенный
`Explore`, файла не требует), settings, baseline-память, `CLAUDE.md` со строкой импорта charter
и правила по путям в `.claude/rules/`.
PM-дорожка (Q0 = PM/Analyst: роль `product`, charter-секция «PM-конвейер», `docs/features/`)
в эталонах не представлена.

`greenfield-design/` — эталонный вывод `/qtim:setup` для вымышленного дизайн-проекта **glow**
(роль Designer (Q0), пустая папка, intake «автопилот с асимметрией», Codex Yes, форма
Plugin-linked). Показан дизайн-состав: charter с секцией «Дизайн-конвейер», четыре роли с
собственными файлами (`designer`, `proto`, `ds`, `reviewer` из шаблона `reviewer-design-agent`;
`tester` — адаптация `testing-agent` под артефакты показа; `explorer` — встроенный `Explore`),
settings, baseline-память. DS-target в эталоне намеренно не решён (гейт стадии 4): у `ds` и
`proto` сохранены обе ветки с пометкой «активируется гейтом DS-target» — это демонстрация
генерации greenfield до выбора цели. Правил `.claude/rules/` нет намеренно: в пустой папке
глобы `paths` указывали бы на несуществующие каталоги.


Назначение:

1. **Живая документация** — что именно появится в проекте после `/qtim:setup`.
2. **Golden-тест генератора** — правишь шаблоны `templates/roles/` или структуру charter в setup
   Phase 4.1 → обнови эталон и сверь дифф глазами: неожиданные изменения в эталоне =
   регрессия генерации. CI проверяет эталон дважды: `check_placeholders.py` — что не осталось
   плейсхолдеров `{{...}}`, `check_golden.py` — семантику (секции и штамп версии charter,
   поля frontmatter ролей, `Skill` у ролей со скилами, `agent-memory/<role>/MEMORY.md`,
   строки `## codex-consult:` / `## adversary:` в схеме отчёта `reviewer`).

Это НЕ рабочий проект: кода нет, пути и значения вымышленные. Протокол codex-consult роли
зовут по имени скила (`qtim:codex-consult`) — абсолютных путей к `reference/*` в charter
с 1.12.0 нет.
