#!/bin/bash

# =============================================================================
# 🧹 SCRIPT DE LIMPIEZA DEL WORKSPACE - DEVOPS ANALYZER API
# =============================================================================
# Autor: GitHub Copilot
# Fecha: 8 de noviembre de 2025
# Propósito: Eliminar archivos innecesarios del proyecto devops-analyzer-api
# =============================================================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Variables globales
TOTAL_FILES_DELETED=0
TOTAL_SIZE_FREED=0
START_TIME=$(date +%s)

# Patrones a excluir (no eliminar): archivos de test y deploy
EXCLUDE_PATTERNS=(
    "test*"
    "test_*"
    "test-*.json"
    "test-*.pdf"
    "test-*.sh"
    "test-*.py"
    "test_*.*"
    "deploy*"
    "deploy-*"
    "deployments"
    "deployments/*"
    # Archivos específicos a excluir
    "github-push-deploy-validator.sh"
    "test_export_word.py"
    "test_generate_report.py"
    "test_json.json"
    "test-export-word.js"
    "cleanup-api-workspace.sh"
)

# Comprueba si un archivo/directorio debe excluirse de la limpieza
is_excluded() {
    local target="$1"
    local base
    base=$(basename "$target")
    for p in "${EXCLUDE_PATTERNS[@]}"; do
        case "$base" in
            $p) return 0 ;;
        esac
    done
    # También excluir si la ruta contiene "deployments" o "test"
    if [[ "$target" == *deployments* ]] || [[ "$target" == *test* ]]; then
        return 0
    fi
    return 1
}

# Banner inicial
echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════════════════════════════════════╗"
echo "║                     🧹 LIMPIEZA DEL WORKSPACE DEVOPS ANALYZER API               ║"
echo "║                                                                                  ║"
echo "║  Este script eliminará archivos innecesarios manteniendo solo lo esencial       ║"
echo "║  para el funcionamiento de la API en producción.                                ║"
echo "╚══════════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo

# Función para mostrar progreso
show_progress() {
    local step=$1
    local total=10
    local percent=$((step * 100 / total))
    local filled=$((step * 40 / total))
    local empty=$((40 - filled))
    
    printf "\r${BLUE}Progreso: [${GREEN}"
    printf "%*s" $filled | tr ' ' '█'
    printf "${BLUE}"
    printf "%*s" $empty | tr ' ' '░'
    printf "] %d%% (%d/%d)${NC}" $percent $step $total
}

# Función para calcular tamaño de archivo
get_file_size() {
    if [[ -f "$1" ]]; then
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null || echo 0
        else
            powershell -command "(Get-Item '$1').Length" 2>/dev/null || echo 0
        fi
    else
        echo 0
    fi
}

# Función para eliminar archivo con reporte
delete_file() {
    local file=$1
    local reason=$2
    
    if is_excluded "$file"; then
        echo -e "  ${YELLOW}!${NC} Omitido (excluido): ${YELLOW}$(basename \"$file\")${NC} - $reason"
        return 0
    fi

    if [[ -f "$file" ]]; then
        local size=$(get_file_size "$file")
        rm -f "$file"
        if [[ $? -eq 0 ]]; then
            TOTAL_FILES_DELETED=$((TOTAL_FILES_DELETED + 1))
            TOTAL_SIZE_FREED=$((TOTAL_SIZE_FREED + size))
            echo -e "  ${GREEN}✓${NC} Eliminado: ${YELLOW}$(basename "$file")${NC} ($(numfmt --to=iec $size)) - $reason"
        else
            echo -e "  ${RED}✗${NC} Error eliminando: $file"
        fi
    fi
}

# Función para eliminar archivos por patrón
delete_pattern() {
    local pattern=$1
    local reason=$2
    
    for file in $pattern; do
        if is_excluded "$file"; then
            echo -e "  ${YELLOW}!${NC} Omitido (excluido): ${YELLOW}$(basename \"$file\")${NC} - $reason"
        elif [[ -f "$file" ]]; then
            delete_file "$file" "$reason"
        fi
    done
}

echo -e "${CYAN}🔍 Analizando estructura del proyecto devops-analyzer-api...${NC}"
echo

# PASO 1: Eliminar PDFs de testing
show_progress 1
echo -e "\n${CYAN}📄 PASO 1: Eliminando archivos PDF de testing...${NC}"
delete_file "test.pdf" "archivo PDF de testing"
delete_file "test2.pdf" "archivo PDF de testing"
delete_file "Unicomer.pdf" "archivo PDF de testing grande"
delete_file "Unicomer_filtered.pdf" "archivo PDF de testing procesado"

# PASO 2: Eliminar archivos de respuesta JSON de testing
show_progress 2
echo -e "\n${CYAN}🔄 PASO 2: Eliminando respuestas JSON de testing...${NC}"
delete_file "latest-test-response.json" "respuesta de testing"
delete_file "final-verification-response.json" "respuesta de verificación"
delete_file "report-response.json" "respuesta de reporte"
delete_file "unicomer-response.json" "respuesta vacía de Unicomer"

# PASO 3: Eliminar scripts de testing y validación
show_progress 3
echo -e "\n${CYAN}🧪 PASO 3: Eliminando scripts de testing y validación...${NC}"
delete_file "test-api.sh" "script de testing de API"
delete_file "validate-deployment.sh" "script de validación de deployment"
delete_file "validate-azure-update.sh" "script de validación de Azure"
delete_file "create-test-pdf.py" "script de creación de PDFs de testing"

# PASO 4: Eliminar archivos comprimidos y logs
show_progress 4
echo -e "\n${CYAN}📦 PASO 4: Eliminando archivos comprimidos y logs...${NC}"
delete_file "deploy.zip" "archivo comprimido de deployment"
delete_file "app-logs-latest.zip" "logs comprimidos de aplicación"

# PASO 5: Eliminar documentación temporal y reportes
show_progress 5
echo -e "\n${CYAN}📄 PASO 5: Eliminando documentación temporal...${NC}"
delete_file "CORRECTION-COMPLETE-REPORT.md" "reporte de corrección temporal"
delete_file "FIXED-AREAS-FUERTES.md" "documentación de corrección temporal"
delete_file "VALIDATION-REPORT.md" "reporte de validación temporal"

# PASO 6: Eliminar archivos de configuración obsoletos
show_progress 6
echo -e "\n${CYAN}⚙️ PASO 6: Eliminando configuración obsoleta...${NC}"
delete_file "publish-profile.xml" "perfil de publicación obsoleto"

# PASO 7: Limpiar directorio dist (build artifacts)
show_progress 7
echo -e "\n${CYAN}🏗️ PASO 7: Limpiando directorio dist...${NC}"
if [[ -d "dist" ]]; then
    dist_files=$(find dist -type f 2>/dev/null | wc -l)
    if [[ $dist_files -gt 0 ]]; then
        echo -e "  ${BLUE}ℹ️${NC} Encontrados $dist_files archivos en dist/"
        find dist -type f -exec rm -f {} \;
        echo -e "  ${GREEN}✓${NC} Directorio dist/ limpiado"
        TOTAL_FILES_DELETED=$((TOTAL_FILES_DELETED + dist_files))
    else
        echo -e "  ${GREEN}✓${NC} Directorio dist/ ya está limpio"
    fi
fi

# PASO 8: Limpiar deployments temporales
show_progress 8
echo -e "\n${CYAN}🚀 PASO 8: Limpiando deployments temporales...${NC}"
    if [[ -d "deployments" ]]; then
        # Por seguridad no eliminamos contenido de 'deployments' para preservar artefactos y pruebas de deploy
        if [[ -f "deployments/active" ]]; then
            active_deployment=$(cat deployments/active 2>/dev/null)
            echo -e "  ${BLUE}ℹ️${NC} Deployment activo: $active_deployment"
        fi
        echo -e "  ${YELLOW}!${NC} Se omite la limpieza de 'deployments/' para preservar archivos de despliegue"
    fi

# PASO 9: Limpiar node_modules innecesarios (solo archivos de cache)
show_progress 9
echo -e "\n${CYAN}📦 PASO 9: Limpiando cache de node_modules...${NC}"
if [[ -d "node_modules" ]]; then
    # Solo limpiar cache, no todo node_modules
    find node_modules -name ".cache" -type d -exec rm -rf {} \; 2>/dev/null
    find node_modules -name "*.log" -type f -exec rm -f {} \; 2>/dev/null
    echo -e "  ${GREEN}✓${NC} Cache de node_modules limpiado"
fi

# PASO 10: Verificar directorios vacíos
show_progress 10
echo -e "\n${CYAN}📁 PASO 10: Verificando directorios vacíos...${NC}"

# Función para verificar si un directorio está vacío
check_empty_dirs() {
    for dir in */; do
        if [[ -d "$dir" && "$dir" != "node_modules/" && "$dir" != "src/" && "$dir" != ".git/" && "$dir" != ".github/" ]]; then
            if [[ -z "$(ls -A "$dir" 2>/dev/null)" ]]; then
                echo -e "  ${GREEN}✓${NC} Directorio vacío encontrado: ${YELLOW}$dir${NC}"
                rmdir "$dir" 2>/dev/null && echo -e "    ${GREEN}Eliminado${NC}" || echo -e "    ${RED}Error eliminando${NC}"
            fi
        fi
    done
}

check_empty_dirs

echo -e "\n${GREEN}✅ Limpieza completada!${NC}"
echo

# REPORTE FINAL
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════════════════════════════════════╗"
echo "║                           📊 REPORTE DE LIMPIEZA FINAL                           ║"
echo "╚══════════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${CYAN}📈 ESTADÍSTICAS DE LIMPIEZA:${NC}"
echo -e "  • Archivos eliminados: ${GREEN}$TOTAL_FILES_DELETED${NC}"
echo -e "  • Espacio liberado: ${GREEN}$(numfmt --to=iec $TOTAL_SIZE_FREED)${NC}"
echo -e "  • Tiempo de ejecución: ${GREEN}${DURATION}s${NC}"
echo

echo -e "${CYAN}📂 ARCHIVOS CONSERVADOS (ESENCIALES PARA PRODUCCIÓN):${NC}"
echo -e "  ${GREEN}✓${NC} package.json - Dependencias y scripts"
echo -e "  ${GREEN}✓${NC} package-lock.json - Lock de dependencias"
echo -e "  ${GREEN}✓${NC} tsconfig.json - Configuración TypeScript"
echo -e "  ${GREEN}✓${NC} Dockerfile - Configuración de container"
echo -e "  ${GREEN}✓${NC} .dockerignore - Exclusiones para Docker"
echo -e "  ${GREEN}✓${NC} README.md - Documentación principal"
echo -e "  ${GREEN}✓${NC} .env.example - Template de variables de entorno"
echo -e "  ${GREEN}✓${NC} .gitignore - Configuración de Git"
echo -e "  ${GREEN}✓${NC} src/ - Código fuente TypeScript"
echo -e "  ${GREEN}✓${NC} node_modules/ - Dependencias (limpiadas)"
echo -e "  ${GREEN}✓${NC} .github/workflows/ - CI/CD pipeline"
echo -e "  ${GREEN}✓${NC} deployments/active - Información de deployment"

echo

echo -e "${CYAN}🎯 SIGUIENTES PASOS RECOMENDADOS:${NC}"
echo -e "  1. ${YELLOW}Compilar proyecto:${NC} npm run build"
echo -e "  2. ${YELLOW}Probar localmente:${NC} npm run dev"
echo -e "  3. ${YELLOW}Hacer commit:${NC} git add . && git commit -m \"cleanup: Limpieza del workspace\""
echo -e "  4. ${YELLOW}Deploy a producción:${NC} Usar GitHub Actions o deploy manual"

echo

echo -e "${GREEN}🎉 Workspace de DevOps Analyzer API limpio y optimizado!${NC}"
echo

# Mostrar estructura final
echo -e "${CYAN}📁 ESTRUCTURA FINAL DEL PROYECTO:${NC}"
echo -e "📦 devops-analyzer-api/"
echo -e "├── 🐳 Dockerfile"
echo -e "├── 📋 README.md"
echo -e "├── ⚙️  package.json"
echo -e "├── 🔒 package-lock.json"
echo -e "├── 📝 tsconfig.json"
echo -e "├── 🌐 .env.example"
echo -e "├── 🚫 .gitignore"
echo -e "├── 🚫 .dockerignore"
echo -e "├── 📁 src/ (código TypeScript)"
echo -e "├── 📁 node_modules/ (dependencias)"
echo -e "├── 📁 .github/workflows/ (CI/CD)"
echo -e "└── 📁 deployments/ (info deployment)"
echo

# Verificar archivos críticos
echo -e "${CYAN}🔍 VERIFICACIÓN DE ARCHIVOS CRÍTICOS:${NC}"
critical_files=("package.json" "src/index.ts" "Dockerfile" "tsconfig.json")
for file in "${critical_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file ${RED}(FALTANTE!)${NC}"
    fi
done