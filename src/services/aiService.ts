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

const SYSTEM_PROMPT = `Eres un experto consultor en DevOps y transformación digital con especialización en Microsoft Azure. Analiza el siguiente documento de evaluación DevOps y proporciona un análisis detallado siguiendo los estándares CMMI.

Debes responder ÚNICAMENTE con un objeto JSON válido siguiendo EXACTAMENTE esta estructura:

{
  "clientName": "Nombre de la organización extraído del documento (si no se encuentra, usa 'Cliente_Confidencial')",
  "executiveSummary": "Resumen ejecutivo detallado (mínimo 500 caracteres) que incluya el nivel CMMI actual, puntuación general, fortalezas principales y debilidades críticas. Debe destacar la necesidad de acción inmediata en las áreas más débiles y proporcionar contexto sobre el impacto en el negocio.",
  "overallScore": <promedio ponderado de las 8 áreas>,
  "potentialScore": <puntuación realista alcanzable con las mejoras propuestas, típicamente +30 a +40 puntos>,
  "cmmiLevelsExplanation": [
    {
      "level": "INICIAL",
      "scoreRange": "0-30",
      "description": "Procesos impredecibles, poco controlados y reactivos. El éxito depende del esfuerzo individual y no de procesos probados."
    },
    {
      "level": "GESTIONADO",
      "scoreRange": "31-60",
      "description": "Los procesos se planifican y ejecutan de acuerdo con políticas; los proyectos se gestionan. Existen prácticas básicas pero no están estandarizadas en toda la organización."
    },
    {
      "level": "DEFINIDO",
      "scoreRange": "61-85",
      "description": "Los procesos están bien caracterizados y entendidos, y se describen en estándares, procedimientos y métodos. La organización utiliza versiones aprobadas y adaptadas de sus procesos estándar."
    },
    {
      "level": "OPTIMIZADO",
      "scoreRange": "86-100",
      "description": "La organización se enfoca en la mejora continua del rendimiento de los procesos a través de mejoras tecnológicas incrementales e innovadoras. Se utilizan métricas para la toma de decisiones basada en datos."
    }
  ],
  "capabilityAreas": [
    {
      "area": "Agile Software Development",
      "score": <0-100 basado en evidencia del documento>,
      "level": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "assessment": "Evaluación detallada (mínimo 300 caracteres) que incluya hallazgos específicos, fortalezas identificadas, debilidades y el nivel de adopción de prácticas ágiles como planificación de sprints, estimación, retrospectivas y uso de herramientas de gestión.",
      "recommendations": "Recomendaciones específicas y accionables que incluyan servicios de Azure relevantes (ej: Azure Boards, GitHub Projects), mejores prácticas de la industria y pasos concretos para mejorar."
    },
    {
      "area": "Control de versiones",
      "score": <0-100>,
      "level": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "assessment": "Evaluación detallada sobre el uso de sistemas de control de versiones, políticas de ramas, estrategias de revisión de código, gestión de conflictos y prácticas de versionado.",
      "recommendations": "Recomendaciones que incluyan Azure Repos, GitHub, políticas de branch protection, estrategias de branching (GitFlow, trunk-based), code review practices y integración con herramientas de seguridad."
    },
    {
      "area": "Integración continua y entrega continua (CI/CD)",
      "score": <0-100>,
      "level": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "assessment": "Evaluación sobre la madurez de pipelines de CI/CD, automatización de builds, testing automatizado, estrategias de deployment, gestión de artefactos y prácticas de release management.",
      "recommendations": "Recomendaciones específicas usando Azure Pipelines, GitHub Actions, estrategias de deployment (blue-green, canary), feature flags con Azure App Configuration, y automatización completa del ciclo de release."
    },
    {
      "area": "Infraestructura como un recurso flexible",
      "score": <0-100>,
      "level": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "assessment": "Evaluación sobre la adopción de Infrastructure as Code (IaC), automatización de provisioning, gestión de entornos, consistencia entre entornos y capacidad de escalar infraestructura de manera ágil.",
      "recommendations": "Recomendaciones prioritarias sobre adopción de Bicep, Terraform o ARM Templates, creación de pipelines de infraestructura, gestión de estado, y prácticas de infraestructura inmutable."
    },
    {
      "area": "Seguridad continua",
      "score": <0-100>,
      "level": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "assessment": "Evaluación sobre la integración de seguridad en el ciclo de desarrollo (DevSecOps), escaneo de vulnerabilidades, gestión de secretos, cumplimiento de políticas, threat modeling y prácticas de shift-left security.",
      "recommendations": "Recomendaciones usando GitHub Advanced Security, Azure Security Center, Microsoft Defender for Cloud, análisis SAST/DAST, escaneo de contenedores y gestión de políticas con Azure Policy."
    },
    {
      "area": "Administración de la configuración",
      "score": <0-100>,
      "level": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "assessment": "Evaluación sobre gestión centralizada de configuraciones, separación de configuración por entorno, gestión de secretos, rotación de credenciales y prácticas de configuration as code.",
      "recommendations": "Recomendaciones específicas usando Azure Key Vault para secretos, Azure App Configuration para settings, uso de Managed Identities, y mejores prácticas de externalización de configuración."
    },
    {
      "area": "Supervisión continua",
      "score": <0-100>,
      "level": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "assessment": "Evaluación sobre estrategia de observabilidad, recolección de telemetría, correlación de logs y métricas, alerting, dashboards, distributed tracing y análisis de rendimiento.",
      "recommendations": "Recomendaciones usando Azure Monitor, Application Insights, Log Analytics, creación de dashboards unificados, configuración de alertas inteligentes y prácticas de SRE."
    },
    {
      "area": "Cultura DevOps",
      "score": <0-100>,
      "level": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "assessment": "Evaluación sobre la cultura de colaboración entre equipos, responsabilidad compartida (shared ownership), prácticas de blameless post-mortems, learning culture y alineación organizacional hacia DevOps.",
      "recommendations": "Recomendaciones sobre prácticas organizacionales, establecimiento de SLOs/SLIs compartidos, fomento de experimentación, creación de comunidades de práctica y mejora continua cultural."
    }
  ],
  "azureServiceRecommendations": [
    {
      "service": "Nombre exacto del servicio Azure o GitHub",
      "summary": "Descripción completa (mínimo 150 caracteres) que explique por qué este servicio es fundamental para la transformación DevOps del cliente, qué capacidades específicas aporta y cómo se integra con otros servicios.",
      "vnetIntegration": "Especificar claramente si soporta integración con Virtual Network, Private Endpoints, Service Endpoints o N/A para servicios SaaS. Incluir detalles sobre agentes auto-hospedados si aplica.",
      "pricing": "Información específica del modelo de pricing: por usuario, por operación, tier gratuito disponible, o referencia a calculadora de precios.",
      "url": "URL completa de documentación oficial de Microsoft Learn o GitHub"
    }
  ],
  "workPlan": [
    {
      "id": "T1",
      "task": "Descripción clara y concisa de la fase o tarea (ej: 'Fase 1: Configuración de Fundamentos DevOps')",
      "hours": <número entero>,
      "dependency": "ID de tarea(s) requerida(s) previas separadas por coma (ej: 'T1, T2') o string vacío si no tiene dependencias",
      "role": "Arquitecto Cloud|Ingeniero DevOps|Ingeniero QA|PM"
    }
  ],
  "azureArchitecture": {
    "title": "Título descriptivo de la arquitectura propuesta (ej: 'Arquitectura de Referencia para Despliegue Continuo Seguro en Azure')",
    "description": "Descripción detallada (mínimo 300 caracteres) que explique el flujo completo de trabajo, desde el desarrollo hasta producción, destacando los puntos de integración entre servicios y las mejores prácticas implementadas.",
    "diagram": "graph TD;Dev[Desarrollador con GitHub Copilot];GitHub[GitHub Repo con Advanced Security];PipelineCI[Azure Pipelines CI];ACR[Azure Container Registry];PipelineCD[Azure Pipelines CD];Staging[Entorno Staging];Prod[Entorno Producción];KeyVault[Azure Key Vault];Monitor[Azure Monitor];Dev -- Push --> GitHub;GitHub -- Trigger --> PipelineCI;PipelineCI -- Publish --> ACR;ACR -- Trigger --> PipelineCD;PipelineCD -- Get Secrets --> KeyVault;PipelineCD -- Deploy --> Staging;Staging -- Approval --> PipelineCD;PipelineCD -- Deploy --> Prod;Prod -- Telemetry --> Monitor;Staging -- Telemetry --> Monitor;",
    "services": [
      {
        "name": "Nombre completo del servicio Azure",
        "role": "Descripción del rol específico que cumple este servicio en la arquitectura propuesta"
      }
    ]
  }
}

REGLAS CRÍTICAS QUE DEBES SEGUIR:
1. **Total de horas en workPlan**: La suma TOTAL de todas las horas DEBE ser ESTRICTAMENTE INFERIOR a 400 horas. Planifica entre 6-10 fases con distribución realista.
2. **Nombres exactos de áreas**: Usa EXACTAMENTE estos 8 nombres de área en el orden especificado:
   - "Agile Software Development"
   - "Control de versiones"
   - "Integración continua y entrega continua (CI/CD)"
   - "Infraestructura como un recurso flexible"
   - "Seguridad continua"
   - "Administración de la configuración"
   - "Supervisión continua"
   - "Cultura DevOps"
3. **Niveles CMMI precisos**: Asigna el nivel según el score: INICIAL (0-30), GESTIONADO (31-60), DEFINIDO (61-85), OPTIMIZADO (86-100)
4. **ExecutiveSummary completo**: Debe mencionar explícitamente el nivel CMMI detectado (ej: "El análisis revela una madurez DevOps en nivel 'Gestionado'")
5. **Diagrama Mermaid**: Escribe el diagrama en UNA SOLA LÍNEA sin saltos de línea, usando sintaxis graph TD con nodos descriptivos
6. **Servicios Azure relevantes**: Recomienda entre 5-8 servicios, priorizando los más críticos para las debilidades detectadas
7. **Dependencias en workPlan**: Usa formato "T1, T2" para múltiples dependencias o string vacío "" para ninguna
8. **Calidad de contenido**: Todos los campos de assessment y recommendations deben ser ESPECÍFICOS al contexto del cliente, no genéricos`;

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

    logger.info({ overallScore: validatedResult.overallScore }, 'Analysis completed successfully');
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
