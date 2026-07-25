import { cpSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = join(root, ".next", "standalone");

if (!existsSync(standaloneDir)) {
  console.error("Missing .next/standalone — run `npm run build` first.");
  process.exit(1);
}

function copyDir(src, dest, label) {
  if (!existsSync(src)) {
    console.warn(`Skipping ${label}: ${src} not found`);
    return;
  }
  cpSync(src, dest, { recursive: true });
  console.log(`Copied ${label}`);
}

copyDir(join(root, "public"), join(standaloneDir, "public"), "public/");

const staticDest = join(standaloneDir, ".next", "static");
mkdirSync(dirname(staticDest), { recursive: true });
copyDir(join(root, ".next", "static"), staticDest, ".next/static/");
