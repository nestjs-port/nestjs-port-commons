#!/usr/bin/env node
import { cp, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

function run(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options,
    });

    child.on("error", rejectPromise);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(
        new Error(
          signal
            ? `${command} exited with signal ${signal}`
            : `${command} exited with code ${code}`,
        ),
      );
    });
  });
}

function capture(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "inherit"],
      shell: false,
      ...options,
    });

    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.on("error", rejectPromise);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise(stdout);
        return;
      }

      rejectPromise(
        new Error(
          signal
            ? `${command} exited with signal ${signal}`
            : `${command} exited with code ${code}`,
        ),
      );
    });
  });
}

async function main() {
  const packageDir = process.cwd();
  const args = process.argv.slice(2);
  const workspaceTmpDir = await mkdtemp(join(tmpdir(), "nestjs-port-jsr-"));
  const packDir = join(workspaceTmpDir, "pack");
  const publishDir = join(workspaceTmpDir, "publish");

  try {
    await mkdir(packDir, { recursive: true });
    await run("pnpm", ["pack", "--pack-destination", packDir], {
      cwd: packageDir,
    });

    const tarball = (await readdir(packDir)).find((entry) =>
      entry.endsWith(".tgz"),
    );
    if (!tarball) {
      throw new Error("pnpm pack did not produce a tarball");
    }

    const packedPackageJson = await capture("tar", [
      "-xOf",
      join(packDir, tarball),
      "package/package.json",
    ]);

    await cp(packageDir, publishDir, { recursive: true });
    await writeFile(join(publishDir, "package.json"), packedPackageJson);

    await run("jsr", ["publish", ...args], {
      cwd: publishDir,
    });
  } finally {
    await rm(workspaceTmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
