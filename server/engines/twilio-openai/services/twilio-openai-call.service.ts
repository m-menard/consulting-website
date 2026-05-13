'use strict';
/**
 * ============================================================
 * Twilio-OpenAI Call Service
 * 
 * Handles outbound calls using Twilio with OpenAI Realtime API.
 * Uses existing Twilio credentials from the database.
 * ============================================================
 */

import twilio from 'twilio';
import { db } from '../../../db';
import { 
  twilioOpenaiCalls, 
  agents, 
  phoneNumbers,
  flows,
  users,
  hrCalls 
} from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { logger } from '../../../utils/logger';
import { 
  getAnswerWebhookUrl, 
  getStatusWebhookUrl,
  getStreamWebhookUrl 
} from '../config/twilio-openai-config';
import { OpenAIPoolService } from '../../plivo/services/openai-pool.service';
import { OpenAIAgentFactory } from '../../plivo/services/openai-agent-factory';
import { TwilioOpenAIAudioBridge } from './audio-bridge.service';
import { getTwilioClient } from '../../../services/twilio-connector';
import { 
  hydrateCompiledTools, 
  hydrateCompiledFlow,
  OpenAIVoiceAgentCompiler 
} from '../../../services/openai-voice-agent';
import { webhookDeliveryService } from '../../../services/webhook-delivery';
import type { AgentConfig, OpenAIVoice, CompiledFlowConfig } from '../types';
import type { CompiledFunctionTool, CompiledConversationState } from '@shared/schema';
import OpenAI from 'openai';


export interface InitiateCallParams {
  userId: string;
  agentId: string;
  toNumber: string;
  fromNumberId: string;
  campaignId?: string;
  contactId?: string;
  flowId?: string;
  candidateId?: string;
  metadata?: Record<string, unknown>;
}

export interface CallResult {
  success: boolean;
  callId?: string;
  twilioCallSid?: string;
  error?: string;
}

export class TwilioOpenAICallService {
  static async initiateCall(params: InitiateCallParams): Promise<CallResult> {
    const { userId, agentId, toNumber, fromNumberId, campaignId, contactId, flowId: overrideFlowId, candidateId,  metadata } = params;



    logger.info(`Initiating call to ${toNumber} from number ${fromNumberId}`, undefined, 'TwilioOpenAICall');

    try {
      const [agent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, agentId))
        .limit(1);



        

      if (!agent) {
        return { success: false, error: 'Agent not found' };
      }


      const [phoneNumber] = await db
        .select()
        .from(phoneNumbers)
        .where(eq(phoneNumbers.id, fromNumberId))
        .limit(1);

      if (!phoneNumber) {
        return { success: false, error: 'Phone number not found' };
      }

      // Check user has sufficient credits before making call
      const [user] = await db
        .select({ credits: users.credits })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || user.credits < 1) {
        logger.warn(`Insufficient credits for user ${userId}`, undefined, 'TwilioOpenAICall');
        return { success: false, error: 'Insufficient credits to make a call' };
      }

      const openaiCredential = await OpenAIPoolService.reserveSlot();
      console.log("CHECK OPEN AI credential", openaiCredential)
      if (!openaiCredential) {
        return { success: false, error: 'No OpenAI capacity available' };
      }

      const callId = nanoid();
      
      let agentConfig;

console.log("check candidate ID", candidateId)
      if (candidateId) {
  const existingActiveCall = await db
    .select()
    .from(hrCalls)
    .where(
      and(
        eq(hrCalls.candidateId, candidateId),
        inArray(hrCalls.status, ['queued', 'ringing', 'in_progress'])
      )
    )
    .limit(1);

  if (existingActiveCall.length > 0) {
    logger.warn(
      `Call already active for candidate ${candidateId}`,
      undefined,
      'TwilioOpenAICall'
    );

    return {
      success: false,
      error: 'Call already in progress for this candidate'
    };
  }
}
      
      const effectiveFlowId = overrideFlowId || agent.flowId;

      console.log(`[DEBUG] agent.type: ${agent.type}`);
console.log(`[DEBUG] agent.flowId: ${agent.flowId}`);
console.log(`[DEBUG] effectiveFlowId: ${effectiveFlowId}`);
console.log(`[DEBUG] agentConfig set after flow block: ${!!agentConfig}`);


      
      if (effectiveFlowId) {
        logger.info(`Agent is flow-based, fetching flow ${effectiveFlowId}${overrideFlowId ? ' (override from test)' : ''}`, undefined, 'TwilioOpenAICall');
        const [flow] = await db
          .select()
          .from(flows)
          .where(eq(flows.id, effectiveFlowId))
          .limit(1);

// const compiledTools = flow.compiledTools as CompiledFunctionTool[];
const compiledToolsRaw = flow.compiledTools;

const compiledTools: CompiledFunctionTool[] = Array.isArray(compiledToolsRaw)
  ? compiledToolsRaw
  : [];

const hydratedTools = hydrateCompiledTools(compiledTools, {
  userId,
  agentId,
  callId,
  knowledgeBaseIds: agent.knowledgeBaseIds || [],
  transferPhoneNumber: agent.transferPhoneNumber || undefined,
});


// ✅ ADD THIS DEBUG BLOCK
console.log(`[DEBUG] agent.knowledgeBaseIds:`, agent.knowledgeBaseIds);
console.log(`[DEBUG] compiledTools names:`, compiledTools.map((t: any) => t.function?.name));
console.log(`[DEBUG] hydratedTools names:`, hydratedTools.map(t => t.name));

          const hasKbTool = hydratedTools.some(t => 
  t.name === 'lookup_knowledge_base' || t.name === 'query_knowledge_base'
);
if (!hasKbTool && agent.knowledgeBaseIds && agent.knowledgeBaseIds.length > 0) {
  logger.info(`Injecting lookup_knowledge_base tool (missing from compiled data)`, undefined, 'TwilioOpenAICall');
  const { RAGKnowledgeService } = await import('../../../services/rag-knowledge');
  hydratedTools.push({
    name: 'lookup_knowledge_base',
    description: 'Search the knowledge base for relevant information to answer user questions. Use this when you need facts, policies, product details, pricing, or any specific information.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: "The search query to find relevant information. Be specific and include key terms from the user's question.",
        },
      },
      required: ['query'],
    },
    handler: async (params: Record<string, unknown>) => {
      try {
        const query = params.query as string;
        const results = await RAGKnowledgeService.searchKnowledge(
          query,
          agent.knowledgeBaseIds!,
          userId,
          5
        );
        if (results.length === 0) {
          return { found: false, message: 'No relevant information found.' };
        }
        const formattedResponse = RAGKnowledgeService.formatResultsForAgent(results, 400);
        return { found: true, information: formattedResponse };
      } catch (error: any) {
        return { found: false, message: 'Unable to search knowledge base.' };
      }
    },
  });
}


if (!flow) {
  console.log("❌ Flow NOT FOUND");
} else {
  console.log("✅ Flow loaded:", flow.id);
}
        
        if (flow) {
          // Use agent language (flows don't have language column)
          const language = agent.language || 'en';
          
          // Use custom prompts from metadata if provided (batch calls with contact variable substitution)
          const customSystemPrompt = metadata?.customSystemPrompt as string | undefined;
          const customFirstMessage = metadata?.customFirstMessage as string | undefined;
          
          // Check if flow has pre-compiled data (compiled at save time)
          if (flow.compiledSystemPrompt && flow.compiledTools) {
            logger.info(`Using pre-compiled flow data (${(flow.compiledTools as any[]).length} tools)`, undefined, 'TwilioOpenAICall');
            
            // Use custom prompts if provided (batch calls), otherwise use pre-compiled prompts
            const systemPrompt = customSystemPrompt || flow.compiledSystemPrompt;
            const firstMessage = customFirstMessage || flow.compiledFirstMessage || undefined;
            
            // Hydrate compiled tools with proper handlers using shared hydrator
            const compiledTools = flow.compiledTools as CompiledFunctionTool[];
            const hydratedTools = hydrateCompiledTools(compiledTools, {
              userId,
              agentId,
              callId,
              knowledgeBaseIds: agent.knowledgeBaseIds || [],
              transferPhoneNumber: agent.transferPhoneNumber || undefined,
            });


            // ✅ ADD THIS DEBUG BLOCK
console.log(`[DEBUG] agent.knowledgeBaseIds:`, agent.knowledgeBaseIds);
console.log(`[DEBUG] compiledTools names:`, compiledTools.map((t: any) => t.function?.name));
console.log(`[DEBUG] hydratedTools names:`, hydratedTools.map(t => t.name));

           // new code for kb start


           const hasKbTool = hydratedTools.some(t => 
  t.name === 'lookup_knowledge_base' || t.name === 'query_knowledge_base'
);
if (!hasKbTool && agent.knowledgeBaseIds && agent.knowledgeBaseIds.length > 0) {
  logger.info(`Injecting lookup_knowledge_base tool (missing from compiled data)`, undefined, 'TwilioOpenAICall');
  const { RAGKnowledgeService } = await import('../../../services/rag-knowledge');
  hydratedTools.push({
    name: 'lookup_knowledge_base',
    description: 'Search the knowledge base for relevant information to answer user questions. Use this when you need facts, policies, product details, pricing, or any specific information.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: "The search query to find relevant information. Be specific and include key terms from the user's question.",
        },
      },
      required: ['query'],
    },
    handler: async (params: Record<string, unknown>) => {
      try {
        const query = params.query as string;
        const results = await RAGKnowledgeService.searchKnowledge(
          query,
          agent.knowledgeBaseIds!,
          userId,
          5
        );
        if (results.length === 0) {
          return { found: false, message: 'No relevant information found.' };
        }
        const formattedResponse = RAGKnowledgeService.formatResultsForAgent(results, 400);
        return { found: true, information: formattedResponse };
      } catch (error: any) {
        return { found: false, message: 'Unable to search knowledge base.' };
      }
    },
  });
}


           // new code for kb end

            
            // Build config with pre-compiled data and hydrated tools
            // agentConfig = {
            //   voice: (agent.openaiVoice as OpenAIVoice) || 'alloy',
            //   model: 'gpt-realtime-1.5' as const,
            //   systemPrompt,
            //   firstMessage,
            //   temperature: agent.temperature ?? 0.7,
            //   tools: hydratedTools,
            //   flowId: effectiveFlowId,
            //   compiledStates: flow.compiledStates || [],  
            // };



            const compiledStates = flow.compiledStates || [];

// 🔥 FORCE FIRST NODE
const firstNode = compiledStates[0];

const forcedFirstMessage =
  customFirstMessage ||
  flow.compiledFirstMessage ||
  firstNode?.content ||
  "Starting interview...";

// 🔥 ADD FLOW CONTROL TOOL
hydratedTools.push({
  name: "next_step",
  description: "Move to next step in flow. Call this after receiving user's answer.",
  parameters: {
    type: "object",
    properties: {
      answer: {
        type: "string",
        description: "The user's answer to the current question"
      }
    },
    required: ["answer"]
  },
 handler: async (params: any) => {
  const answer = params?.answer || params?.user_input || "";
  const next = await moveToNextNode(callId, answer);
  
  if (!next) {
    // Flow khatam ho gaya — silence monitor band karo ABHI
    const session = TwilioOpenAIAudioBridge.getSession(callId);
    if (session?.silenceTimeoutId) {
      clearTimeout(session.silenceTimeoutId);
      session.silenceTimeoutId = undefined;
    }
    
    return {
      response: "Thank you for your time. We will review your responses and get back to you soon. Goodbye!",
      isLastStep: true
    };
  }
  
  return { response: next.content };
}
});

agentConfig = {
  voice: (agent.openaiVoice as OpenAIVoice) || 'alloy',
  model: 'gpt-realtime-1.5',
  
  // 🔥 STRONG SYSTEM PROMPT
//   systemPrompt: `
// You are a STRICT flow-based AI interviewer.

// RULES:
// - Follow flow EXACTLY step by step
// - Do NOT ask random questions
// - ONLY ask from flow
// - ALWAYS wait for response
// - Use next_step tool to continue

// Flow:
// ${JSON.stringify(compiledStates)}
// `,

  systemPrompt: `
You are a strict flow-based AI phone interviewer.

CONVERSATION RULES:
1. Ask ONLY the question given to you — do not add anything extra
2. After user answers, confirm ONCE: "Just to confirm, you said [X] — is that correct?"
3. If user says YES/YEAH/YEP/CORRECT/RIGHT/HMM → immediately call next_step with their answer
4. If user says NO/WRONG → ask them to repeat, then confirm again
5. After calling next_step, ask EXACTLY the next_question from the tool result — nothing else
6. When is_last_step is true → say goodbye and call end_call IMMEDIATELY
7. NEVER ask "please hold on while we proceed" — just ask the next question directly
8. NEVER confirm the same answer twice

CRITICAL: "Yeah", "Yep", "Hmm", "Sure", "Right" all mean YES — call next_step immediately.

Flow questions:
${JSON.stringify(compiledStates)}
`,

  // 🔥 FIXED MESSAGE
  firstMessage: forcedFirstMessage,

  temperature: agent.temperature ?? 0.7,
  tools: hydratedTools,

  flowId: effectiveFlowId,
  compiledStates,
};


// AFTER agentConfig set
console.log("🔥 FINAL AGENT CONFIG:", {
  hasFlow: !!agentConfig?.flowId,
  flowId: agentConfig?.flowId,
  systemPrompt: agentConfig?.systemPrompt?.slice(0, 100),
  tools: agentConfig?.tools?.map(t => t.name),
});
          } else {
            // Fall back to runtime compilation using shared services
            logger.info(`Flow loaded with ${(flow.nodes as any[]).length} nodes, language: ${language}, compiling at runtime`, undefined, 'TwilioOpenAICall');
            
            // Compile the flow using shared compiler
            const compiledResult = OpenAIVoiceAgentCompiler.compileFlow(
              flow.nodes as any[],
              flow.edges as any[],
              {
                language,
                voice: (agent.openaiVoice as string) || 'alloy',
                model: 'gpt-realtime-1.5',
                knowledgeBaseIds: agent.knowledgeBaseIds || [],
                transferEnabled: agent.transferEnabled || false,
                transferPhoneNumber: agent.transferPhoneNumber || undefined,
                endConversationEnabled: agent.endConversationEnabled ?? true,
              }
            );
            
            // Hydrate the compiled flow using shared hydrator
            // Use custom prompts if provided (batch calls), otherwise use compiled prompts
            agentConfig = hydrateCompiledFlow({
              compiledSystemPrompt: customSystemPrompt || compiledResult.systemPrompt,
              compiledFirstMessage: customFirstMessage || (compiledResult.firstMessage ?? null),
              compiledTools: compiledResult.tools as CompiledFunctionTool[],
              compiledStates: compiledResult.conversationStates as CompiledConversationState[],
              voice: (agent.openaiVoice as OpenAIVoice) || 'alloy',
              model: 'gpt-realtime-1.5',
              temperature: agent.temperature ?? 0.7,
              toolContext: {
                userId,
                agentId,
                callId,
              },
              language,
              knowledgeBaseIds: agent.knowledgeBaseIds || [],
              transferPhoneNumber: agent.transferPhoneNumber || undefined,
              transferEnabled: agent.transferEnabled || false,
            });
          }
        }
      }
      
      // Track if we used a flow-based config (tools already included)
      const isFlowAgent = agentConfig !== undefined;

      console.log(`[DEBUG] agentConfig set after flow block: ${!!agentConfig}`);
      console.log(`[DEBUG] isFlowAgent: ${isFlowAgent}`);
      
      if (!agentConfig && !effectiveFlowId) {
        // Natural agent - create base config and add tools
        // Use custom prompts from metadata if provided (batch calls with contact variable substitution)
        const customSystemPrompt = metadata?.customSystemPrompt as string | undefined;
        const customFirstMessage = metadata?.customFirstMessage as string | undefined;

        console.log("⚠️ FALLING BACK TO NATURAL AGENT ❌");
        
        let naturalConfig = OpenAIAgentFactory.createAgentConfig({
          voice: (agent.openaiVoice as OpenAIVoice) || 'alloy',
          model: 'gpt-realtime-1.5',
          systemPrompt: customSystemPrompt || agent.systemPrompt || 'You are a helpful AI assistant.',
          firstMessage: customFirstMessage || agent.firstMessage || undefined,
          temperature: agent.temperature ?? 0.7,
          toolContext: {
            userId,
            agentId,
            callId,
          },
        });

        // Add supplemental tools only for natural agents
        if (agent.knowledgeBaseIds && agent.knowledgeBaseIds.length > 0) {
          naturalConfig = OpenAIAgentFactory.addKnowledgeBaseTool(
            naturalConfig, 
            agent.knowledgeBaseIds, 
            userId
          );
        }

        if (agent.appointmentBookingEnabled) {
          naturalConfig = OpenAIAgentFactory.addAppointmentTool(naturalConfig, userId, agentId, callId);
        }

        if (agent.transferEnabled && agent.transferPhoneNumber) {
          naturalConfig = OpenAIAgentFactory.addTransferTool(
            naturalConfig,
            agent.transferPhoneNumber,
            undefined
          );
        }

        if (agent.endConversationEnabled) {
          naturalConfig = OpenAIAgentFactory.addEndCallTool(naturalConfig);
        }

        if (agent.detectLanguageEnabled) {
          naturalConfig = OpenAIAgentFactory.enableLanguageDetection(naturalConfig);
        }
        
        agentConfig = naturalConfig;
      }

      // Normalize phone numbers early - preserve + prefix for proper E.164 format display
      const normalizedFromNumber = phoneNumber.phoneNumber.replace(/[\s\-\(\)]/g, '').replace(/^\+?/, '+');
      const normalizedToNumber = toNumber.replace(/[\s\-\(\)]/g, '').replace(/^\+?/, '+');

      await TwilioOpenAIAudioBridge.createSession({
        callSid: callId,
        openaiApiKey: openaiCredential.apiKey,
        agentConfig: agentConfig as any,
        fromNumber: normalizedFromNumber,
        toNumber: normalizedToNumber,
        callDirection: 'outbound',
      });

      const client = await getTwilioClient();
      
      const call = await client.calls.create({
        to: toNumber.startsWith('+') ? toNumber : `+${toNumber}`,
        from: phoneNumber.phoneNumber.startsWith('+') 
          ? phoneNumber.phoneNumber 
          : `+${phoneNumber.phoneNumber}`,
        url: getAnswerWebhookUrl(),
        // statusCallback: getStatusWebhookUrl(),
        statusCallback: getStatusWebhookUrl({
  jobId: campaignId,
  candidateId: candidateId,
  userId: userId,
}),
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      });

      // Remap session from internal callId to Twilio CallSid so answer webhook can find it
      TwilioOpenAIAudioBridge.remapSession(callId, call.sid);

      await db.insert(twilioOpenaiCalls).values({
        id: callId,
        userId,
        agentId,
        campaignId,
        contactId,
        twilioPhoneNumberId: phoneNumber.id,
        openaiCredentialId: openaiCredential.id,
        twilioCallSid: call.sid,
        fromNumber: normalizedFromNumber,
        toNumber: normalizedToNumber,
        openaiVoice: (agent.openaiVoice as any) || 'alloy',
        openaiModel: 'gpt-realtime-1.5',
        status: 'initiated',
        callDirection: 'outbound',
        startedAt: new Date(),
        // metadata,
        metadata: {
  ...(metadata || {}),
  flowId: effectiveFlowId,
  currentStepIndex: 0,
  variables: {},
  score: 0
},
      });

      TwilioOpenAIAudioBridge.onSessionEnd(call.sid, async () => {
        await OpenAIPoolService.releaseSlot(openaiCredential.id);
      });

      logger.info(`Call initiated: ${callId} -> Twilio SID: ${call.sid}`, undefined, 'TwilioOpenAICall');

      // Trigger call.started webhook event
      try {
        await webhookDeliveryService.triggerEvent(userId, 'call.started', {
          call: {
            id: callId,
            callSid: call.sid,
            direction: 'outbound',
            status: 'initiated',
            startedAt: new Date().toISOString(),
            fromNumber: normalizedFromNumber,
            toNumber: normalizedToNumber,
          },
          agent: {
            id: agentId,
            name: agent.name || null,
          },
          campaign: campaignId ? { id: campaignId } : null,
        });
        logger.info(`Triggered call.started webhook for call ${callId}`, undefined, 'TwilioOpenAICall');
      } catch (webhookError: any) {
        logger.error(`Failed to trigger call.started webhook: ${webhookError.message}`, undefined, 'TwilioOpenAICall');
      }

      // Trigger flow.started webhook for flow-based agents
      if (isFlowAgent && effectiveFlowId) {
        try {
          const [flow] = await db
            .select()
            .from(flows)
            .where(eq(flows.id, effectiveFlowId))
            .limit(1);
          
          if (flow) {
            await webhookDeliveryService.triggerEvent(userId, 'flow.started', {
              flowId: flow.id,
              flowName: flow.name,
              callId: callId,
              callSid: call.sid,
              agentId: agentId,
              userId: userId,
            }, campaignId);
            logger.info(`Triggered flow.started webhook for call ${callId}, flow ${flow.name}`, undefined, 'TwilioOpenAICall');
          }
        } catch (flowWebhookError: any) {
          logger.error(`Failed to trigger flow.started webhook: ${flowWebhookError.message}`, undefined, 'TwilioOpenAICall');
        }
      }

      return {
        success: true,
        callId,
        twilioCallSid: call.sid,
      };

    } catch (error: any) {
      console.log("check initiate call", error.message)
      logger.error('Error initiating call', error.message, 'TwilioOpenAICall');
      return { success: false, error: error.message };
    }
  }

  static async hangupCall(callSid: string): Promise<boolean> {
    try {
      const [callRecord] = await db
        .select()
        .from(twilioOpenaiCalls)
        .where(eq(twilioOpenaiCalls.twilioCallSid, callSid))
        .limit(1);

      if (!callRecord) {
        logger.warn(`Call not found: ${callSid}`, undefined, 'TwilioOpenAICall');
        return false;
      }

      const client = await getTwilioClient();
      await client.calls(callSid).update({ status: 'completed' });

      await TwilioOpenAIAudioBridge.endSession(callSid);

      logger.info(`Call hung up: ${callSid}`, undefined, 'TwilioOpenAICall');
      return true;

    } catch (error: any) {
      logger.error('Error hanging up call', error.message, 'TwilioOpenAICall');
      return false;
    }
  }

  static async getCallStatus(callId: string): Promise<any> {
    const [call] = await db
      .select()
      .from(twilioOpenaiCalls)
      .where(eq(twilioOpenaiCalls.id, callId))
      .limit(1);

    return call || null;
  }
  
}



// async function moveToNextNode(callId: string) {
//   const [call] = await db
//     .select()
//     .from(twilioOpenaiCalls)
//     .where(eq(twilioOpenaiCalls.id, callId))
//     .limit(1);

//   if (!call?.metadata?.flowId) return null;

//   const [flow] = await db
//     .select()
//     .from(flows)
//     .where(eq(flows.id, call.metadata.flowId))
//     .limit(1);

//   if (!flow) return null;

//   const states = flow.compiledStates || [];

//   const currentIndex =
//     (call.metadata?.currentStepIndex ?? 0);

//   const nextIndex = currentIndex + 1;
//   const nextNode = states[nextIndex];

//   // update step index
//   await db.update(twilioOpenaiCalls)
//     .set({
//       metadata: {
//         ...call.metadata,
//         currentStepIndex: nextIndex,
//         flowId: flow.id
//       }
//     })
//     .where(eq(twilioOpenaiCalls.id, callId));

//   console.log("➡️ NEXT FLOW STEP:", nextNode?.id);

//   return nextNode;
// }





async function getAIScore(answer: string, question: string) {
  const apiKey = await OpenAIPoolService.getOpenAIKeyFromSettings();

  if (!apiKey) {
    console.error("❌ OpenAI key not found");
    return { score: 50, reason: "No API key" };
  }

  const openai = new OpenAI({ apiKey });

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
Evaluate answer like HR.

Return JSON:
{ "score": number, "reason": "short" }
`
      },
      {
        role: "user",
        content: `Q: ${question}\nA: ${answer}`
      }
    ],
    response_format: { type: "json_object" }
  });

  return JSON.parse(res.choices[0].message.content);
}


async function moveToNextNode(callId: string, userAnswer?: string) {
  const [call] = await db
    .select()
    .from(twilioOpenaiCalls)
    .where(eq(twilioOpenaiCalls.id, callId))
    .limit(1);

  if (!call?.metadata?.flowId) return null;

  const [flow] = await db
    .select()
    .from(flows)
    .where(eq(flows.id, call.metadata.flowId))
    .limit(1);

  if (!flow) return null;

  const states = flow.compiledStates || [];

  const currentIndex = call.metadata?.currentStepIndex ?? 0;
  const currentNode = states[currentIndex];

  let updatedMetadata = { ...(call.metadata || {}) };

  // 🔥 1. SAVE USER ANSWER
  if (currentNode?.variable && userAnswer) {
    updatedMetadata.variables = {
      ...(updatedMetadata.variables || {}),
      [currentNode.variable]: userAnswer
    };
  }

  // 🔥 2. AI SCORING (FOR ALL QUESTIONS)
  if (currentNode?.type === "question" && userAnswer) {
    try {
      const result = await getAIScore(userAnswer, currentNode.content);

      const prevScore = updatedMetadata.score || 0;
      updatedMetadata.score = prevScore + result.score;

      console.log("🤖 AI SCORE:", result.score);
    } catch (err) {
      console.error("AI scoring failed:", err);
    }
  }

  // 🔥 3. NEXT STEP
  const nextIndex = currentIndex + 1;
  const nextNode = states[nextIndex];

  updatedMetadata.currentStepIndex = nextIndex;

  await db.update(twilioOpenaiCalls)
    .set({ metadata: updatedMetadata })
    .where(eq(twilioOpenaiCalls.id, callId));

  console.log("➡️ NEXT FLOW STEP:", nextNode?.id);

  return nextNode;
}


