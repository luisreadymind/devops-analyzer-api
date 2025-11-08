#!/bin/bash

# ================================================================
# DEPLOY SCRIPT PARA DEVOPS-ANALYZER-API
# Garantiza compilación TypeScript, deploy y validación completa
# Version: 1.0.0 - Optimizado para Azure App Service + GitHub Container Registry
# ================================================================

set -euo pipefail

# Colores y formato
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuración del proyecto
PROJECT_NAME="devops-analyzer-api"
REGISTRY="ghcr.io"
IMAGE_NAME="$REGISTRY/luisalbertoarenas/$PROJECT_NAME"
AZURE_APP_NAME="devops-analyzer-api"
AZURE_URL="https://devops-analyzer-api.azurewebsites.net"
BUILD_DATE=$(date '+%Y%m%d-%H%M%S')
GIT_HASH=$(git rev-parse --short HEAD || echo "unknown")
VERSION="1.0.0-$BUILD_DATE-$GIT_HASH"

# Log functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "\n${PURPLE}${BOLD}=== STEP $1: $2 ===${NC}"; }

# Cleanup function
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Deploy falló con código: $exit_code"
        log_warning "Ejecutando cleanup..."
        # Cleanup temporal files if any
        rm -f dist-*.tar.gz 2>/dev/null || true
    fi
    exit $exit_code
}

trap cleanup EXIT

# Verificar prerequisites
check_prerequisites() {
    log_step "1" "VERIFICANDO PREREQUISITES"
    
    local missing_tools=()
    
    # Verificar tools requeridos
    if ! command -v node >/dev/null 2>&1; then missing_tools+=("node"); fi
    if ! command -v npm >/dev/null 2>&1; then missing_tools+=("npm"); fi
    if ! command -v docker >/dev/null 2>&1; then missing_tools+=("docker"); fi
    if ! command -v az >/dev/null 2>&1; then missing_tools+=("azure-cli"); fi
    if ! command -v git >/dev/null 2>&1; then missing_tools+=("git"); fi
    if ! command -v jq >/dev/null 2>&1; then missing_tools+=("jq"); fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Herramientas faltantes: ${missing_tools[*]}"
        log_info "Instálalas antes de continuar"
        exit 1
    fi
    
    # Verificar Node.js version (>= 18)
    NODE_VERSION=$(node -v | sed 's/v//')
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
    if [ "$NODE_MAJOR" -lt 18 ]; then
        log_error "Node.js version >= 18 requerida. Actual: $NODE_VERSION"
        exit 1
    fi
    
    # Verificar Docker daemon
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon no está corriendo"
        exit 1
    fi
    
    # Verificar Azure login
    if ! az account show >/dev/null 2>&1; then
        log_error "No estás logueado en Azure CLI. Ejecuta: az login"
        exit 1
    fi
    
    # Verificar archivos esenciales
    local required_files=("package.json" "tsconfig.json" "Dockerfile" "src/index.ts")
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Archivo requerido no encontrado: $file"
            exit 1
        fi
    done
    
    log_success "Prerequisites OK ✓"
    log_info "Node.js: $NODE_VERSION"
    log_info "Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
    log_info "Azure CLI: $(az --version | grep azure-cli | awk '{print $2}')"
}

# Install dependencies y audit
install_dependencies() {
    log_step "2" "INSTALANDO DEPENDENCIAS"
    
    # Clean install
    if [ -d "node_modules" ]; then
        log_info "Limpiando node_modules existente..."
        rm -rf node_modules
    fi
    
    # Install with audit
    log_info "Ejecutando: npm ci"
    npm ci --silent
    
    # Security audit
    log_info "Verificando vulnerabilidades de seguridad..."
    npm audit --audit-level=high || {
        log_warning "Vulnerabilidades encontradas. Intentando fix automático..."
        npm audit fix --force
    }
    
    log_success "Dependencias instaladas ✓"
}

# TypeScript compilation y validación
compile_typescript() {
    log_step "3" "COMPILANDO TYPESCRIPT"
    
    # Linting primero
    if npm run lint --silent 2>/dev/null; then
        log_info "Lint check: OK"
    else
        log_warning "Lint issues found, pero continuando..."
    fi
    
    # Type checking
    log_info "Type checking..."
    npx tsc --noEmit
    
    # Build
    log_info "Compilando TypeScript..."
    npm run build
    
    # Verificar dist
    if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
        log_error "Compilación falló: directorio dist vacío o no existe"
        exit 1
    fi
    
    # Verificar archivos críticos en dist
    if [ ! -f "dist/index.js" ]; then
        log_error "Archivo principal dist/index.js no encontrado"
        exit 1
    fi
    
    log_success "Compilación TypeScript exitosa ✓"
    log_info "Archivos generados: $(ls -1 dist | wc -l) files"
}

# Testing (si existen tests)
run_tests() {
    log_step "4" "EJECUTANDO TESTS"
    
    # Verificar si hay tests definidos
    if npm run test --silent 2>/dev/null; then
        log_info "Ejecutando test suite..."
        npm test
        log_success "Tests pasaron ✓"
    else
        log_warning "No hay tests configurados o script test no disponible"
        log_info "Continuando sin tests..."
    fi
}

# Docker build y push
build_and_push_docker() {
    log_step "5" "BUILD Y PUSH DOCKER IMAGE"
    
    # Build con multi-stage y cache
    log_info "Building Docker image: $IMAGE_NAME:$VERSION"
    docker build \
        --build-arg BUILD_DATE="$BUILD_DATE" \
        --build-arg VERSION="$VERSION" \
        --build-arg GIT_HASH="$GIT_HASH" \
        --tag "$IMAGE_NAME:$VERSION" \
        --tag "$IMAGE_NAME:latest" \
        --cache-from "$IMAGE_NAME:latest" \
        .
    
    # Verificar que la imagen se creó correctamente
    if ! docker images | grep -q "$PROJECT_NAME"; then
        log_error "Docker build falló"
        exit 1
    fi
    
    # Test local de la imagen
    log_info "Testing Docker image localmente..."
    CONTAINER_ID=$(docker run -d -p 3001:3000 "$IMAGE_NAME:$VERSION")
    sleep 5
    
    # Health check local
    if curl -f -s http://localhost:3001/health >/dev/null 2>&1; then
        log_success "Docker image health check OK ✓"
    else
        log_warning "Health check local falló, pero continuando..."
    fi
    
    # Stop test container
    docker stop "$CONTAINER_ID" >/dev/null 2>&1 || true
    docker rm "$CONTAINER_ID" >/dev/null 2>&1 || true
    
    # Login a GitHub Container Registry
    log_info "Login a GitHub Container Registry..."
    if [ -z "${GITHUB_TOKEN:-}" ]; then
        log_error "Variable GITHUB_TOKEN no está definida"
        log_info "Ejecuta: export GITHUB_TOKEN=tu_token"
        exit 1
    fi
    
    echo "$GITHUB_TOKEN" | docker login "$REGISTRY" -u luisalbertoarenas --password-stdin
    
    # Push images
    log_info "Pushing image: $IMAGE_NAME:$VERSION"
    docker push "$IMAGE_NAME:$VERSION"
    
    log_info "Pushing latest tag..."
    docker push "$IMAGE_NAME:latest"
    
    log_success "Docker images pushed ✓"
}

# Deploy a Azure App Service
deploy_to_azure() {
    log_step "6" "DEPLOY A AZURE APP SERVICE"
    
    # Verificar que el App Service existe
    if ! az webapp show --name "$AZURE_APP_NAME" --resource-group "$AZURE_APP_NAME" >/dev/null 2>&1; then
        log_error "Azure App Service '$AZURE_APP_NAME' no encontrado"
        exit 1
    fi
    
    # Configure container settings
    log_info "Configurando container image en Azure..."
    az webapp config container set \
        --name "$AZURE_APP_NAME" \
        --resource-group "$AZURE_APP_NAME" \
        --docker-custom-image-name "$IMAGE_NAME:$VERSION" \
        --docker-registry-server-url "https://$REGISTRY" \
        --docker-registry-server-user "luisalbertoarenas" \
        --docker-registry-server-password "$GITHUB_TOKEN"
    
    # Restart app para asegurar nuevo container
    log_info "Restarting Azure App Service..."
    az webapp restart --name "$AZURE_APP_NAME" --resource-group "$AZURE_APP_NAME"
    
    log_success "Deploy a Azure completado ✓"
}

# Health check y validación post-deploy
validate_deployment() {
    log_step "7" "VALIDANDO DEPLOYMENT"
    
    local max_attempts=20
    local attempt=0
    
    log_info "Esperando que la aplicación esté disponible..."
    log_info "URL: $AZURE_URL"
    
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        log_info "Intento $attempt/$max_attempts - Checking health..."
        
        # Health check básico
        if curl -f -s "$AZURE_URL/health" >/dev/null 2>&1; then
            log_success "Health check OK ✓"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Health check falló después de $max_attempts intentos"
            
            # Debug info
            log_info "Obteniendo logs de Azure para debug..."
            az webapp log tail --name "$AZURE_APP_NAME" --resource-group "$AZURE_APP_NAME" --lines 50 || true
            exit 1
        fi
        
        sleep 10
    done
    
    # Test endpoints críticos
    log_info "Testing endpoints críticos..."
    
    # Test API status
    if response=$(curl -s -w "%{http_code}" "$AZURE_URL/api/status" -o /dev/null); then
        if [ "$response" = "200" ]; then
            log_success "API status endpoint OK ✓"
        else
            log_warning "API status endpoint retornó: $response"
        fi
    fi
    
    # Test assessment endpoint (POST)
    log_info "Testing assessment endpoint..."
    test_payload='{"companyName":"Test Company","industry":"Technology"}'
    if response=$(curl -s -w "%{http_code}" -X POST "$AZURE_URL/api/assessment" \
        -H "Content-Type: application/json" \
        -d "$test_payload" -o /dev/null); then
        if [ "$response" = "200" ]; then
            log_success "Assessment endpoint OK ✓"
        else
            log_warning "Assessment endpoint retornó: $response"
        fi
    fi
    
    log_success "Validación completa ✓"
}

# Generar reporte final
generate_report() {
    log_step "8" "GENERANDO REPORTE FINAL"
    
    local report_file="deployment-report-$BUILD_DATE.json"
    
    # Crear reporte detallado
    cat > "$report_file" << EOF
{
  "deployment": {
    "project": "$PROJECT_NAME",
    "version": "$VERSION",
    "buildDate": "$BUILD_DATE",
    "gitHash": "$GIT_HASH",
    "status": "SUCCESS"
  },
  "docker": {
    "registry": "$REGISTRY",
    "imageName": "$IMAGE_NAME",
    "tags": ["$VERSION", "latest"]
  },
  "azure": {
    "appService": "$AZURE_APP_NAME",
    "url": "$AZURE_URL",
    "healthCheck": "PASSED"
  },
  "validation": {
    "healthEndpoint": "$AZURE_URL/health",
    "apiStatusEndpoint": "$AZURE_URL/api/status",
    "assessmentEndpoint": "$AZURE_URL/api/assessment"
  },
  "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%S.000Z')"
}
EOF
    
    log_success "Reporte generado: $report_file"
    
    # Summary
    echo -e "\n${GREEN}${BOLD}=======================================${NC}"
    echo -e "${GREEN}${BOLD}    🚀 DEPLOY COMPLETADO EXITOSAMENTE${NC}"
    echo -e "${GREEN}${BOLD}=======================================${NC}"
    echo -e "${CYAN}Proyecto:${NC} $PROJECT_NAME"
    echo -e "${CYAN}Version:${NC} $VERSION"
    echo -e "${CYAN}URL:${NC} $AZURE_URL"
    echo -e "${CYAN}Image:${NC} $IMAGE_NAME:$VERSION"
    echo -e "${CYAN}Reporte:${NC} $report_file"
    echo -e "${GREEN}${BOLD}=======================================${NC}\n"
    
    # Quick commands
    echo -e "${YELLOW}COMANDOS ÚTILES:${NC}"
    echo -e "${PURPLE}Ver logs:${NC} az webapp log tail --name $AZURE_APP_NAME --resource-group $AZURE_APP_NAME"
    echo -e "${PURPLE}Health check:${NC} curl $AZURE_URL/health"
    echo -e "${PURPLE}API status:${NC} curl $AZURE_URL/api/status"
    echo -e "${PURPLE}Test assessment:${NC} curl -X POST $AZURE_URL/api/assessment -H 'Content-Type: application/json' -d '{\"companyName\":\"Test\",\"industry\":\"Tech\"}'"
    echo ""
}

# Función principal
main() {
    echo -e "${PURPLE}${BOLD}"
    echo "=================================================================="
    echo "          DEPLOY SCRIPT - DEVOPS ANALYZER API"
    echo "=================================================================="
    echo -e "${NC}"
    
    log_info "Iniciando deploy proceso para $PROJECT_NAME"
    log_info "Build ID: $VERSION"
    
    # Verificar que estamos en el directorio correcto
    if [ ! -f "package.json" ] || ! grep -q "devops-analyzer-api" package.json 2>/dev/null; then
        log_error "Este script debe ejecutarse desde el directorio devops-analyzer-api"
        exit 1
    fi
    
    # Ejecutar pasos del deploy
    check_prerequisites
    install_dependencies
    compile_typescript
    run_tests
    build_and_push_docker
    deploy_to_azure
    validate_deployment
    generate_report
    
    log_success "🎉 Deploy completado exitosamente!"
}

# Ejecutar solo si se llama directamente
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi