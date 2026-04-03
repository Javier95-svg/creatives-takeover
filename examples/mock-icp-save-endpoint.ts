// Mock reference only. This is not wired into the production runtime.
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

const icpAnalysisSchema = z.object({
  nicheScore: z.object({
    overall: z.number().min(0).max(100),
    verdict: z.enum(['Highly Viable', 'Promising', 'Needs Refinement']),
    subScores: z.object({
      marketSize: z.number().min(0).max(100),
      painIntensity: z.number().min(0).max(100),
      accessibility: z.number().min(0).max(100),
      competitiveGap: z.number().min(0).max(100),
    }),
    reasoning: z.string().min(10).max(4000),
  }),
  nicheProfile: z.object({
    nicheName: z.string().min(2).max(240),
    nicheDescription: z.string().min(10).max(4000),
  }).passthrough(),
  painPoints: z.array(z.object({
    painPoint: z.string().min(5).max(500),
    severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
    frequency: z.string().min(2).max(500),
    currentSolution: z.string().min(2).max(1000),
    gapInCurrentSolution: z.string().min(2).max(1000),
    opportunityScore: z.number().min(1).max(10),
  })).min(1).max(12),
  positioningStrategy: z.object({
    positioningStatement: z.string().min(10).max(1000),
    uniqueValueProposition: z.string().min(10).max(2000),
    keyDifferentiators: z.array(z.string().min(2).max(300)).min(1).max(10),
  }).passthrough(),
  actionPlan: z.array(z.object({
    priority: z.enum(['High', 'Medium', 'Low']),
    action: z.string().min(3).max(500),
    description: z.string().min(10).max(2000),
    channel: z.string().min(2).max(200),
  })).min(1).max(12),
});

const icpSavePayloadSchema = z.object({
  userId: z.string().uuid(),
  businessDescription: z.string().trim().min(30).max(12000),
  targetAudience: z.string().trim().min(8).max(3000),
  industry: z.string().trim().max(200).nullable().optional(),
  analysis: icpAnalysisSchema,
  clientEventId: z.string().trim().min(8).max(200),
});

type IcpSavePayload = z.infer<typeof icpSavePayloadSchema>;

type SaveDeps = {
  hasIcpRecord: (userId: string, businessDescription: string) => Promise<boolean>;
  saveIcpRecord: (payload: IcpSavePayload) => Promise<{ id: string }>;
};

export const createMockIcpSaveRouter = ({ hasIcpRecord, saveIcpRecord }: SaveDeps) => {
  const router = Router();

  router.post('/api/icp/save', async (req: Request, res: Response) => {
    const parsed = icpSavePayloadSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(422).json({
        success: false,
        error: 'Validation failed',
        fieldErrors: parsed.error.flatten(),
      });
    }

    const payload = parsed.data;

    try {
      const duplicate = await hasIcpRecord(payload.userId, payload.businessDescription);
      if (duplicate) {
        return res.status(409).json({
          success: false,
          error: 'An ICP profile with this description is already saved for this user.',
        });
      }

      const saved = await saveIcpRecord(payload);
      return res.status(201).json({
        success: true,
        id: saved.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown save error';
      const statusCode =
        message.toLowerCase().includes('timeout') ? 504 :
        message.toLowerCase().includes('unauthorized') ? 401 :
        500;

      return res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  });

  return router;
};
