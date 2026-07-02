#!/usr/bin/env node
// Синтаксическая проверка Workflow-скриптов. Движок Workflow исполняет тело скрипта
// в async-контексте, где top-level return/await легальны — поэтому обычный `node --check`
// (модульный парсинг) здесь даёт ложный fail. Воспроизводим движок: `export const meta`
// заменяем на локальную декларацию и парсим тело конструктором AsyncFunction (без исполнения).
import { readFileSync } from "node:fs";

const AsyncFunction = (async () => {}).constructor;
let failed = false;

for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, "utf8").replace(/^export\s+const\s+meta/m, "const meta");
  try {
    new AsyncFunction("agent", "parallel", "pipeline", "phase", "log", "args", "budget", "workflow", src);
    console.log(`OK: ${file}`);
  } catch (e) {
    console.error(`${file}: ${e.message}`);
    failed = true;
  }
}

if (process.argv.length <= 2) {
  console.error("Не передано ни одного файла");
  failed = true;
}
if (failed) process.exit(1);
