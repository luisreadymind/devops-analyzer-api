import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { logger } from '../config/logger.js';
import { AnalysisResult, AnalysisResultSchema } from '../schemas/analysisResult.js';

const client = new OpenAIClient(
  process.env.AZURE_OPENAI_ENDPOINT!,
  new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY!)
);

const MAX_INPUT_TOKENS = 50000; // Token limit for input text
const CHARS_PER_TOKEN = 4; // Approximate characters per token

function truncateTextToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = Math.ceil(text.length / CHARS_PER_TOKEN);
  
  if (estimatedTokens <= maxTokens) {
    logger.info({ 
      textLength: text.length, 
      estimatedTokens 
    }, 'Text within token limit');
    return text;
  }

  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const truncatedText = text.substring(0, maxChars);
  
  logger.warn({ 
    originalLength: text.length, 
    originalEstimatedTokens: estimatedTokens,
    truncatedLength: maxChars,
    truncatedEstimatedTokens: maxTokens 
  }, 'Text truncated to fit token limit');

  return truncatedText + '\n\n[Texto truncado para ajustarse al límite de tokens. Análisis basado en las primeras secciones del documento.]';
}

const SYSTEM_PROMPT = `Eres un experto consultor senior en DevOps, transformación digital y arquitectura de Azure con certificación en Well-Architected Framework. Analiza el siguiente documento de evaluación DevOps y proporciona un análisis integral siguiendo los estándares CMMI y los pilares del Azure Well-Architected Framework.

📋 CONSIDERACIONES PARA EL PLAN DE TRABAJO:
- Horario laboral: 9 AM a 6 PM (Hora México - UTC -6) = 8 horas por día
- Semana laboral: Lunes a Viernes (5 días laborales)
- Usa estas consideraciones para calcular las horas y duración del plan de trabajo
- Total de horas: flexible hasta 450 horas máximo según complejidad y madurez de la empresa

⚠️ IMPORTANTE: Debes responder ÚNICAMENTE con un objeto JSON válido siguiendo EXACTAMENTE esta estructura:

{
  "cliente": "Nombre del cliente extraído del documento (si no aparece, usa 'Cliente Genérico')",
  "evaluador": "Equipo Arquitectura Azure DevOps",
  "fechaAssessment": "YYYY-MM (fecha actual o del documento)",
  "resumenEjecutivo": {
    "madurezGlobal": <puntaje 0-100 del nivel general de madurez DevOps>,
    "diagnostico": "Diagnóstico ejecutivo completo (mínimo 300 caracteres) que sintetice el estado actual, áreas críticas y contexto de riesgo.",
    "hallazgosPrincipales": [
      "Hallazgo principal 1 (conciso y específico)",
      "Hallazgo principal 2",
      "Hallazgo principal 3",
      "Hallazgo principal 4"
    ],
    "impactoNegocio": "Descripción del impacto en el negocio (mínimo 200 caracteres): riesgos operativos, seguridad, velocidad de entrega, downtime."
  },
  "resultadoGlobal": {
    "puntuacionTotal": <mismo valor que madurezGlobal>,
    "nivelPredominante": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
    "areasCriticas": [
      "Área crítica 1 (puntaje < 40)",
      "Área crítica 2"
    ],
    "areasFuertes": [
      "Área fuerte 1 (puntaje >= 60)",
      "Área fuerte 2"
    ]
  },
  "capacidadWAF": [
    {
      "pilar": "Excelencia Operacional",
      "puntaje": <1-5>,
      "nivelCMMI": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "observaciones": "Evaluación específica del pilar de Excelencia Operacional: automatización, procedimientos de recuperación, pruebas de resiliencia."
    },
    {
      "pilar": "Seguridad",
      "puntaje": <1-5>,
      "nivelCMMI": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "observaciones": "Evaluación de seguridad: gestión de secretos, modelado de amenazas, cumplimiento normativo, controles proactivos."
    },
    {
      "pilar": "Confiabilidad",
      "puntaje": <1-5>,
      "nivelCMMI": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "observaciones": "Evaluación de confiabilidad: automatización de despliegues, cobertura de pruebas, gestión de versiones, capacidad de recuperación."
    },
    {
      "pilar": "Optimización de Costos",
      "puntaje": <1-5>,
      "nivelCMMI": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "observaciones": "Evaluación de costos: análisis de consumo, prácticas de ahorro, uso eficiente de recursos."
    },
    {
      "pilar": "Gobernanza",
      "puntaje": <1-5>,
      "nivelCMMI": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "observaciones": "Evaluación de gobernanza: políticas, controles automáticos, cumplimiento, directrices estandarizadas."
    },
    {
      "pilar": "Desempeño y Eficiencia",
      "puntaje": <1-5>,
      "nivelCMMI": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "observaciones": "Evaluación de desempeño: prácticas CI/CD, pruebas de performance, nivel de automatización."
    },
    {
      "pilar": "Cultura y Colaboración",
      "puntaje": <1-5>,
      "nivelCMMI": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "observaciones": "Evaluación cultural: adopción ágil, colaboración entre equipos, resistencia al cambio, indicadores culturales."
    },
    {
      "pilar": "Sostenibilidad",
      "puntaje": <1-5>,
      "nivelCMMI": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "observaciones": "Evaluación de sostenibilidad: gestión de artefactos, dependencias, iniciativas escalables."
    }
  ],
  "recomendaciones": [
    {
      "id": 1,
      "descripcion": "Descripción detallada de la recomendación prioritaria",
      "servicioAzure": "Nombre del servicio Azure específico",
      "prioridad": "ALTA|MEDIA|BAJA",
      "impactoEsperado": "Descripción del impacto esperado",
      "esfuerzo": "ALTO|MEDIO|BAJO"
    }
  ],
  "planTrabajo": {
    "horasMaximas": 450,
    "periodoMaximoMeses": 4,
    "horasSemanalesPorRecurso": 40,
    "resumenRoles": [
      {
        "rol": "Arquitecto Cloud",
        "horas": <total de horas asignadas>,
        "porcentaje": <porcentaje del total>
      },
      {
        "rol": "DevOps Engineer",
        "horas": <total de horas asignadas>,
        "porcentaje": <porcentaje del total>
      },
      {
        "rol": "QA Engineer",
        "horas": <total de horas asignadas>,
        "porcentaje": <porcentaje del total>
      },
      {
        "rol": "PM",
        "horas": <total de horas asignadas>,
        "porcentaje": <porcentaje del total>
      }
    ],
    "tareasDetalladas": [
      {
        "id_tarea": "T1",
        "descripcion": "Descripción detallada de la tarea",
        "horas_estimadas": <número>,
        "dependencia": "",
        "rol": "Arquitecto Cloud|DevOps Engineer|QA Engineer|PM",
        "fase": "MES_1|MES_2|MES_3|MES_4",
        "prioridad": "ALTA|MEDIA|BAJA"
      },
      {
        "id_tarea": "T2",
        "descripcion": "Otra tarea detallada",
        "horas_estimadas": <número>,
        "dependencia": "T1",
        "rol": "DevOps Engineer",
        "fase": "MES_1",
        "prioridad": "ALTA"
      }
    ]
  },
  "proyeccionEvolucion": [
    {
      "mes": 1,
      "madurezEsperada": <puntaje esperado 0-100>,
      "capacidadesImplementadas": [
        "Capacidad 1",
        "Capacidad 2"
      ],
      "kpisEsperados": {
        "leadTime": "X días",
        "deploymentFrequency": "X vez/veces por semana",
        "changeFailureRate": "X%"
      }
    },
    {
      "mes": 2,
      "madurezEsperada": <puntaje esperado>,
      "capacidadesImplementadas": [...],
      "kpisEsperados": {...}
    },
    {
      "mes": 3,
      "madurezEsperada": <puntaje esperado>,
      "capacidadesImplementadas": [...],
      "kpisEsperados": {...}
    },
    {
      "mes": 4,
      "madurezEsperada": <puntaje esperado>,
      "capacidadesImplementadas": [...],
      "kpisEsperados": {...}
    }
  ],
  "roadmap": [
    {
      "mes": 1,
      "entregables": [
        "Entregable 1",
        "Entregable 2"
      ],
      "objetivos": [
        "Objetivo 1",
        "Objetivo 2"
      ]
    },
    {
      "mes": 2,
      "entregables": [...],
      "objetivos": [...]
    },
    {
      "mes": 3,
      "entregables": [...],
      "objetivos": [...]
    },
    {
      "mes": 4,
      "entregables": [...],
      "objetivos": [...]
    }
  ]
}

REGLAS CRÍTICAS:

1. **Pilares WAF (capacidadWAF)**: Evalúa EXACTAMENTE estos 8 pilares con puntaje 1-5:
   - Excelencia Operacional
   - Seguridad
   - Confiabilidad
   - Optimización de Costos
   - Gobernanza
   - Desempeño y Eficiencia
   - Cultura y Colaboración
   - Sostenibilidad

2. **Niveles CMMI**: INICIAL (0-30), GESTIONADO (31-60), DEFINIDO (61-85), OPTIMIZADO (86-100)

3. **Plan de Trabajo**: 
   - Total de horas flexible según complejidad y madurez: HASTA 450 horas máximo
   - Ajustar las horas según nivel de madurez de la empresa y complejidad de las recomendaciones
   - Considerar horario laboral: 9 AM a 6 PM (8 horas/día) - Hora México UTC -6
   - Considerar semana laboral: Lunes a Viernes (5 días laborales)
   - Periodo de 4 meses
   - Distribuir entre 4 roles OBLIGATORIOS:
     * Arquitecto Cloud
     * DevOps Engineer
     * QA Engineer
     * PM (Project Manager)
   - **CRÍTICO**: Generar EXACTAMENTE entre 15-20 tareas detalladas (no menos de 15)
   - Las tareas NO deben incluir campo recomendacion_id
   - Las tareas deben ser específicas y accionables basadas en el análisis general
   - Calcular horas basándose en las recomendaciones priorizadas
   - Usar dependencias lógicas (T1, T2, etc.)

4. **Recomendaciones**: 
   - Generar MÍNIMO 10 recomendaciones (óptimo: 12-15)
   - Priorizar según impacto y urgencia
   - Cada recomendación debe especificar servicios Azure concretos
   - Las recomendaciones deben fundamentar el plan de trabajo

5. **Proyección y Roadmap**: 4 meses de evolución con incrementos graduales de madurez

6. **Contenido específico**: Todas las observaciones y descripciones deben ser contextuales al cliente, no genéricas

7. **Coherencia**: Los puntajes de capacidadWAF deben reflejar el nivel de madurezGlobal

8. **VALIDACIÓN FINAL**:
   - planTrabajo NO debe incluir campos: diasLaboralesPorSemana, diasLaborables, horasPorDia
   - planTrabajo DEBE tener: "horasMaximas": <hasta 450 según complejidad>
   - Las tareas NO deben tener campo recomendacion_id
   - Verifica la estructura antes de responder`;

export async function analyzePdfWithOpenAI(pdfText: string): Promise<AnalysisResult> {
  try {
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    
    // Truncate text if it exceeds token limit
    const truncatedText = truncateTextToTokenLimit(pdfText, MAX_INPUT_TOKENS);
    
    logger.info({ 
      deploymentName, 
      endpoint: endpoint?.substring(0, 40) + '...',
      textLength: truncatedText.length 
    }, 'Sending request to Azure OpenAI');

    const response = await client.getChatCompletions(
      deploymentName,
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analiza este documento de evaluación DevOps:\n\n${truncatedText}` }
      ],
      {
        temperature: 0.7,
        maxTokens: 16000,
        responseFormat: { type: 'json_object' }
      }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    logger.info({ responseLength: content.length }, 'Received response from Azure OpenAI');
    
    const parsedResult = JSON.parse(content);
    const validatedResult = AnalysisResultSchema.parse(parsedResult);

    logger.info({ 
      cliente: validatedResult.cliente,
      madurezGlobal: validatedResult.resumenEjecutivo.madurezGlobal,
      puntuacionTotal: validatedResult.resultadoGlobal.puntuacionTotal 
    }, 'Analysis completed successfully');
    return validatedResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack,
      // @ts-ignore - capture any additional properties
      code: (error as any).code,
      // @ts-ignore
      statusCode: (error as any).statusCode,
      // @ts-ignore
      response: (error as any).response
    } : error;
    
    logger.error({ 
      error: errorDetails,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
      hasEndpoint: !!process.env.AZURE_OPENAI_ENDPOINT,
      hasApiKey: !!process.env.AZURE_OPENAI_API_KEY
    }, 'Failed to analyze PDF with OpenAI');
    
    throw new Error(`Failed to analyze document with AI: ${errorMessage}`);
  }
}
