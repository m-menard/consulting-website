import { Router } from "express";
import { SipTrunkService } from "../services/sip-trunk.service.js";
import { ElevenLabsSipService } from "../services/elevenlabs-sip.service.js";
import { OpenAISipService } from "../services/openai-sip.service.js";
import { db } from "../../../server/db.js";
import { sql } from "drizzle-orm";
const router = Router();
const importRateLimits = /* @__PURE__ */ new Map();
const IMPORT_RATE_LIMIT = 10;
const IMPORT_RATE_WINDOW = 6e4;
function checkImportRateLimit(userId) {
  const now = Date.now();
  const userLimit = importRateLimits.get(userId);
  if (!userLimit || now > userLimit.resetTime) {
    importRateLimits.set(userId, { count: 1, resetTime: now + IMPORT_RATE_WINDOW });
    return true;
  }
  if (userLimit.count >= IMPORT_RATE_LIMIT) {
    return false;
  }
  userLimit.count++;
  return true;
}
router.get("/", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const phoneNumbers = await SipTrunkService.getUserPhoneNumbers(userId);
    res.json({ success: true, data: phoneNumbers });
  } catch (error) {
    console.error("[SIP Phone Numbers] Error fetching:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get("/debug/elevenlabs-comparison", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const elevenLabsNumbers = await ElevenLabsSipService.listAllPhoneNumbers(userId);
    const ourNumbers = await SipTrunkService.getUserPhoneNumbers(userId);
    const agentResult = await db.execute(sql`
      SELECT id, name, eleven_labs_agent_id FROM agents WHERE user_id = ${userId}
    `);
    const agents = agentResult.rows;
    const agentMap = {};
    agents.forEach((a) => {
      if (a.eleven_labs_agent_id) {
        agentMap[a.eleven_labs_agent_id] = a;
      }
    });
    const comparison = elevenLabsNumbers.map((elPhone) => {
      const ourMatch = ourNumbers.find((p) => p.externalElevenLabsPhoneId === elPhone.phone_number_id);
      const assignedAgent = elPhone.agent_id ? agentMap[elPhone.agent_id] : null;
      return {
        elevenLabsPhoneId: elPhone.phone_number_id,
        phoneNumber: elPhone.phone_number,
        name: elPhone.name || elPhone.label,
        provider: elPhone.provider,
        // What ElevenLabs has
        elevenLabsAgentId: elPhone.agent_id || "none",
        elevenLabsAgentName: assignedAgent?.name || "unknown (not in our DB)",
        // What our DB has
        ourDbMatch: ourMatch ? {
          id: ourMatch.id,
          agentId: ourMatch.agentId,
          label: ourMatch.label
        } : null,
        // Status
        synced: ourMatch && ourMatch.agentId ? assignedAgent?.id === ourMatch.agentId : false,
        issue: !ourMatch ? "NOT IN OUR DB" : !ourMatch.agentId ? "NO AGENT ASSIGNED IN OUR DB" : !elPhone.agent_id ? "NO AGENT IN ELEVENLABS" : assignedAgent?.id !== ourMatch.agentId ? "AGENT MISMATCH" : "OK"
      };
    });
    res.json({
      success: true,
      message: "Comparison of ElevenLabs phone numbers vs our database",
      elevenlabsCount: elevenLabsNumbers.length,
      ourDbCount: ourNumbers.length,
      comparison
    });
  } catch (error) {
    console.error("[SIP Phone Numbers] Error in debug comparison:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const phoneNumber = await SipTrunkService.getPhoneNumberById(id, userId);
    if (!phoneNumber) {
      return res.status(404).json({ success: false, message: "Phone number not found" });
    }
    res.json({ success: true, data: phoneNumber });
  } catch (error) {
    console.error("[SIP Phone Numbers] Error fetching:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.post("/import", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!checkImportRateLimit(userId)) {
      return res.status(429).json({
        success: false,
        message: "Too many import requests. Please wait a minute before trying again."
      });
    }
    const { sipTrunkId, phoneNumber, label, agentId, customHeaders } = req.body;
    if (!sipTrunkId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: sipTrunkId, phoneNumber"
      });
    }
    const trunk = await SipTrunkService.getTrunkById(sipTrunkId, userId);
    if (!trunk) {
      return res.status(404).json({ success: false, message: "SIP trunk not found" });
    }
    const importRequest = {
      sipTrunkId,
      phoneNumber,
      label,
      agentId,
      customHeaders
    };
    let result;
    if (trunk.engine === "elevenlabs-sip") {
      result = await ElevenLabsSipService.importPhoneNumber(userId, trunk, importRequest);
    } else if (trunk.engine === "openai-sip") {
      result = await OpenAISipService.importPhoneNumber(userId, trunk, phoneNumber, label, agentId);
    } else {
      result = await SipTrunkService.importPhoneNumber(userId, trunk, importRequest);
    }
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("[SIP Phone Numbers] Error importing:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
});
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const phoneNumber = await SipTrunkService.getPhoneNumberById(id, userId);
    if (!phoneNumber) {
      return res.status(404).json({ success: false, message: "Phone number not found" });
    }
    const updates = req.body;
    const updated = await SipTrunkService.updatePhoneNumber(id, userId, updates);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("[SIP Phone Numbers] Error updating:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.post("/:id/assign-agent", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { agentId } = req.body;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const phoneNumber = await SipTrunkService.getPhoneNumberById(id, userId);
    if (!phoneNumber) {
      return res.status(404).json({ success: false, message: "Phone number not found" });
    }
    const updated = await SipTrunkService.assignAgentToPhoneNumber(id, userId, agentId);
    if (phoneNumber.engine === "elevenlabs-sip" && phoneNumber.externalElevenLabsPhoneId) {
      await ElevenLabsSipService.assignAgentToPhoneNumber(
        userId,
        phoneNumber.externalElevenLabsPhoneId,
        agentId
      );
      if (agentId) {
        try {
          const { ElevenLabsService } = await import("../../../server/services/elevenlabs.js");
          const { ElevenLabsPoolService } = await import("../../../server/services/elevenlabs-pool.js");
          const agentResult = await db.execute(sql`
            SELECT eleven_labs_agent_id, appointment_booking_enabled, user_id
            FROM agents WHERE id = ${agentId} AND user_id = ${userId} LIMIT 1
          `);
          const agent = agentResult.rows[0];
          if (agent?.eleven_labs_agent_id && agent?.appointment_booking_enabled) {
            const credential = await ElevenLabsPoolService.getCredentialForAgent(agentId);
            if (!credential) {
              console.warn(`[SIP Phone Numbers] No ElevenLabs credential found for agent ${agentId}`);
            } else {
              const elevenLabsService = new ElevenLabsService(credential.apiKey);
              console.log(`[SIP Phone Numbers] Refreshing appointment tool for agent ${agentId}...`);
              await elevenLabsService.refreshAppointmentToolWithCurrentDate(agent.eleven_labs_agent_id);
              console.log(`[SIP Phone Numbers] Appointment tool refreshed for agent ${agentId}`);
            }
          }
        } catch (toolError) {
          console.warn(`[SIP Phone Numbers] Warning: Could not refresh appointment tool: ${toolError.message}`);
        }
      }
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("[SIP Phone Numbers] Error assigning agent:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.post("/:id/resync", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const phoneNumber = await SipTrunkService.getPhoneNumberById(id, userId);
    if (!phoneNumber) {
      return res.status(404).json({ success: false, message: "Phone number not found" });
    }
    if (phoneNumber.engine !== "elevenlabs-sip") {
      return res.status(400).json({ success: false, message: "Resync is only available for ElevenLabs SIP phone numbers" });
    }
    if (!phoneNumber.externalElevenLabsPhoneId) {
      return res.status(400).json({ success: false, message: "Phone number is not linked to ElevenLabs" });
    }
    if (!phoneNumber.agentId) {
      return res.status(400).json({ success: false, message: "No agent assigned to this phone number" });
    }
    console.log(`[SIP Phone Numbers] Resyncing phone ${phoneNumber.phoneNumber} agent ${phoneNumber.agentId} to ElevenLabs...`);
    await ElevenLabsSipService.assignAgentToPhoneNumber(
      userId,
      phoneNumber.externalElevenLabsPhoneId,
      phoneNumber.agentId
    );
    console.log(`[SIP Phone Numbers] Resync complete for phone ${phoneNumber.phoneNumber}`);
    res.json({ success: true, message: "Phone number agent resynced to ElevenLabs successfully" });
  } catch (error) {
    console.error("[SIP Phone Numbers] Error resyncing:", error);
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
    const phoneNumber = await SipTrunkService.getPhoneNumberById(id, userId);
    if (!phoneNumber) {
      return res.status(404).json({ success: false, message: "Phone number not found" });
    }
    if (phoneNumber.engine === "elevenlabs-sip" && phoneNumber.externalElevenLabsPhoneId) {
      await ElevenLabsSipService.deletePhoneNumber(userId, phoneNumber.externalElevenLabsPhoneId);
    }
    await SipTrunkService.deletePhoneNumber(id, userId);
    res.json({ success: true, message: "Phone number deleted successfully" });
  } catch (error) {
    console.error("[SIP Phone Numbers] Error deleting:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get("/:id/elevenlabs-details", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const phoneNumber = await SipTrunkService.getPhoneNumberById(id, userId);
    if (!phoneNumber) {
      return res.status(404).json({ success: false, message: "Phone number not found" });
    }
    if (phoneNumber.engine !== "elevenlabs-sip" || !phoneNumber.externalElevenLabsPhoneId) {
      return res.status(400).json({ success: false, message: "Not an ElevenLabs SIP phone number" });
    }
    const details = await ElevenLabsSipService.getPhoneNumberDetails(
      userId,
      phoneNumber.externalElevenLabsPhoneId
    );
    res.json({ success: true, data: details });
  } catch (error) {
    console.error("[SIP Phone Numbers] Error fetching ElevenLabs details:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.post("/:id/reprovision", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const phoneNumber = await SipTrunkService.getPhoneNumberById(id, userId);
    if (!phoneNumber) {
      return res.status(404).json({ success: false, message: "Phone number not found" });
    }
    if (phoneNumber.engine !== "elevenlabs-sip" || !phoneNumber.externalElevenLabsPhoneId) {
      return res.status(400).json({ success: false, message: "Re-provisioning only available for ElevenLabs SIP phone numbers" });
    }
    const trunk = await SipTrunkService.getTrunkById(phoneNumber.sipTrunkId, userId);
    if (!trunk) {
      return res.status(404).json({ success: false, message: "Associated SIP trunk not found" });
    }
    const result = await ElevenLabsSipService.updatePhoneNumberSipConfig(
      userId,
      phoneNumber.externalElevenLabsPhoneId,
      trunk,
      phoneNumber.phoneNumber
    );
    res.json({
      success: true,
      message: "Phone number SIP configuration updated successfully. Inbound calls should now be enabled.",
      data: result
    });
  } catch (error) {
    console.error("[SIP Phone Numbers] Error re-provisioning:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
var user_phone_numbers_routes_default = router;
export {
  user_phone_numbers_routes_default as default
};
