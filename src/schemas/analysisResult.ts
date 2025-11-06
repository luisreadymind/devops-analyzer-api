import { z } from 'zod';

export const AnalysisResultSchema = z.object({
  cliente: z.string(),
  evaluador: z.string(),
  fechaAssessment: z.string(),
  resumenEjecutivo: z.object({
    madurezGlobal: z.number().min(0).max(100),
    diagnostico: z.string(),
    hallazgosPrincipales: z.array(z.string()),
    impactoNegocio: z.string()
  }),
  resultadoGlobal: z.object({
    puntuacionTotal: z.number().min(0).max(100),
    nivelPredominante: z.enum(['INICIAL', 'GESTIONADO', 'DEFINIDO', 'OPTIMIZADO']),
    areasCriticas: z.array(z.string()),
    areasFuertes: z.array(z.string())
  }),
  capacidadWAF: z.array(
    z.object({
      pilar: z.string(),
      puntaje: z.number().min(0).max(5),
      nivelCMMI: z.enum(['INICIAL', 'GESTIONADO', 'DEFINIDO', 'OPTIMIZADO']),
      observaciones: z.string()
    })
  ),
  recomendaciones: z.array(
    z.object({
      id: z.number(),
      descripcion: z.string(),
      servicioAzure: z.string(),
      prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA']),
      impactoEsperado: z.string(),
      esfuerzo: z.enum(['ALTO', 'MEDIO', 'BAJO'])
    })
  ),
  planTrabajo: z.object({
    horasMaximas: z.number(),
    periodoMaximoMeses: z.number(),
    horasSemanalesPorRecurso: z.number(),
    resumenRoles: z.array(
      z.object({
        rol: z.string(),
        horas: z.number(),
        porcentaje: z.number()
      })
    ),
    tareasDetalladas: z.array(
      z.object({
        id_tarea: z.string(),
        descripcion: z.string(),
        horas_estimadas: z.number(),
        dependencia: z.string(),
        rol: z.string(),
        fase: z.string(),
        prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA'])
      })
    )
  }),
  proyeccionEvolucion: z.array(
    z.object({
      mes: z.number(),
      madurezEsperada: z.number().min(0).max(100),
      capacidadesImplementadas: z.array(z.string()),
      kpisEsperados: z.object({
        leadTime: z.string(),
        deploymentFrequency: z.string(),
        changeFailureRate: z.string()
      })
    })
  ),
  roadmap: z.array(
    z.object({
      mes: z.number(),
      entregables: z.array(z.string()),
      objetivos: z.array(z.string())
    })
  )
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

