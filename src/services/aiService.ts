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
- **Total de horas: MÁXIMO 400 horas** (debe ser menor a 450 horas obligatoriamente)
- **Tareas: EXACTAMENTE 10 tareas** (ni más ni menos)
- **Cada tarea DEBE incluir en su descripción el servicio de Azure recomendado para ejecutarla**
- **Priorizar servicios Azure con IA**: GitHub Copilot, GitHub Advanced Security, Azure OpenAI Service, Azure ML

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
      "observaciones": "Evaluación detallada (mínimo 200 caracteres) del estado actual: nivel de automatización, procedimientos de recuperación, pruebas de resiliencia, monitoreo proactivo. DEBE incluir recomendaciones específicas de servicios Azure: Azure Monitor para observabilidad, Application Insights para telemetría, Azure Automation para runbooks, Azure Log Analytics para centralización de logs, Azure DevOps para pipelines CI/CD automatizados. Especificar gaps identificados y cómo cada servicio Azure resolvería las deficiencias detectadas."
    },
    {
      "pilar": "Seguridad",
      "puntaje": <1-5>,
      "nivelCMMI": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "observaciones": "Evaluación detallada (mínimo 200 caracteres) de seguridad: gestión de secretos, modelado de amenazas, cumplimiento normativo, controles proactivos, vulnerabilidades identificadas. DEBE incluir servicios Azure específicos: Azure Key Vault para gestión de secretos y certificados, GitHub Advanced Security para escaneo de código y dependencias, Microsoft Defender for Cloud para protección de cargas de trabajo, Azure Policy para cumplimiento automatizado, Microsoft Entra ID para gestión de identidades, Azure Private Link para conectividad segura. Detallar brechas de seguridad y soluciones Azure puntuales."
    },
    {
      "pilar": "Confiabilidad",
      "puntaje": <1-5>,
      "nivelCMMI": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "observaciones": "Evaluación detallada (mínimo 200 caracteres) de confiabilidad: automatización de despliegues, cobertura de pruebas, gestión de versiones, capacidad de recuperación ante fallos, estrategias de backup. DEBE especificar servicios Azure: Azure DevOps para pipelines CI/CD resilientes, Azure Site Recovery para recuperación ante desastres, Azure Backup para protección de datos, Azure Traffic Manager para balanceo y failover, Azure Kubernetes Service (AKS) para orquestación con alta disponibilidad, Azure Front Door para distribución global. Identificar puntos únicos de falla y cómo Azure los mitigaría."
    },
    {
      "pilar": "Optimización de Costos",
      "puntaje": <1-5>,
      "nivelCMMI": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "observaciones": "Evaluación detallada (mínimo 200 caracteres) de optimización: análisis de consumo actual, prácticas de ahorro, uso eficiente de recursos, desperdicio identificado. DEBE incluir herramientas Azure específicas: Azure Cost Management + Billing para análisis de gastos, Azure Advisor para recomendaciones de ahorro, Azure Reserved Instances y Savings Plans para compromisos, Azure Policy para límites de gasto, Azure Automation para apagado programado de recursos no productivos, Azure Monitor para identificar recursos subutilizados. Cuantificar potencial de ahorro con cada servicio."
    },
    {
      "pilar": "Gobernanza",
      "puntaje": <1-5>,
      "nivelCMMI": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "observaciones": "Evaluación detallada (mínimo 200 caracteres) de gobernanza: políticas implementadas, controles automáticos, cumplimiento normativo, directrices estandarizadas, auditoría. DEBE especificar servicios Azure: Azure Policy para aplicación automática de políticas, Azure Blueprints para plantillas de gobernanza, Microsoft Purview para gobierno de datos, Azure Resource Manager (ARM) templates y Bicep para infraestructura como código (IaC), Azure Management Groups para jerarquía organizacional, Azure RBAC para control de accesos granular. Identificar gaps de cumplimiento y controles Azure necesarios."
    },
    {
      "pilar": "Desempeño y Eficiencia",
      "puntaje": <1-5>,
      "nivelCMMI": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "observaciones": "Evaluación detallada (mínimo 200 caracteres) de desempeño: prácticas CI/CD actuales, pruebas de performance, nivel de automatización, métricas de velocidad (lead time, deployment frequency). DEBE incluir servicios Azure: Azure DevOps o GitHub Actions para pipelines optimizados, Azure Load Testing para pruebas de carga, Application Insights para APM (Application Performance Monitoring), Azure Cache for Redis para optimización de latencia, Azure CDN para distribución de contenido, GitHub Copilot para acelerar desarrollo. Medir y comparar con benchmarks DORA metrics."
    },
    {
      "pilar": "Cultura y Colaboración",
      "puntaje": <1-5>,
      "nivelCMMI": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "observaciones": "Evaluación detallada (mínimo 200 caracteres) cultural: adopción de metodologías ágiles, colaboración entre equipos (Dev/Ops/QA), resistencia al cambio, silos organizacionales, indicadores de cultura DevOps. DEBE recomendar servicios Azure para colaboración: Azure DevOps Boards para gestión ágil de trabajo, GitHub para colaboración en código con pull requests, Azure DevOps Wiki para documentación compartida, Microsoft Teams integrado con DevOps para comunicación, GitHub Copilot para democratizar conocimiento técnico. Identificar barreras culturales y cómo las herramientas Azure facilitan la transformación."
    },
    {
      "pilar": "Sostenibilidad",
      "puntaje": <1-5>,
      "nivelCMMI": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "observaciones": "Evaluación detallada (mínimo 200 caracteres) de sostenibilidad: gestión de artefactos, control de dependencias, deuda técnica, escalabilidad de soluciones, impacto ambiental. DEBE especificar servicios Azure: Azure Container Registry para gestión centralizada de imágenes, Azure Artifacts para paquetes y dependencias, GitHub Dependabot para actualización automática de dependencias, Azure Kubernetes Service (AKS) para escalabilidad eficiente, Microsoft Sustainability Calculator para huella de carbono, Azure Advisor para recomendaciones de eficiencia energética. Evaluar madurez de prácticas sostenibles y roadmap Azure para mejorarlas."
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
    "horasMaximas": 400,
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
        "descripcion": "Implementar escaneo de código en el pipeline mediante la integración de GitHub Advanced Security para detectar vulnerabilidades y secretos expuestos",
        "horas_estimadas": <número>,
        "dependencia": "",
        "rol": "DevOps Engineer",
        "fase": "MES_1",
        "prioridad": "ALTA"
      },
      {
        "id_tarea": "T2",
        "descripcion": "Configurar GitHub Copilot para el equipo de desarrollo para acelerar la escritura de código y mejorar la productividad mediante IA",
        "horas_estimadas": <número>,
        "dependencia": "T1",
        "rol": "Arquitecto Cloud",
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
   
   **CRÍTICO - OBSERVACIONES DETALLADAS**: Cada observación debe tener MÍNIMO 200 caracteres y DEBE incluir:
   - Estado actual específico del cliente (no genérico)
   - Gaps y deficiencias identificadas
   - Servicios Azure específicos recomendados (mínimo 3-5 por pilar)
   - Explicación de CÓMO cada servicio Azure resuelve los problemas identificados
   - Impacto esperado de implementar cada servicio
   - Priorización de servicios según criticidad

2. **Niveles CMMI**: INICIAL (0-30), GESTIONADO (31-60), DEFINIDO (61-85), OPTIMIZADO (86-100)

3. **Plan de Trabajo**: 
   - **Total de horas: MÁXIMO 400 horas** (menos de 450h obligatorio)
   - Ajustar las horas según nivel de madurez de la empresa y complejidad de las recomendaciones
   - Considerar horario laboral: 9 AM a 6 PM (8 horas/día) - Hora México UTC -6
   - Considerar semana laboral: Lunes a Viernes (5 días laborales)
   - Periodo de 4 meses
   - Distribuir entre 4 roles OBLIGATORIOS:
     * Arquitecto Cloud
     * DevOps Engineer
     * QA Engineer
     * PM (Project Manager)
   - **CRÍTICO**: Generar EXACTAMENTE 10 tareas detalladas (ni más ni menos)
   - Las tareas NO deben incluir campo recomendacion_id
   - **DESCRIPCIÓN DE TAREAS**: Cada tarea DEBE especificar el servicio de Azure recomendado para realizarla
   - **FORMATO DE DESCRIPCIÓN**: "Acción a realizar mediante [Servicio Azure específico]. Ejemplo: Implementar escaneo de código en el pipeline mediante la integración de GitHub Advanced Security"
   - **SERVICIOS AZURE PRIORITARIOS A PROMOVER**:
     * GitHub Copilot (asistencia con IA en desarrollo)
     * GitHub Advanced Security (escaneo de vulnerabilidades y secretos)
     * Azure OpenAI Service (integración de IA en aplicaciones)
     * Azure Machine Learning (MLOps y modelos de IA)
     * Azure DevOps (pipelines CI/CD)
     * Azure Monitor y Application Insights (observabilidad)
     * Azure Key Vault (gestión de secretos)
     * Azure Container Registry (gestión de imágenes)
     * Azure Kubernetes Service (orquestación)
   - Priorizar el uso de tecnologías emergentes en IA que se integren al ciclo de desarrollo
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

7.5. **OBSERVACIONES EN CAPACIDAD WAF - REQUISITOS OBLIGATORIOS**:
   - Cada observación debe tener MÍNIMO 200 caracteres (idealmente 250-400)
   - Debe mencionar MÍNIMO 3-5 servicios Azure específicos por pilar
   - Debe explicar el GAP actual y CÓMO cada servicio Azure lo resolvería
   - Debe ser contextual al cliente, no genérica
   - Debe priorizar servicios según criticidad y quick wins
   - Debe incluir ejemplos concretos de implementación cuando sea posible

8. **VALIDACIÓN FINAL**:
   - planTrabajo NO debe incluir campos: diasLaboralesPorSemana, diasLaborables, horasPorDia
   - planTrabajo DEBE tener: "horasMaximas": 400 (máximo permitido, menos de 450)
   - Las tareas deben ser EXACTAMENTE 10 (no más, no menos)
   - Las tareas NO deben tener campo recomendacion_id
   - CADA tarea DEBE mencionar el servicio de Azure recomendado en su descripción
   - El total de horas de todas las tareas debe ser menor a 400 horas
   - CADA observación en capacidadWAF DEBE tener mínimo 200 caracteres y mencionar 3-5 servicios Azure
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
