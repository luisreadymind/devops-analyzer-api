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
  logger.info('Generating HTML dashboard');

  const timestamp = new Date().toLocaleString('es-MX');
  const categoriesJson = JSON.stringify(
    result.categories.map((c) => ({
      name: escapeHtml(c.name),
      score: c.score
    }))
  );

  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DevOps Assessment Report - ${escapeHtml(fileName)}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <link href="https://unpkg.com/tabulator-tables@5.6.2/dist/css/tabulator.min.css" rel="stylesheet">
    <script type="text/javascript" src="https://unpkg.com/tabulator-tables@5.6.2/dist/js/tabulator.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 2rem;
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 3rem;
            text-align: center;
        }
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .header .meta {
            opacity: 0.9;
            font-size: 0.95rem;
        }
        .score-badge {
            display: inline-block;
            font-size: 4rem;
            font-weight: bold;
            margin: 1rem 0;
            padding: 1rem 2rem;
            background: rgba(255,255,255,0.2);
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        .content {
            padding: 2rem;
        }
        .section {
            margin-bottom: 2.5rem;
            padding: 1.5rem;
            background: #f8f9fa;
            border-radius: 15px;
            border-left: 5px solid #667eea;
        }
        .section h2 {
            color: #667eea;
            margin-bottom: 1rem;
            font-size: 1.8rem;
        }
        .summary {
            line-height: 1.8;
            color: #333;
            font-size: 1.05rem;
        }
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 2rem;
            margin: 2rem 0;
        }
        .chart-container {
            background: white;
            padding: 1.5rem;
            border-radius: 15px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .priority-high { color: #dc3545; font-weight: bold; }
        .priority-medium { color: #ffc107; font-weight: bold; }
        .priority-low { color: #28a745; font-weight: bold; }
        ul {
            list-style: none;
            padding-left: 0;
        }
        ul li {
            padding: 0.75rem;
            margin: 0.5rem 0;
            background: white;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .tabulator {
            font-size: 14px;
            border-radius: 10px;
            overflow: hidden;
        }
        .footer {
            text-align: center;
            padding: 2rem;
            color: #666;
            background: #f8f9fa;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 DevOps Assessment Report</h1>
            <div class="score-badge">${result.overallScore}/100</div>
            <div class="meta">
                <strong>File:</strong> ${escapeHtml(fileName)} | 
                <strong>Generated:</strong> ${timestamp}
            </div>
        </div>

        <div class="content">
            <div class="section">
                <h2>📋 Executive Summary</h2>
                <div class="summary">${escapeHtml(result.summary)}</div>
            </div>

            <div class="section">
                <h2>📈 Category Analysis</h2>
                <div class="charts-grid">
                    <div class="chart-container">
                        <canvas id="radarChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <canvas id="barChart"></canvas>
                    </div>
                </div>
                <div id="categoriesTable"></div>
            </div>

            <div class="section">
                <h2>💪 Strengths</h2>
                <ul>
                    ${result.strengths.map((s) => `<li>✅ ${escapeHtml(s)}</li>`).join('')}
                </ul>
            </div>

            <div class="section">
                <h2>⚠️ Areas for Improvement</h2>
                <ul>
                    ${result.weaknesses.map((w) => `<li>🔸 ${escapeHtml(w)}</li>`).join('')}
                </ul>
            </div>

            <div class="section">
                <h2>🎯 Action Items</h2>
                <div id="actionItemsTable"></div>
            </div>
        </div>

        <div class="footer">
            <p>Generated by DevOps Analyzer API | Powered by Azure OpenAI</p>
        </div>
    </div>

    <script>
        const categories = ${categoriesJson};
        
        // Radar Chart
        new Chart(document.getElementById('radarChart'), {
            type: 'radar',
            data: {
                labels: categories.map(c => c.name),
                datasets: [{
                    label: 'Category Scores',
                    data: categories.map(c => c.score),
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });

        // Bar Chart
        new Chart(document.getElementById('barChart'), {
            type: 'bar',
            data: {
                labels: categories.map(c => c.name),
                datasets: [{
                    label: 'Scores',
                    data: categories.map(c => c.score),
                    backgroundColor: categories.map(c => 
                        c.score >= 80 ? '#28a745' : 
                        c.score >= 60 ? '#ffc107' : '#dc3545'
                    )
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });

        // Categories Table
        new Tabulator("#categoriesTable", {
            data: ${JSON.stringify(result.categories)},
            layout: "fitColumns",
            columns: [
                { title: "Category", field: "name", width: 200 },
                { title: "Score", field: "score", width: 100, 
                  formatter: function(cell) {
                      const value = cell.getValue();
                      const color = value >= 80 ? '#28a745' : value >= 60 ? '#ffc107' : '#dc3545';
                      return '<span style="color:' + color + '; font-weight: bold;">' + value + '</span>';
                  }
                },
                { title: "Findings", field: "findings", 
                  formatter: function(cell) {
                      return cell.getValue().join('<br>• ');
                  }
                },
                { title: "Recommendations", field: "recommendations",
                  formatter: function(cell) {
                      return cell.getValue().join('<br>• ');
                  }
                }
            ]
        });

        // Action Items Table
        new Tabulator("#actionItemsTable", {
            data: ${JSON.stringify(result.actionItems)},
            layout: "fitColumns",
            columns: [
                { title: "Priority", field: "priority", width: 120,
                  formatter: function(cell) {
                      const value = cell.getValue();
                      const color = value === 'High' ? '#dc3545' : 
                                    value === 'Medium' ? '#ffc107' : '#28a745';
                      return '<span style="color:' + color + '; font-weight: bold;">🔥 ' + value + '</span>';
                  }
                },
                { title: "Description", field: "description" },
                { title: "Estimated Effort", field: "estimatedEffort", width: 150 }
            ]
        });
    </script>
</body>
</html>`;
}
