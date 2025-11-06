import { AnalysisResult } from '../schemas/analysisResult.js';
import { logger } from '../config/logger.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

function escapeJson(obj: any): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export function generateDashboardHtml(result: AnalysisResult): string {
  logger.info('Generating HTML dashboard from template');

  const cssContent = readFileSync(join(__dirname, 'report-template.css'), 'utf-8');
  
  // Map new Spanish/WAF structure
  const dimensionesData = result.capacidadWAF;
  const tareasData = result.planTrabajo.tareasDetalladas;
  const promedio = result.resumenEjecutivo.madurezGlobal;
  
  // Use proyeccionEvolucion for evolution chart
  const evolucion = [
    promedio,
    ...result.proyeccionEvolucion.map(p => p.madurezEsperada)
  ];

  const objetivo = evolucion[evolucion.length - 1];

  // Generate sections for each WAF pillar
  const areaSectionsHtml = result.capacidadWAF.map((pilar) => {
    const sectionKey = pilar.pilar.toLowerCase()
      .replace(/\s+/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    // Convert 0-5 scale to 0-100 for display
    const puntajeDisplay = Math.round((pilar.puntaje / 5) * 100);
    
    return `
        <div class="grid-2 mt-3 d-none" id="section-${sectionKey}">
          <div class="panel">
            <div class="panel-title"><span>${escapeHtml(pilar.pilar)}</span></div>
            <div class="mb-3">
              <div class="kpi-value" style="font-size: 48px;">${puntajeDisplay} %</div>
              <div class="kpi-sub">Nivel: <strong>${pilar.nivelCMMI}</strong> | Puntaje: ${pilar.puntaje}/5</div>
            </div>
            <h5 class="small-text" style="font-weight: bold;">Observaciones</h5>
            <p class="small-text">${escapeHtml(pilar.observaciones)}</p>
          </div>
          <div class="panel">
            <div class="panel-title"><span>Niveles CMMI</span></div>
            <div class="mb-2 ${pilar.nivelCMMI === 'INICIAL' ? 'p-2' : ''}" style="${pilar.nivelCMMI === 'INICIAL' ? 'background: #FFE6E6; border-left: 3px solid #D13438;' : ''}">
              <strong class="small-text">INICIAL</strong> <span class="small-text">(0-30)</span>
              <p class="small-text mb-0">Procesos impredecibles, poco controlados y reactivos.</p>
            </div>
            <div class="mb-2 ${pilar.nivelCMMI === 'GESTIONADO' ? 'p-2' : ''}" style="${pilar.nivelCMMI === 'GESTIONADO' ? 'background: #FFF4E6; border-left: 3px solid #FF8C00;' : ''}">
              <strong class="small-text">GESTIONADO</strong> <span class="small-text">(31-60)</span>
              <p class="small-text mb-0">Los procesos se planifican y ejecutan de acuerdo con políticas.</p>
            </div>
            <div class="mb-2 ${pilar.nivelCMMI === 'DEFINIDO' ? 'p-2' : ''}" style="${pilar.nivelCMMI === 'DEFINIDO' ? 'background: #E6F3FF; border-left: 3px solid #0078D4;' : ''}">
              <strong class="small-text">DEFINIDO</strong> <span class="small-text">(61-85)</span>
              <p class="small-text mb-0">Los procesos están bien caracterizados y entendidos.</p>
            </div>
            <div class="mb-2 ${pilar.nivelCMMI === 'OPTIMIZADO' ? 'p-2' : ''}" style="${pilar.nivelCMMI === 'OPTIMIZADO' ? 'background: #E6F7E6; border-left: 3px solid #107C10;' : ''}">
              <strong class="small-text">OPTIMIZADO</strong> <span class="small-text">(86-100)</span>
              <p class="small-text mb-0">La organización se enfoca en la mejora continua del rendimiento.</p>
            </div>
          </div>
        </div>`;
  }).join('');

  // Generate Recommendations section
  const recomendacionesHtml = result.recomendaciones.length > 0 ? `
        <div class="mt-3 d-none" id="section-recomendaciones-lista">
          <div class="panel">
            <div class="panel-title"><span>Recomendaciones Prioritarias</span></div>
            <div class="table-responsive">
              <table class="table table-sm table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Descripción</th>
                    <th scope="col">Servicio Azure</th>
                    <th scope="col">Prioridad</th>
                    <th scope="col">Impacto Esperado</th>
                    <th scope="col">Esfuerzo</th>
                  </tr>
                </thead>
                <tbody class="small-text">
                  ${result.recomendaciones.map(rec => `
                    <tr>
                      <td><strong>${rec.id}</strong></td>
                      <td>${escapeHtml(rec.descripcion)}</td>
                      <td>${escapeHtml(rec.servicioAzure)}</td>
                      <td><span class="badge bg-${rec.prioridad === 'ALTA' ? 'danger' : rec.prioridad === 'MEDIA' ? 'warning' : 'secondary'}">${rec.prioridad}</span></td>
                      <td>${escapeHtml(rec.impactoEsperado)}</td>
                      <td><span class="badge bg-${rec.esfuerzo === 'ALTO' ? 'danger' : rec.esfuerzo === 'MEDIO' ? 'warning' : 'success'}">${rec.esfuerzo}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>` : '';

  // Generate Projection section
  const proyeccionHtml = `
        <div class="mt-3 d-none" id="section-proyeccion">
          <div class="panel">
            <div class="panel-title"><span>Proyección de Evolución (4 meses)</span></div>
            ${result.proyeccionEvolucion.map(proy => `
              <div class="mb-3 p-3" style="background: #F5F5F5; border-radius: 4px;">
                <h6 class="small-text" style="font-weight: bold;">Mes ${proy.mes} - Madurez esperada: ${proy.madurezEsperada}%</h6>
                <p class="small-text mb-2"><strong>Capacidades a implementar:</strong></p>
                <ul class="small-text mb-2">
                  ${proy.capacidadesImplementadas.map(cap => `<li>${escapeHtml(cap)}</li>`).join('')}
                </ul>
                <p class="small-text mb-1"><strong>KPIs esperados:</strong></p>
                <ul class="small-text mb-0">
                  <li><strong>Lead Time:</strong> ${escapeHtml(proy.kpisEsperados.leadTime)}</li>
                  <li><strong>Deployment Frequency:</strong> ${escapeHtml(proy.kpisEsperados.deploymentFrequency)}</li>
                  <li><strong>Change Failure Rate:</strong> ${escapeHtml(proy.kpisEsperados.changeFailureRate)}</li>
                </ul>
              </div>
            `).join('')}
          </div>
        </div>`;

  // Generate Roadmap section
  const roadmapHtml = `
        <div class="mt-3 d-none" id="section-roadmap">
          <!-- Tabla de Plan de Trabajo Detallado -->
          <div class="panel mb-3">
            <div class="panel-title"><span>Plan de Trabajo Detallado (${result.planTrabajo.horasMaximas}h ≈ ${result.planTrabajo.periodoMaximoMeses} meses)</span></div>
            <div class="table-responsive">
              <table class="table table-sm table-hover align-middle mb-0" style="font-size: 0.85rem;">
                <thead class="table-light">
                  <tr>
                    <th scope="col" style="width: 8%;">ID Tarea</th>
                    <th scope="col" style="width: 35%;">Descripción</th>
                    <th scope="col" style="width: 12%;">Horas Estimadas</th>
                    <th scope="col" style="width: 18%;">Rol</th>
                    <th scope="col" style="width: 12%;">Fase</th>
                    <th scope="col" style="width: 15%;">Dependencia</th>
                  </tr>
                </thead>
                <tbody>
                  ${result.planTrabajo.tareasDetalladas.map(tarea => {
                    const prioridadColor = tarea.prioridad === 'ALTA' ? '#D13438' : 
                                          tarea.prioridad === 'MEDIA' ? '#FF8C00' : '#107C10';
                    return `
                    <tr>
                      <td><span class="badge" style="background-color: ${prioridadColor};">${escapeHtml(tarea.id_tarea)}</span></td>
                      <td>${escapeHtml(tarea.descripcion)}</td>
                      <td class="text-center"><strong>${tarea.horas_estimadas}h</strong></td>
                      <td>${escapeHtml(tarea.rol)}</td>
                      <td><span class="badge bg-secondary">${escapeHtml(tarea.fase)}</span></td>
                      <td class="text-center">${tarea.dependencia ? escapeHtml(tarea.dependencia) : '-'}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
                <tfoot class="table-light">
                  <tr>
                    <td colspan="2" class="text-end"><strong>TOTAL HORAS:</strong></td>
                    <td class="text-center"><strong>${result.planTrabajo.tareasDetalladas.reduce((sum, t) => sum + t.horas_estimadas, 0)}h</strong></td>
                    <td colspan="3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- Gráfico de Distribución de Horas por Rol -->
          <div class="panel mb-3">
            <div class="panel-title"><span>Distribución de Horas por Rol</span></div>
            <div class="row">
              <div class="col-md-6">
                <canvas id="horasPorRolChart" style="max-height: 300px;"></canvas>
              </div>
              <div class="col-md-6">
                <div class="table-responsive">
                  <table class="table table-sm mb-0" style="font-size: 0.85rem;">
                    <thead class="table-light">
                      <tr>
                        <th>Rol</th>
                        <th class="text-end">Horas</th>
                        <th class="text-end">Porcentaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${result.planTrabajo.resumenRoles.map(rol => `
                        <tr>
                          <td>${escapeHtml(rol.rol)}</td>
                          <td class="text-end"><strong>${rol.horas}h</strong></td>
                          <td class="text-end">${rol.porcentaje.toFixed(2)}%</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- Roadmap de Implementación -->
          <div class="panel">
            <div class="panel-title"><span>Roadmap de Implementación por Mes</span></div>
            ${result.roadmap.map(rm => `
              <div class="mb-3 p-3" style="background: #E6F3FF; border-left: 4px solid #0078D4; border-radius: 4px;">
                <h6 class="small-text" style="font-weight: bold;">Mes ${rm.mes}</h6>
                <p class="small-text mb-2"><strong>Entregables:</strong></p>
                <ul class="small-text mb-2">
                  ${rm.entregables.map(ent => `<li>${escapeHtml(ent)}</li>`).join('')}
                </ul>
                <p class="small-text mb-1"><strong>Objetivos:</strong></p>
                <ul class="small-text mb-0">
                  ${rm.objetivos.map(obj => `<li>${escapeHtml(obj)}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </div>`;

  // Navigation items for WAF pillars
  const navItemsHtml = result.capacidadWAF.map((pilar, idx) => {
    const sectionKey = pilar.pilar.toLowerCase()
      .replace(/\s+/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    const icons = [
      'bi-star', 'bi-shield-lock', 'bi-heart-pulse', 'bi-piggy-bank',
      'bi-clipboard-check', 'bi-speedometer2', 'bi-people', 'bi-tree'
    ];
    
    return `
      <div class="nav-item" data-section-key="${sectionKey}" onclick="switchSection('${sectionKey}')">
        <i class="bi ${icons[idx] || 'bi-circle'}"></i> <span>${escapeHtml(pilar.pilar)}</span>
      </div>`;
  }).join('');

  const totalHours = result.planTrabajo.horasMaximas;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Dashboard DevOps - ${escapeHtml(result.cliente)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tabulator-tables@6.2.5/dist/css/tabulator_bootstrap5.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.6/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/tabulator-tables@6.2.5/dist/js/tabulator.min.js"></script>
  <style>${cssContent}</style>
</head>
<body>
  <div class="app-shell">
    <aside class="left-nav">
      <div class="brand">
        <i class="bi bi-app-indicator"></i>
        <div>
          Dashboard DevOps
          <small>Azure CAF / WAF / DevOps</small>
        </div>
      </div>
      <div class="nav-item active" data-section-key="dashboard" onclick="switchSection('dashboard')">
        <i class="bi bi-grid-1x2"></i> <span>Panel general</span>
      </div>
      ${navItemsHtml}
      <div class="nav-item" data-section-key="recomendaciones-lista" onclick="switchSection('recomendaciones-lista')">
        <i class="bi bi-lightbulb"></i> <span>Recomendaciones</span>
      </div>
      <div class="nav-item" data-section-key="proyeccion" onclick="switchSection('proyeccion')">
        <i class="bi bi-graph-up-arrow"></i> <span>Proyección 4 meses</span>
      </div>
      <div class="nav-item" data-section-key="roadmap" onclick="switchSection('roadmap')">
        <i class="bi bi-kanban"></i> <span>Roadmap ${result.planTrabajo.periodoMaximoMeses} meses</span>
      </div>
      <div class="nav-item" data-section-key="fuente" onclick="switchSection('fuente')">
        <i class="bi bi-filetype-pdf"></i> <span>Fuente: Documento</span>
      </div>
    </aside>

    <main class="main-view">
      <header class="topbar">
        <div>
          <div class="topbar-title">Evaluación de Madurez DevOps - ${escapeHtml(result.cliente)}</div>
          <div class="small-text">${escapeHtml(result.resumenEjecutivo.diagnostico.substring(0, 150))}...</div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="badge-env">Producción</span>
          <button class="btn-export" onclick="exportHTML()"><i class="bi bi-download"></i> Exportar HTML</button>
          <button class="btn-export" style="background: #6c757d;" onclick="showJsonModal()"><i class="bi bi-eye"></i> Ver JSON</button>
          <button class="btn-export" style="background: #28a745;" onclick="downloadJSON()"><i class="bi bi-file-earmark-code"></i> Descargar JSON</button>
        </div>
      </header>

      <section class="content-area">
        <div class="kpi-grid">
          <div class="kpi">
            <div class="kpi-label"><i class="bi bi-speedometer2"></i> Madurez global</div>
            <div class="kpi-value">${promedio}%</div>
            <div class="kpi-sub">Objetivo a 4 meses: ${objetivo}%</div>
          </div>
          <div class="kpi">
            <div class="kpi-label"><i class="bi bi-award"></i> Nivel Predominante</div>
            <div class="kpi-value" style="font-size: 24px;">${result.resultadoGlobal.nivelPredominante}</div>
            <div class="kpi-sub">Puntuación: ${result.resultadoGlobal.puntuacionTotal}%</div>
          </div>
          <div class="kpi">
            <div class="kpi-label"><i class="bi bi-exclamation-triangle"></i> Áreas Críticas</div>
            <div class="kpi-value" style="font-size: 32px;">${result.resultadoGlobal.areasCriticas.length}</div>
            <div class="kpi-sub">${escapeHtml(result.resultadoGlobal.areasCriticas[0] || 'N/A')}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label"><i class="bi bi-check-circle"></i> Áreas Fuertes</div>
            <div class="kpi-value" style="font-size: 32px;">${result.resultadoGlobal.areasFuertes.length}</div>
            <div class="kpi-sub">${escapeHtml(result.resultadoGlobal.areasFuertes[0] || 'N/A')}</div>
          </div>
        </div>

        <div class="grid-2 mt-3" id="section-dashboard">
          <div class="panel">
            <div class="panel-title">
              <span>Radar WAF (${dimensionesData.length} pilares)</span>
              <span class="small-text">Niveles CMMI</span>
            </div>
            <div class="chart-wrapper">
              <canvas id="radar"></canvas>
            </div>
          </div>
          <div class="panel">
            <div class="panel-title">
              <span>Distribución por pilar WAF</span>
              <span class="small-text">Vista Power BI</span>
            </div>
            <div class="chart-wrapper">
              <canvas id="bars"></canvas>
            </div>
          </div>
        </div>

        <div class="grid-2 mt-3" id="section-dashboard-2">
          <div class="panel">
            <div class="panel-title">
              <span>Evolución proyectada 4 meses</span>
              <span class="small-text">Escenario: implementación de recomendaciones</span>
            </div>
            <div class="chart-wrapper">
              <canvas id="line"></canvas>
            </div>
          </div>
          <div class="panel">
            <div class="panel-title">
              <span>Resumen Ejecutivo</span>
            </div>
            <p class="small-text"><strong>Diagnóstico:</strong> ${escapeHtml(result.resumenEjecutivo.diagnostico)}</p>
            <p class="small-text mt-2"><strong>Hallazgos principales:</strong></p>
            <ul class="small-text">
              ${result.resumenEjecutivo.hallazgosPrincipales.map(h => `<li>${escapeHtml(h)}</li>`).join('')}
            </ul>
            <p class="small-text mt-2"><strong>Impacto en el negocio:</strong> ${escapeHtml(result.resumenEjecutivo.impactoNegocio)}</p>
            <div class="small-text mt-3">• Fecha de exportación: <span id="now"></span></div>
            <div class="small-text">• Total horas estimadas: <strong>${totalHours}h</strong> (aprox. ${result.planTrabajo.periodoMaximoMeses} meses)</div>
          </div>
        </div>

        ${areaSectionsHtml}
        ${recomendacionesHtml}
        ${proyeccionHtml}
        ${roadmapHtml}

        <div class="mt-3 d-none" id="section-fuente">
          <div class="panel">
            <div class="panel-title"><span>Fuente de datos</span></div>
            <p class="small-text mb-1">Este dashboard se generó a partir de un documento PDF analizado por un modelo de IA generativa (Azure OpenAI - GPT-5-mini).</p>
            <p class="small-text mb-1">La estructura aplica la guía: <strong>Microsoft Azure Learning Paths</strong>, <strong>Azure Well-Architected Framework</strong>, <strong>Cloud Adoption Framework</strong> y <strong>Microsoft DevOps Practices</strong>.</p>
            <div class="mt-3">
              <h6 class="small-text" style="font-weight: bold;">Cliente</h6>
              <p class="small-text mb-2">${escapeHtml(result.cliente)}</p>
              <h6 class="small-text" style="font-weight: bold;">Evaluador</h6>
              <p class="small-text mb-2">${escapeHtml(result.evaluador)}</p>
              <h6 class="small-text" style="font-weight: bold;">Fecha de Assessment</h6>
              <p class="small-text mb-2">${escapeHtml(result.fechaAssessment)}</p>
              <h6 class="small-text" style="font-weight: bold;">Niveles de Madurez CMMI</h6>
              <div class="mb-2">
                <strong class="small-text">INICIAL (0-30):</strong>
                <p class="small-text mb-0">Procesos impredecibles, poco controlados y reactivos.</p>
              </div>
              <div class="mb-2">
                <strong class="small-text">GESTIONADO (31-60):</strong>
                <p class="small-text mb-0">Los procesos se planifican y ejecutan de acuerdo con políticas.</p>
              </div>
              <div class="mb-2">
                <strong class="small-text">DEFINIDO (61-85):</strong>
                <p class="small-text mb-0">Los procesos están bien caracterizados y entendidos.</p>
              </div>
              <div class="mb-2">
                <strong class="small-text">OPTIMIZADO (86-100):</strong>
                <p class="small-text mb-0">La organización se enfoca en la mejora continua del rendimiento.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="table-wrap mt-3" id="section-tareas">
          <div class="panel-title mb-2">
            <span>Plan de trabajo detallado (${totalHours}h)</span>
            <span class="small-text">Filtrable y paginado</span>
          </div>
          <div id="rec-table"></div>
        </div>

      </section>
    </main>
  </div>

  <!-- JSON Modal -->
  <div id="jsonModal" class="modal" style="display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6);">
    <div style="background-color: white; margin: 5% auto; padding: 20px; border-radius: 8px; width: 80%; max-width: 900px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid var(--primary); padding-bottom: 10px;">
        <h3 style="margin: 0; color: var(--primary);">
          <i class="bi bi-file-earmark-code"></i> Análisis Completo (JSON)
        </h3>
        <button onclick="closeJsonModal()" style="background: transparent; border: none; font-size: 24px; cursor: pointer; color: #666;">
          <i class="bi bi-x-circle"></i>
        </button>
      </div>
      <div style="flex: 1; overflow-y: auto; background: #f5f5f5; border-radius: 4px; padding: 15px;">
        <pre id="jsonContent" style="margin: 0; white-space: pre-wrap; word-wrap: break-word; font-size: 12px; font-family: 'Courier New', monospace;"></pre>
      </div>
      <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;">
        <button class="btn-export" onclick="copyJsonToClipboard()" style="background: #6c757d;">
          <i class="bi bi-clipboard"></i> Copiar al portapapeles
        </button>
        <button class="btn-export" onclick="downloadJSON()">
          <i class="bi bi-download"></i> Descargar JSON
        </button>
        <button class="btn-export" onclick="closeJsonModal()" style="background: #dc3545;">
          <i class="bi bi-x-lg"></i> Cerrar
        </button>
      </div>
    </div>
  </div>

  <script>
  const dimensiones = ${escapeJson(dimensionesData)};
  const promedio = ${promedio};
  const objetivo = ${objetivo};
  const evolucion = ${escapeJson(evolucion)};
  const tareas = ${escapeJson(tareasData)};
  // Full AI analysis JSON (original response) - available for download
  const analysisJson = ${escapeJson(result)};

    document.addEventListener("DOMContentLoaded", function() {
      document.getElementById("now").innerText = new Date().toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" });

      // Radar Chart - convert 0-5 to 0-100 for display
      const radarCtx = document.getElementById("radar");
      new Chart(radarCtx, {
        type: "radar",
        data: {
          labels: dimensiones.map(d => d.pilar),
          datasets: [
            {
              label: "Estado actual",
              data: dimensiones.map(d => Math.round((d.puntaje / 5) * 100)),
              fill: true,
              backgroundColor: "rgba(0,120,212,0.25)",
              borderColor: "rgba(0,120,212,1)",
              pointBackgroundColor: "rgba(0,120,212,1)",
              borderWidth: 2
            },
            {
              label: "Objetivo 4 meses",
              data: dimensiones.map(d => Math.min(100, Math.round((d.puntaje / 5) * 100) + (objetivo - promedio))),
              fill: true,
              backgroundColor: "rgba(142,76,198,0.12)",
              borderColor: "rgba(142,76,198,.9)",
              pointBackgroundColor: "rgba(142,76,198,1)",
              borderWidth: 1.2
            }
          ]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          scales: { 
            r: { 
              suggestedMin: 0, 
              suggestedMax: 100, 
              ticks: { stepSize: 20 } 
            } 
          }, 
          plugins: { 
            legend: { position: "bottom" } 
          } 
        }
      });

      // Bar Chart
      const barCtx = document.getElementById("bars");
      const barColors = dimensiones.map(d => {
        const score = Math.round((d.puntaje / 5) * 100);
        if (score >= 86) return "rgba(16,124,16,0.8)";
        if (score >= 61) return "rgba(0,120,212,0.8)";
        if (score >= 31) return "rgba(255,140,0,0.8)";
        return "rgba(209,52,56,0.8)";
      });
      new Chart(barCtx, {
        type: "bar",
        data: {
          labels: dimensiones.map(d => d.pilar),
          datasets: [{ 
            label: "Nivel (%)", 
            data: dimensiones.map(d => Math.round((d.puntaje / 5) * 100)), 
            backgroundColor: barColors
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          indexAxis: "y", 
          plugins: { legend: { display: false } }, 
          scales: { x: { max: 100, beginAtZero: true } } 
        }
      });

      // Line Chart
      const lineCtx = document.getElementById("line");
      new Chart(lineCtx, {
        type: "line",
        data: {
          labels: ["T0 (actual)", "Mes 1", "Mes 2", "Mes 3", "Mes 4"],
          datasets: [
            { 
              label: "Madurez global", 
              data: evolucion, 
              borderColor: "rgba(0,120,212,1)", 
              backgroundColor: "rgba(0,120,212,.2)", 
              tension: .35, 
              fill: true 
            },
            { 
              label: "Objetivo CAF", 
              data: [objetivo, objetivo, objetivo, objetivo, objetivo], 
              borderColor: "rgba(142,76,198,.9)", 
              borderDash: [5,5], 
              tension: 0 
            }
          ]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          scales: { y: { max: 100, beginAtZero: true } } 
        }
      });

      // Pie Chart - Distribución de Horas por Rol
      const pieCtx = document.getElementById("horasPorRolChart");
      if (pieCtx) {
        new Chart(pieCtx, {
          type: "pie",
          data: {
            labels: ${JSON.stringify(result.planTrabajo.resumenRoles.map(r => r.rol))},
            datasets: [{
              data: ${JSON.stringify(result.planTrabajo.resumenRoles.map(r => r.horas))},
              backgroundColor: [
                'rgba(0, 120, 212, 0.8)',    // Azul - Arquitecto Cloud
                'rgba(16, 124, 16, 0.8)',     // Verde - DevOps Engineer
                'rgba(255, 140, 0, 0.8)',     // Naranja - QA Engineer
                'rgba(142, 76, 198, 0.8)'     // Morado - PM
              ],
              borderColor: [
                'rgba(0, 120, 212, 1)',
                'rgba(16, 124, 16, 1)',
                'rgba(255, 140, 0, 1)',
                'rgba(142, 76, 198, 1)'
              ],
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  padding: 15,
                  font: {
                    size: 12
                  }
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.parsed || 0;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(2);
                    return label + ': ' + value + 'h (' + percentage + '%)';
                  }
                }
              }
            }
          }
        });
      }

      // Tabulator Table
      new Tabulator("#rec-table", {
        data: tareas,
        layout: "fitDataStretch",
        pagination: true,
        paginationSize: 10,
        columns: [
          { title: "ID", field: "id_tarea", width: 80, resizable: false },
          { title: "Descripción", field: "descripcion", minWidth: 300, formatter: "textarea" },
          { title: "Horas", field: "horas_estimadas", hozAlign: "right", width: 100, resizable: false },
          { title: "Dependencia", field: "dependencia", width: 120, resizable: false },
          { title: "Rol", field: "rol", minWidth: 150, headerFilter: "select", headerFilterParams: {
            "": "Todos",
            "Arquitecto Cloud": "Arquitecto Cloud",
            "Ingeniero DevOps": "Ingeniero DevOps",
            "Ingeniero QA": "Ingeniero QA",
            "PM": "PM"
          }},
          { title: "Fase", field: "fase", width: 150 },
          { title: "Prioridad", field: "prioridad", width: 100, headerFilter: "select", headerFilterParams: {
            "": "Todas",
            "ALTA": "ALTA",
            "MEDIA": "MEDIA",
            "BAJA": "BAJA"
          }}
        ]
      });
    });

    function switchSection(sectionKey) {
      document.querySelectorAll(".left-nav .nav-item").forEach(el => el.classList.remove("active"));
      document.querySelectorAll(".main-view .content-area > [id^='section-']").forEach(el => el.classList.add('d-none'));
      document.querySelector('.nav-item[data-section-key="' + sectionKey + '"]')?.classList.add("active");
      
      const tareasTable = document.getElementById('section-tareas');
      if (tareasTable && sectionKey !== 'roadmap' && sectionKey !== 'fuente' && sectionKey !== 'proyeccion' && sectionKey !== 'recomendaciones-lista') {
        tareasTable.classList.remove('d-none');
      }

      if (sectionKey === 'dashboard') {
        document.getElementById('section-dashboard')?.classList.remove('d-none');
        document.getElementById('section-dashboard-2')?.classList.remove('d-none');
      } else {
        document.getElementById('section-' + sectionKey)?.classList.remove('d-none');
      }
    }

    function exportHTML() {
      const blob = new Blob([document.documentElement.outerHTML], {type: "text/html"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dashboard-devops-${result.cliente.replace(/\s+/g, '-')}.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    function downloadJSON() {
      try {
        const jsonString = JSON.stringify(analysisJson, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        const clientSafe = (analysisJson?.cliente || 'client').toString().replace(/\s+/g, '-');
        a.download = 'analysis-' + clientSafe + '-' + timestamp + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        closeJsonModal();
      } catch (e) {
        console.error('Failed to download JSON', e);
      }
    }

    function showJsonModal() {
      const content = document.getElementById('jsonContent');
      if (content) {
        content.textContent = JSON.stringify(analysisJson, null, 2);
      }
      const modal = document.getElementById('jsonModal');
      if (modal) {
        modal.style.display = 'block';
      }
    }

    function closeJsonModal() {
      const modal = document.getElementById('jsonModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

    function copyJsonToClipboard() {
      try {
        const jsonString = JSON.stringify(analysisJson, null, 2);
        navigator.clipboard.writeText(jsonString).then(() => {
          alert('JSON copiado al portapapeles exitosamente!');
        }).catch(() => {
          alert('Error al copiar al portapapeles');
        });
      } catch (e) {
        console.error('Failed to copy JSON', e);
        alert('Error al copiar al portapapeles');
      }
    }

    // Event listeners for modal
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeJsonModal();
      }
    });

    const modal = document.getElementById('jsonModal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          closeJsonModal();
        }
      });
    }
  </script>
</body>
</html>`;

  logger.info({ 
    htmlLength: html.length,
    cliente: result.cliente,
    capacidadWAFCount: result.capacidadWAF.length,
    totalHours
  }, 'HTML dashboard generated successfully');

  return html;
}
