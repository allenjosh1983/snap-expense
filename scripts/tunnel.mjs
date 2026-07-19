#!/usr/bin/env node
/**
 * Cloudflare Quick Tunnel — exposes localhost:3001 over trusted HTTPS.
 * Requires the dev server to be running first (`npm run dev`).
 * On first run, downloads cloudflared into tools/ if missing.
 */
import { spawn } from "child_process";
import { createWriteStream } from "fs";
import { access, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { get as httpsGet } from "https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const toolsDir = join(root, "tools");
const isWin = process.platform === "win32";
const cloudflaredName = isWin ? "cloudflared.exe" : "cloudflared";
const cloudflaredPath = join(toolsDir, cloudflaredName);
const downloadUrl = isWin
  ? "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
  : process.platform === "darwin" && process.arch === "arm64"
    ? "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz"
    : "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64";

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveCloudflared() {
  if (await exists(cloudflaredPath)) return cloudflaredPath;

  console.log("cloudflared not found — downloading to tools/ …");
  await mkdir(toolsDir, { recursive: true });

  if (isWin) {
    await downloadFile(downloadUrl, cloudflaredPath);
    return cloudflaredPath;
  }

  console.error(
    "cloudflared is not installed.\n" +
      "Install it (brew install cloudflared / apt install cloudflared) or download manually:\n" +
      downloadUrl
  );
  process.exit(1);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const follow = (u) => {
      httpsGet(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          follow(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }
        const file = createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", reject);
      }).on("error", reject);
    };
    follow(url);
  });
}

async function main() {
  const bin = await resolveCloudflared();
  const port = process.env.PORT || "3001";
  const target = `http://localhost:${port}`;

  console.log("");
  console.log("Starting Cloudflare Quick Tunnel …");
  console.log(`  Local target: ${target}`);
  console.log("");
  console.log("⚠  The tunnel URL is PUBLIC to anyone who has the link.");
  console.log("   Use for testing only. A new URL is issued each session.");
  console.log("");
  console.log("Waiting for https://*.trycloudflare.com URL …");
  console.log("");

  const child = spawn(bin, ["tunnel", "--url", target], {
    stdio: ["inherit", "pipe", "pipe"],
  });

  let urlPrinted = false;
  const printUrl = (line) => {
    const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match && !urlPrinted) {
      urlPrinted = true;
      console.log("────────────────────────────────────────────");
      console.log("  Open on your iPhone:");
      console.log(`  ${match[0]}`);
      console.log("────────────────────────────────────────────");
      console.log("");
    }
    process.stdout.write(line + "\n");
  };

  child.stdout.on("data", (buf) => {
    buf
      .toString()
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach(printUrl);
  });

  child.stderr.on("data", (buf) => {
    buf
      .toString()
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach(printUrl);
  });

  child.on("close", (code) => process.exit(code ?? 0));
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
