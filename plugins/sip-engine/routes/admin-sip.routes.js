import { Router } from "express";
import { SipTrunkService } from "../services/sip-trunk.service.js";
import { OpenAISipService } from "../services/openai-sip.service.js";
const router = Router();
router.get("/settings", async (req, res) => {
  try {
    const settings = await SipTrunkService.getAdminSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error("[Admin SIP] Error fetching settings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.put("/settings", async (req, res) => {
  try {
    const updates = req.body;
    const settings = await SipTrunkService.updateAdminSettings(updates);
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error("[Admin SIP] Error updating settings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get("/openai-sip/config", async (req, res) => {
  try {
    const { db } = await import("../../../server/db.js");
    const { sql } = await import("drizzle-orm");
    let projectId = "";
    let webhookSecret = "";
    try {
      projectId = await OpenAISipService.getOpenAIProjectId();
    } catch (e) {
    }
    try {
      const secretResult = await db.execute(sql`
        SELECT setting_value FROM global_settings 
        WHERE setting_key = 'openai_sip_webhook_secret' 
        LIMIT 1
      `);
      const secretRow = secretResult.rows[0];
      webhookSecret = secretRow?.setting_value || "";
    } catch (e) {
    }
    const sipEndpoint = projectId ? OpenAISipService.getSipEndpoint(projectId) : "";
    const baseUrl = process.env.BASE_URL || req.get("origin") || "https://your-domain.com";
    res.json({
      success: true,
      data: {
        sipEndpoint,
        projectId,
        webhookSecret: webhookSecret ? "********" : "",
        // Masked for security
        webhookSecretSet: !!webhookSecret,
        webhookUrl: `${baseUrl}/api/openai-sip/webhook`,
        instructions: [
          "Go to platform.openai.com and navigate to Settings > Project > General to find your Project ID",
          "Navigate to Settings > Project > Webhooks and create a new webhook",
          'Enter the Webhook URL shown below and select "realtime.call.incoming" event',
          "Copy the Webhook Secret from OpenAI and paste it below",
          "Configure your SIP trunk provider to point to the SIP Endpoint",
          "Import phone numbers in AgentHR and assign AI agents",
          "Test by calling one of your imported numbers"
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router.post("/openai-sip/project-id", async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required"
      });
    }
    const { db } = await import("../../../server/db.js");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`
      INSERT INTO global_settings (setting_key, setting_value, category, description)
      VALUES ('openai_sip_project_id', ${projectId}, 'sip', 'OpenAI Project ID for SIP integration')
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = ${projectId}, updated_at = NOW()
    `);
    res.json({
      success: true,
      data: {
        projectId,
        sipEndpoint: OpenAISipService.getSipEndpoint(projectId)
      }
    });
  } catch (error) {
    console.error("[Admin SIP] Error setting OpenAI project ID:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.post("/openai-sip/webhook-secret", async (req, res) => {
  try {
    const { webhookSecret } = req.body;
    if (!webhookSecret) {
      return res.status(400).json({
        success: false,
        message: "Webhook secret is required"
      });
    }
    const { db } = await import("../../../server/db.js");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`
      INSERT INTO global_settings (setting_key, setting_value, category, description)
      VALUES ('openai_sip_webhook_secret', ${webhookSecret}, 'sip', 'OpenAI webhook secret for signature verification')
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = ${webhookSecret}, updated_at = NOW()
    `);
    console.log("[Admin SIP] OpenAI webhook secret saved");
    res.json({
      success: true,
      message: "Webhook secret saved successfully"
    });
  } catch (error) {
    console.error("[Admin SIP] Error setting webhook secret:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get("/trunks", async (req, res) => {
  try {
    const { userId, engine, status } = req.query;
    const filters = {
      userId,
      engine,
      isActive: status === "active" ? true : status === "inactive" ? false : void 0
    };
    const trunks = await SipTrunkService.getAllTrunks(filters);
    res.json({ success: true, data: trunks });
  } catch (error) {
    console.error("[Admin SIP] Error fetching trunks:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get("/phone-numbers", async (req, res) => {
  try {
    const { userId, engine } = req.query;
    const filters = {
      userId,
      engine
    };
    const phoneNumbers = await SipTrunkService.getAllPhoneNumbers(filters);
    res.json({ success: true, data: phoneNumbers });
  } catch (error) {
    console.error("[Admin SIP] Error fetching phone numbers:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get("/calls", async (req, res) => {
  try {
    const { userId, engine, status, startDate, endDate, limit, offset } = req.query;
    const filters = {
      userId,
      engine,
      status,
      startDate: startDate ? new Date(startDate) : void 0,
      endDate: endDate ? new Date(endDate) : void 0,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    };
    const calls = await SipTrunkService.getSipCalls(filters);
    res.json({ success: true, data: calls });
  } catch (error) {
    console.error("[Admin SIP] Error fetching calls:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get("/plans/:planId/sip-settings", async (req, res) => {
  try {
    const { planId } = req.params;
    const settings = await SipTrunkService.getPlanSipSettings(planId);
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error("[Admin SIP] Error fetching plan settings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.put("/plans/:planId/sip-settings", async (req, res) => {
  try {
    const { planId } = req.params;
    const { sipEnabled, maxConcurrentSipCalls, sipEnginesAllowed } = req.body;
    const settings = await SipTrunkService.updatePlanSipSettings(planId, {
      sipEnabled,
      maxConcurrentSipCalls,
      sipEnginesAllowed
    });
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error("[Admin SIP] Error updating plan settings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get("/stats", async (req, res) => {
  try {
    const stats = await SipTrunkService.getAdminStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("[Admin SIP] Error fetching stats:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get("/providers", (req, res) => {
  const { SIP_PROVIDER_INFO } = require("../types");
  res.json({
    success: true,
    data: SIP_PROVIDER_INFO
  });
});
var admin_sip_routes_default = router;
export {
  admin_sip_routes_default as default
};
