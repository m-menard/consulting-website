/**
 * User SIP Phone Number Routes
 * Import and manage SIP phone numbers
 */

import { Router, Request, Response } from 'express';
import { SipTrunkService } from '../services/sip-trunk.service';
import { ElevenLabsSipService } from '../services/elevenlabs-sip.service';
import { OpenAISipService } from '../services/openai-sip.service';
import { ImportSipPhoneNumberRequest } from '../types';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

const router = Router();

// Simple rate limiting for import endpoint - prevents abuse
const importRateLimits = new Map<string, { count: number; resetTime: number }>();
const IMPORT_RATE_LIMIT = 10; // Max imports per window
const IMPORT_RATE_WINDOW = 60000; // 1 minute window

function checkImportRateLimit(userId: string): boolean {
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

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const phoneNumbers = await SipTrunkService.getUserPhoneNumbers(userId);
    res.json({ success: true, data: phoneNumbers });
  } catch (error: any) {
    console.error('[SIP Phone Numbers] Error fetching:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Debug endpoint: List all phone numbers from ElevenLabs API and compare with our database
// MUST be defined before /:id to avoid being caught by the parameter route
router.get('/debug/elevenlabs-comparison', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get all ElevenLabs phone numbers from their API
    const elevenLabsNumbers = await ElevenLabsSipService.listAllPhoneNumbers(userId);
    
    // Get our database phone numbers
    const ourNumbers = await SipTrunkService.getUserPhoneNumbers(userId);
    
    // Get our agents
    const agentResult = await db.execute(sql`
      SELECT id, name, eleven_labs_agent_id FROM agents WHERE user_id = ${userId}
    `);
    const agents = agentResult.rows as any[];
    
    // Create a map of our agents by ElevenLabs ID
    const agentMap: Record<string, any> = {};
    agents.forEach(a => {
      if (a.eleven_labs_agent_id) {
        agentMap[a.eleven_labs_agent_id] = a;
      }
    });
    
    // Build comparison
    const comparison = elevenLabsNumbers.map((elPhone: any) => {
      const ourMatch = ourNumbers.find((p: any) => p.externalElevenLabsPhoneId === elPhone.phone_number_id);
      const assignedAgent = elPhone.agent_id ? agentMap[elPhone.agent_id] : null;
      
      return {
        elevenLabsPhoneId: elPhone.phone_number_id,
        phoneNumber: elPhone.phone_number,
        name: elPhone.name || elPhone.label,
        provider: elPhone.provider,
        
        // What ElevenLabs has
        elevenLabsAgentId: elPhone.agent_id || 'none',
        elevenLabsAgentName: assignedAgent?.name || 'unknown (not in our DB)',
        
        // What our DB has
        ourDbMatch: ourMatch ? {
          id: ourMatch.id,
          agentId: ourMatch.agentId,
          label: ourMatch.label,
        } : null,
        
        // Status
        synced: ourMatch && ourMatch.agentId ? (assignedAgent?.id === ourMatch.agentId) : false,
        issue: !ourMatch ? 'NOT IN OUR DB' : 
               !ourMatch.agentId ? 'NO AGENT ASSIGNED IN OUR DB' :
               !elPhone.agent_id ? 'NO AGENT IN ELEVENLABS' :
               assignedAgent?.id !== ourMatch.agentId ? 'AGENT MISMATCH' : 'OK'
      };
    });
    
    res.json({ 
      success: true, 
      message: 'Comparison of ElevenLabs phone numbers vs our database',
      elevenlabsCount: elevenLabsNumbers.length,
      ourDbCount: ourNumbers.length,
      comparison
    });
  } catch (error: any) {
    console.error('[SIP Phone Numbers] Error in debug comparison:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const phoneNumber = await SipTrunkService.getPhoneNumberById(id, userId);
    if (!phoneNumber) {
      return res.status(404).json({ success: false, message: 'Phone number not found' });
    }
    
    res.json({ success: true, data: phoneNumber });
  } catch (error: any) {
    console.error('[SIP Phone Numbers] Error fetching:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/import', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Check rate limit
    if (!checkImportRateLimit(userId)) {
      return res.status(429).json({ 
        success: false, 
        message: 'Too many import requests. Please wait a minute before trying again.' 
      });
    }

    const { sipTrunkId, phoneNumber, label, agentId, customHeaders } = req.body;

    if (!sipTrunkId || !phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: sipTrunkId, phoneNumber' 
      });
    }

    const trunk = await SipTrunkService.getTrunkById(sipTrunkId, userId);
    if (!trunk) {
      return res.status(404).json({ success: false, message: 'SIP trunk not found' });
    }

    const importRequest: ImportSipPhoneNumberRequest = {
      sipTrunkId,
      phoneNumber,
      label,
      agentId,
      customHeaders,
    };

    let result;
    if (trunk.engine === 'elevenlabs-sip') {
      result = await ElevenLabsSipService.importPhoneNumber(userId, trunk, importRequest);
    } else if (trunk.engine === 'openai-sip') {
      result = await OpenAISipService.importPhoneNumber(userId, trunk, phoneNumber, label, agentId);
    } else {
      result = await SipTrunkService.importPhoneNumber(userId, trunk, importRequest);
    }

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.error('[SIP Phone Numbers] Error importing:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const phoneNumber = await SipTrunkService.getPhoneNumberById(id, userId);
    if (!phoneNumber) {
      return res.status(404).json({ success: false, message: 'Phone number not found' });
    }

    const updates = req.body;
    const updated = await SipTrunkService.updatePhoneNumber(id, userId, updates);
    
    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[SIP Phone Numbers] Error updating:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/assign-agent', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { agentId } = req.body;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const phoneNumber = await SipTrunkService.getPhoneNumberById(id, userId);
    if (!phoneNumber) {
      return res.status(404).json({ success: false, message: 'Phone number not found' });
    }

    const updated = await SipTrunkService.assignAgentToPhoneNumber(id, userId, agentId);
    
    if (phoneNumber.engine === 'elevenlabs-sip' && phoneNumber.externalElevenLabsPhoneId) {
      await ElevenLabsSipService.assignAgentToPhoneNumber(
        userId,
        phoneNumber.externalElevenLabsPhoneId,
        agentId
      );
      
      // Also refresh the agent's appointment tool webhook URL to ensure it uses the current agent ID
      // This fixes issues where the appointment webhook has a stale agent ID
      if (agentId) {
        try {
          const { ElevenLabsService } = await import('../../../server/services/elevenlabs');
          const { ElevenLabsPoolService } = await import('../../../server/services/elevenlabs-pool');
          
          // Get the agent's ElevenLabs agent ID - IMPORTANT: Also verify user ownership
          const agentResult = await db.execute(sql`
            SELECT eleven_labs_agent_id, appointment_booking_enabled, user_id
            FROM agents WHERE id = ${agentId} AND user_id = ${userId} LIMIT 1
          `);
          const agent = agentResult.rows[0] as any;
          
          if (agent?.eleven_labs_agent_id && agent?.appointment_booking_enabled) {
            // Get the correct API key from the pool for this agent
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
        } catch (toolError: any) {
          // Log but don't fail the assignment if tool refresh fails
          console.warn(`[SIP Phone Numbers] Warning: Could not refresh appointment tool: ${toolError.message}`);
        }
      }
    }
    
    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[SIP Phone Numbers] Error assigning agent:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Force resync SIP phone number's agent assignment to ElevenLabs
// This is useful when ElevenLabs has a stale agent ID cached
router.post('/:id/resync', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const phoneNumber = await SipTrunkService.getPhoneNumberById(id, userId);
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
    
    await ElevenLabsSipService.assignAgentToPhoneNumber(
      userId,
      phoneNumber.externalElevenLabsPhoneId,
      phoneNumber.agentId
    );
    
    console.log(`[SIP Phone Numbers] Resync complete for phone ${phoneNumber.phoneNumber}`);
    res.json({ success: true, message: 'Phone number agent resynced to ElevenLabs successfully' });
  } catch (error: any) {
    console.error('[SIP Phone Numbers] Error resyncing:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const phoneNumber = await SipTrunkService.getPhoneNumberById(id, userId);
    if (!phoneNumber) {
      return res.status(404).json({ success: false, message: 'Phone number not found' });
    }

    if (phoneNumber.engine === 'elevenlabs-sip' && phoneNumber.externalElevenLabsPhoneId) {
      await ElevenLabsSipService.deletePhoneNumber(userId, phoneNumber.externalElevenLabsPhoneId);
    }

    await SipTrunkService.deletePhoneNumber(id, userId);
    res.json({ success: true, message: 'Phone number deleted successfully' });
  } catch (error: any) {
    console.error('[SIP Phone Numbers] Error deleting:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/elevenlabs-details', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const phoneNumber = await SipTrunkService.getPhoneNumberById(id, userId);
    if (!phoneNumber) {
      return res.status(404).json({ success: false, message: 'Phone number not found' });
    }

    if (phoneNumber.engine !== 'elevenlabs-sip' || !phoneNumber.externalElevenLabsPhoneId) {
      return res.status(400).json({ success: false, message: 'Not an ElevenLabs SIP phone number' });
    }

    const details = await ElevenLabsSipService.getPhoneNumberDetails(
      userId,
      phoneNumber.externalElevenLabsPhoneId
    );
    
    res.json({ success: true, data: details });
  } catch (error: any) {
    console.error('[SIP Phone Numbers] Error fetching ElevenLabs details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/reprovision', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const phoneNumber = await SipTrunkService.getPhoneNumberById(id, userId);
    if (!phoneNumber) {
      return res.status(404).json({ success: false, message: 'Phone number not found' });
    }

    if (phoneNumber.engine !== 'elevenlabs-sip' || !phoneNumber.externalElevenLabsPhoneId) {
      return res.status(400).json({ success: false, message: 'Re-provisioning only available for ElevenLabs SIP phone numbers' });
    }

    const trunk = await SipTrunkService.getTrunkById(phoneNumber.sipTrunkId, userId);
    if (!trunk) {
      return res.status(404).json({ success: false, message: 'Associated SIP trunk not found' });
    }

    const result = await ElevenLabsSipService.updatePhoneNumberSipConfig(
      userId,
      phoneNumber.externalElevenLabsPhoneId,
      trunk,
      phoneNumber.phoneNumber
    );
    
    res.json({ 
      success: true, 
      message: 'Phone number SIP configuration updated successfully. Inbound calls should now be enabled.',
      data: result 
    });
  } catch (error: any) {
    console.error('[SIP Phone Numbers] Error re-provisioning:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
