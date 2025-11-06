import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { logger } from '../config/logger.js';
import { AnalysisResult, AnalysisResultSchema } from '../schemas/analysisResult.js';

const client = new OpenAIClient(
  process.env.AZURE_OPENAI_ENDPOINT!,
  new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY!)
);

const MAX_INPUT_TOKENS = 5000; // Token limit for input text
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
  "executiveSummary": "Resumen ejecutivo conciso de las fortalezas y debilidades críticas",
  "overallScore": 0-100,
  "potentialScore": 0-100,
  "cmmiLevelsExplanation": [
    {
      "level": "INICIAL",
      "scoreRange": "0-30",
      "description": "Procesos ad-hoc, impredecibles y reactivos"
    },
    {
      "level": "GESTIONADO",
      "scoreRange": "31-60",
      "description": "Procesos planificados, documentados y gestionados a nivel de proyecto"
    },
    {
      "level": "DEFINIDO",
      "scoreRange": "61-85",
      "description": "Procesos estandarizados, documentados y consistentes a nivel organizacional"
    },
    {
      "level": "OPTIMIZADO",
      "scoreRange": "86-100",
      "description": "Mejora continua basada en métricas y datos"
    }
  ],
  "capabilityAreas": [
    {
      "area": "Gestión Ágil de Proyectos",
      "score": 0-100,
      "level": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "assessment": "Evaluación detallada",
      "recommendations": "Recomendaciones específicas"
    },
    {
      "area": "Control de Versiones",
      "score": 0-100,
      "level": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "assessment": "Evaluación detallada",
      "recommendations": "Recomendaciones específicas"
    },
    {
      "area": "CI/CD",
      "score": 0-100,
      "level": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "assessment": "Evaluación detallada",
      "recommendations": "Recomendaciones específicas"
    },
    {
      "area": "Infraestructura como Código",
      "score": 0-100,
      "level": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "assessment": "Evaluación detallada",
      "recommendations": "Recomendaciones específicas"
    },
    {
      "area": "Seguridad",
      "score": 0-100,
      "level": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "assessment": "Evaluación detallada",
      "recommendations": "Recomendaciones específicas"
    },
    {
      "area": "Gestión de Configuración",
      "score": 0-100,
      "level": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "assessment": "Evaluación detallada",
      "recommendations": "Recomendaciones específicas"
    },
    {
      "area": "Monitoreo y Observabilidad",
      "score": 0-100,
      "level": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "assessment": "Evaluación detallada",
      "recommendations": "Recomendaciones específicas"
    },
    {
      "area": "Cultura DevOps",
      "score": 0-100,
      "level": "INICIAL|GESTIONADO|DEFINIDO|OPTIMIZADO",
      "assessment": "Evaluación detallada",
      "recommendations": "Recomendaciones específicas"
    }
  ],
  "azureServiceRecommendations": [
    {
      "service": "Nombre del servicio Azure",
      "summary": "Descripción breve",
      "vnetIntegration": "Sí/No - detalles",
      "pricing": "Información de precios",
      "url": "URL de documentación"
    }
  ],
  "workPlan": [
    {
      "id": "T-01",
      "task": "Descripción de la tarea",
      "hours": <número>,
      "dependency": "ID de tarea previa o vacío",
      "role": "Arquitecto Cloud|Ingeniero DevOps|Ingeniero QA|PM"
    }
  ],
  "azureArchitecture": {
    "title": "Título de la arquitectura",
    "description": "Descripción detallada",
    "diagram": "Diagrama en sintaxis Mermaid.js con componentes Azure",
    "services": [
      {
        "name": "Nombre del servicio",
        "role": "Función en la arquitectura"
      }
    ]
  }
}

REGLAS IMPORTANTES:
1. El workPlan debe tener un TOTAL de horas ESTRICTAMENTE INFERIOR a 400
2. Usa las 8 áreas de capacidad especificadas exactamente
3. Asigna niveles CMMI según los rangos: INICIAL (0-30), GESTIONADO (31-60), DEFINIDO (61-85), OPTIMIZADO (86-100)
4. El potentialScore debe ser realista (overallScore + mejora esperada)
5. Recomienda SOLO servicios de Azure relevantes
6. El diagrama Mermaid debe seguir la sintaxis correcta con componentes Azure`;

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
        maxTokens: 5000,
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
