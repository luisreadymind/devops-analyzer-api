import { AnalysisResult } from '../schemas/analysisResult.js';
import { logger } from '../config/logger.js';

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function generateDashboardHtml(result: AnalysisResult, fileName: string): string {
  logger.info('Generating HTML dashboard from template');

  const timestamp = new Date().toLocaleString('es-MX');
  
  // Map categories to dimensions
  const dimensionesData = result.categories.map(cat => ({
    nombre: cat.name,
    valor: cat.score,
    nivel: cat.score >= 86 ? 'OPTIMIZADO' : cat.score >= 61 ? 'DEFINIDO' : cat.score >= 31 ? 'GESTIONADO' : 'INICIAL',
    assessment: cat.findings.join(' '),
    recommendations: cat.recommendations.join(' ')
  }));

  const promedio = result.overallScore;
  const objetivo = Math.min(100, promedio + 30);
  const incrementoPorMes = (objetivo - promedio) / 4;
  const evolucion = [
    promedio,
    Math.round(promedio + incrementoPorMes),
    Math.round(promedio + incrementoPorMes * 2),
    Math.round(promedio + incrementoPorMes * 3),
    objetivo
  ];

  const recomendacionesData = result.actionItems.map((item, idx) => ({
    id: `T-${String(idx + 1).padStart(2, '0')}`,
    recomendacion: item.description,
    prioridad: item.priority === 'High' ? 'Alta' : item.priority === 'Medium' ? 'Media' : 'Baja',
    servicio: 'Azure DevOps / Azure',
    esfuerzo_h: item.estimatedEffort === 'Alto' ? 40 : item.estimatedEffort === 'Medio' ? 24 : 16,
    dependencia: '',
    role: item.priority === 'High' ? 'Arquitecto Cloud' : 'Ingeniero DevOps'
  }));

  const htmlLength = 0;
  logger.info({ 
    htmlLength,
    categoriesCount: result.categories.length,
    dimensionesCount: dimensionesData.length,
    recomendacionesCount: recomendacionesData.length
  }, 'HTML dashboard generation started');

  // Return simple HTML for now - will be replaced with full template
  return `<!DOCTYPE html><html><head><title>Test</title></head><body><h1>DevOps Dashboard</h1></body></html>`;
}
