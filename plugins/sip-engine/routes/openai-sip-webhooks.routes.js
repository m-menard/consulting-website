import { Router } from "express";
import { OpenAISipService } from "../services/openai-sip.service.js";
const router = Router();
async function verifyWebhookSignature(req) {
  const webhookId = req.headers["webhook-id"];
  const webhookTimestamp = req.headers["webhook-timestamp"];
  const webhookSignature = req.headers["webhook-signature"];
  const secret = await OpenAISipService.getWebhookSecret();
  if (!secret) {
    console.warn("[OpenAI SIP] SECURITY WARNING: No webhook secret configured - requests are not verified");
    console.warn("[OpenAI SIP] Configure webhook secret in Admin > Plugins > SIP Engine > OpenAI SIP Setup");
    return { valid: true, reason: "No secret configured (testing mode)" };
  }
  if (!webhookSignature) {
    console.error("[OpenAI SIP] Missing webhook-signature header");
    return { valid: false, reason: "Missing webhook-signature header" };
  }
  if (!webhookId) {
    console.error("[OpenAI SIP] Missing webhook-id header");
    return { valid: false, reason: "Missing webhook-id header" };
  }
  if (!webhookTimestamp) {
    console.error("[OpenAI SIP] Missing webhook-timestamp header");
    return { valid: false, reason: "Missing webhook-timestamp header" };
  }
  const payload = JSON.stringify(req.body);
  const isValid = await OpenAISipService.verifyWebhookSignature(
    payload,
    webhookSignature,
    webhookId,
    webhookTimestamp
  );
  return { valid: isValid, reason: isValid ? void 0 : "Signature verification failed" };
}
router.post("/webhook", async (req, res) => {
  try {
    const verification = await verifyWebhookSignature(req);
    if (!verification.valid) {
      console.error(`[OpenAI SIP] Webhook rejected: ${verification.reason}`);
      return res.status(401).json({ error: verification.reason || "Invalid signature" });
    }
    const event = req.body;
    console.log(`[OpenAI SIP] Webhook received: ${event.type}`);
    switch (event.type) {
      case "realtime.call.incoming": {
        const result = await OpenAISipService.handleIncomingCall(event);
        if (result.action === "accept" && result.config) {
          const acceptResult = await OpenAISipService.acceptCall(event.data.call_id, result.config);
          if (!acceptResult.success) {
            console.error(`[OpenAI SIP] Failed to accept call: ${acceptResult.error}`);
          }
        } else {
          await OpenAISipService.rejectCall(event.data.call_id, result.reason || "Call rejected");
        }
        break;
      }
      case "realtime.call.completed": {
        await OpenAISipService.handleCallCompleted(
          event.data.call_id,
          event.data.duration_seconds,
          event.data.transcript
        );
        break;
      }
      case "realtime.call.failed": {
        await OpenAISipService.handleCallFailed(
          event.data.call_id,
          event.data.reason || "Unknown error"
        );
        break;
      }
      default:
        console.log(`[OpenAI SIP] Unhandled event type: ${event.type}`);
    }
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("[OpenAI SIP] Error handling webhook:", error);
    res.status(500).json({ error: error.message });
  }
});
router.get("/health", (req, res) => {
  res.json({
    success: true,
    data: {
      engine: "openai-sip",
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
});
router.get("/config", async (req, res) => {
  try {
    const projectId = await OpenAISipService.getOpenAIProjectId();
    const sipEndpoint = OpenAISipService.getSipEndpoint(projectId);
    res.json({
      success: true,
      data: {
        sipEndpoint,
        projectId,
        webhookUrl: `${process.env.BASE_URL || "https://your-domain.com"}/api/openai-sip/webhook`,
        instructions: [
          "1. Configure your SIP trunk to point to the sipEndpoint above",
          "2. Set the webhookUrl in your OpenAI Platform project settings",
          "3. Import phone numbers and assign agents in AgentHR",
          "4. Incoming calls will be handled by the assigned AI agent"
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
var openai_sip_webhooks_routes_default = router;
export {
  openai_sip_webhooks_routes_default as default
};
