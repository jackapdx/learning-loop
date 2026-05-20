import tailwindcss from "@tailwindcss/vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type Plugin } from "vite";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const LESSONS_ROOT = resolve(__dirname, "..", "..", "lessons");

/** Vite plugin: auto-rebuild lessons-data.ts when lesson .md files change during dev */
function lessonWatchPlugin(): Plugin {
  let running = false;
  let pending = false;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  function rebuild() {
    if (running) {
      pending = true;
      return;
    }
    running = true;
    pending = false;
    // Debounce: batch rapid changes
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      const proc = spawn("bun", ["run", "scripts/prebuild-lessons.ts"], {
        cwd: __dirname,
        stdio: "pipe",
      });
      proc.stdout?.on("data", (d: Buffer) => process.stdout.write(d));
      proc.stderr?.on("data", (d: Buffer) => process.stderr.write(d));
      proc.on("close", () => {
        running = false;
        if (pending) rebuild();
      });
    }, 200);
  }

  return {
    name: "lesson-md-watch",
    apply: "serve",
    configureServer(server) {
      server.watcher.add(LESSONS_ROOT);

      const onMdChange = (file: string) => {
        if (file.endsWith(".md")) rebuild();
      };
      server.watcher.on("add", onMdChange);
      server.watcher.on("change", onMdChange);
      server.watcher.on("unlink", onMdChange);

      console.log(`  📝 Watching ${LESSONS_ROOT} for lesson .md changes`);
    },
  };
}

export default defineConfig({
  clearScreen: false,
  plugins: [svelte(), tailwindcss(), lessonWatchPlugin()],
  build: {
    outDir: "dist",
  },
  server: {
    port: 5173,
    host: true,
  },
});
