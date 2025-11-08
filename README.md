# DevOps Analyzer API

API para analizar PDFs de evaluación DevOps y generar reportes interactivos usando Azure OpenAI.

## 🚀 Features

- 📄 Upload PDF files (DevOps assessment documents)
- 🤖 AI-powered analysis using Azure OpenAI (GPT-4)
- 📊 Interactive HTML dashboards with Chart.js and Tabulator
- ☁️ Automatic upload to Azure Blob Storage
- 🔒 Secure with Helmet, CORS, and file validation
- 📝 Structured logging with Pino
- 🎯 TypeScript + Express + ESM

## 📋 Prerequisites

- Node.js 20.x or higher
- Azure subscription
- Azure OpenAI resource with GPT-4 deployment
- Azure Storage Account

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/luisreadymind/devops-analyzer-api.git
cd devops-analyzer-api
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your Azure credentials:
```env
PORT=3000
NODE_ENV=development

AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4

AZURE_STORAGE_ACCOUNT_NAME=your-storage-account
AZURE_STORAGE_CONTAINER_NAME=devopsbireports
# For local dev (use Managed Identity in production)
AZURE_STORAGE_CONNECTION_STRING=your-connection-string

ALLOWED_ORIGINS=http://localhost:3000
MAX_FILE_SIZE_MB=20
```

## 🏃 Running Locally

Development mode with hot reload:
```bash
npm run dev
```

Build and run production:
```bash
npm run build
npm start
```

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

### Generate Report
```bash
POST /api/generate-report
Content-Type: multipart/form-data

Form data:
- file: PDF file (max 20MB)
```

Example using curl:
```bash
curl -X POST http://localhost:3000/api/generate-report \
  -F "file=@assessment.pdf"
```

Response:
```json
{
  "status": "success",
  "data": {
    "reportUrl": "https://storage.blob.core.windows.net/devopsbireports/report_123456_assessment.html",
    "analysis": {
      "overallScore": 75,
      "summary": "...",
      "categories": [...],
      "strengths": [...],
      "weaknesses": [...],
      "actionItems": [...]
    }
  }
}
```

## 🎨 Project Structure

```
devops-analyzer-api/
├── src/
│   ├── config/
│   │   └── logger.ts           # Pino logger configuration
│   ├── middleware/
│   │   └── errors.ts            # Error handling middleware
│   ├── routes/
│   │   └── report.ts            # Report generation endpoint
│   ├── schemas/
│   │   └── analysisResult.ts    # Zod validation schemas
│   ├── services/
│   │   ├── aiService.ts         # Azure OpenAI integration
│   │   ├── htmlExporter.ts      # HTML dashboard generator
│   │   ├── pdf.ts               # PDF text extraction
│   │   └── storageService.ts    # Azure Blob Storage
│   └── index.ts                 # Express app entry point
├── .github/
│   └── workflows/
│       └── azure-webapps.yml    # CI/CD pipeline
├── package.json
├── tsconfig.json
└── .env.example
```

## ☁️ Azure Deployment

### 🚀 Quick Deploy (Recomendado)

Usa nuestro **script maestro interactivo** que incluye múltiples métodos de deploy:

```bash
# Script interactivo con menú de opciones
./deploy-master.sh
```

**Opciones disponibles:**
1. **Deploy Directo** - Build local + Docker push + Azure deploy (5-8 min)
2. **Push + GitHub Actions** - Git push + Actions monitoring + Azure sync (8-12 min) 
3. **Validación Solo** - Health checks y status endpoints (1-2 min)

### ⚙️ Métodos de Deploy Individuales

**1. Deploy Directo (Rápido)**:
```bash
# Configurar variables de entorno
cp .env.deploy.example .env.deploy
# Editar .env.deploy con tu GitHub token

# Validación pre-deploy
./pre-deploy-check.sh

# Deploy completo
source .env.deploy && ./deploy-analyzer-api.sh
```

**2. Push + GitHub Actions (Robusto)**:
```bash
# Asegúrate de tener GitHub CLI instalado y autenticado
gh auth login

# Push automático + monitoreo de Actions + sincronización Azure
./github-push-deploy-validator.sh
```

### 🔧 Características de los Scripts de Deploy

**`deploy-master.sh`** - Script principal interactivo:
- ✅ Menú de selección de método de deploy
- ✅ Validación de prerequisites automática
- ✅ Status del proyecto en tiempo real
- ✅ Opciones para todos los niveles de usuario

**`deploy-analyzer-api.sh`** - Deploy directo (13KB):
- ✅ **8 pasos automatizados** de validación y deploy
- ✅ Compilación TypeScript con verificación de errores
- ✅ Docker build y push a GitHub Container Registry
- ✅ Deploy automático a Azure App Service  
- ✅ Health checks y validación de endpoints críticos
- ✅ Reporte detallado en JSON con métricas

**`github-push-deploy-validator.sh`** - Push + Actions (18KB):
- ✅ **Push automático** a GitHub con tags timestamped
- ✅ **Monitoreo GitHub Actions** por 200 segundos
- ✅ **Validación job completado** exitosamente
- ✅ **Verificación container** Azure App Service
- ✅ **Actualización automática** si la versión no coincide
- ✅ **Reinicio App Service** y wait 60 segundos post-restart
- ✅ **Validación completa** de health checks
- ✅ **Reportes detallados** en JSON

**`pre-deploy-check.sh`** - Validación previa (4KB):
- ✅ 10 verificaciones críticas antes del deploy
- ✅ Validación de configuración y conectividad  
- ✅ Prevención de errores comunes

### 📊 Repository Configuration

- **Repository**: `luisreadymind/devops-analyzer-api`
- **Container Registry**: `ghcr.io/luisreadymind/devops-analyzer-api`
- **Azure App Service**: `devops-analyzer-api`
- **Production URL**: `https://devops-analyzer-api.azurewebsites.net`

### 📋 Deploy Manual (Avanzado)

Si prefieres deploy manual o configuración personalizada:

1. **Crear Azure Resources**:

```bash
# Variables
RG="devops-analyzer-api"
LOCATION="southcentralus" 
STORAGE_ACCOUNT="devopsassessstorage"
OPENAI_NAME="devops-openai"
WEBAPP_NAME="devops-analyzer-api"
PLAN_NAME="devops-analyzer-plan"

# Create App Service Plan
az appservice plan create \
  --name $PLAN_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --name $WEBAPP_NAME \
  --resource-group $RG \
  --plan $PLAN_NAME \
  --runtime "NODE:20-lts"

# Configure App Settings
az webapp config appsettings set \
  --name $WEBAPP_NAME \
  --resource-group $RG \
  --settings \
    NODE_ENV=production \
    AZURE_OPENAI_ENDPOINT="https://$OPENAI_NAME.openai.azure.com/" \
    AZURE_OPENAI_DEPLOYMENT="gpt-4" \
    AZURE_STORAGE_ACCOUNT_NAME="$STORAGE_ACCOUNT" \
    AZURE_STORAGE_CONTAINER_NAME="devopsbireports" \
    ALLOWED_ORIGINS="https://your-domain.com" \
    MAX_FILE_SIZE_MB="20"

# Enable Managed Identity
az webapp identity assign \
  --name $WEBAPP_NAME \
  --resource-group $RG

# Get the principal ID
PRINCIPAL_ID=$(az webapp identity show \
  --name $WEBAPP_NAME \
  --resource-group $RG \
  --query principalId -o tsv)

# Assign Storage Blob Data Contributor role
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/<SUBSCRIPTION_ID>/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT"
```

2. **Configurar GitHub Secrets**:
   - `GITHUB_TOKEN`: Token con permisos para Container Registry
   - `AZURE_WEBAPP_PUBLISH_PROFILE`: Profile del App Service

3. **Deploy manual**:
```bash
# Build y push
npm run build
docker build -t ghcr.io/luisalbertoarenas/devops-analyzer-api:latest .
docker push ghcr.io/luisalbertoarenas/devops-analyzer-api:latest

# Configure Azure container
az webapp config container set \
  --name devops-analyzer-api \
  --resource-group devops-analyzer-api \
  --docker-custom-image-name ghcr.io/luisalbertoarenas/devops-analyzer-api:latest
```

### 🔧 Deploy Scripts Disponibles

| Script | Propósito | Uso |
|--------|-----------|-----|
| `pre-deploy-check.sh` | Validación pre-deploy | `./pre-deploy-check.sh` |
| `deploy-analyzer-api.sh` | Deploy completo automatizado | `./deploy-analyzer-api.sh` |
| `.env.deploy.example` | Template de configuración | `cp .env.deploy.example .env.deploy` |

### 📊 Monitoreo Post-Deploy

Después del deploy, usa estos comandos para monitoreo:

```bash
# Health check
curl https://devops-analyzer-api.azurewebsites.net/health

# API status 
curl https://devops-analyzer-api.azurewebsites.net/api/status

# Ver logs en tiempo real
az webapp log tail --name devops-analyzer-api --resource-group devops-analyzer-api

# Test completo del assessment endpoint
curl -X POST https://devops-analyzer-api.azurewebsites.net/api/assessment \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Test Company","industry":"Technology"}'
```

### 🐛 Troubleshooting Deploy

Si el deploy falla, verifica:

1. **GitHub Token**: `echo $GITHUB_TOKEN` debe retornar tu token
2. **Azure Login**: `az account show` debe mostrar tu cuenta
3. **Docker**: `docker info` debe ejecutarse sin errores  
4. **Compilación**: `npm run build` debe completarse exitosamente
5. **Logs**: Revisar logs con `az webapp log tail`

## 🧪 Testing

Test locally:
```bash
curl -X POST http://localhost:3000/api/generate-report \
  -F "file=@test.pdf"
```

Test deployed app:
```bash
curl -X POST https://devops-analyzer-api.azurewebsites.net/api/generate-report \
  -F "file=@test.pdf"
```

## 🔐 Security

- API keys stored in environment variables
- Managed Identity for Azure Storage (production)
- CORS restrictions
- File type validation (PDF only)
- File size limits (20MB default)
- HTML sanitization
- Helmet security headers

## 📝 License

MIT

## 👤 Author

Luis Alberto Arenas
