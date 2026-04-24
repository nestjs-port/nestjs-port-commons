#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function getWorkspaceRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function discoverJsrPackageDirs() {
  const root = getWorkspaceRoot();
  const packagesDir = path.join(root, "packages");
  const packageDirs = [];

  walk(packagesDir, packageDirs);

  return packageDirs.sort();
}

function walk(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, acc);
      continue;
    }

    if (entry.isFile() && entry.name === "jsr.json") {
      acc.push(dir);
    }
  }
}

for (const packageDir of discoverJsrPackageDirs()) {
  const packageJsonPath = path.join(packageDir, "package.json");
  const jsrJsonPath = path.join(packageDir, "jsr.json");

  if (!fs.existsSync(packageJsonPath) || !fs.existsSync(jsrJsonPath)) continue;

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const jsrJson = JSON.parse(fs.readFileSync(jsrJsonPath, "utf8"));

  if (jsrJson.version === packageJson.version) continue;

  jsrJson.version = packageJson.version;
  fs.writeFileSync(jsrJsonPath, `${JSON.stringify(jsrJson, null, 2)}\n`);
}
