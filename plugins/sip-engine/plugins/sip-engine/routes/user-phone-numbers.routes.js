"use strict";
/**
 * User SIP Phone Number Routes
 * Import and manage SIP phone numbers
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sip_trunk_service_1 = require("../services/sip-trunk.service");
const elevenlabs_sip_service_1 = require("../services/elevenlabs-sip.service");
const openai_sip_service_1 = require("../services/openai-sip.service");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const phoneNumbers = await sip_trunk_service_1.SipTrunkService.getUserPhoneNumbers(userId);
        res.json({ success: true, data: phoneNumbers });
    }
    catch (error) {
        console.error('[SIP Phone Numbers] Error fetching:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const phoneNumber = await sip_trunk_service_1.SipTrunkService.getPhoneNumberById(id, userId);
        if (!phoneNumber) {
            return res.status(404).json({ success: false, message: 'Phone number not found' });
        }
        res.json({ success: true, data: phoneNumber });
    }
    catch (error) {
        console.error('[SIP Phone Numbers] Error fetching:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post('/import', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const { sipTrunkId, phoneNumber, label, agentId, customHeaders } = req.body;
        if (!sipTrunkId || !phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: sipTrunkId, phoneNumber'
            });
        }
        const trunk = await sip_trunk_service_1.SipTrunkService.getTrunkById(sipTrunkId, userId);
        if (!trunk) {
            return res.status(404).json({ success: false, message: 'SIP trunk not found' });
        }
        const importRequest = {
            sipTrunkId,
            phoneNumber,
            label,
            agentId,
            customHeaders,
        };
        let result;
        if (trunk.engine === 'elevenlabs-sip') {
            result = await elevenlabs_sip_service_1.ElevenLabsSipService.importPhoneNumber(userId, trunk, importRequest);
        }
        else if (trunk.engine === 'openai-sip') {
            result = await openai_sip_service_1.OpenAISipService.importPhoneNumber(userId, trunk, phoneNumber, label, agentId);
        }
        else {
            result = await sip_trunk_service_1.SipTrunkService.importPhoneNumber(userId, trunk, importRequest);
        }
        res.status(201).json({ success: true, data: result });
    }
    catch (error) {
        console.error('[SIP Phone Numbers] Error importing:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const phoneNumber = await sip_trunk_service_1.SipTrunkService.getPhoneNumberById(id, userId);
        if (!phoneNumber) {
            return res.status(404).json({ success: false, message: 'Phone number not found' });
        }
        const updates = req.body;
        const updated = await sip_trunk_service_1.SipTrunkService.updatePhoneNumber(id, userId, updates);
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('[SIP Phone Numbers] Error updating:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post('/:id/assign-agent', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const { agentId } = req.body;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const phoneNumber = await sip_trunk_service_1.SipTrunkService.getPhoneNumberById(id, userId);
        if (!phoneNumber) {
            return res.status(404).json({ success: false, message: 'Phone number not found' });
        }
        const updated = await sip_trunk_service_1.SipTrunkService.assignAgentToPhoneNumber(id, userId, agentId);
        if (phoneNumber.engine === 'elevenlabs-sip' && phoneNumber.externalElevenLabsPhoneId) {
            await elevenlabs_sip_service_1.ElevenLabsSipService.assignAgentToPhoneNumber(userId, phoneNumber.externalElevenLabsPhoneId, agentId);
        }
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('[SIP Phone Numbers] Error assigning agent:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Force resync SIP phone number's agent assignment to ElevenLabs
// This is useful when ElevenLabs has a stale agent ID cached
router.post('/:id/resync', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const phoneNumber = await sip_trunk_service_1.SipTrunkService.getPhoneNumberById(id, userId);
        if (!phoneNumber) {
            return res.status(404).json({ success: false, message: 'Phone number not found' });
        }
        if (phoneNumber.engine !== 'elevenlabs-sip') {
            return res.status(400).json({ success: false, message: 'Resync is only available for ElevenLabs SIP phone numbers' });
        }
        if (!phoneNumber.externalElevenLabsPhoneId) {
            return res.status(400).json({ success: false, message: 'Phone number is not linked to ElevenLabs' });
        }
        if (!phoneNumber.agentId) {
            return res.status(400).json({ success: false, message: 'No agent assigned to this phone number' });
        }
        console.log(`[SIP Phone Numbers] Resyncing phone ${phoneNumber.phoneNumber} agent ${phoneNumber.agentId} to ElevenLabs...`);
        await elevenlabs_sip_service_1.ElevenLabsSipService.assignAgentToPhoneNumber(userId, phoneNumber.externalElevenLabsPhoneId, phoneNumber.agentId);
        console.log(`[SIP Phone Numbers] Resync complete for phone ${phoneNumber.phoneNumber}`);
        res.json({ success: true, message: 'Phone number agent resynced to ElevenLabs successfully' });
    }
    catch (error) {
        console.error('[SIP Phone Numbers] Error resyncing:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const phoneNumber = await sip_trunk_service_1.SipTrunkService.getPhoneNumberById(id, userId);
        if (!phoneNumber) {
            return res.status(404).json({ success: false, message: 'Phone number not found' });
        }
        if (phoneNumber.engine === 'elevenlabs-sip' && phoneNumber.externalElevenLabsPhoneId) {
            await elevenlabs_sip_service_1.ElevenLabsSipService.deletePhoneNumber(userId, phoneNumber.externalElevenLabsPhoneId);
        }
        await sip_trunk_service_1.SipTrunkService.deletePhoneNumber(id, userId);
        res.json({ success: true, message: 'Phone number deleted successfully' });
    }
    catch (error) {
        console.error('[SIP Phone Numbers] Error deleting:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get('/:id/elevenlabs-details', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const phoneNumber = await sip_trunk_service_1.SipTrunkService.getPhoneNumberById(id, userId);
        if (!phoneNumber) {
            return res.status(404).json({ success: false, message: 'Phone number not found' });
        }
        if (phoneNumber.engine !== 'elevenlabs-sip' || !phoneNumber.externalElevenLabsPhoneId) {
            return res.status(400).json({ success: false, message: 'Not an ElevenLabs SIP phone number' });
        }
        const details = await elevenlabs_sip_service_1.ElevenLabsSipService.getPhoneNumberDetails(userId, phoneNumber.externalElevenLabsPhoneId);
        res.json({ success: true, data: details });
    }
    catch (error) {
        console.error('[SIP Phone Numbers] Error fetching ElevenLabs details:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post('/:id/reprovision', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const phoneNumber = await sip_trunk_service_1.SipTrunkService.getPhoneNumberById(id, userId);
        if (!phoneNumber) {
            return res.status(404).json({ success: false, message: 'Phone number not found' });
        }
        if (phoneNumber.engine !== 'elevenlabs-sip' || !phoneNumber.externalElevenLabsPhoneId) {
            return res.status(400).json({ success: false, message: 'Re-provisioning only available for ElevenLabs SIP phone numbers' });
        }
        const trunk = await sip_trunk_service_1.SipTrunkService.getTrunkById(phoneNumber.sipTrunkId, userId);
        if (!trunk) {
            return res.status(404).json({ success: false, message: 'Associated SIP trunk not found' });
        }
        const result = await elevenlabs_sip_service_1.ElevenLabsSipService.updatePhoneNumberSipConfig(userId, phoneNumber.externalElevenLabsPhoneId, trunk, phoneNumber.phoneNumber);
        res.json({
            success: true,
            message: 'Phone number SIP configuration updated successfully. Inbound calls should now be enabled.',
            data: result
        });
    }
    catch (error) {
        console.error('[SIP Phone Numbers] Error re-provisioning:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;
