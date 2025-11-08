#!/bin/bash

# ================================================================
# SCRIPT PRINCIPAL DE DEPLOY - SELECTOR DE MÉTODO
# Permite elegir entre deploy directo o push+GitHub Actions
# ================================================================

set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_banner() {
    echo -e "${PURPLE}${BOLD}"
    echo "=================================================================="
    echo "               DEVOPS ANALYZER API - DEPLOY MASTER"
    echo "=================================================================="
    echo -e "${NC}"
}

show_menu() {
    echo -e "${CYAN}Selecciona el método de deploy:${NC}"
    echo ""
    echo -e "${GREEN}1)${NC} ${BOLD}Deploy Directo${NC} - Build local + Docker push + Azure deploy"
    echo -e "   📦 Compilación local"
    echo -e "   🐳 Docker build y push directo"
    echo -e "   ☁️  Deploy inmediato a Azure"
    echo -e "   ⚡ Más rápido (~5-8 minutos)"
    echo ""
    echo -e "${GREEN}2)${NC} ${BOLD}Push + GitHub Actions${NC} - Git push + Actions monitoring + Azure sync"
    echo -e "   📤 Push a GitHub"
    echo -e "   🔄 GitHub Actions build automático"
    echo -e "   👀 Monitoreo de Actions (200s)"
    echo -e "   🔄 Sincronización y validación Azure"
    echo -e "   🛡️  Más robusto (~8-12 minutos)"
    echo ""
    echo -e "${GREEN}3)${NC} ${BOLD}Validación Solo${NC} - Solo verificar estado actual"
    echo -e "   🔍 Health checks"
    echo -e "   📊 Status de endpoints"
    echo -e "   ⚡ Rápido (~1-2 minutos)"
    echo ""
    echo -e "${GREEN}q)${NC} Salir"
    echo ""
}

validate_prerequisites() {
    log_info "Verificando prerequisites básicos..."
    
    # Verificar directorio
    if [ ! -f "package.json" ] || ! grep -q "devops-analyzer-api" package.json 2>/dev/null; then
        log_error "Ejecuta desde el directorio devops-analyzer-api"
        exit 1
    fi
    
    # Verificar scripts existen
    if [ ! -f "deploy-analyzer-api.sh" ]; then
        log_error "Script deploy-analyzer-api.sh no encontrado"
        exit 1
    fi
    
    if [ ! -f "github-push-deploy-validator.sh" ]; then
        log_error "Script github-push-deploy-validator.sh no encontrado"
        exit 1
    fi
    
    log_success "Prerequisites básicos OK"
}

run_direct_deploy() {
    echo -e "\n${YELLOW}==============================================="
    echo -e "         INICIANDO DEPLOY DIRECTO"
    echo -e "===============================================${NC}"
    
    # Verificar configuración
    if [ -z "${GITHUB_TOKEN:-}" ]; then
        log_error "GITHUB_TOKEN no configurado"
        log_info "💡 Solución:"
        echo "   export GITHUB_TOKEN=tu_token"
        echo "   O: source .env.deploy"
        exit 1
    fi
    
    # Ejecutar pre-check
    if [ -f "pre-deploy-check.sh" ]; then
        log_info "Ejecutando pre-deploy check..."
        if ! ./pre-deploy-check.sh; then
            log_error "Pre-deploy check falló"
            exit 1
        fi
    fi
    
    # Ejecutar deploy
    log_info "Iniciando deploy directo..."
    ./deploy-analyzer-api.sh
}

run_github_actions_deploy() {
    echo -e "\n${YELLOW}==============================================="
    echo -e "      INICIANDO PUSH + GITHUB ACTIONS"
    echo -e "===============================================${NC}"
    
    # Verificar GitHub CLI
    if ! command -v gh >/dev/null 2>&1; then
        log_error "GitHub CLI no instalado"
        log_info "💡 Instalar: https://cli.github.com/"
        exit 1
    fi
    
    # Verificar auth
    if ! gh auth status >/dev/null 2>&1; then
        log_error "GitHub CLI no autenticado"
        log_info "💡 Ejecuta: gh auth login"
        exit 1
    fi
    
    # Ejecutar GitHub push + validation
    log_info "Iniciando push y monitoreo de GitHub Actions..."
    ./github-push-deploy-validator.sh
}

run_validation_only() {
    echo -e "\n${YELLOW}==============================================="
    echo -e "           EJECUTANDO VALIDACIÓN SOLO"
    echo -e "===============================================${NC}"
    
    local AZURE_URL="https://devops-analyzer-api.azurewebsites.net"
    
    log_info "Ejecutando health checks..."
    
    # Health check
    if curl -f -s --max-time 10 "$AZURE_URL/health" >/dev/null; then
        log_success "✅ Health check: OK"
    else
        log_error "❌ Health check: FAILED"
    fi
    
    # API status
    if response=$(curl -s -w "%{http_code}" --max-time 10 "$AZURE_URL/api/status" -o /tmp/api_status.json); then
        if [ "$response" = "200" ]; then
            log_success "✅ API Status: OK"
            local version=$(jq -r '.version // "unknown"' /tmp/api_status.json 2>/dev/null)
            log_info "   Version: $version"
        else
            log_error "❌ API Status: HTTP $response"
        fi
    fi
    
    # Assessment endpoint
    log_info "Testing assessment endpoint..."
    local test_payload='{"companyName":"Health Check","industry":"Technology"}'
    if response=$(curl -s -w "%{http_code}" --max-time 20 -X POST "$AZURE_URL/api/assessment" \
        -H "Content-Type: application/json" \
        -d "$test_payload" -o /tmp/assessment_test.json); then
        
        if [ "$response" = "200" ]; then
            log_success "✅ Assessment endpoint: OK"
        else
            log_warning "⚠️  Assessment endpoint: HTTP $response"
        fi
    fi
    
    # Container info
    log_info "Obteniendo info del container..."
    if command -v az >/dev/null 2>&1 && az account show >/dev/null 2>&1; then
        if container_image=$(az webapp config container show --name devops-analyzer-api --resource-group devops-analyzer-api --query "linuxFxVersion" -o tsv 2>/dev/null); then
            log_success "✅ Container info: ${container_image#DOCKER|}"
        fi
    fi
    
    echo ""
    log_success "🎉 Validación completada"
    log_info "🌐 App URL: $AZURE_URL"
}

show_current_status() {
    echo -e "\n${CYAN}Estado actual del proyecto:${NC}"
    
    # Git info
    if git status >/dev/null 2>&1; then
        local branch=$(git branch --show-current)
        local commit=$(git rev-parse --short HEAD)
        local status=$(git status --porcelain | wc -l)
        
        echo -e "  📝 Branch: $branch"
        echo -e "  🎯 Commit: $commit"
        if [ "$status" -gt 0 ]; then
            echo -e "  ⚠️  Cambios sin commit: $status archivos"
        else
            echo -e "  ✅ Working directory limpio"
        fi
    fi
    
    # Últimos deploys
    if [ -f "deployment-report-"*".json" ] 2>/dev/null; then
        local last_report=$(ls -t deployment-report-*.json 2>/dev/null | head -1)
        if [ -n "$last_report" ]; then
            local last_deploy=$(jq -r '.deployment.buildDate' "$last_report" 2>/dev/null)
            echo -e "  📊 Último deploy: $last_deploy"
        fi
    fi
    
    echo ""
}

main() {
    show_banner
    validate_prerequisites
    show_current_status
    
    while true; do
        show_menu
        read -p "Selecciona una opción [1-3,q]: " choice
        
        case $choice in
            1)
                run_direct_deploy
                break
                ;;
            2)
                run_github_actions_deploy
                break
                ;;
            3)
                run_validation_only
                echo ""
                read -p "¿Continuar con el menú? (Y/n): " continue_menu
                if [[ $continue_menu =~ ^[Nn]$ ]]; then
                    break
                fi
                ;;
            q|Q)
                log_info "👋 ¡Hasta luego!"
                exit 0
                ;;
            *)
                log_error "Opción inválida: $choice"
                ;;
        esac
    done
    
    log_success "🎉 Proceso completado exitosamente!"
}

# Ejecutar solo si se llama directamente
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi