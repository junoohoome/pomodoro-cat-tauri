import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { baseFixture } from "./fixtures";
import { scenarios } from "./scenarios";

const PORT = 1420;
const OUT_ROOT = ".visual-check";

async function main() {
  // 1) 起Vite dev server（进程内，跑完一起关）
  const server = await createServer({
    root: process.cwd(),
    server: { port: PORT, strictPort: true },
    logLevel: "silent",
  });
  await server.listen();
  const base = `http://localhost:${PORT}`;
  console.log(`visual-check: vite ready at ${base}`);

  // 2) 输出目录（带时间戳）
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join(OUT_ROOT, stamp);
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 960, height: 680 } });

  const files: string[] = [];
  try {
    for (let i = 0; i < scenarios.length; i++) {
      const s = scenarios[i];
      const fixture = { ...baseFixture, ...s.fixture }; // 场景 override 优先
      const page = await context.newPage();

      // 注入 invoke mock（必须在页面脚本前；addInitScript 序列化 fixture 进页面）
      await page.addInitScript((fx) => {
        (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
          invoke: (cmd: string): unknown =>
            Promise.resolve(cmd in fx ? (fx as Record<string, unknown>)[cmd] : null),
        };
      }, fixture);

      await page.goto(`${base}${s.route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800); // 等 React mount + mock 数据返回后渲染

      const file = `${String(i + 1).padStart(2, "0")}-${s.slug}.png`;
      await page.screenshot({ path: join(outDir, file), fullPage: true });
      files.push(file);
      console.log(`visual-check: captured ${file} (${s.label})`);
      await page.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }

  // 3) 写 manifest.md
  const rows = scenarios
    .map((s, i) => `| ${String(i + 1).padStart(2, "0")} | ${s.label} | \`${s.route}\` | ${files[i]} | ${s.intent} |`)
    .join("\n");
  const manifest = `# Visual Check — ${stamp}\n\n路由：\`http://localhost:${PORT}\`，viewport 960×680，fullPage 截图。\n\n| # | 场景 | 路由 | 截图 | 边界意图 |\n|---|---|---|---|---|\n${rows}\n`;
  await writeFile(join(outDir, "manifest.md"), manifest);

  // 4) latest 指针（删旧的、建软链 → 本次）
  const latest = join(OUT_ROOT, "latest");
  await rm(latest, { force: true });
  await symlink(stamp, latest, "dir");

  console.log(`\nvisual-check: done. ${files.length} screenshots + manifest at ${outDir}`);
  console.log(`visual-check: 'latest' -> ${stamp}`);
}

main().catch((e) => {
  console.error("visual-check failed:", e);
  process.exit(1);
});
