#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const roots = process.argv.slice(2);
if (!roots.length) {
  console.error("usage: add-js-ext.mjs <dir> ...");
  process.exit(1);
}

const TS_EXT_RE = /\.(ts|tsx|mts|cts)$/;
const DTS_RE = /\.d\.(ts|mts|cts)$/;

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      e.name === "node_modules" ||
      e.name === "dist" ||
      e.name === "generated"
    )
      continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (TS_EXT_RE.test(e.name) && !DTS_RE.test(e.name)) acc.push(full);
  }
  return acc;
}

function resolveSpec(fromFile, spec) {
  if (/\.(js|jsx|mjs|cjs|json)$/.test(spec)) return null;
  const target = path.resolve(path.dirname(fromFile), spec);
  const exts = [".ts", ".tsx", ".mts", ".cts"];
  for (const ext of exts) if (fs.existsSync(target + ext)) return spec + ".js";
  for (const ext of exts)
    if (fs.existsSync(path.join(target, "index" + ext)))
      return spec.replace(/\/$/, "") + "/index.js";
  return null;
}

const RE =
  /(\bfrom\s+|\bimport\s*\(\s*|^\s*import\s+|;\s*import\s+)(['"])(\.\.?\/[^'"`\n]*)\2/gm;
const BARE_RE =
  /(\bfrom\s+|\bimport\s*\(\s*|^\s*import\s+|;\s*import\s+)(['"])(\.\.?)\2/gm;

let files = 0,
  modFiles = 0,
  modSpecs = 0;
const unresolved = [];
for (const root of roots) {
  for (const file of walk(root)) {
    files++;
    const src = fs.readFileSync(file, "utf8");
    let out = src.replace(RE, (m, pre, q, spec) => {
      const r = resolveSpec(file, spec);
      if (r == null) {
        if (!/\.(js|jsx|mjs|cjs|json)$/.test(spec))
          unresolved.push({ file, spec });
        return m;
      }
      modSpecs++;
      return `${pre}${q}${r}${q}`;
    });
    out = out.replace(BARE_RE, (_, pre, q, dot) => {
      modSpecs++;
      return `${pre}${q}${dot}/index.js${q}`;
    });
    if (out !== src) {
      fs.writeFileSync(file, out);
      modFiles++;
    }
  }
}
console.log(
  `scanned ${files}, modified ${modFiles}, rewrote ${modSpecs} specifiers`,
);
if (unresolved.length) {
  console.log(`unresolved: ${unresolved.length}`);
  for (const u of unresolved.slice(0, 50))
    console.log(" ", u.file, "::", u.spec);
}
