import { Router } from "express";
import { SipTrunkService } from "../services/sip-trunk.service.js";
import { ElevenLabsSipService } from "../services/elevenlabs-sip.service.js";
import { OpenAISipService } from "../services/openai-sip.service.js";
import { SIP_PROVIDER_INFO } from "../types.js";
import { db } from "../../../server/db.js";
import { sql } from "drizzle-orm";
const router = Router();
router.get("/", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const trunks = await SipTrunkService.getUserTrunks(userId);
    res.json({ success: true, data: trunks });
  } catch (error) {
    console.error("[SIP Trunks] Error fetching trunks:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get("/providers", (req, res) => {
  res.json({
    success: true,
    data: SIP_PROVIDER_INFO
  });
});
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const trunk = await SipTrunkService.getTrunkById(id, userId);
    if (!trunk) {
      return res.status(404).json({ success: false, message: "SIP trunk not found" });
    }
    res.json({ success: true, data: trunk });
  } catch (error) {
    console.error("[SIP Trunks] Error fetching trunk:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.post("/", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { name, engine, provider, sipHost, sipPort, transport, inboundTransport, inboundPort, mediaEncryption, username, password } = req.body;
    if (!name || !engine || !provider) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, engine, provider"
      });
    }
    const validEngines = ["elevenlabs-sip", "openai-sip"];
    if (!validEngines.includes(engine)) {
      return res.status(400).json({
        success: false,
        message: `Invalid engine. Must be one of: ${validEngines.join(", ")}`
      });
    }
    const validProviders = Object.keys(SIP_PROVIDER_INFO);
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        message: `Invalid provider. Must be one of: ${validProviders.join(", ")}`
      });
    }
    if (engine === "openai-sip") {
      const openaiResult = await db.execute(sql`
        SELECT setting_value FROM global_settings 
        WHERE setting_key = 'openai_sip_project_id' 
        LIMIT 1
      `);
      const openaiSetting = openaiResult.rows[0];
      if (!openaiSetting?.setting_value) {
        return res.status(400).json({
          success: false,
          message: "OpenAI SIP requires admin to configure OpenAI Project ID first"
        });
      }
    }
    const accessCheck = await SipTrunkService.checkSipAccess(userId, engine);
    if (!accessCheck.allowed) {
      return res.status(403).json({ success: false, message: accessCheck.reason });
    }
    const providerInfo = SIP_PROVIDER_INFO[provider];
    const defaultInboundTransport = provider === "twilio" ? "tcp" : transport || providerInfo.transport;
    const defaultInboundPort = provider === "twilio" ? 5060 : sipPort || providerInfo.defaultPort;
    const trunkData = {
      name,
      engine,
      provider,
      sipHost: sipHost || providerInfo.defaultHost,
      sipPort: sipPort || providerInfo.defaultPort,
      transport: transport || providerInfo.transport,
      inboundTransport: inboundTransport || defaultInboundTransport,
      inboundPort: inboundPort || defaultInboundPort,
      mediaEncryption: mediaEncryption || "disable",
      // Disabled by default for compatibility
      username,
      password
    };
    let trunk = await SipTrunkService.createTrunk(userId, trunkData);
    if (engine === "openai-sip") {
      const provisionResult = await OpenAISipService.provisionTrunk(userId, trunk);
      if (!provisionResult.success) {
        console.warn(`[SIP Trunks] OpenAI SIP provisioning warning: ${provisionResult.error}`);
      } else {
        trunk = await SipTrunkService.getTrunkById(trunk.id, userId) || trunk;
      }
    } else if (engine === "elevenlabs-sip") {
      console.log(`[SIP Trunks] ElevenLabs trunk created - provisioning occurs during phone number import`);
    }
    res.status(201).json({ success: true, data: trunk });
  } catch (error) {
    console.error("[SIP Trunks] Error creating trunk:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const trunk = await SipTrunkService.getTrunkById(id, userId);
    if (!trunk) {
      return res.status(404).json({ success: false, message: "SIP trunk not found" });
    }
    const updates = req.body;
    const updatedTrunk = await SipTrunkService.updateTrunk(id, userId, updates);
    res.json({ success: true, data: updatedTrunk });
  } catch (error) {
    console.error("[SIP Trunks] Error updating trunk:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const trunk = await SipTrunkService.getTrunkById(id, userId);
    if (!trunk) {
      return res.status(404).json({ success: false, message: "SIP trunk not found" });
    }
    await SipTrunkService.deleteTrunk(id, userId);
    res.json({ success: true, message: "SIP trunk deleted successfully" });
  } catch (error) {
    console.error("[SIP Trunks] Error deleting trunk:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.post("/:id/test", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const trunk = await SipTrunkService.getTrunkById(id, userId);
    if (!trunk) {
      return res.status(404).json({ success: false, message: "SIP trunk not found" });
    }
    const result = await SipTrunkService.testTrunkConnection(id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("[SIP Trunks] Error testing trunk:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.post("/:id/reprovision-all", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const trunk = await SipTrunkService.getTrunkById(id, userId);
    if (!trunk) {
      return res.status(404).json({ success: false, message: "SIP trunk not found" });
    }
    if (trunk.engine !== "elevenlabs-sip") {
      return res.status(400).json({
        success: false,
        message: "Re-provisioning is only available for ElevenLabs SIP trunks"
      });
    }
    const phoneNumbersResult = await db.execute(sql`
      SELECT id, phone_number, external_elevenlabs_phone_id
      FROM sip_phone_numbers
      WHERE sip_trunk_id = ${id} AND user_id = ${userId} AND engine = 'elevenlabs-sip'
    `);
    const phoneNumbers = phoneNumbersResult.rows;
    if (phoneNumbers.length === 0) {
      return res.json({
        success: true,
        message: "No phone numbers to re-provision",
        data: { updated: 0, failed: 0, total: 0 }
      });
    }
    let updated = 0;
    let failed = 0;
    const errors = [];
    for (const phone of phoneNumbers) {
      if (!phone.external_elevenlabs_phone_id) {
        console.log(`[SIP Trunks] Skipping ${phone.phone_number} - no ElevenLabs ID`);
        continue;
      }
      try {
        await ElevenLabsSipService.updatePhoneNumberSipConfig(
          userId,
          phone.external_elevenlabs_phone_id,
          trunk,
          phone.phone_number
        );
        updated++;
        console.log(`[SIP Trunks] Re-provisioned ${phone.phone_number}`);
      } catch (err) {
        failed++;
        errors.push(`${phone.phone_number}: ${err.message}`);
        console.error(`[SIP Trunks] Failed to re-provision ${phone.phone_number}:`, err.message);
      }
    }
    res.json({
      success: true,
      message: `Re-provisioned ${updated} of ${phoneNumbers.length} phone numbers`,
      data: {
        updated,
        failed,
        total: phoneNumbers.length,
        errors: errors.length > 0 ? errors : void 0
      }
    });
  } catch (error) {
    console.error("[SIP Trunks] Error re-provisioning trunk:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
var user_trunks_routes_default = router;
export {
  user_trunks_routes_default as default
};
