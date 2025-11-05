import { z } from 'zod';

export const AnalysisResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  summary: z.string(),
  categories: z.array(
    z.object({
      name: z.string(),
      score: z.number().min(0).max(100),
      findings: z.array(z.string()),
      recommendations: z.array(z.string())
    })
  ),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  actionItems: z.array(
    z.object({
      priority: z.enum(['High', 'Medium', 'Low']),
      description: z.string(),
      estimatedEffort: z.string()
    })
  )
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
