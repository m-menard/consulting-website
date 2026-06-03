/**
 * Starts local API server + Vite with a shared free port for /api proxying.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PREFERRED_PORT = parseInt(process.env.API_DEV_PORT || "3000", 10);

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, "127.0.0.1");
  });
}

async function findAvailablePort(start) {
  for (let port = start; port < start + 20; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free port found between ${start} and ${start + 19}`);
}

const port = await findAvailablePort(PREFERRED_PORT);
const apiBase = `http://127.0.0.1:${port}`;

if (port !== PREFERRED_PORT) {
  console.log(
    `[dev] Port ${PREFERRED_PORT} is in use; using ${port} for the API server instead.`
  );
  console.log(
    `[dev] To free ${PREFERRED_PORT}: lsof -ti:${PREFERRED_PORT} | xargs kill -9`
  );
}

console.log(`[dev] API → ${apiBase}  |  Web → http://localhost:5173\n`);

const env = {
  ...process.env,
  API_DEV_PORT: String(port),
  VITE_API_PROXY_TARGET: apiBase,
};

function runNpmScript(name, label) {
  return spawn(npmCmd, ["run", name], {
    cwd: root,
    env,
    stdio: "inherit",
  });
}

const api = runNpmScript("dev:api", "api");
const web = runNpmScript("dev:client", "web");

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  api.kill("SIGTERM");
  web.kill("SIGTERM");
  setTimeout(() => process.exit(code), 300);
}

api.on("exit", (code) => {
  if (!shuttingDown) {
    console.log("\n[dev] API server stopped.");
    shutdown(code ?? 1);
  }
});

web.on("exit", (code) => {
  if (!shuttingDown) {
    console.log("\n[dev] Vite stopped.");
    shutdown(code ?? 1);
  }
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
