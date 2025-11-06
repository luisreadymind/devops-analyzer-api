import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { logger } from '../config/logger.js';
import { AnalysisResult, AnalysisResultSchema } from '../schemas/analysisResult.js';

const client = new OpenAIClient(
  process.env.AZURE_OPENAI_ENDPOINT!,
  new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY!)
);

const SYSTEM_PROMPT = `Eres un experto consultor en DevOps y transformación digital. Analiza el siguiente documento de evaluación DevOps y proporciona un análisis detallado.

Debes responder ÚNICAMENTE con un objeto JSON válido siguiendo esta estructura:
{
  "overallScore": <número entre 0-100>,
  "summary": "<resumen ejecutivo de 2-3 párrafos>",
  "categories": [
    {
      "name": "<nombre de la categoría>",
      "score": <número entre 0-100>,
      "findings": ["<hallazgo 1>", "<hallazgo 2>"],
      "recommendations": ["<recomendación 1>", "<recomendación 2>"]
    }
  ],
  "strengths": ["<fortaleza 1>", "<fortaleza 2>"],
  "weaknesses": ["<debilidad 1>", "<debilidad 2>"],
  "actionItems": [
    {
      "priority": "High|Medium|Low",
      "description": "<descripción>",
      "estimatedEffort": "<esfuerzo estimado>"
    }
  ]
}

Analiza al menos 5 categorías principales de DevOps: CI/CD, Infrastructure as Code, Monitoring, Security, y Collaboration.`;

export async function analyzePdfWithOpenAI(pdfText: string): Promise<AnalysisResult> {
  try {
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    
    logger.info({ 
      deploymentName, 
      endpoint: endpoint?.substring(0, 40) + '...',
      textLength: pdfText.length 
    }, 'Sending request to Azure OpenAI');

    const response = await client.getChatCompletions(
      deploymentName,
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analiza este documento de evaluación DevOps:\n\n${pdfText}` }
      ],
      {
        temperature: 0.7,
        maxTokens: 4000,
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
