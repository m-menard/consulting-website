import { Router } from "express";
import { apiAuthMiddleware, asyncHandler } from "../middleware/auth.middleware.js";
import { db } from "../../../server/db.js";
import { candidates, jobs } from "../../../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
const router = Router();
const createContactSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  jobId: z.string().optional()
});
const bulkImportSchema = z.object({
  contacts: z.array(createContactSchema).min(1).max(1e4),
  skipDuplicates: z.boolean().optional().default(true),
  jobId: z.string().optional()
});
router.get(
  "/",
  apiAuthMiddleware("contacts:read"),
  asyncHandler(async (req, res) => {
    const { userId } = req.apiAuth;
    const page = parseInt(req.query.page) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize) || 50, 100);
    const offset = (page - 1) * pageSize;
    const contactList = await db.select().from(candidates).where(eq(candidates.userId, userId)).orderBy(desc(candidates.createdAt)).limit(pageSize).offset(offset);
    const response = {
      success: true,
      data: contactList.map((c) => ({
        id: c.id,
        phone: c.phone,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        tags: c.tags,
        pipelineStage: c.pipelineStage,
        aiScore: c.aiScore,
        aiSummary: c.aiSummary,
        jobId: c.jobId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      })),
      meta: {
        requestId: req.requestId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        pagination: {
          page,
          pageSize,
          totalItems: contactList.length,
          totalPages: Math.ceil(contactList.length / pageSize),
          hasNext: contactList.length === pageSize,
          hasPrev: page > 1
        }
      }
    };
    res.json(response);
  })
);
router.post(
  "/",
  apiAuthMiddleware("contacts:write"),
  asyncHandler(async (req, res) => {
    const { userId } = req.apiAuth;
    const parseResult = createContactSchema.safeParse(req.body);
    if (!parseResult.success) {
      const response2 = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: { errors: parseResult.error.flatten().fieldErrors }
        },
        meta: { requestId: req.requestId, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
      };
      return res.status(400).json(response2);
    }
    const data = parseResult.data;
    let jobId = data.jobId;
    if (!jobId) {
      const [firstJob] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.userId, userId)).limit(1);
      if (!firstJob) {
        const response2 = {
          success: false,
          error: { code: "NO_JOB", message: "No jobs found. Create a job first before adding candidates." },
          meta: { requestId: req.requestId, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
        };
        return res.status(400).json(response2);
      }
      jobId = firstJob.id;
    }
    const [existing] = await db.select().from(candidates).where(and(eq(candidates.userId, userId), eq(candidates.phone, data.phone))).limit(1);
    if (existing) {
      const response2 = {
        success: false,
        error: { code: "ALREADY_EXISTS", message: "Candidate with this phone number already exists." },
        meta: { requestId: req.requestId, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
      };
      return res.status(409).json(response2);
    }
    const [contact] = await db.insert(candidates).values({
      userId,
      jobId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email || void 0,
      tags: data.tags,
      source: "api",
      pipelineStage: "uploaded"
    }).returning();
    const response = {
      success: true,
      data: {
        id: contact.id,
        phone: contact.phone,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        tags: contact.tags,
        jobId: contact.jobId,
        pipelineStage: contact.pipelineStage,
        createdAt: contact.createdAt
      },
      meta: { requestId: req.requestId, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    };
    res.status(201).json(response);
  })
);
router.get(
  "/:id",
  apiAuthMiddleware("contacts:read"),
  asyncHandler(async (req, res) => {
    const { userId } = req.apiAuth;
    const { id } = req.params;
    const [contact] = await db.select().from(candidates).where(and(eq(candidates.id, id), eq(candidates.userId, userId))).limit(1);
    if (!contact) {
      const response2 = {
        success: false,
        error: { code: "NOT_FOUND", message: "Candidate not found." },
        meta: { requestId: req.requestId, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
      };
      return res.status(404).json(response2);
    }
    const response = {
      success: true,
      data: contact,
      meta: { requestId: req.requestId, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    };
    res.json(response);
  })
);
router.put(
  "/:id",
  apiAuthMiddleware("contacts:write"),
  asyncHandler(async (req, res) => {
    const { userId } = req.apiAuth;
    const { id } = req.params;
    const [existing] = await db.select().from(candidates).where(and(eq(candidates.id, id), eq(candidates.userId, userId))).limit(1);
    if (!existing) {
      const response2 = {
        success: false,
        error: { code: "NOT_FOUND", message: "Candidate not found." },
        meta: { requestId: req.requestId, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
      };
      return res.status(404).json(response2);
    }
    const { phone, firstName, lastName, email, tags, pipelineStage } = req.body;
    const [updated] = await db.update(candidates).set({
      phone: phone ?? existing.phone,
      firstName: firstName ?? existing.firstName,
      lastName: lastName ?? existing.lastName,
      email: email ?? existing.email,
      tags: tags ?? existing.tags,
      pipelineStage: pipelineStage ?? existing.pipelineStage,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(candidates.id, id)).returning();
    const response = {
      success: true,
      data: updated,
      meta: { requestId: req.requestId, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    };
    res.json(response);
  })
);
router.delete(
  "/:id",
  apiAuthMiddleware("contacts:write"),
  asyncHandler(async (req, res) => {
    const { userId } = req.apiAuth;
    const { id } = req.params;
    const result = await db.delete(candidates).where(and(eq(candidates.id, id), eq(candidates.userId, userId))).returning();
    if (result.length === 0) {
      const response2 = {
        success: false,
        error: { code: "NOT_FOUND", message: "Candidate not found." },
        meta: { requestId: req.requestId, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
      };
      return res.status(404).json(response2);
    }
    const response = {
      success: true,
      data: { deleted: true },
      meta: { requestId: req.requestId, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    };
    res.json(response);
  })
);
router.post(
  "/bulk-import",
  apiAuthMiddleware("contacts:write"),
  asyncHandler(async (req, res) => {
    const { userId } = req.apiAuth;
    const parseResult = bulkImportSchema.safeParse(req.body);
    if (!parseResult.success) {
      const response2 = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: { errors: parseResult.error.flatten().fieldErrors }
        },
        meta: { requestId: req.requestId, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
      };
      return res.status(400).json(response2);
    }
    const { contacts: newContacts, skipDuplicates } = parseResult.data;
    let jobId = parseResult.data.jobId;
    if (!jobId) {
      const [firstJob] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.userId, userId)).limit(1);
      if (!firstJob) {
        const response2 = {
          success: false,
          error: { code: "NO_JOB", message: "No jobs found. Create a job first before importing candidates." },
          meta: { requestId: req.requestId, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
        };
        return res.status(400).json(response2);
      }
      jobId = firstJob.id;
    }
    let imported = 0;
    let skipped = 0;
    const errors = [];
    for (let i = 0; i < newContacts.length; i++) {
      const contact = newContacts[i];
      try {
        const [existing] = await db.select().from(candidates).where(and(eq(candidates.userId, userId), eq(candidates.phone, contact.phone))).limit(1);
        if (existing) {
          if (skipDuplicates) {
            skipped++;
            continue;
          } else {
            errors.push({ row: i + 1, phone: contact.phone, error: "Duplicate phone number" });
            continue;
          }
        }
        await db.insert(candidates).values({
          userId,
          jobId,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          email: contact.email || void 0,
          tags: contact.tags,
          source: "api",
          pipelineStage: "uploaded"
        });
        imported++;
      } catch (error) {
        errors.push({ row: i + 1, phone: contact.phone, error: error.message });
      }
    }
    const responseData = {
      imported,
      skipped,
      errors: errors.map((e) => ({ row: e.row, phoneNumber: e.phone, error: e.error }))
    };
    const response = {
      success: true,
      data: responseData,
      meta: { requestId: req.requestId, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    };
    res.status(201).json(response);
  })
);
var contacts_routes_default = router;
export {
  contacts_routes_default as default
};
