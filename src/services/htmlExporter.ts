import { AnalysisResult } from '../schemas/analysisResult.js';
import { logger } from '../config/logger.js';

export function generateDashboardHtml(result: AnalysisResult): string {
  logger.info('Generating HTML dashboard from template');
  
  // Map capability areas to dimensions (already in correct format)
  const dimensionesData = result.capabilityAreas;

  // Map work plan to recommendations table
  const recomendacionesData = result.workPlan;

  const htmlLength = 0;
  logger.info({ 
    htmlLength,
    clientName: result.clientName,
    capabilityAreasCount: result.capabilityAreas.length,
    dimensionesCount: dimensionesData.length,
    recomendacionesCount: recomendacionesData.length,
    totalHours: recomendacionesData.reduce((sum, item) => sum + item.hours, 0)
  }, 'HTML dashboard generation started');

  // Return simple HTML for now - will be replaced with full template
  return `<!DOCTYPE html><html><head><title>DevOps Assessment - ${result.clientName}</title></head><body><h1>DevOps Dashboard - ${result.clientName}</h1><p>${result.executiveSummary}</p></body></html>`;
}
