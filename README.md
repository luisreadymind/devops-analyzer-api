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

### 1. Create Azure Resources

```bash
# Variables
RG="DevOpsAssesment"
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

# Get OpenAI API Key (set as secret or use Key Vault)
az cognitiveservices account keys list \
  --name $OPENAI_NAME \
  --resource-group $RG
```

### 2. Configure GitHub Secrets

1. Get publish profile:
```bash
az webapp deployment list-publishing-profiles \
  --name $WEBAPP_NAME \
  --resource-group $RG \
  --xml
```

2. Add to GitHub repository secrets:
   - `AZURE_WEBAPP_PUBLISH_PROFILE`: (paste the XML output)

### 3. Deploy

Push to main branch or trigger workflow manually:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

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
