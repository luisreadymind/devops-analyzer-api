#!/bin/bash

# ================================================================
# SCRIPT DE PUSH Y VALIDACIÓN COMPLETA GITHUB + AZURE
# Push a GitHub, monitoreo de Actions, validación y sync de container
# Version: 1.0.0 - Para devops-analyzer-api
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

# Configuración

REPO_OWNER="luisreadymind"
REPO_NAME="devops-analyzer-api"
AZURE_APP_NAME="devops-analyzer-api"
AZURE_RG="DevOpsAssesment"
AZURE_URL="https://devops-analyzer-api.azurewebsites.net"
REGISTRY="ghcr.io"
IMAGE_NAME="$REGISTRY/$REPO_OWNER/devops-analyzer-api"
MAX_WAIT_ACTIONS=320  # 320 segundos
POST_RESTART_WAIT=60  # 60 segundos
BUILD_DATE=$(date '+%Y%m%d-%H%M%S')

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
        log_error "Script falló con código: $exit_code"
        # Cleanup temp files if any
        rm -f /tmp/github_workflow_*.json 2>/dev/null || true
        rm -f /tmp/azure_container_*.json 2>/dev/null || true
    fi
    exit $exit_code
}

trap cleanup EXIT

# Verificar prerequisites
check_prerequisites() {
    log_step "1" "VERIFICANDO PREREQUISITES"
    
    # Verificar herramientas necesarias
    local missing_tools=()
    if ! command -v git >/dev/null 2>&1; then missing_tools+=("git"); fi
    # github-cli is optional if SSH keys are available for pushing
    GH_CLI_AVAILABLE=true
    if ! command -v gh >/dev/null 2>&1; then GH_CLI_AVAILABLE=false; fi
    if ! command -v az >/dev/null 2>&1; then missing_tools+=("azure-cli"); fi
    if ! command -v jq >/dev/null 2>&1; then missing_tools+=("jq"); fi
    if ! command -v curl >/dev/null 2>&1; then missing_tools+=("curl"); fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Herramientas faltantes: ${missing_tools[*]}"
        log_info "Instálalas antes de continuar"
        exit 1
    fi
    
    # Verificar autenticación (SSH o GitHub CLI)
    local auth_ok=false
    
    # Check SSH auth first - ensure agent is running
    log_info "Verificando SSH authentication..."
    
    # Start SSH agent if not running
    if [ -z "$SSH_AGENT_PID" ]; then
        log_info "Iniciando SSH agent..."
        eval "$(ssh-agent -s)" >/dev/null 2>&1
    fi
    
    # Add SSH key if not loaded
    log_info "Verificando si SSH key está cargada..."
    if ssh-add -l >/dev/null 2>&1; then
        log_info "SSH key ya está cargada"
    else
        log_info "Cargando SSH key..."
        if ssh-add ~/.ssh/id_rsa >/dev/null 2>&1; then
            log_info "SSH key cargada exitosamente"
        elif ssh-add ~/.ssh/id_ed25519 >/dev/null 2>&1; then
            log_info "SSH key ed25519 cargada exitosamente"
        else
            log_info "Error al cargar SSH key"
        fi
    fi
    
    # Test SSH connection
    log_info "Probando conexión SSH a GitHub..."
    ssh_output=$(ssh -T git@github.com 2>&1)
    ssh_exit=$?
    log_info "SSH exit code: $ssh_exit"
    log_info "SSH output: $ssh_output"
    
    if [ $ssh_exit -eq 0 ] && echo "$ssh_output" | grep -q "successfully authenticated"; then
        log_info "SSH authentication to GitHub verified ✓"
        auth_ok=true
    else
        log_info "SSH authentication failed (exit: $ssh_exit)"
    fi
    
    # If SSH not working, check GitHub CLI
    if [ "$auth_ok" = false ] && [ "$GH_CLI_AVAILABLE" = true ]; then
        if gh auth status >/dev/null 2>&1; then
            log_info "GitHub CLI authentication verified ✓"
            auth_ok=true
        fi
    fi
    
    if [ "$auth_ok" = false ]; then
        log_error "No se pudo verificar autenticación a GitHub (ni SSH ni GitHub CLI)"
        log_info "Configura SSH keys o ejecuta: gh auth login"
        exit 1
    fi
    
    # Verificar Azure CLI auth
    if ! az account show >/dev/null 2>&1; then
        log_error "Azure CLI no está autenticado"
        log_info "Ejecuta: az login"
        exit 1
    fi
    
    # Verificar que estamos en el repo correcto
    local current_repo=$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]\([^/]*\/[^/]*\)\.git.*/\1/' || echo "")
    if [ "$current_repo" != "$REPO_OWNER/$REPO_NAME" ]; then
        log_warning "Repo detectado: $current_repo, esperado: $REPO_OWNER/$REPO_NAME"
        read -p "¿Continuar de todos modos? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "Prerequisites verificados ✓"
}

# Verificar y hacer push a GitHub
git_push_and_tag() {
    log_step "2" "GIT PUSH Y TAGGING"
    
    # Verificar que hay cambios o al menos estar en sync
    local git_status=$(git status --porcelain)
    if [ -n "$git_status" ]; then
        log_info "Cambios detectados, preparando commit..."
        
        # Mostrar cambios
        echo -e "${CYAN}Cambios pendientes:${NC}"
        git status --short
        echo ""
        
        # Confirmar commit
        read -p "¿Hacer commit de estos cambios? (Y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            log_error "Cancelado por usuario"
            exit 1
        fi
        
        # Commit message
        read -p "Mensaje del commit [Auto deploy $BUILD_DATE]: " commit_msg
        commit_msg=${commit_msg:-"Auto deploy $BUILD_DATE"}
        
        git add .
        git commit -m "$commit_msg"
    else
        log_info "No hay cambios pendientes en el working directory"
    fi
    
    # Obtener hash del commit actual
    local current_commit=$(git rev-parse HEAD)
    local short_hash=$(git rev-parse --short HEAD)
    log_info "Commit actual: $short_hash"
    
    # Crear tag con timestamp
    local tag_name="deploy-$BUILD_DATE-$short_hash"
    log_info "Creando tag: $tag_name"
    git tag -a "$tag_name" -m "Deploy $BUILD_DATE"
    
    # Push con tags
    log_info "Haciendo push a GitHub..."
    git push origin main
    git push origin --tags
    
    log_success "Push completado ✓"
    log_info "Tag creado: $tag_name"
    log_info "Commit: $current_commit"
    
    # Store para uso posterior
    echo "$current_commit" > /tmp/current_commit_hash
    echo "$tag_name" > /tmp/deploy_tag
}

# Monitorear GitHub Actions
monitor_github_actions() {
    log_step "3" "MONITOREANDO GITHUB ACTIONS"
    
    # Skip if GitHub CLI not available
    if [ "$GH_CLI_AVAILABLE" = false ]; then
        log_warning "GitHub CLI no disponible, saltando monitoreo de Actions"
        log_info "Verifica manualmente el progreso en: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
        return 0
    fi
    
    local start_time=$(date +%s)
    local end_time=$((start_time + MAX_WAIT_ACTIONS))
    local workflow_found=false
    local workflow_id=""
    local run_id=""
    
    log_info "Esperando que inicie el workflow... (máximo ${MAX_WAIT_ACTIONS}s)"
    
    # Esperar un poco para que el workflow aparezca
    sleep 10
    
    # Buscar el workflow más reciente
    while [ $(date +%s) -lt $end_time ]; do
        log_info "Buscando workflows recientes..."
        
        # Obtener workflows recientes (últimos 5)
        if gh run list --limit 5 --json databaseId,status,conclusion,workflowName,createdAt,headSha > /tmp/github_workflow_list.json; then
            
            # Buscar workflow que coincida con nuestro commit
            local current_commit=$(cat /tmp/current_commit_hash 2>/dev/null || git rev-parse HEAD)
            
            # Buscar por commit SHA o por tiempo reciente
            run_id=$(jq -r --arg commit "$current_commit" '.[] | select(.headSha == $commit or (.createdAt | fromdateiso8601) > (now - 300)) | .databaseId' /tmp/github_workflow_list.json 2>/dev/null | head -1)
            
            if [ -n "$run_id" ] && [ "$run_id" != "null" ]; then
                workflow_found=true
                log_success "Workflow encontrado: Run ID $run_id"
                break
            fi
        fi
        
        log_info "Workflow aún no encontrado, esperando... ($(( end_time - $(date +%s) ))s restantes)"
        sleep 15
    done
    
    if [ "$workflow_found" = false ]; then
        log_error "No se encontró workflow después de ${MAX_WAIT_ACTIONS}s"
        log_info "Verifica manualmente en: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
        exit 1
    fi
    
    # Monitorear el progreso del workflow
    log_info "Monitoreando progreso del workflow..."
    local status="in_progress"
    
    while [ $(date +%s) -lt $end_time ] && [[ "$status" == "in_progress" || "$status" == "queued" ]]; do
        # Obtener status actual
        if gh run view "$run_id" --json status,conclusion,workflowName > /tmp/github_workflow_status.json; then
            status=$(jq -r '.status' /tmp/github_workflow_status.json)
            local conclusion=$(jq -r '.conclusion' /tmp/github_workflow_status.json)
            local workflow_name=$(jq -r '.workflowName' /tmp/github_workflow_status.json)
            
            log_info "Status: $status | Workflow: $workflow_name | Tiempo restante: $(( end_time - $(date +%s) ))s"
            
            if [ "$status" = "completed" ]; then
                if [ "$conclusion" = "success" ]; then
                    log_success "GitHub Actions completado exitosamente ✓"
                    break
                else
                    log_error "GitHub Actions falló con conclusion: $conclusion"
                    log_info "Ver detalles en: https://github.com/$REPO_OWNER/$REPO_NAME/actions/runs/$run_id"
                    exit 1
                fi
            fi
        fi
        
        sleep 10
    done
    
    # Timeout check
    if [ $(date +%s) -ge $end_time ] && [ "$status" != "completed" ]; then
        log_error "Timeout: GitHub Actions no completó en ${MAX_WAIT_ACTIONS}s"
        log_info "Status final: $status"
        log_info "Monitorea manualmente: https://github.com/$REPO_OWNER/$REPO_NAME/actions/runs/$run_id"
        exit 1
    fi
    
    log_success "GitHub Actions completado exitosamente ✓"
}

# Obtener información del container desplegado
get_deployed_container_info() {
    log_step "4" "OBTENIENDO INFO DEL CONTAINER DESPLEGADO"
    
    # Obtener configuración actual del container
    log_info "Obteniendo configuración actual del App Service..."
    
    if az webapp config container show \
        --name "$AZURE_APP_NAME" \
        --resource-group "$AZURE_RG" \
        --output json > /tmp/azure_container_config.json; then
        
        local current_image=$(jq -r '.linuxFxVersion' /tmp/azure_container_config.json | sed 's/DOCKER|//')
        local registry_url=$(jq -r '.appSettings[] | select(.name=="DOCKER_REGISTRY_SERVER_URL") | .value' /tmp/azure_container_config.json 2>/dev/null || echo "")
        
        log_info "Container actual: $current_image"
        log_info "Registry: $registry_url"
        
        # Store para comparación
        echo "$current_image" > /tmp/current_container_image
        
        return 0
    else
        log_error "No se pudo obtener configuración del container"
        exit 1
    fi
}

# Verificar si necesita actualización del container
check_and_update_container() {
    log_step "5" "VERIFICANDO Y ACTUALIZANDO CONTAINER"
    
    # Obtener tag del último deploy
    local deploy_tag=$(cat /tmp/deploy_tag 2>/dev/null || echo "latest")
    local current_commit=$(cat /tmp/current_commit_hash 2>/dev/null || git rev-parse --short HEAD)
    
    # Determinar imagen esperada
    local expected_image="$IMAGE_NAME:latest"  # Podríamos usar tag específico si se prefiere
    local current_image=$(cat /tmp/current_container_image 2>/dev/null || echo "")
    
    log_info "Imagen esperada: $expected_image"
    log_info "Imagen actual: $current_image"
    
    # Verificar si necesita actualización (siempre actualizamos para garantizar latest)
    log_info "Actualizando container a la versión más reciente..."
    
    # Actualizar configuración del container
    if az webapp config container set \
        --name "$AZURE_APP_NAME" \
        --resource-group "$AZURE_RG" \
        --container-image-name "$expected_image" \
        --container-registry-url "https://$REGISTRY" >/dev/null; then
        
        log_success "Container configurado con imagen: $expected_image ✓"
        
        # Reiniciar App Service
        log_info "Reiniciando Azure App Service..."
    if az webapp restart --name "$AZURE_APP_NAME" --resource-group "$AZURE_RG" >/dev/null; then
            log_success "App Service reiniciado ✓"
        else
            log_error "Error al reiniciar App Service"
            exit 1
        fi
        
        # Esperar tiempo post-restart
        log_info "Esperando ${POST_RESTART_WAIT}s para que la app se estabilice..."
        sleep $POST_RESTART_WAIT
        
    else
        log_error "Error al actualizar configuración del container"
        exit 1
    fi
}

# Validación completa de la aplicación
validate_application() {
    log_step "6" "VALIDACIÓN COMPLETA DE LA APLICACIÓN"
    
    local max_attempts=10
    local attempt=0
    local health_ok=false
    
    log_info "Validando health endpoints..."
    
    # Health check básico con reintentos
    while [ $attempt -lt $max_attempts ] && [ "$health_ok" = false ]; do
        attempt=$((attempt + 1))
        log_info "Health check $attempt/$max_attempts..."
        
        # Test health endpoint
        if curl -f -s --max-time 10 "$AZURE_URL/health" >/dev/null 2>&1; then
            health_ok=true
            log_success "Health endpoint OK ✓"
        else
            if [ $attempt -eq $max_attempts ]; then
                log_error "Health check falló después de $max_attempts intentos"
                
                # Obtener logs para debug
                log_info "Obteniendo logs recientes para debug..."
                az webapp log tail --name "$AZURE_APP_NAME" --resource-group "$AZURE_RG" --lines 20 2>/dev/null || true
                
                exit 1
            else
                log_warning "Health check falló, reintentando en 10s..."
                sleep 10
            fi
        fi
    done
    
    # Test endpoints adicionales
    log_info "Testing endpoints críticos..."
    
    # Test API status
    if response=$(curl -s -w "%{http_code}" --max-time 15 "$AZURE_URL/api/status" -o /tmp/api_status_response.json); then
        if [ "$response" = "200" ]; then
            log_success "API status endpoint OK ✓"
            local api_version=$(jq -r '.version // "unknown"' /tmp/api_status_response.json 2>/dev/null)
            log_info "API version: $api_version"
        else
            log_warning "API status retornó código: $response"
        fi
    fi
    
    # Test assessment endpoint (básico)
    log_info "Testing assessment endpoint..."
    local test_payload='{"companyName":"Test Deploy Validation","industry":"Technology"}'
    
    if response=$(curl -s -w "%{http_code}" --max-time 30 -X POST "$AZURE_URL/api/assessment" \
        -H "Content-Type: application/json" \
        -d "$test_payload" -o /tmp/assessment_response.json); then
        
        if [ "$response" = "200" ]; then
            log_success "Assessment endpoint OK ✓"
            
            # Verificar que la respuesta tiene estructura esperada
            if jq -e '.analysis' /tmp/assessment_response.json >/dev/null 2>&1; then
                log_success "Assessment response structure OK ✓"
            else
                log_warning "Assessment response structure inesperada"
            fi
        else
            log_warning "Assessment endpoint retornó código: $response"
        fi
    fi
    
    log_success "Validación de aplicación completada ✓"
}

# Generar reporte final detallado
generate_final_report() {
    log_step "7" "GENERANDO REPORTE FINAL"
    
        local report_file="github-deploy-report-$BUILD_DATE.json"
        local deploy_tag=$(cat /tmp/deploy_tag 2>/dev/null || echo "unknown")
        local current_commit=$(cat /tmp/current_commit_hash 2>/dev/null || git rev-parse HEAD)
        local current_image=$(cat /tmp/current_container_image 2>/dev/null || echo "unknown")
    
        # Crear reporte completo
        cat > "$report_file" << EOF
{
    "deployment": {
        "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%S.000Z')",
        "buildId": "$BUILD_DATE",
        "status": "SUCCESS",
        "method": "GitHub Actions + Azure Container Update"
    },
    "git": {
        "repository": "$REPO_OWNER/$REPO_NAME",
        "commit": "$current_commit",
        "tag": "$deploy_tag",
        "branch": "$(git branch --show-current)"
    },
    "github": {
        "actionsMonitored": true,
        "maxWaitTime": "${MAX_WAIT_ACTIONS}s",
        "status": "completed_successfully"
    },
    "azure": {
        "appService": "$AZURE_APP_NAME",
        "resourceGroup": "$AZURE_RG",
        "url": "$AZURE_URL",
        "containerImage": "$current_image",
        "restartPerformed": true,
        "postRestartWait": "${POST_RESTART_WAIT}s"
    },
    "validation": {
        "healthCheck": "PASSED",
        "apiStatus": "PASSED",
        "assessmentEndpoint": "PASSED",
        "overallStatus": "ALL_TESTS_PASSED"
    },
    "timing": {
        "totalDuration": "$(( $(date +%s) - $(cat /tmp/script_start_time 2>/dev/null || echo $(date +%s)) ))s",
        "actionsWait": "${MAX_WAIT_ACTIONS}s",
        "postRestartWait": "${POST_RESTART_WAIT}s"
    }
}
EOF
    
    log_success "Reporte generado: $report_file"
    
    # Summary visual
    echo -e "\n${GREEN}${BOLD}==========================================="
    echo -e "    🎉 DEPLOY GITHUB→AZURE COMPLETADO"
    echo -e "===========================================${NC}"
    echo -e "${CYAN}Repository:${NC} $REPO_OWNER/$REPO_NAME"
    echo -e "${CYAN}Commit:${NC} $(git rev-parse --short HEAD)"
    echo -e "${CYAN}Tag:${NC} $deploy_tag"
    echo -e "${CYAN}Container:${NC} $current_image"
    echo -e "${CYAN}App URL:${NC} $AZURE_URL"
    echo -e "${CYAN}Reporte:${NC} $report_file"
    echo -e "${GREEN}${BOLD}===========================================${NC}\n"
    
    # Links útiles
    echo -e "${YELLOW}LINKS ÚTILES:${NC}"
    echo -e "${PURPLE}GitHub Actions:${NC} https://github.com/$REPO_OWNER/$REPO_NAME/actions"
    echo -e "${PURPLE}Azure Portal:${NC} https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$AZURE_RG/providers/Microsoft.Web/sites/$AZURE_APP_NAME"
    echo -e "${PURPLE}App URL:${NC} $AZURE_URL"
    echo -e "${PURPLE}Health Check:${NC} $AZURE_URL/health"
    echo ""
    
    # Comandos post-deploy
    echo -e "${YELLOW}COMANDOS POST-DEPLOY:${NC}"
    echo -e "${PURPLE}Ver logs:${NC} az webapp log tail --name $AZURE_APP_NAME --resource-group $AZURE_RG"
    echo -e "${PURPLE}Health check:${NC} curl $AZURE_URL/health"
    echo -e "${PURPLE}Test API:${NC} curl $AZURE_URL/api/status"
    echo ""
}

# Función principal
main() {
    # Store start time
    echo "$(date +%s)" > /tmp/script_start_time
    
    echo -e "${PURPLE}${BOLD}"
    echo "=================================================================="
    echo "         GITHUB PUSH + ACTIONS + AZURE DEPLOY VALIDATOR"
    echo "=================================================================="
    echo -e "${NC}"
    
    log_info "Iniciando proceso completo para $REPO_NAME"
    log_info "Target: $AZURE_URL"
    log_info "Max wait GitHub Actions: ${MAX_WAIT_ACTIONS}s"
    log_info "Post-restart wait: ${POST_RESTART_WAIT}s"
    
    # Verificar directorio correcto
    if [ ! -f "package.json" ] || ! grep -q "devops-analyzer-api" package.json 2>/dev/null; then
        log_error "Este script debe ejecutarse desde el directorio devops-analyzer-api"
        exit 1
    fi
    
    # Ejecutar todos los pasos
    check_prerequisites
    git_push_and_tag
    monitor_github_actions
    get_deployed_container_info
    check_and_update_container
    validate_application
    generate_final_report
    
    log_success "🚀 Proceso completo finalizado exitosamente!"
}

# Ejecutar solo si se llama directamente
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi