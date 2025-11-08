# ================================================================
# COMANDOS RÁPIDOS PARA DEVOPS-ANALYZER-API
# Copiar y pegar comandos útiles para desarrollo y deploy
# Repo: luisreadymind/devops-analyzer-api
# ================================================================

# 🚀 DEPLOY COMPLETO - NUEVO MÉTODO MAESTRO
# ==========================================
# Script interactivo con múltiples opciones
./deploy-master.sh

# Deploy directo (método 1 - rápido)
source .env.deploy && ./deploy-analyzer-api.sh

# Push + GitHub Actions (método 2 - robusto)
./github-push-deploy-validator.sh

# 🔍 VALIDACIÓN Y TESTING
# ========================
# Health check local
curl http://localhost:3000/health

# Health check producción
curl https://devops-analyzer-api.azurewebsites.net/health

# Test API status
curl https://devops-analyzer-api.azurewebsites.net/api/status

# Test assessment endpoint
curl -X POST https://devops-analyzer-api.azurewebsites.net/api/assessment \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Test Company","industry":"Technology","currentProcesses":"Manual deployments, basic monitoring"}'

# Test con archivo PDF (si tienes test.pdf)
curl -X POST https://devops-analyzer-api.azurewebsites.net/api/generate-report \
  -F "file=@test.pdf"

# 📊 MONITOREO AZURE
# ===================
# Ver logs en tiempo real
az webapp log tail --name devops-analyzer-api --resource-group devops-analyzer-api

# Ver logs de últimas 100 líneas
az webapp log download --name devops-analyzer-api --resource-group devops-analyzer-api && cat webapp_logs.zip

# Estado del App Service
az webapp show --name devops-analyzer-api --resource-group devops-analyzer-api --query "{status:state,defaultHostName:defaultHostName,lastModifiedTimeUtc:lastModifiedTimeUtc}"

# Configuración de container actual
az webapp config container show --name devops-analyzer-api --resource-group devops-analyzer-api

# Reiniciar App Service
az webapp restart --name devops-analyzer-api --resource-group devops-analyzer-api

# 🐳 DOCKER LOCAL
# ================
# Build local para testing
docker build -t devops-analyzer-api:dev .

# Run local container
docker run -p 3001:3000 --env-file .env devops-analyzer-api:dev

# Ver imágenes locales
docker images | grep devops-analyzer

# Limpiar imágenes viejas
docker image prune -f

# Ver containers en ejecución
docker ps

# 🔧 DESARROLLO LOCAL
# ====================
# Instalar dependencias limpias
rm -rf node_modules package-lock.json && npm install

# Build TypeScript
npm run build

# Desarrollo con hot reload
npm run dev

# Linting
npm run lint

# Tests (si están configurados)
npm test

# Verificar vulnerabilidades
npm audit --audit-level=high

# 📁 GESTIÓN DE ARCHIVOS
# =======================
# Limpiar workspace (ejecutar desde raíz del proyecto)
./cleanup-api-workspace.sh

# Ver tamaño del proyecto
du -sh . && echo "node_modules: $(du -sh node_modules 2>/dev/null || echo 'No encontrado')"

# Encontrar archivos grandes
find . -type f -size +1M -exec ls -lh {} \; | sort -k5 -hr

# Ver estructura del proyecto
tree -I 'node_modules|dist|*.log' -L 3

# 🌐 GITHUB Y GIT
# ================
# Status del repo
git status --short

# Último commit
git log --oneline -1

# Tags existentes
git tag --list

# Push con tags
git push origin main --tags

# Ver GitHub Actions (si tienes gh CLI)
gh workflow list --repo luisreadymind/devops-analyzer-api
gh run list --limit 5 --repo luisreadymind/devops-analyzer-api

# Abrir GitHub Actions en browser
echo "https://github.com/luisreadymind/devops-analyzer-api/actions"

# Verificar repo remoto correcto
git remote -v

# 🔑 CONFIGURACIÓN Y SECRETOS
# ============================
# Verificar variables de entorno críticas
echo "GITHUB_TOKEN: ${GITHUB_TOKEN:+SET}" 
echo "NODE_ENV: ${NODE_ENV:-NOT_SET}"

# Test Azure CLI
az account show --query "{name:name,user:user.name,tenantId:tenantId}"

# Test Docker login a GitHub
echo $GITHUB_TOKEN | docker login ghcr.io -u luisalbertoarenas --password-stdin && echo "Docker login OK"

# Generar nuevo GitHub token (abrir en browser)
echo "https://github.com/settings/tokens/new?description=DevOps-Analyzer-Deploy&scopes=write:packages,read:packages,delete:packages"

# ⚡ ONE-LINERS ÚTILES
# =====================
# Deploy ultra rápido (si todo está configurado)
source .env.deploy 2>/dev/null && ./deploy-analyzer-api.sh || echo "Configura .env.deploy primero"

# Health check con timestamp
echo "$(date): $(curl -s https://devops-analyzer-api.azurewebsites.net/health)"

# Logs de Azure en archivo
az webapp log tail --name devops-analyzer-api --resource-group devops-analyzer-api > azure-logs-$(date +%Y%m%d-%H%M%S).log &

# Kill todos los containers de devops-analyzer
docker ps | grep devops-analyzer | awk '{print $1}' | xargs -r docker stop

# Backup de configuración importante
tar -czf backup-config-$(date +%Y%m%d).tar.gz package.json tsconfig.json Dockerfile .env.example .github/

# ================================================================
# NOTAS IMPORTANTES:
# 
# 1. Siempre ejecutar pre-deploy-check.sh antes de deploy
# 2. Mantener GITHUB_TOKEN seguro y rotarlo regularmente  
# 3. Verificar logs después de cada deploy
# 4. Hacer backup antes de cambios importantes
# 5. Usar source .env.deploy para cargar variables
# ================================================================