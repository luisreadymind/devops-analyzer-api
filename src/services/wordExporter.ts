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
      width: 1200,
      height: 800,
      chartCallback: (ChartJS) => {
        ChartJS.defaults.responsive = true;
        ChartJS.defaults.maintainAspectRatio = false;
        // Increase devicePixelRatio for higher resolution charts embedded in Word
        ChartJS.defaults.devicePixelRatio = 3;

        // Improve default font and colors for better visibility when exported
        ChartJS.defaults.font.family = 'Arial';
        ChartJS.defaults.font.size = 12;
        ChartJS.defaults.color = '#222222';
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
              font: 'Aptos',
              size: 22, // 11pt
            },
          },
          {
            id: 'title',
            name: 'Title',
            run: {
              font: 'Aptos',
              size: 48, // 24pt
              color: '007D6D',
            },
          },
          {
            id: 'heading1',
            name: 'Heading 1',
            run: {
              font: 'Aptos',
              size: 48, // 24pt
              color: '007D6D',
            },
          },
          {
            id: 'heading2',
            name: 'Heading 2',
            run: {
              font: 'Aptos',
              size: 32, // 16pt
              color: 'EE0000',
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
        children: [
          new TextRun({
            text: 'REPORTE DE MADUREZ DEVOPS',
            font: 'Aptos',
            size: 48,
          }),
        ],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.LEFT,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Readymind México – Evaluación basada en Azure Well-Architected Framework y CMMI',
            font: 'Aptos',
            size: 32,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.LEFT,
        spacing: { after: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Cliente: ${data.cliente}`,
            font: 'Aptos',
            size: 22,
          }),
        ],
        heading: HeadingLevel.HEADING_3,
        alignment: AlignmentType.LEFT,
        spacing: { after: 600 },
      }),
    ];
  }

  private createGeneralInfo(data: DevOpsAnalysis): Paragraph[] {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: 'Información General',
            font: 'Aptos',
            size: 48,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Cliente: ', bold: true, font: 'Aptos', size: 22 }),
          new TextRun({ text: data.cliente, font: 'Aptos', size: 22 }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Evaluador: ', bold: true, font: 'Aptos', size: 22 }),
          new TextRun({ text: data.evaluador || 'Equipo Readymind', font: 'Aptos', size: 22 }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Fecha Assessment: ', bold: true, font: 'Aptos', size: 22 }),
          new TextRun({ text: data.fechaAssessment, font: 'Aptos', size: 22 }),
        ],
        spacing: { after: 400 },
      }),
    ];
  }

  private createExecutiveSummary(data: DevOpsAnalysis): Paragraph[] {
    const resumen = data.resumenEjecutivo;
    const paragraphs: Paragraph[] = [
      new Paragraph({
        children: [
          new TextRun({
            text: 'Resumen Ejecutivo',
            font: 'Aptos',
            size: 48,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Diagnóstico general',
            font: 'Aptos',
            size: 32,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: resumen.diagnostico,
            font: 'Aptos',
            size: 22,
          }),
        ],
        spacing: { after: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Hallazgos principales',
            font: 'Aptos',
            size: 32,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      }),
    ];

    // Agregar hallazgos principales
    resumen.hallazgosPrincipales.forEach(h => {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: `• ${h}`,
            font: 'Aptos',
            size: 22,
          }),
        ],
        bullet: { level: 0 },
        spacing: { after: 150 },
      }));
    });

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Impacto en el negocio',
            font: 'Aptos',
            size: 32,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: resumen.impactoNegocio,
            font: 'Aptos',
            size: 22,
          }),
        ],
        spacing: { after: 400 },
      })
    );

    return paragraphs;
  }

  private createGlobalResult(data: DevOpsAnalysis): Paragraph[] {
    const resultado = data.resultadoGlobal;
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: 'Resultado Global',
            font: 'Aptos',
            size: 48,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Puntuación total: ', bold: true, font: 'Aptos', size: 22 }),
          new TextRun({ text: resultado.puntuacionTotal.toString(), font: 'Aptos', size: 22 }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Nivel predominante: ', bold: true, font: 'Aptos', size: 22 }),
          new TextRun({ text: resultado.nivelPredominante, font: 'Aptos', size: 22 }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Áreas críticas: ', bold: true, font: 'Aptos', size: 22 }),
          new TextRun({ text: resultado.areasCriticas.join(', '), font: 'Aptos', size: 22 }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Áreas fuertes: ', bold: true, font: 'Aptos', size: 22 }),
          new TextRun({ text: resultado.areasFuertes.join(', '), font: 'Aptos', size: 22 }),
        ],
        spacing: { after: 400 },
      }),
    ];
  }

  private createWAFEvaluation(data: DevOpsAnalysis, radarBuffer: Buffer, barBuffer: Buffer): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [
      new Paragraph({
        children: [
          new TextRun({
            text: 'Evaluación por Pilar WAF',
            font: 'Aptos',
            size: 48,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
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
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pilar', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Puntaje', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Observaciones', font: 'Aptos', size: 22 })] })] }),
          ],
        }),
        ...data.capacidadWAF.map(pilar =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: pilar.pilar, font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: pilar.puntaje.toString(), font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: pilar.observaciones, font: 'Aptos', size: 22 })] })] }),
            ],
          })
        ),
      ],
    });

    elements.push(table);

    // Insertar gráfico radar
    elements.push(new Paragraph({
      children: [
        new TextRun({
          text: 'Gráfico Radar: Situación Actual vs. Esperada',
          font: 'Aptos',
          size: 32,
        }),
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200, before: 400 },
    }));
    elements.push(new Paragraph({
      children: [ new ImageRun({ data: radarBuffer, transformation: { width: 500, height: 350 }, type: 'image/png' } as any) ],
      spacing: { after: 400 },
    }));

    // Insertar gráfico de barras
    elements.push(new Paragraph({
      children: [
        new TextRun({
          text: 'Gráfico de Barras: Resultados por Calificación',
          font: 'Aptos',
          size: 32,
        }),
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200, before: 200 },
    }));
    elements.push(new Paragraph({
      children: [ new ImageRun({ data: barBuffer, transformation: { width: 500, height: 350 }, type: 'image/png' } as any) ],
      spacing: { after: 400 },
    }));

    return elements;
  }

  private createRecommendations(data: DevOpsAnalysis): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [
      new Paragraph({
        children: [
          new TextRun({
            text: 'Recomendaciones',
            font: 'Aptos',
            size: 48,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
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
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ID', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Descripción', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Servicio Azure', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Prioridad', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Impacto Esperado', font: 'Aptos', size: 22 })] })] }),
          ],
        }),
        ...data.recomendaciones.map(rec =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rec.id, font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rec.descripcion, font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rec.servicioAzure, font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rec.prioridad, font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rec.impactoEsperado, font: 'Aptos', size: 22 })] })] }),
            ],
          })
        ),
      ],
    });

    elements.push(table);
    return elements;
  }

  private createWorkPlan(data: DevOpsAnalysis, pieBuffer: Buffer): (Paragraph | Table)[] {
    const plan = data.planTrabajo;
    const elements: (Paragraph | Table)[] = [
      new Paragraph({
        children: [
          new TextRun({
            text: 'Plan de Trabajo',
            font: 'Aptos',
            size: 48,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Horas máximas: ', bold: true, font: 'Aptos', size: 22 }),
          new TextRun({ text: plan.horasMaximas.toString(), font: 'Aptos', size: 22 }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Periodo: ', bold: true, font: 'Aptos', size: 22 }),
          new TextRun({ text: `${plan.periodoMaximoMeses} meses`, font: 'Aptos', size: 22 }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Horas semanales por recurso: ', bold: true, font: 'Aptos', size: 22 }),
          new TextRun({ text: plan.horasSemanalesPorRecurso.toString(), font: 'Aptos', size: 22 }),
        ],
        spacing: { after: 300 },
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
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ID', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Descripción', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Horas', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Dependencia', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Rol', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Fase', font: 'Aptos', size: 22 })] })] }),
          ],
        }),
        ...plan.tareasDetalladas.map(tarea =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: tarea.id_tarea, font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: tarea.descripcion, font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: tarea.horas_estimadas.toString(), font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: tarea.dependencia, font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: tarea.rol, font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: tarea.fase, font: 'Aptos', size: 22 })] })] }),
            ],
          })
        ),
      ],
    });

    elements.push(table);

    // Insertar gráfico de pie
    elements.push(new Paragraph({
      children: [
        new TextRun({
          text: 'Gráfico de Pie: Total de Horas por Rol',
          font: 'Aptos',
          size: 32,
        }),
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200, before: 400 },
    }));
    elements.push(new Paragraph({
      children: [ new ImageRun({ data: pieBuffer, transformation: { width: 500, height: 350 }, type: 'image/png' } as any) ],
      spacing: { after: 400 },
    }));

    return elements;
  }

  private createEvolutionProjection(data: DevOpsAnalysis, evolutionBuffer: Buffer): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [
      new Paragraph({
        children: [
          new TextRun({
            text: 'Proyección de Evolución',
            font: 'Aptos',
            size: 48,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
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
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Mes', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Madurez Esperada', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Capacidades Implementadas', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'KPIs Esperados', font: 'Aptos', size: 22 })] })] }),
          ],
        }),
        ...data.proyeccionEvolucion.map(proy =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: proy.mes, font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${proy.madurezEsperada}%`, font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: proy.capacidadesImplementadas.join(', '), font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 
                `Lead Time: ${proy.kpisEsperados.leadTime}, ` +
                `Deployment Frequency: ${proy.kpisEsperados.deploymentFrequency}, ` +
                `Change Failure Rate: ${proy.kpisEsperados.changeFailureRate}`, font: 'Aptos', size: 22 })] })] }),
            ],
          })
        ),
      ],
    });

    elements.push(table);

    // Insertar gráfico de evolución
    elements.push(new Paragraph({
      children: [
        new TextRun({
          text: 'Gráfico de Evolución Esperada',
          font: 'Aptos',
          size: 32,
        }),
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200, before: 400 },
    }));
    elements.push(new Paragraph({
      children: [ new ImageRun({ data: evolutionBuffer, transformation: { width: 500, height: 350 }, type: 'image/png' } as any) ],
      spacing: { after: 400 },
    }));

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
            backgroundColor: 'rgba(0,120,212,0.25)',
            borderColor: 'rgba(0,120,212,1)',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: 'rgba(0,120,212,1)',
          },
          {
            label: 'Esperada',
            data: expected,
            backgroundColor: 'rgba(127,63,191,0.25)',
            borderColor: 'rgba(127,63,191,1)',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: 'rgba(127,63,191,1)',
          },
        ],
      },
      options: {
        plugins: {
          legend: { position: 'top', labels: { color: '#222222', font: { size: 14 } } },
          title: { display: false }
        },
        scales: { r: { min: 0, max: 100, ticks: { color: '#222222', font: { size: 12 } }, pointLabels: { color: '#222222', font: { size: 12 } } } },
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
            backgroundColor: 'rgba(0,120,212,0.85)',
            borderColor: 'rgba(0,120,212,1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false }, title: { display: false } },
        scales: {
          x: { ticks: { color: '#222222', font: { size: 12 } } },
          y: { min: 0, max: 100, ticks: { color: '#222222', font: { size: 12 } } }
        },
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
            borderColor: 'rgba(0,180,120,1)',
            backgroundColor: 'rgba(0,180,120,0.25)',
            tension: 0.3,
          },
        ],
      },
      options: {
        plugins: { legend: { position: 'top', labels: { color: '#222222', font: { size: 13 } } } },
        scales: { y: { min: 0, max: 100, ticks: { color: '#222222', font: { size: 12 } } }, x: { ticks: { color: '#222222', font: { size: 12 } } } },
      },
    };
    return await this.chartJS.renderToBuffer(config);
  }

  private async generatePieChart(data: DevOpsAnalysis): Promise<Buffer> {
    // Pie: total de horas por rol
    const roles = data.planTrabajo.resumenRoles.map(r => r.rol);
    const horas = data.planTrabajo.resumenRoles.map(r => r.horas);
    // Azure palette (hex) converted to rgba for pie slices
    const AZURE_PALETTE = [
      'rgba(0,120,212,0.9)', // #0078D4
      'rgba(0,125,109,0.9)', // #007D6D (titles color)
      'rgba(127,63,191,0.9)', // #7F3FBF
      'rgba(0,180,120,0.9)', // green variant
      'rgba(255,185,0,0.9)', // yellow accent
      'rgba(0,164,239,0.9)', // light azure
    ];

    const config: import('chart.js').ChartConfiguration<'pie', number[], string> = {
      type: 'pie',
      data: {
        labels: roles,
        datasets: [
          {
            label: 'Horas por Rol',
            data: horas,
            backgroundColor: AZURE_PALETTE.slice(0, Math.max(roles.length, 1)),
            borderColor: '#ffffff',
            borderWidth: 1,
          },
        ],
      },
      options: {
        plugins: { legend: { position: 'right', labels: { color: '#222222', font: { size: 12 } } } },
      },
    };
    return await this.chartJS.renderToBuffer(config);
  }

  private createRoadmap(data: DevOpsAnalysis): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [
      new Paragraph({
        children: [
          new TextRun({
            text: 'Roadmap',
            font: 'Aptos',
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
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
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Mes', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Entregables', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Objetivos', font: 'Aptos', size: 22 })] })] }),
          ],
        }),
        ...data.roadmap.map(item =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.mes, font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.entregables.join(', '), font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.objetivos.join(', '), font: 'Aptos', size: 22 })] })] }),
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
        children: [
          new TextRun({
            text: 'Tabla de Servicios Azure Recomendados',
            font: 'Aptos',
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
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
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Área evaluada relacionada', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Servicio', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Descripción detallada', font: 'Aptos', size: 22 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Modelo de costos', font: 'Aptos', size: 22 })] })] }),
          ],
        }),
        ...services.map(service =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: service[0], font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: service[1], font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: service[2], font: 'Aptos', size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: service[3], font: 'Aptos', size: 22 })] })] }),
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
        children: [
          new TextRun({
            text: 'Conclusión General del Estudio',
            font: 'Aptos',
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'El estado actual muestra una madurez gestionada con oportunidades claras en seguridad, automatización, observabilidad y gobernanza. ' +
            'La hoja de ruta propuesta, basada en Azure Well-Architected Framework y buenas prácticas CMMI, proyecta alcanzar un 65–70% de madurez en el corto plazo, ' +
            'mejorando resiliencia, velocidad de entrega y postura de seguridad, con beneficios tangibles en continuidad operativa y control de costos.',
            font: 'Aptos',
            size: 22,
          }),
        ],
        spacing: { after: 400 },
      }),
    ];
  }
}