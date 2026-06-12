import { spawn, spawnSync } from "node:child_process";
import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import { chromium } from "playwright";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const presentationDir = path.resolve(scriptDir, "..");
const args = process.argv.slice(2);
const outputFlag = args.indexOf("--output");
const outputDir = path.resolve(
  presentationDir,
  outputFlag >= 0 && args[outputFlag + 1] ? args[outputFlag + 1] : "dist-static",
);
const exportDir = path.join(presentationDir, ".export");
const archivePath = path.join(exportDir, "infected-last-defense.zip");
const logPath = path.join(exportDir, "export.log");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => {
        if (error) reject(error);
        else if (port) resolve(port);
        else reject(new Error("Unable to allocate a preview port"));
      });
    });
  });
}

async function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  await appendFile(logPath, `${line}\n`, "utf8");
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: presentationDir,
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function waitForServer(url, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function addPublicNavigation(html) {
  const backButton = `
<a class="game-back-link" href="../" aria-label="返回遊戲首頁">← 返回遊戲</a>
<style>
.game-back-link {
  position: fixed; top: 18px; left: 18px; z-index: 50;
  padding: 10px 15px; color: #b9f53c;
  border: 1px solid rgba(185,245,60,.58);
  background: rgba(5,8,6,.82); font: 700 14px/1.2 system-ui, sans-serif;
  letter-spacing: .08em; text-decoration: none; backdrop-filter: blur(8px);
}
.game-back-link:hover { color: #071006; background: #b9f53c; }
@media (max-width: 700px) {
  .game-back-link { top: 10px; left: 10px; padding: 8px 11px; font-size: 12px; }
}
</style>`;

  return html
    .replace('<html lang="en">', '<html lang="zh-Hant">')
    .replace(
      /<title>.*?<\/title>/,
      "<title>感染者 最後防線：Web 2.5D 俯視射擊遊戲製作實錄</title>",
    )
    .replace("</body>", `${backButton}\n</body>`);
}

let preview;
let browser;
try {
  const port = await findAvailablePort();
  const previewUrl = `http://127.0.0.1:${port}`;

  await rm(exportDir, { recursive: true, force: true });
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(exportDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  await log("Building open-slide production site");
  await run(npm, ["run", "build"]);

  await log(`Starting preview server on ${previewUrl}`);
  preview = spawn(
    npm,
    ["run", "preview", "--", "--port", String(port)],
    {
      cwd: presentationDir,
      stdio: "inherit",
      shell: process.platform === "win32",
    },
  );

  await waitForServer(previewUrl);
  await log("Launching Chromium");
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    acceptDownloads: true,
    viewport: { width: 1440, height: 900 },
  });
  await page.goto(`${previewUrl}/s/infected-last-defense`, { waitUntil: "networkidle" });
  await log("Presentation page loaded");

  const downloadButton = page.getByRole("button", { name: "Download" });
  await downloadButton.click();

  const exportItem = page.getByText("Export as HTML", { exact: true });
  const downloadPromise = page.waitForEvent("download");
  await exportItem.click();
  const download = await downloadPromise;
  await download.saveAs(archivePath);
  await log("HTML archive downloaded");

  const archive = unzipSync(new Uint8Array(await readFile(archivePath)));
  for (const [relativePath, bytes] of Object.entries(archive)) {
    const target = path.join(outputDir, relativePath);
    if (relativePath.endsWith("/") || (!path.extname(relativePath) && bytes.length === 0)) {
      await mkdir(target, { recursive: true });
      continue;
    }
    await mkdir(path.dirname(target), { recursive: true });
    if (relativePath.endsWith(".html")) {
      const html = addPublicNavigation(new TextDecoder().decode(bytes));
      await writeFile(target, html, "utf8");
    } else {
      await writeFile(target, bytes);
    }
  }
  await log(`Presentation exported to ${outputDir}`);
} catch (error) {
  const detail = error instanceof Error ? error.stack ?? error.message : String(error);
  await log(`Export failed\n${detail}`);
  throw error;
} finally {
  await browser?.close();
  if (preview?.pid && process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(preview.pid), "/t", "/f"], {
      stdio: "ignore",
    });
  } else {
    preview?.kill();
  }
}
