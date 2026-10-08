#!/usr/bin/env node

const { spawn } = require("node:child_process");
const { join } = require("node:path");

const nextBin = join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, "start"], {
  stdio: "inherit",
  env: process.env,
});

const forwardSignal = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("error", (err) => {
  console.error("Failed to launch Next.js:", err);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
    return;
  }

  process.exit(code ?? 0);
});
