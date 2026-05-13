'use strict';
import { Router, Response } from 'express';
import { storage } from '../../storage';
import { AdminRequest, requireAdminPermission } from '../../middleware/admin-auth';
import { db } from '../../db';
import { eq, isNull, and, sql, isNotNull, or, inArray, desc } from 'drizzle-orm';
import { phoneNumbers, agents, incomingAgents, incomingConnections, calls, users } from '@shared/schema';
import { ElevenLabsPoolService } from '../../services/elevenlabs-pool';
import { ElevenLabsService } from '../../services/elevenlabs';
import { z } from 'zod';

export function registerPhoneNumbersRoutes(router: Router) {
  router.get('/phone-numbers', requireAdminPermission('phones', 'phone_numbers', 'read'), async (req: AdminRequest, res: Response) => {
    try {
      const numbers = await db
        .select({
          id: phoneNumbers.id,
          phoneNumber: phoneNumbers.phoneNumber,
          status: phoneNumbers.status,
          userId: phoneNumbers.userId,
          twilioSid: phoneNumbers.twilioSid,
          country: phoneNumbers.country,
          monthlyPrice: phoneNumbers.monthlyPrice,
          purchasePrice: phoneNumbers.purchasePrice,
          elevenLabsPhoneNumberId: phoneNumbers.elevenLabsPhoneNumberId,
          isSystemPool: phoneNumbers.isSystemPool,
          createdAt: phoneNumbers.createdAt,
          userName: users.name,
          userEmail: users.email
        })
        .from(phoneNumbers)
        .leftJoin(users, eq(phoneNumbers.userId, users.id))
        .orderBy(desc(phoneNumbers.createdAt));
      res.json(numbers);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      res.status(500).json({ error: 'Failed to fetch phone numbers' });
    }
  });

  router.get('/phone-numbers/twilio-active', requireAdminPermission('phones', 'phone_numbers', 'read'), async (req: AdminRequest, res: Response) => {
    try {
      const dbSid = await storage.getGlobalSetting('twilio_account_sid');
      const dbToken = await storage.getGlobalSetting('twilio_auth_token');
      
      const accountSid = (dbSid?.value as string) || process.env.TWILIO_ACCOUNT_SID;
      const authToken = (dbToken?.value as string) || process.env.TWILIO_AUTH_TOKEN;
      
      if (!accountSid || !authToken) {
        return res.json({ numbers: [], error: 'Twilio not configured' });
      }
      
      const twilio = (await import('twilio')).default;
      const client = twilio(accountSid, authToken);
      
      const incomingNumbers = await client.incomingPhoneNumbers.list({ limit: 100 });
      
      res.json({
        numbers: incomingNumbers.map(n => ({
          sid: n.sid,
          phoneNumber: n.phoneNumber,
          friendlyName: n.friendlyName,
          capabilities: n.capabilities
        }))
      });
    } catch (error: any) {
      console.error('Error fetching Twilio numbers:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch Twilio numbers' });
    }
  });

  router.post('/phone-numbers/import', requireAdminPermission('phones', 'phone_numbers', 'update'), async (req: AdminRequest, res: Response) => {
    try {
      const { phoneNumber, twilioSid, provider, skipValidation } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
      
      const existing = await db.select().from(phoneNumbers).where(eq(phoneNumbers.phoneNumber, phoneNumber));
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Phone number already exists' });
      }
      
      const isTwilioImport = !provider || provider === 'twilio';
      let validatedSid = twilioSid;
      
      if (!skipValidation && isTwilioImport) {
        const dbSid = await storage.getGlobalSetting('twilio_account_sid');
        const dbToken = await storage.getGlobalSetting('twilio_auth_token');
        const twilioAccountSid = (dbSid?.value as string) || process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = (dbToken?.value as string) || process.env.TWILIO_AUTH_TOKEN;
        
        if (twilioAccountSid && twilioAuthToken) {
          const twilio = (await import('twilio')).default;
          const client = twilio(twilioAccountSid, twilioAuthToken);
          
          try {
            if (twilioSid) {
              const twilioNumber = await client.incomingPhoneNumbers(twilioSid).fetch();
              if (twilioNumber.phoneNumber !== phoneNumber) {
                return res.status(400).json({ 
                  error: `Twilio SID belongs to different number: ${twilioNumber.phoneNumber}` 
                });
              }
              validatedSid = twilioSid;
            } else {
              const numbers = await client.incomingPhoneNumbers.list({ phoneNumber });
              if (numbers.length === 0) {
                return res.status(400).json({ 
                  error: 'Phone number not found in Twilio account. Use "Load from Twilio" to import existing numbers.' 
                });
              }
              validatedSid = numbers[0].sid;
            }
          } catch (twilioError: any) {
            if (twilioError.code === 20404) {
              return res.status(400).json({ 
                error: 'Phone number not found in Twilio account. It may have been released.' 
              });
            }
            console.error('Twilio validation error:', twilioError.message);
            return res.status(400).json({ 
              error: `Twilio validation failed: ${twilioError.message}` 
            });
          }
        }
      }
      
      const [newNumber] = await db.insert(phoneNumbers).values({
        phoneNumber: phoneNumber,
        twilioSid: validatedSid || (isTwilioImport ? null : 'imported-' + Date.now()),
        status: 'active'
      }).returning();
      
      res.json({ success: true, phoneNumber: newNumber });
    } catch (error: any) {
      console.error('Error importing phone number:', error);
      res.status(500).json({ error: error.message || 'Failed to import phone number' });
    }
  });

  router.delete('/phone-numbers/release/:sid', requireAdminPermission('phones', 'phone_numbers', 'delete'), async (req: AdminRequest, res: Response) => {
    try {
      const { sid } = req.params;
      
      const dbSid = await storage.getGlobalSetting('twilio_account_sid');
      const dbToken = await storage.getGlobalSetting('twilio_auth_token');
      
      const accountSid = (dbSid?.value as string) || process.env.TWILIO_ACCOUNT_SID;
      const authToken = (dbToken?.value as string) || process.env.TWILIO_AUTH_TOKEN;
      
      if (!accountSid || !authToken) {
        return res.status(400).json({ error: 'Twilio not configured' });
      }
      
      const twilio = (await import('twilio')).default;
      const client = twilio(accountSid, authToken);
      
      await client.incomingPhoneNumbers(sid).remove();
      
      await db.delete(phoneNumbers).where(eq(phoneNumbers.twilioSid, sid));
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error releasing phone number:', error);
      res.status(500).json({ error: error.message || 'Failed to release phone number' });
    }
  });

  router.get('/phone-numbers/all', requireAdminPermission('phones', 'phone_numbers', 'read'), async (req: AdminRequest, res: Response) => {
    try {
      const allNumbers = await db
        .select({
          id: phoneNumbers.id,
          phoneNumber: phoneNumbers.phoneNumber,
          status: phoneNumbers.status,
          userId: phoneNumbers.userId,
          twilioSid: phoneNumbers.twilioSid,
          country: phoneNumbers.country,
          createdAt: phoneNumbers.createdAt,
          userName: users.name,
          userEmail: users.email
        })
        .from(phoneNumbers)
        .leftJoin(users, eq(phoneNumbers.userId, users.id))
        .orderBy(desc(phoneNumbers.createdAt));
      
      res.json(allNumbers);
    } catch (error) {
      console.error('Error fetching all phone numbers:', error);
      res.status(500).json({ error: 'Failed to fetch phone numbers' });
    }
  });

  router.patch('/phone-numbers/:id/assign', requireAdminPermission('phones', 'phone_numbers', 'update'), async (req: AdminRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      const phoneNumber = await db.select().from(phoneNumbers).where(eq(phoneNumbers.id, id));
      if (phoneNumber.length === 0) {
        return res.status(404).json({ error: 'Phone number not found' });
      }
      
      if (userId) {
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
      }
      
      await db.update(phoneNumbers)
        .set({ 
          userId: userId || null,
          status: userId ? 'assigned' : 'available'
        })
        .where(eq(phoneNumbers.id, id));
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error assigning phone number:', error);
      res.status(500).json({ error: 'Failed to assign phone number' });
    }
  });

  router.post('/phone-numbers/configure-webhooks', requireAdminPermission('phones', 'phone_numbers', 'update'), async (req: AdminRequest, res: Response) => {
    try {
      const { phoneNumberIds, webhookUrl } = req.body;
      
      if (!phoneNumberIds || !Array.isArray(phoneNumberIds) || phoneNumberIds.length === 0) {
        return res.status(400).json({ error: 'Phone number IDs are required' });
      }
      
      if (!webhookUrl) {
        return res.status(400).json({ error: 'Webhook URL is required' });
      }
      
      const dbSid = await storage.getGlobalSetting('twilio_account_sid');
      const dbToken = await storage.getGlobalSetting('twilio_auth_token');
      
      const accountSid = (dbSid?.value as string) || process.env.TWILIO_ACCOUNT_SID;
      const authToken = (dbToken?.value as string) || process.env.TWILIO_AUTH_TOKEN;
      
      if (!accountSid || !authToken) {
        return res.status(400).json({ error: 'Twilio not configured' });
      }
      
      const twilio = (await import('twilio')).default;
      const client = twilio(accountSid, authToken);
      
      const results: any[] = [];
      
      for (const id of phoneNumberIds) {
        const phoneNumberRecord = await db.select().from(phoneNumbers).where(eq(phoneNumbers.id, id));
        if (phoneNumberRecord.length === 0 || !phoneNumberRecord[0].twilioSid) {
          results.push({ id, success: false, error: 'Phone number not found or no Twilio SID' });
          continue;
        }
        
        try {
          await client.incomingPhoneNumbers(phoneNumberRecord[0].twilioSid).update({
            voiceUrl: webhookUrl,
            voiceMethod: 'POST'
          });
          results.push({ id, success: true });
        } catch (err: any) {
          results.push({ id, success: false, error: err.message });
        }
      }
      
      res.json({ success: true, results });
    } catch (error: any) {
      console.error('Error configuring webhooks:', error);
      res.status(500).json({ error: error.message || 'Failed to configure webhooks' });
    }
  });

  router.get('/phone-numbers/migration-status', requireAdminPermission('phones', 'phone_numbers', 'read'), async (req: AdminRequest, res: Response) => {
    try {
      const numbersNeedingMigration = await db
        .select({
          id: phoneNumbers.id,
          number: phoneNumbers.phoneNumber,
          status: phoneNumbers.status
        })
        .from(phoneNumbers)
        .where(
          and(
            eq(phoneNumbers.status, 'active'),
            isNull(phoneNumbers.elevenLabsPhoneNumberId)
          )
        );
      
      res.json({
        needsMigration: numbersNeedingMigration.length,
        numbers: numbersNeedingMigration
      });
    } catch (error) {
      console.error('Error getting migration status:', error);
      res.status(500).json({ error: 'Failed to get migration status' });
    }
  });

  router.post('/phone-numbers/migrate/:phoneNumberId', requireAdminPermission('phones', 'phone_numbers', 'update'), async (req: AdminRequest, res: Response) => {
    try {
      const { phoneNumberId } = req.params;
      
      const phoneNumber = await db.select().from(phoneNumbers).where(eq(phoneNumbers.id, phoneNumberId));
      if (phoneNumber.length === 0) {
        return res.status(404).json({ error: 'Phone number not found' });
      }
      
      await db.update(phoneNumbers)
        .set({ elevenLabsPhoneNumberId: 'migrated-' + Date.now() })
        .where(eq(phoneNumbers.id, phoneNumberId));
      
      res.json({ success: true, message: 'Phone number marked as migrated' });
    } catch (error: any) {
      console.error('Error migrating phone number:', error);
      res.status(500).json({ error: error.message || 'Failed to migrate phone number' });
    }
  });

  router.post('/phone-numbers/migrate-all', requireAdminPermission('phones', 'phone_numbers', 'update'), async (req: AdminRequest, res: Response) => {
    try {
      const result = await db.update(phoneNumbers)
        .set({ elevenLabsPhoneNumberId: 'migrated-' + Date.now() })
        .where(isNull(phoneNumbers.elevenLabsPhoneNumberId));
      
      res.json({ success: true, message: 'All phone numbers marked as migrated' });
    } catch (error: any) {
      console.error('Error migrating all phone numbers:', error);
      res.status(500).json({ error: error.message || 'Failed to migrate phone numbers' });
    }
  });

  router.post('/phone-numbers/migrate-agent/:agentId', requireAdminPermission('phones', 'phone_numbers', 'update'), async (req: AdminRequest, res: Response) => {
    try {
      const { agentId } = req.params;
      
      res.json({ success: true, message: 'Agent migration endpoint - not implemented' });
    } catch (error: any) {
      console.error('Error migrating agent:', error);
      res.status(500).json({ error: error.message || 'Failed to migrate agent' });
    }
  });

  router.post('/phone-numbers/cleanup', requireAdminPermission('phones', 'phone_numbers', 'update'), async (req: AdminRequest, res: Response) => {
    try {
      const dbSid = await storage.getGlobalSetting('twilio_account_sid');
      const dbToken = await storage.getGlobalSetting('twilio_auth_token');
      const twilioAccountSid = (dbSid?.value as string) || process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = (dbToken?.value as string) || process.env.TWILIO_AUTH_TOKEN;
      
      if (!twilioAccountSid || !twilioAuthToken) {
        return res.status(400).json({ error: 'Twilio credentials not configured' });
      }
      
      const twilio = (await import('twilio')).default;
      const client = twilio(twilioAccountSid, twilioAuthToken);
      
      const twilioPhoneSet = new Set<string>();
      const twilioSidSet = new Set<string>();
      let page: any = await client.incomingPhoneNumbers.page({ pageSize: 100 });
      
      while (page) {
        for (const number of page.instances) {
          twilioPhoneSet.add(number.phoneNumber);
          twilioSidSet.add(number.sid);
        }
        if (!page.nextPageUrl) break;
        page = await page.nextPage();
      }
      
      const dbNumbers = await db.select().from(phoneNumbers);
      
      let orphanedTwilio = 0;
      let orphanedUsers = 0;
      const orphanedDetails: Array<{ phoneNumber: string; reason: string }> = [];
      
      for (const number of dbNumbers) {
        const isTwilioManaged = number.twilioSid && 
          number.twilioSid.startsWith('PN') && 
          !number.twilioSid.startsWith('imported-');
        
        if (isTwilioManaged) {
          const existsInTwilio = twilioPhoneSet.has(number.phoneNumber) || 
            twilioSidSet.has(number.twilioSid!);
          
          if (!existsInTwilio) {
            await db.delete(phoneNumbers).where(eq(phoneNumbers.id, number.id));
            orphanedTwilio++;
            orphanedDetails.push({ 
              phoneNumber: number.phoneNumber, 
              reason: 'Not found in Twilio account' 
            });
            continue;
          }
        }
        
        if (number.userId) {
          const user = await storage.getUser(number.userId);
          if (!user) {
            await db.update(phoneNumbers)
              .set({ userId: null, status: 'available' })
              .where(eq(phoneNumbers.id, number.id));
            orphanedUsers++;
            orphanedDetails.push({ 
              phoneNumber: number.phoneNumber, 
              reason: 'Assigned to deleted user' 
            });
          }
        }
      }
      
      res.json({ 
        success: true, 
        cleaned: orphanedTwilio + orphanedUsers,
        orphanedTwilio,
        orphanedUsers,
        totalTwilioNumbers: twilioPhoneSet.size,
        details: orphanedDetails
      });
    } catch (error: any) {
      console.error('Error cleaning up phone numbers:', error);
      res.status(500).json({ error: error.message || 'Failed to cleanup phone numbers' });
    }
  });

  router.post('/phone-numbers/clear-sync-status', requireAdminPermission('phones', 'phone_numbers', 'update'), async (req: AdminRequest, res: Response) => {
    try {
      await db.update(phoneNumbers)
        .set({ elevenLabsPhoneNumberId: null })
        .where(isNotNull(phoneNumbers.elevenLabsPhoneNumberId));
      
      res.json({ success: true, message: 'Sync status cleared for all phone numbers' });
    } catch (error) {
      console.error('Error clearing sync status:', error);
      res.status(500).json({ error: 'Failed to clear sync status' });
    }
  });

  router.post('/phone-numbers/sync-to-elevenlabs', requireAdminPermission('phones', 'phone_numbers', 'update'), async (req: AdminRequest, res: Response) => {
    try {
      let { phoneNumberIds } = req.body;
      
      if (!phoneNumberIds || !Array.isArray(phoneNumberIds) || phoneNumberIds.length === 0) {
        const allPhoneNumbers = await db.select({ id: phoneNumbers.id })
          .from(phoneNumbers);
        phoneNumberIds = allPhoneNumbers.map(p => p.id);
      }
      
      if (phoneNumberIds.length === 0) {
        return res.json({ success: true, message: 'No phone numbers to sync', total: 0, synced: 0, failed: 0, results: [] });
      }
      
      const numbersToSync = await db.select()
        .from(phoneNumbers)
        .where(inArray(phoneNumbers.id, phoneNumberIds));
      
      const dbSid = await storage.getGlobalSetting('twilio_account_sid');
      const dbToken = await storage.getGlobalSetting('twilio_auth_token');
      const twilioAccountSid = (dbSid?.value as string) || process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = (dbToken?.value as string) || process.env.TWILIO_AUTH_TOKEN;
      
      if (!twilioAccountSid || !twilioAuthToken) {
        return res.status(400).json({ error: 'Twilio credentials not configured' });
      }
      
      const results: Array<{ id: string; phoneNumber: string; success: boolean; error?: string; elevenLabsPhoneNumberId?: string; credentialId?: string }> = [];
      let synced = 0;
      let failed = 0;
      
      const serviceCache = new Map<string, ElevenLabsService>();
      
      for (const phone of numbersToSync) {
        try {
          if (phone.elevenLabsPhoneNumberId) {
            results.push({ 
              id: phone.id, 
              phoneNumber: phone.phoneNumber, 
              success: true, 
              elevenLabsPhoneNumberId: phone.elevenLabsPhoneNumberId 
            });
            synced++;
            continue;
          }
          
          let credential;
          if (phone.userId) {
            credential = await ElevenLabsPoolService.getUserCredential(phone.userId);
          } else {
            credential = await ElevenLabsPoolService.getAvailableCredential();
          }
          
          if (!credential) {
            const ownerInfo = phone.userId ? `user ${phone.userId}` : 'system pool';
            console.error(`❌ No ElevenLabs credential for ${phone.phoneNumber} (${ownerInfo})`);
            results.push({ 
              id: phone.id, 
              phoneNumber: phone.phoneNumber, 
              success: false, 
              error: `No ElevenLabs credential available for ${ownerInfo}` 
            });
            failed++;
            continue;
          }
          
          let elevenLabsService = serviceCache.get(credential.id);
          if (!elevenLabsService) {
            elevenLabsService = new ElevenLabsService(credential.apiKey);
            serviceCache.set(credential.id, elevenLabsService);
          }
          
          console.log(`📞 Syncing phone number to ElevenLabs: ${phone.phoneNumber} (credential: ${credential.id})`);
          
          const result = await elevenLabsService.syncPhoneNumberToElevenLabs({
            phoneNumber: phone.phoneNumber,
            twilioAccountSid,
            twilioAuthToken,
            label: phone.phoneNumber,
            enableOutbound: true,
          });
          
          await db.update(phoneNumbers)
            .set({ elevenLabsPhoneNumberId: result.phone_number_id })
            .where(eq(phoneNumbers.id, phone.id));
          
          results.push({ 
            id: phone.id, 
            phoneNumber: phone.phoneNumber, 
            success: true, 
            elevenLabsPhoneNumberId: result.phone_number_id,
            credentialId: credential.id
          });
          synced++;
          console.log(`✅ Phone number synced: ${phone.phoneNumber} -> ${result.phone_number_id}`);
        } catch (error: any) {
          console.error(`❌ Failed to sync phone number ${phone.phoneNumber}:`, error.message);
          results.push({ 
            id: phone.id, 
            phoneNumber: phone.phoneNumber, 
            success: false, 
            error: error.message 
          });
          failed++;
        }
      }
      
      res.json({ 
        success: failed === 0, 
        message: `Synced ${synced} of ${numbersToSync.length} phone number(s)${failed > 0 ? ` (${failed} failed)` : ''}`,
        total: numbersToSync.length,
        synced,
        failed,
        results
      });
    } catch (error: any) {
      console.error('Error syncing to ElevenLabs:', error);
      res.status(500).json({ error: error.message || 'Failed to sync to ElevenLabs' });
    }
  });
}
