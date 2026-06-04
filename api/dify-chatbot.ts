import type { VercelRequest, VercelResponse } from "@vercel/node";

const UPSTREAM = process.env.DIFY_UPSTREAM_URL || "http://185.238.250.203";

function rewriteDifyHtml(html: string, publicOrigin: string): string {
  const upstreamHost = new URL(UPSTREAM).host;
  const wsOrigin = publicOrigin.replace(/^https:/, "wss:");
  return html
    .replaceAll(`http://${upstreamHost}`, publicOrigin)
    .replaceAll(`ws://${upstreamHost}`, wsOrigin)
    .replaceAll(upstreamHost, new URL(publicOrigin).host);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const publicHost = (req.headers.host as string) || "accellm.ai";
  const publicOrigin = `https://${publicHost}`;

  const slug = req.query.slug ?? req.query.path;
  const segment = Array.isArray(slug) ? slug.join("/") : String(slug ?? "");
  const upstreamPath = `/chatbot/${segment}`;

  const incoming = new URL(req.url || "/", publicOrigin);
  incoming.searchParams.delete("slug");
  incoming.searchParams.delete("path");
  const search = incoming.searchParams.toString();
  const upstreamUrl = `${UPSTREAM}${upstreamPath}${search ? `?${search}` : ""}`;

  const upstreamRes = await fetch(upstreamUrl, { method: req.method });

  const contentType = upstreamRes.headers.get("content-type") ?? "";
  res.status(upstreamRes.status);

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  if (!contentType.includes("text/html")) {
    const body = Buffer.from(await upstreamRes.arrayBuffer());
    if (contentType) res.setHeader("content-type", contentType);
    res.send(body);
    return;
  }

  const html = await upstreamRes.text();
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "private, no-cache, no-store, max-age=0, must-revalidate");
  res.send(rewriteDifyHtml(html, publicOrigin));
}
