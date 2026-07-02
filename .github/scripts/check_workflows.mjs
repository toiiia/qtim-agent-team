#!/usr/bin/env node
// Проверка Workflow-скриптов. Движок Workflow исполняет тело скрипта
// в async-контексте, где top-level return/await легальны — поэтому обычный `node --check`
// (модульный парсинг) здесь даёт ложный fail. Воспроизводим движок: `export const meta`
// заменяем на локальную декларацию и парсим тело конструктором AsyncFunction (без исполнения).
// Дополнительно — лексический запрет источников недетерминизма, ломающих resume
// (Date.now() / Math.random() / безаргументный new Date() в движке бросают исключение).
import { readFileSync } from "node:fs";

const AsyncFunction = (async () => {}).constructor;
const BANNED = /\bDate\.now\s*\(|\bMath\.random\s*\(|\bnew\s+Date\s*\(\s*\)/g;
let failed = false;

for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, "utf8").replace(/^export\s+const\s+meta/m, "const meta");
  const banned = src.match(BANNED);
  if (banned) {
    console.error(`${file}: запрещено (ломает resume Workflow): ${[...new Set(banned.map(s => s.trim()))].join(", ")}`);
    failed = true;
    continue;
  }
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
