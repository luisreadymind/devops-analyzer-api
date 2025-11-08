import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, HeadingLevel, TextRun, ImageRun } from 'docx';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

// Interfaces para el análisis DevOps
interface PilarWAF {
  pilar: string;
  puntaje: number;
  observaciones: string;
}

interface Recomendacion {
  id: string;
  descripcion: string;
  servicioAzure: string;
  prioridad: string;
  impactoEsperado: string;
}

interface RolResumen {
  rol: string;
  horas: number;
  porcentaje: number;
}

interface TareaDetallada {
  id_tarea: string;
  descripcion: string;
  horas_estimadas: number;
  dependencia: string;
  rol: string;
  fase: string;
}

interface PlanTrabajo {
  horasMaximas: number;
  periodoMaximoMeses: number;
  horasSemanalesPorRecurso: number;
  resumenRoles: RolResumen[];
  tareasDetalladas: TareaDetallada[];
}

interface ProyeccionEvolucion {
  mes: string;
  madurezEsperada: number;
  capacidadesImplementadas: string[];
  kpisEsperados: {
    leadTime: string;
    deploymentFrequency: string;
    changeFailureRate: string;
  };
}

interface Roadmap {
  mes: string;
  entregables: string[];
  objetivos: string[];
}

interface ResumenEjecutivo {
  diagnostico: string;
  hallazgosPrincipales: string[];
  impactoNegocio: string;
}

interface ResultadoGlobal {
  puntuacionTotal: number;
  nivelPredominante: string;
  areasCriticas: string[];
  areasFuertes: string[];
}

interface DevOpsAnalysis {
  cliente: string;
  evaluador: string;
  fechaAssessment: string;
  resumenEjecutivo: ResumenEjecutivo;
  resultadoGlobal: ResultadoGlobal;
  capacidadWAF: PilarWAF[];
  recomendaciones: Recomendacion[];
  planTrabajo: PlanTrabajo;
  proyeccionEvolucion: ProyeccionEvolucion[];
  roadmap: Roadmap[];
}

// Colores para gráficos (comentado por ahora)
// const AZURE_RGB = { r: 0, g: 120, b: 212 }; // #0078D4
// const VIOLET_RGB = { r: 127, g: 63, b: 191 }; // #7F3FBF
// const GREEN_RGB = { r: 81, g: 255, b: 120 }; // #51FF78

export class WordExporterService {
  private chartJS: ChartJSNodeCanvas;

  constructor() {
    this.chartJS = new ChartJSNodeCanvas({
      width: 800,
      height: 600,
      chartCallback: (ChartJS) => {
        ChartJS.defaults.responsive = true;
        ChartJS.defaults.maintainAspectRatio = false;
      }
    });
  }

  /**
   * Genera un documento Word con el reporte completo de madurez DevOps
   */
  async generateDevOpsReportWord(data: DevOpsAnalysis): Promise<Buffer> {
    // Generar gráficos
    const radarBuffer = await this.generateRadarChart(data);
    const barBuffer = await this.generateBarChart(data);
    const evolutionBuffer = await this.generateEvolutionChart(data);
    const pieBuffer = await this.generatePieChart(data);

    const sections = [
      {
        children: [
          ...this.createCoverPage(data),
          ...this.createGeneralInfo(data),
          ...this.createExecutiveSummary(data),
          ...this.createGlobalResult(data),
          ...this.createWAFEvaluation(data, radarBuffer, barBuffer),
          ...this.createRecommendations(data),
          ...this.createWorkPlan(data, pieBuffer),
          ...this.createEvolutionProjection(data, evolutionBuffer),
          ...this.createRoadmap(data),
          ...this.createAzureServicesTable(),
          ...this.createConclusion(),
        ],
      },
    ];

    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: 'normal',
            name: 'Normal',
            run: {
              font: 'Calibri',
              size: 24, // 12pt
            },
          },
          {
            id: 'title',
            name: 'Title',
            run: {
              font: 'Calibri',
              size: 56, // 28pt
              color: '0078D4',
            },
          },
          {
            id: 'heading1',
            name: 'Heading 1',
            run: {
              font: 'Calibri',
              size: 40, // 20pt
              color: '0078D4',
            },
          },
          {
            id: 'heading2',
            name: 'Heading 2',
            run: {
              font: 'Calibri',
              size: 28, // 14pt
              color: '0078D4',
            },
          },
        ],
      },
      sections: sections,
    });

    // Generar el buffer del documento
    const buffer = await Packer.toBuffer(doc);
    return buffer;
  }

  private createCoverPage(data: DevOpsAnalysis): Paragraph[] {
    return [
      new Paragraph({
        text: 'REPORTE DE MADUREZ DEVOPS',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.LEFT,
      }),
      new Paragraph({
        text: 'Readymind México – Evaluación basada en Azure Well-Architected Framework y CMMI',
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.LEFT,
      }),
      new Paragraph({
        text: `Cliente: ${data.cliente}`,
        heading: HeadingLevel.HEADING_3,
        alignment: AlignmentType.LEFT,
      }),
    ];
  }

  private createGeneralInfo(data: DevOpsAnalysis): Paragraph[] {
    return [
      new Paragraph({
        text: 'Información General',
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Cliente: ', bold: true }),
          new TextRun(data.cliente),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Evaluador: ', bold: true }),
          new TextRun(data.evaluador || 'Equipo Readymind'),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Fecha Assessment: ', bold: true }),
          new TextRun(data.fechaAssessment),
        ],
      }),
    ];
  }

  private createExecutiveSummary(data: DevOpsAnalysis): Paragraph[] {
    const resumen = data.resumenEjecutivo;
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: 'Resumen Ejecutivo',
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: 'Diagnóstico general',
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph(resumen.diagnostico),
      new Paragraph({
        text: 'Hallazgos principales',
        heading: HeadingLevel.HEADING_2,
      }),
    ];

    // Agregar hallazgos principales
    resumen.hallazgosPrincipales.forEach(h => {
      paragraphs.push(new Paragraph({
        text: `• ${h}`,
        bullet: { level: 0 },
      }));
    });

    paragraphs.push(
      new Paragraph({
        text: 'Impacto en el negocio',
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph(resumen.impactoNegocio)
    );

    return paragraphs;
  }

  private createGlobalResult(data: DevOpsAnalysis): Paragraph[] {
    const resultado = data.resultadoGlobal;
    return [
      new Paragraph({
        text: 'Resultado Global',
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Puntuación total: ', bold: true }),
          new TextRun(resultado.puntuacionTotal.toString()),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Nivel predominante: ', bold: true }),
          new TextRun(resultado.nivelPredominante),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Áreas críticas: ', bold: true }),
          new TextRun(resultado.areasCriticas.join(', ')),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Áreas fuertes: ', bold: true }),
          new TextRun(resultado.areasFuertes.join(', ')),
        ],
      }),
    ];
  }

  private createWAFEvaluation(data: DevOpsAnalysis, radarBuffer: Buffer, barBuffer: Buffer): (Paragraph | Table | ImageRun)[] {
    const elements: (Paragraph | Table | ImageRun)[] = [
      new Paragraph({
        text: 'Evaluación por Pilar WAF',
        heading: HeadingLevel.HEADING_1,
      }),
    ];

    // Tabla de evaluación WAF
    const table = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Pilar')] }),
            new TableCell({ children: [new Paragraph('Puntaje')] }),
            new TableCell({ children: [new Paragraph('Observaciones')] }),
          ],
        }),
        ...data.capacidadWAF.map(pilar =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(pilar.pilar)] }),
              new TableCell({ children: [new Paragraph(pilar.puntaje.toString())] }),
              new TableCell({ children: [new Paragraph(pilar.observaciones)] }),
            ],
          })
        ),
      ],
    });

    elements.push(table);

    // Insertar gráfico radar
  elements.push(new Paragraph({ text: 'Gráfico Radar: Situación Actual vs. Esperada', heading: HeadingLevel.HEADING_2 }));
  elements.push(new Paragraph({ children: [ new ImageRun({ data: radarBuffer, transformation: { width: 500, height: 350 }, type: 'image/png' } as any) ] }));

    // Insertar gráfico de barras
  elements.push(new Paragraph({ text: 'Gráfico de Barras: Resultados por Calificación', heading: HeadingLevel.HEADING_2 }));
  elements.push(new Paragraph({ children: [ new ImageRun({ data: barBuffer, transformation: { width: 500, height: 350 }, type: 'image/png' } as any) ] }));

    return elements;
  }

  private createRecommendations(data: DevOpsAnalysis): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [
      new Paragraph({
        text: 'Recomendaciones',
        heading: HeadingLevel.HEADING_1,
      }),
    ];

    const table = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('ID')] }),
            new TableCell({ children: [new Paragraph('Descripción')] }),
            new TableCell({ children: [new Paragraph('Servicio Azure')] }),
            new TableCell({ children: [new Paragraph('Prioridad')] }),
            new TableCell({ children: [new Paragraph('Impacto Esperado')] }),
          ],
        }),
        ...data.recomendaciones.map(rec =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(rec.id)] }),
              new TableCell({ children: [new Paragraph(rec.descripcion)] }),
              new TableCell({ children: [new Paragraph(rec.servicioAzure)] }),
              new TableCell({ children: [new Paragraph(rec.prioridad)] }),
              new TableCell({ children: [new Paragraph(rec.impactoEsperado)] }),
            ],
          })
        ),
      ],
    });

    elements.push(table);
    return elements;
  }

  private createWorkPlan(data: DevOpsAnalysis, pieBuffer: Buffer): (Paragraph | Table | ImageRun)[] {
    const plan = data.planTrabajo;
    const elements: (Paragraph | Table | ImageRun)[] = [
      new Paragraph({
        text: 'Plan de Trabajo',
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Horas máximas: ', bold: true }),
          new TextRun(plan.horasMaximas.toString()),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Periodo: ', bold: true }),
          new TextRun(`${plan.periodoMaximoMeses} meses`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Horas semanales por recurso: ', bold: true }),
          new TextRun(plan.horasSemanalesPorRecurso.toString()),
        ],
      }),
    ];

    // Tabla de tareas detalladas
    const table = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('ID')] }),
            new TableCell({ children: [new Paragraph('Descripción')] }),
            new TableCell({ children: [new Paragraph('Horas')] }),
            new TableCell({ children: [new Paragraph('Dependencia')] }),
            new TableCell({ children: [new Paragraph('Rol')] }),
            new TableCell({ children: [new Paragraph('Fase')] }),
          ],
        }),
        ...plan.tareasDetalladas.map(tarea =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(tarea.id_tarea)] }),
              new TableCell({ children: [new Paragraph(tarea.descripcion)] }),
              new TableCell({ children: [new Paragraph(tarea.horas_estimadas.toString())] }),
              new TableCell({ children: [new Paragraph(tarea.dependencia)] }),
              new TableCell({ children: [new Paragraph(tarea.rol)] }),
              new TableCell({ children: [new Paragraph(tarea.fase)] }),
            ],
          })
        ),
      ],
    });

    elements.push(table);

    // Insertar gráfico de pie
  elements.push(new Paragraph({ text: 'Gráfico de Pie: Total de Horas por Rol', heading: HeadingLevel.HEADING_2 }));
  elements.push(new Paragraph({ children: [ new ImageRun({ data: pieBuffer, transformation: { width: 500, height: 350 }, type: 'image/png' } as any) ] }));

    return elements;
  }

  private createEvolutionProjection(data: DevOpsAnalysis, evolutionBuffer: Buffer): (Paragraph | Table | ImageRun)[] {
    const elements: (Paragraph | Table | ImageRun)[] = [
      new Paragraph({
        text: 'Proyección de Evolución',
        heading: HeadingLevel.HEADING_1,
      }),
    ];

    const table = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Mes')] }),
            new TableCell({ children: [new Paragraph('Madurez Esperada')] }),
            new TableCell({ children: [new Paragraph('Capacidades Implementadas')] }),
            new TableCell({ children: [new Paragraph('KPIs Esperados')] }),
          ],
        }),
        ...data.proyeccionEvolucion.map(proy =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(proy.mes)] }),
              new TableCell({ children: [new Paragraph(`${proy.madurezEsperada}%`)] }),
              new TableCell({ children: [new Paragraph(proy.capacidadesImplementadas.join(', '))] }),
              new TableCell({ children: [new Paragraph(
                `Lead Time: ${proy.kpisEsperados.leadTime}, ` +
                `Deployment Frequency: ${proy.kpisEsperados.deploymentFrequency}, ` +
                `Change Failure Rate: ${proy.kpisEsperados.changeFailureRate}`
              )] }),
            ],
          })
        ),
      ],
    });

    elements.push(table);

    // Insertar gráfico de evolución
  elements.push(new Paragraph({ text: 'Gráfico de Evolución Esperada', heading: HeadingLevel.HEADING_2 }));
  elements.push(new Paragraph({ children: [ new ImageRun({ data: evolutionBuffer, transformation: { width: 500, height: 350 }, type: 'image/png' } as any) ] }));

    return elements;
  }
  // --- Métodos para generar gráficos ---
  private async generateRadarChart(data: DevOpsAnalysis): Promise<Buffer> {
    // Radar: situación actual vs. esperada
    const labels = data.capacidadWAF.map(p => p.pilar);
    const actual = data.capacidadWAF.map(p => p.puntaje);
    // Promedio de madurez esperada por pilar (usando el último mes de proyección)
    const lastProjection = data.proyeccionEvolucion[data.proyeccionEvolucion.length - 1];
    const expected = labels.map(_ => lastProjection ? lastProjection.madurezEsperada : 0);
    const config: import('chart.js').ChartConfiguration<'radar', number[], string> = {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: 'Actual',
            data: actual,
            backgroundColor: 'rgba(0,120,212,0.2)',
            borderColor: 'rgba(0,120,212,1)',
          },
          {
            label: 'Esperada',
            data: expected,
            backgroundColor: 'rgba(127,63,191,0.2)',
            borderColor: 'rgba(127,63,191,1)',
          },
        ],
      },
      options: {
        plugins: { legend: { position: 'top' } },
        scales: { r: { min: 0, max: 100 } },
      },
    };
    return await this.chartJS.renderToBuffer(config);
  }

  private async generateBarChart(data: DevOpsAnalysis): Promise<Buffer> {
    // Barras: resultado por calificación
    const labels = data.capacidadWAF.map(p => p.pilar);
    const scores = data.capacidadWAF.map(p => p.puntaje);
    const config: import('chart.js').ChartConfiguration<'bar', number[], string> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Puntaje',
            data: scores,
            backgroundColor: 'rgba(0,120,212,0.7)',
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { min: 0, max: 100 } },
      },
    };
    return await this.chartJS.renderToBuffer(config);
  }

  private async generateEvolutionChart(data: DevOpsAnalysis): Promise<Buffer> {
    // Evolución esperada al aplicar recomendaciones
    const labels = data.proyeccionEvolucion.map(p => p.mes);
    const madurez = data.proyeccionEvolucion.map(p => p.madurezEsperada);
    const config: import('chart.js').ChartConfiguration<'line', number[], string> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Madurez Esperada (%)',
            data: madurez,
            fill: false,
            borderColor: 'rgba(81,255,120,1)',
            backgroundColor: 'rgba(81,255,120,0.2)',
            tension: 0.3,
          },
        ],
      },
      options: {
        plugins: { legend: { position: 'top' } },
        scales: { y: { min: 0, max: 100 } },
      },
    };
    return await this.chartJS.renderToBuffer(config);
  }

  private async generatePieChart(data: DevOpsAnalysis): Promise<Buffer> {
    // Pie: total de horas por rol
    const roles = data.planTrabajo.resumenRoles.map(r => r.rol);
    const horas = data.planTrabajo.resumenRoles.map(r => r.horas);
    const config: import('chart.js').ChartConfiguration<'pie', number[], string> = {
      type: 'pie',
      data: {
        labels: roles,
        datasets: [
          {
            label: 'Horas por Rol',
            data: horas,
            backgroundColor: [
              'rgba(0,120,212,0.7)',
              'rgba(127,63,191,0.7)',
              'rgba(81,255,120,0.7)',
              'rgba(255,205,86,0.7)',
              'rgba(255,99,132,0.7)',
              'rgba(54,162,235,0.7)',
            ],
          },
        ],
      },
      options: {
        plugins: { legend: { position: 'right' } },
      },
    };
    return await this.chartJS.renderToBuffer(config);
  }

  private createRoadmap(data: DevOpsAnalysis): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [
      new Paragraph({
        text: 'Roadmap',
        heading: HeadingLevel.HEADING_1,
      }),
    ];

    const table = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Mes')] }),
            new TableCell({ children: [new Paragraph('Entregables')] }),
            new TableCell({ children: [new Paragraph('Objetivos')] }),
          ],
        }),
        ...data.roadmap.map(item =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(item.mes)] }),
              new TableCell({ children: [new Paragraph(item.entregables.join(', '))] }),
              new TableCell({ children: [new Paragraph(item.objetivos.join(', '))] }),
            ],
          })
        ),
      ],
    });

    elements.push(table);
    return elements;
  }

  private createAzureServicesTable(): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [
      new Paragraph({
        text: 'Tabla de Servicios Azure Recomendados',
        heading: HeadingLevel.HEADING_1,
      }),
    ];

    const services = [
      ['Seguridad', 'Microsoft Defender for Cloud', 'Protección unificada de cargas en Azure, alertas, hardening y recomendaciones de seguridad.', 'Por recurso'],
      ['Gestión de secretos', 'Azure Key Vault', 'Almacenamiento seguro de secretos, claves y certificados con RBAC e integración con CI/CD.', 'Por recurso'],
      ['Observabilidad', 'Azure Monitor', 'Métricas, logs, alertas y tableros; integración con Application Insights.', 'Por consumo'],
      ['Observabilidad', 'Azure Application Insights', 'Telemetría, trazas distribuidas, performance y diagnóstico para apps.', 'Por consumo'],
      ['Automatización', 'Azure Automation', 'Runbooks, Desired State Configuration y tareas programadas para operación.', 'Por ejecución'],
      ['DevOps', 'Azure DevOps', 'Repos, Pipelines, Boards, Test Plans para CI/CD y gestión ágil.', 'Por usuario'],
      ['Código Seguro', 'GitHub Advanced Security', 'Code scanning, secret scanning y dependabot alerts para seguridad.', 'Por repositorio'],
      ['Productividad IA', 'GitHub Copilot', 'Asistente de IA para desarrollo, generación de código y documentación.', 'Por usuario'],
      ['Plataforma App + IA', 'Azure App Service', 'Hospedaje administrado para aplicaciones web y APIs con integración a servicios de IA.', 'Por recurso'],
      ['Plataforma Contenedores + IA', 'Azure Kubernetes Service (AKS)', 'Orquestación de contenedores; integración con modelos y servicios de IA.', 'Por nodo/por consumo'],
      ['APIs', 'Azure API Management', 'Gestión, publicación, seguridad y observabilidad de APIs.', 'Por unidad'],
      ['IA Generativa', 'Azure OpenAI Service', 'Modelos GPT y Embeddings para copilots, chatbots y generación de contenido.', 'Por token'],
      ['Búsqueda IA', 'Azure AI Search', 'Búsqueda semántica, indexación y RAG para aplicaciones con IA.', 'Por consumo'],
      ['Visión/Documentos', 'Azure AI Vision / Document Intelligence', 'OCR, extracción de datos, clasificación y análisis de documentos.', 'Por consumo'],
    ];

    const table = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Área evaluada relacionada')] }),
            new TableCell({ children: [new Paragraph('Servicio')] }),
            new TableCell({ children: [new Paragraph('Descripción detallada')] }),
            new TableCell({ children: [new Paragraph('Modelo de costos')] }),
          ],
        }),
        ...services.map(service =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(service[0])] }),
              new TableCell({ children: [new Paragraph(service[1])] }),
              new TableCell({ children: [new Paragraph(service[2])] }),
              new TableCell({ children: [new Paragraph(service[3])] }),
            ],
          })
        ),
      ],
    });

    elements.push(table);
    return elements;
  }

  private createConclusion(): Paragraph[] {
    return [
      new Paragraph({
        text: 'Conclusión General del Estudio',
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph(
        'El estado actual muestra una madurez gestionada con oportunidades claras en seguridad, automatización, observabilidad y gobernanza. ' +
        'La hoja de ruta propuesta, basada en Azure Well-Architected Framework y buenas prácticas CMMI, proyecta alcanzar un 65–70% de madurez en el corto plazo, ' +
        'mejorando resiliencia, velocidad de entrega y postura de seguridad, con beneficios tangibles en continuidad operativa y control de costos.'
      ),
    ];
  }
}