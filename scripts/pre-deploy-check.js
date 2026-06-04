#!/usr/bin/env node
/**
 * Pre-deploy check script
 * 1. Runs production build
 * 2. Starts preview server
 * 3. Verifies SSR on key routes
 * 4. Checks for catastrophic error patterns
 */
import { spawn } from "child_process";

const PREVIEW_PORT = 4173;
const ROUTES = ["/", "/auth", "/app"];
const CATASTROPHIC_PATTERNS = [
  '"unhandled":true',
  '"message":"HTTPError"',
];

function run(cmd, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: opts.stdio ?? "inherit",
      shell: opts.shell ?? false,
    });
    if (opts.detach) child.unref();
    child.on("close", (code) => {
      if (code !== 0 && !opts.allowFail) {
        reject(new Error(`Command "${cmd} ${args.join(" ")}" exited with ${code}`));
      } else {
        resolve(code);
      }
    });
    child.on("error", reject);
    if (opts.getPid) opts.getPid(child.pid);
  });
}

async function waitForServer(url, retries = 40, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error("Server did not become ready in time");
}

async function checkRoute(route) {
  const url = `http://localhost:${PREVIEW_PORT}${route}`;
  const res = await fetch(url);
  const text = await res.text();
  const isHtml = res.headers.get("content-type")?.includes("text/html");

  const errors = [];
  if (res.status >= 500) errors.push(`HTTP ${res.status}`);
  if (!isHtml) errors.push(`Content-Type is "${res.headers.get("content-type")}", expected text/html`);
  for (const pat of CATASTROPHIC_PATTERNS) {
    if (text.includes(pat)) errors.push(`Contains catastrophic pattern: ${pat}`);
  }
  if (text.length < 200) errors.push(`Body too short (${text.length} chars)`);

  return { route, ok: errors.length === 0, errors, status: res.status };
}

async function main() {
  console.log("\n🚀  Pre-deploy check\n");

  // 1. Build
  console.log("📦  Running production build…\n");
  await run("bun", ["run", "build"]);
  console.log("\n✅  Build passed\n");

  // 2. Start preview server in background
  console.log("🔌  Starting preview server…");
  let previewPid = null;
  await run("bun", ["run", "preview", "--port", String(PREVIEW_PORT)], {
    stdio: "ignore",
    detach: true,
    getPid: (pid) => {
      previewPid = pid;
    },
  });

  // Give the detached process a moment to spawn
  await new Promise((r) => setTimeout(r, 1000));

  try {
    await waitForServer(`http://localhost:${PREVIEW_PORT}`);
    console.log("✅  Preview server ready\n");

    // 3. Check routes
    console.log("🔍  Checking SSR routes…\n");
    const results = [];
    for (const route of ROUTES) {
      const result = await checkRoute(route);
      results.push(result);
      const icon = result.ok ? "✅" : "❌";
      console.log(`  ${icon}  ${route.padEnd(6)}  HTTP ${result.status}`);
      for (const err of result.errors) console.log(`      → ${err}`);
    }

    const failed = results.filter((r) => !r.ok);
    console.log("");

    if (failed.length === 0) {
      console.log("🎉  All checks passed — safe to deploy!\n");
      process.exit(0);
    } else {
      console.log(`❌  ${failed.length} route(s) failed SSR checks. Fix before deploying.\n`);
      process.exit(1);
    }
  } finally {
    // 4. Kill preview server
    if (previewPid) {
      try {
        process.kill(previewPid, "SIGTERM");
      } catch {}
    }
  }
}

main().catch((err) => {
  console.error("\n💥  Pre-deploy check failed:\n", err.message);
  process.exit(1);
});
