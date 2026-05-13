import { Router } from "express";
import { db } from "../../../server/db.js";
import { apiKeys, users } from "../../../shared/schema.js";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
const router = Router();
const requireAdmin = (req, res, next) => {
  const user = req.user;
  if (!user || user.role !== "admin" && user.role !== "super_admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};
router.get("/", requireAdmin, async (req, res) => {
  try {
    const keys = await db.select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      userName: users.name,
      userEmail: users.email,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      rateLimit: apiKeys.rateLimit,
      rateLimitWindow: apiKeys.rateLimitWindow,
      isActive: apiKeys.isActive,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt
    }).from(apiKeys).leftJoin(users, eq(apiKeys.userId, users.id)).orderBy(desc(apiKeys.createdAt));
    const keysWithCount = keys.map((k) => ({
      ...k,
      requestCount: 0
    }));
    res.json(keysWithCount);
  } catch (error) {
    console.error("[Admin API Keys] List error:", error);
    res.status(500).json({ error: "Failed to list API keys" });
  }
});
router.get("/settings", requireAdmin, async (req, res) => {
  try {
    res.json({
      defaultRateLimit: 100,
      defaultRateLimitWindow: 60
    });
  } catch (error) {
    console.error("[Admin API Keys] Settings error:", error);
    res.status(500).json({ error: "Failed to get settings" });
  }
});
router.put("/settings", requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      defaultRateLimit: z.number().min(1).max(1e4),
      defaultRateLimitWindow: z.number().min(1).max(3600)
    });
    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid settings" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("[Admin API Keys] Update settings error:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});
router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, rateLimit, rateLimitWindow } = req.body;
    const updateData = {};
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (typeof rateLimit === "number") updateData.rateLimit = rateLimit;
    if (typeof rateLimitWindow === "number") updateData.rateLimitWindow = rateLimitWindow;
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }
    const [updated] = await db.update(apiKeys).set(updateData).where(eq(apiKeys.id, id)).returning();
    if (!updated) {
      return res.status(404).json({ error: "API key not found" });
    }
    res.json({ success: true, key: updated });
  } catch (error) {
    console.error("[Admin API Keys] Update error:", error);
    res.status(500).json({ error: "Failed to update API key" });
  }
});
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, id)).returning();
    if (result.length === 0) {
      return res.status(404).json({ error: "API key not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("[Admin API Keys] Delete error:", error);
    res.status(500).json({ error: "Failed to delete API key" });
  }
});
var admin_routes_default = router;
export {
  admin_routes_default as default
};
