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
  
  const dimensionesData = result.capabilityAreas;
  const recomendacionesData = result.workPlan;
  const promedio = result.overallScore;
  const objetivo = result.potentialScore;
  
  // Calculate evolution (5 points from current to potential)
  const incrementoPorMes = (objetivo - promedio) / 4;
  const evolucion = [
    Math.round(promedio),
    Math.round(promedio + incrementoPorMes),
    Math.round(promedio + incrementoPorMes * 2),
    Math.round(promedio + incrementoPorMes * 3),
    Math.round(objetivo)
  ];

  // Generate sections for each capability area
  const areaSectionsHtml = result.capabilityAreas.map((area) => {
    const sectionKey = area.area.toLowerCase()
      .replace(/\s+/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    return `
        <div class="grid-2 mt-3 d-none" id="section-${sectionKey}">
          <div class="panel">
            <div class="panel-title"><span>${escapeHtml(area.area)}</span></div>
            <div class="mb-3">
              <div class="kpi-value" style="font-size: 48px;">${area.score} %</div>
              <div class="kpi-sub">Nivel: <strong>${area.level}</strong></div>
            </div>
            <h5 class="small-text" style="font-weight: bold;">Evaluación</h5>
            <p class="small-text">${escapeHtml(area.assessment)}</p>
            <h5 class="small-text mt-3" style="font-weight: bold;">Recomendaciones</h5>
            <p class="small-text">${escapeHtml(area.recommendations)}</p>
          </div>
          <div class="panel">
            <div class="panel-title"><span>Nivel CMMI</span></div>
            ${result.cmmiLevelsExplanation.map(lvl => `
              <div class="mb-2 ${lvl.level === area.level ? 'p-2' : ''}" style="${lvl.level === area.level ? 'background: #E6F3FF; border-left: 3px solid var(--primary);' : ''}">
                <strong class="small-text">${lvl.level}</strong> <span class="small-text">(${lvl.scoreRange})</span>
                <p class="small-text mb-0">${escapeHtml(lvl.description)}</p>
              </div>
            `).join('')}
          </div>
        </div>`;
  }).join('');

  // Generate Azure Services section
  const azureServicesHtml = result.azureServiceRecommendations.length > 0 ? `
        <div class="mt-3 d-none" id="section-azureservices">
          <div class="panel">
            <div class="panel-title"><span>Servicios Azure Recomendados</span></div>
            <div class="table-responsive">
              <table class="table table-sm table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th scope="col">Servicio</th>
                    <th scope="col">Resumen</th>
                    <th scope="col">VNet Integration</th>
                    <th scope="col">Pricing</th>
                    <th scope="col">Documentación</th>
                  </tr>
                </thead>
                <tbody class="small-text">
                  ${result.azureServiceRecommendations.map(svc => `
                    <tr>
                      <td><strong>${escapeHtml(svc.service)}</strong></td>
                      <td>${escapeHtml(svc.summary)}</td>
                      <td>${escapeHtml(svc.vnetIntegration)}</td>
                      <td>${escapeHtml(svc.pricing)}</td>
                      <td><a href="${escapeHtml(svc.url)}" target="_blank" class="btn btn-sm btn-link">Ver docs</a></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>` : '';

  // Generate Architecture section
  const architectureHtml = `
        <div class="mt-3 d-none" id="section-architecture">
          <div class="panel">
            <div class="panel-title"><span>${escapeHtml(result.azureArchitecture.title)}</span></div>
            <p class="small-text mb-3">${escapeHtml(result.azureArchitecture.description)}</p>
            <div class="panel-title mt-3"><span>Diagrama de Arquitectura</span></div>
            <pre class="small-text p-3" style="background: #F5F5F5; border-radius: 4px; overflow-x: auto;">${escapeHtml(result.azureArchitecture.diagram)}</pre>
            <div class="panel-title mt-3"><span>Servicios en la Arquitectura</span></div>
            <ul class="small-text mb-0">
              ${result.azureArchitecture.services.map(svc => `
                <li><strong>${escapeHtml(svc.name)}:</strong> ${escapeHtml(svc.role)}</li>
              `).join('')}
            </ul>
          </div>
        </div>`;

  // Navigation items for capability areas
  const navItemsHtml = result.capabilityAreas.map((area, idx) => {
    const sectionKey = area.area.toLowerCase()
      .replace(/\s+/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    const icons = [
      'bi-card-checklist', 'bi-git', 'bi-robot', 'bi-cloud',
      'bi-shield-lock', 'bi-gear', 'bi-activity', 'bi-people'
    ];
    
    return `
      <div class="nav-item" data-section-key="${sectionKey}" onclick="switchSection('${sectionKey}')">
        <i class="bi ${icons[idx] || 'bi-circle'}"></i> <span>${escapeHtml(area.area)}</span>
      </div>`;
  }).join('');

  const totalHours = recomendacionesData.reduce((sum, item) => sum + item.hours, 0);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Dashboard DevOps - ${escapeHtml(result.clientName)}</title>
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
      <div class="nav-item" data-section-key="azureservices" onclick="switchSection('azureservices')">
        <i class="bi bi-cloud-check"></i> <span>Servicios Azure</span>
      </div>
      <div class="nav-item" data-section-key="architecture" onclick="switchSection('architecture')">
        <i class="bi bi-diagram-3"></i> <span>Arquitectura</span>
      </div>
      <div class="nav-item" data-section-key="roadmap" onclick="switchSection('roadmap')">
        <i class="bi bi-kanban"></i> <span>Roadmap ${Math.ceil(totalHours / 160)} meses</span>
      </div>
      <div class="nav-item" data-section-key="fuente" onclick="switchSection('fuente')">
        <i class="bi bi-filetype-pdf"></i> <span>Fuente: Documento</span>
      </div>
    </aside>

    <main class="main-view">
      <header class="topbar">
        <div>
          <div class="topbar-title">Evaluación de Madurez DevOps - ${escapeHtml(result.clientName)}</div>
          <div class="small-text">${escapeHtml(result.executiveSummary.substring(0, 150))}...</div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="badge-env">Producción</span>
          <button class="btn-export" onclick="exportHTML()"><i class="bi bi-download"></i> Exportar HTML</button>
          <button class="btn-export" style="background: #6c757d;" onclick="downloadJSON()"><i class="bi bi-file-earmark-code"></i> Descargar JSON</button>
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
            <div class="kpi-label"><i class="bi bi-stack"></i> ${escapeHtml(dimensionesData[2]?.area || 'CI/CD')}</div>
            <div class="kpi-value">${dimensionesData[2]?.score || 0}%</div>
            <div class="kpi-sub">${dimensionesData[2]?.level || 'N/A'}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label"><i class="bi bi-shield-check"></i> ${escapeHtml(dimensionesData[4]?.area || 'Seguridad')}</div>
            <div class="kpi-value">${dimensionesData[4]?.score || 0}%</div>
            <div class="kpi-sub">${dimensionesData[4]?.level || 'N/A'}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label"><i class="bi bi-cloud-arrow-up"></i> ${escapeHtml(dimensionesData[3]?.area || 'Infraestructura')}</div>
            <div class="kpi-value">${dimensionesData[3]?.score || 0}%</div>
            <div class="kpi-sub">${dimensionesData[3]?.level || 'N/A'}</div>
          </div>
        </div>

        <div class="grid-2 mt-3" id="section-dashboard">
          <div class="panel">
            <div class="panel-title">
              <span>Radar CMMI (${dimensionesData.length} dimensiones)</span>
              <span class="small-text">Niveles CMMI</span>
            </div>
            <div class="chart-wrapper">
              <canvas id="radar"></canvas>
            </div>
          </div>
          <div class="panel">
            <div class="panel-title">
              <span>Distribución por capacidad</span>
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
            <p class="small-text">${escapeHtml(result.executiveSummary)}</p>
            <div class="small-text mt-3">• Fecha de exportación: <span id="now"></span></div>
            <div class="small-text">• Total horas estimadas: <strong>${totalHours}h</strong> (aprox. ${Math.ceil(totalHours / 160)} meses)</div>
          </div>
        </div>

        ${areaSectionsHtml}
        ${azureServicesHtml}
        ${architectureHtml}

        <div class="mt-3 d-none" id="section-roadmap">
          <div class="panel mb-3">
            <div class="panel-title">
              <span>Roadmap de implementación (${totalHours}h ≈ ${Math.ceil(totalHours / 160)} meses)</span>
              <span class="small-text">Roles: Arquitecto Cloud, DevOps, QA, PM</span>
            </div>
            <div class="table-responsive">
              <table class="table table-sm table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Actividad</th>
                    <th scope="col">Horas</th>
                    <th scope="col">Dependencia</th>
                    <th scope="col">Rol</th>
                  </tr>
                </thead>
                <tbody class="small-text">
                  ${recomendacionesData.map(item => `
                    <tr>
                      <td>${escapeHtml(item.id)}</td>
                      <td>${escapeHtml(item.task)}</td>
                      <td>${item.hours}</td>
                      <td>${escapeHtml(item.dependency || '—')}</td>
                      <td>${escapeHtml(item.role)}</td>
                    </tr>
                  `).join('')}
                  <tr class="table-info fw-semibold">
                    <td></td>
                    <td>Total estimado</td>
                    <td>${totalHours}h</td>
                    <td>—</td>
                    <td>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="mt-3 d-none" id="section-fuente">
          <div class="panel">
            <div class="panel-title"><span>Fuente de datos</span></div>
            <p class="small-text mb-1">Este dashboard se generó a partir de un documento PDF analizado por un modelo de IA generativa (Azure OpenAI - GPT-4o).</p>
            <p class="small-text mb-1">La estructura aplica la guía: <strong>Microsoft Azure Learning Paths</strong>, <strong>Azure Well-Architected Framework</strong>, <strong>Cloud Adoption Framework</strong> y <strong>Microsoft DevOps Practices</strong>.</p>
            <div class="mt-3">
              <h6 class="small-text" style="font-weight: bold;">Niveles de Madurez CMMI</h6>
              ${result.cmmiLevelsExplanation.map(lvl => `
                <div class="mb-2">
                  <strong class="small-text">${lvl.level}</strong> <span class="small-text">(${lvl.scoreRange})</span>
                  <p class="small-text mb-0">${escapeHtml(lvl.description)}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="table-wrap mt-3" id="section-recomendaciones">
          <div class="panel-title mb-2">
            <span>Plan de trabajo detallado (${totalHours}h)</span>
            <span class="small-text">Filtrable y paginado</span>
          </div>
          <div id="rec-table"></div>
        </div>

      </section>
    </main>
  </div>

  <script>
  const dimensiones = ${escapeJson(dimensionesData)};
  const promedio = ${promedio};
  const objetivo = ${objetivo};
  const evolucion = ${escapeJson(evolucion)};
  const recomendaciones = ${escapeJson(recomendacionesData)};
  // Full AI analysis JSON (original response) - available for download
  const analysisJson = ${escapeJson(result)};

    document.addEventListener("DOMContentLoaded", function() {
      document.getElementById("now").innerText = new Date().toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" });

      // Radar Chart
      const radarCtx = document.getElementById("radar");
      new Chart(radarCtx, {
        type: "radar",
        data: {
          labels: dimensiones.map(d => d.area),
          datasets: [
            {
              label: "Estado actual",
              data: dimensiones.map(d => d.score),
              fill: true,
              backgroundColor: "rgba(0,120,212,0.25)",
              borderColor: "rgba(0,120,212,1)",
              pointBackgroundColor: "rgba(0,120,212,1)",
              borderWidth: 2
            },
            {
              label: "Objetivo 4 meses",
              data: dimensiones.map(d => Math.min(100, d.score + (objetivo - promedio))),
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
        if (d.score >= 86) return "rgba(16,124,16,0.8)";
        if (d.score >= 61) return "rgba(0,120,212,0.8)";
        if (d.score >= 31) return "rgba(255,140,0,0.8)";
        return "rgba(209,52,56,0.8)";
      });
      new Chart(barCtx, {
        type: "bar",
        data: {
          labels: dimensiones.map(d => d.area),
          datasets: [{ 
            label: "Nivel (%)", 
            data: dimensiones.map(d => d.score), 
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

      // Tabulator Table
      new Tabulator("#rec-table", {
        data: recomendaciones,
        layout: "fitDataStretch",
        pagination: true,
        paginationSize: 10,
        columns: [
          { title: "ID", field: "id", width: 80, resizable: false },
          { title: "Tarea", field: "task", minWidth: 300, formatter: "textarea" },
          { title: "Horas", field: "hours", hozAlign: "right", width: 100, resizable: false },
          { title: "Dependencia", field: "dependency", width: 120, resizable: false },
          { title: "Rol", field: "role", minWidth: 150, headerFilter: "select", headerFilterParams: {
            "": "Todos",
            "Arquitecto Cloud": "Arquitecto Cloud",
            "Ingeniero DevOps": "Ingeniero DevOps",
            "Ingeniero QA": "Ingeniero QA",
            "PM": "PM"
          }}
        ]
      });
    });

    function switchSection(sectionKey) {
      document.querySelectorAll(".left-nav .nav-item").forEach(el => el.classList.remove("active"));
      document.querySelectorAll(".main-view .content-area > [id^='section-']").forEach(el => el.classList.add('d-none'));
      document.querySelector('.nav-item[data-section-key="' + sectionKey + '"]')?.classList.add("active");
      
      const recTable = document.getElementById('section-recomendaciones');
      if (recTable && sectionKey !== 'roadmap' && sectionKey !== 'fuente') {
        recTable.classList.remove('d-none');
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
      a.download = "dashboard-devops-${result.clientName.replace(/\s+/g, '-')}.html";
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
        const clientSafe = (analysisJson?.clientName || 'client').toString().replace(/\s+/g, '-');
  a.download = 'analysis-' + clientSafe + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Failed to download JSON', e);
      }
    }
  </script>
</body>
</html>`;

  logger.info({ 
    htmlLength: html.length,
    clientName: result.clientName,
    capabilityAreasCount: result.capabilityAreas.length,
    totalHours
  }, 'HTML dashboard generated successfully');

  return html;
}
