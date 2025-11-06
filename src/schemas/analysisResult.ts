import { z } from 'zod';

export const AnalysisResultSchema = z.object({
  clientName: z.string(),
  executiveSummary: z.string(),
  overallScore: z.number().min(0).max(100),
  potentialScore: z.number().min(0).max(100),
  cmmiLevelsExplanation: z.array(
    z.object({
      level: z.string(),
      scoreRange: z.string(),
      description: z.string()
    })
  ),
  capabilityAreas: z.array(
    z.object({
      area: z.string(),
      score: z.number().min(0).max(100),
      level: z.enum(['INICIAL', 'GESTIONADO', 'DEFINIDO', 'OPTIMIZADO']),
      assessment: z.string(),
      recommendations: z.string()
    })
  ),
  azureServiceRecommendations: z.array(
    z.object({
      service: z.string(),
      summary: z.string(),
      vnetIntegration: z.string(),
      pricing: z.string(),
      url: z.string()
    })
  ),
  workPlan: z.array(
    z.object({
      id: z.string(),
      task: z.string(),
      hours: z.number(),
      dependency: z.string(),
      role: z.enum(['Arquitecto Cloud', 'Ingeniero DevOps', 'Ingeniero QA', 'PM'])
    })
  ),
  azureArchitecture: z.object({
    title: z.string(),
    description: z.string(),
    diagram: z.string(),
    services: z.array(
      z.object({
        name: z.string(),
        role: z.string()
      })
    )
  })
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
