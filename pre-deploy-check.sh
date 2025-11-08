#!/bin/bash

# ================================================================
# SCRIPT DE VALIDACIÓN PRE-DEPLOY
# Valida configuración antes de ejecutar deploy principal
# ================================================================

set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo -e "${BLUE}======================================="
echo -e "   PRE-DEPLOY VALIDATION CHECKER"
echo -e "=======================================${NC}"

# 1. Verificar directorio correcto
if [ ! -f "package.json" ] || ! grep -q "devops-analyzer-api" package.json 2>/dev/null; then
    log_error "❌ Debes estar en el directorio devops-analyzer-api"
    exit 1
fi
log_success "✅ Directorio correcto: devops-analyzer-api"

# 2. Verificar Git status
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    log_warning "⚠️  Hay cambios sin commitear:"
    git status --short
    echo ""
    read -p "¿Continuar sin commitear? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Haz commit de los cambios primero"
        exit 1
    fi
else
    log_success "✅ Git status limpio"
fi

# 3. Verificar GITHUB_TOKEN
if [ -z "${GITHUB_TOKEN:-}" ]; then
    log_error "❌ Variable GITHUB_TOKEN no está definida"
    log_info "💡 Solucion: export GITHUB_TOKEN=tu_token"
    log_info "💡 O crea .env.deploy y ejecuta: source .env.deploy"
    exit 1
fi
log_success "✅ GITHUB_TOKEN configurado"

# 4. Verificar Azure CLI login
if ! az account show >/dev/null 2>&1; then
    log_error "❌ No estás logueado en Azure CLI"
    log_info "💡 Solucion: az login"
    exit 1
fi

AZURE_USER=$(az account show --query user.name -o tsv)
log_success "✅ Azure CLI logueado como: $AZURE_USER"

# 5. Verificar Docker
if ! docker info >/dev/null 2>&1; then
    log_error "❌ Docker daemon no está corriendo"
    log_info "💡 Solucion: Inicia Docker Desktop o systemctl start docker"
    exit 1
fi
log_success "✅ Docker daemon corriendo"

# 6. Verificar Node.js version
NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    log_error "❌ Node.js >= 18 requerido. Actual: $NODE_VERSION"
    exit 1
fi
log_success "✅ Node.js version: $NODE_VERSION"

# 7. Verificar archivos esenciales
REQUIRED_FILES=("package.json" "tsconfig.json" "Dockerfile" "src/index.ts" ".github/workflows/docker-build-push.yml")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        log_error "❌ Archivo esencial faltante: $file"
        exit 1
    fi
done
log_success "✅ Archivos esenciales presentes"

# 8. Test quick compilation
log_info "🔍 Testing TypeScript compilation..."
if npm run build >/dev/null 2>&1; then
    log_success "✅ TypeScript compilation OK"
else
    log_error "❌ TypeScript compilation falló"
    log_info "💡 Ejecuta: npm run build (para ver errores)"
    exit 1
fi

# 9. Verificar Azure App Service
if ! az webapp show --name "devops-analyzer-api" --resource-group "devops-analyzer-api" >/dev/null 2>&1; then
    log_error "❌ Azure App Service no encontrado"
    log_info "💡 Verifica que 'devops-analyzer-api' existe en Azure"
    exit 1
fi
log_success "✅ Azure App Service encontrado"

# 10. Network connectivity check
if ! curl -s --max-time 10 https://api.github.com >/dev/null; then
    log_error "❌ Sin conectividad a GitHub"
    exit 1
fi
if ! curl -s --max-time 10 https://management.azure.com >/dev/null; then
    log_error "❌ Sin conectividad a Azure"
    exit 1
fi
log_success "✅ Conectividad de red OK"

echo ""
echo -e "${GREEN}======================================="
echo -e "   ✅ TODOS LOS CHECKS PASARON"
echo -e "=======================================${NC}"
echo ""
log_info "🚀 Listo para deploy. Ejecuta:"
log_info "   ./deploy-analyzer-api.sh"
echo ""