/**
 * Local API server for `npm run dev` (port 3000).
 * Mirrors Vercel serverless routes: /api/intake, /api/contact
 */
import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import intakeHandler from "../api/intake";
import contactHandler from "../api/contact";

const PORT = parseInt(process.env.API_DEV_PORT || "3000", 10);

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function createVercelLikeReq(
  req: IncomingMessage,
  body: unknown
): IncomingMessage & { body: unknown; query: Record<string, string> } {
  const vercelReq = req as IncomingMessage & {
    body: unknown;
    query: Record<string, string>;
  };
  vercelReq.body = body;
  vercelReq.query = {};
  return vercelReq;
}

function createVercelLikeRes(serverRes: ServerResponse): ServerResponse & {
  status: (code: number) => ServerResponse & { json: (data: unknown) => void };
} {
  const res = serverRes as ServerResponse & {
    statusCode: number;
    status: (code: number) => ServerResponse & { json: (data: unknown) => void };
    json: (data: unknown) => void;
  };

  res.status = function status(code: number) {
    res.statusCode = code;
    return res as ServerResponse & { json: (data: unknown) => void };
  };

  res.json = function json(data: unknown) {
    if (!res.getHeader("Content-Type")) {
      res.setHeader("Content-Type", "application/json");
    }
    res.end(JSON.stringify(data));
  };

  return res;
}

const routes: Record<
  string,
  (req: IncomingMessage, res: ServerResponse) => Promise<void> | void
> = {
  "/api/intake": intakeHandler,
  "/api/contact": contactHandler,
};

let activePort = PORT;

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${activePort}`);
  const pathname = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const handler = routes[pathname];
  if (!handler) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  try {
    const body = req.method === "POST" ? await readBody(req) : {};
    const vercelReq = createVercelLikeReq(req, body);
    const vercelRes = createVercelLikeRes(res);
    await handler(vercelReq, vercelRes);
  } catch (error) {
    console.error(`[dev-api] ${pathname}`, error);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `[dev-api] Port ${activePort} is already in use. Stop the other process or run: lsof -ti:${activePort} | xargs kill -9`
    );
  } else {
    console.error("[dev-api] Server error:", error);
  }
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", () => {
  activePort = PORT;
  console.log(
    `[dev-api] Listening on http://127.0.0.1:${activePort} (/api/intake, /api/contact)`
  );
});
