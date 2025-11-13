#!/bin/bash

# Script de deploy para azure-devops-capability-analizer
# Valida estructura, hace commit y push a git, triggers GitHub Actions pipeline, monitorea y valida
# Uso: ./deploy.sh [commit-message]
# Si no se proporciona commit-message, usa "deploy: YYYY-MM-DD_HH-MM-SS"

set -e  # Exit on error

COMMIT_MESSAGE=${1:-"deploy: $(date +%Y-%m-%d_%H-%M-%S)"}

echo "=== Validando estructura del directorio ==="
REQUIRED_FILES=(
    "Dockerfile"
    "package.json"
    "src/index.ts"
    ".github/workflows/azure-webapps.yml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "ERROR: Archivo requerido faltante: $file"
        exit 1
    fi
done

echo "✓ Estructura validada"

echo "=== Preparando commit y push ==="
git add .
if git diff --staged --quiet; then
    echo "No hay cambios para commitear"
else
    git commit -m "$COMMIT_MESSAGE"
    echo "✓ Commit creado con mensaje: $COMMIT_MESSAGE"
fi

echo "=== Push a Git ==="
git push origin main
echo "✓ Push completado. Pipeline de GitHub Actions debería iniciarse."

echo "=== Monitoreo del pipeline ==="
# Esperar un poco para que el run aparezca
sleep 10

# Obtener el último run
RUN_ID=$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
if [ -z "$RUN_ID" ]; then
    echo "ERROR: No se encontró ningún run reciente"
    exit 1
fi

echo "Monitoreando run ID: $RUN_ID"
while true; do
    STATUS=$(gh run view $RUN_ID --json status --jq '.status')
    CONCLUSION=$(gh run view $RUN_ID --json conclusion --jq '.conclusion')
    echo "Estado: $STATUS, Conclusión: $CONCLUSION"
    if [ "$STATUS" = "completed" ]; then
        if [ "$CONCLUSION" = "success" ]; then
            echo "✓ Pipeline completado exitosamente"
            break
        else
            echo "ERROR: Pipeline falló con conclusión: $CONCLUSION"
            exit 1
        fi
    fi
    sleep 30
done

echo "=== Validando imagen en App Service ==="
IMAGE_CONFIG=$(az webapp config show --resource-group devops-analyzer-rg --name devops-analyzer-web --query linuxFxVersion -o tsv)
if [[ $IMAGE_CONFIG == DOCKER|devopsanalyzeracr.azurecr.io/devops-analyzer:* ]]; then
    echo "✓ Imagen configurada correctamente: $IMAGE_CONFIG"
else
    echo "ERROR: Imagen no configurada correctamente: $IMAGE_CONFIG"
    exit 1
fi

echo "=== Validando health del App Service ==="
APP_URL="https://devops-analyzer-web.azurewebsites.net/health"
echo "Verificando $APP_URL"
for i in {1..10}; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL" || true)
    echo "Intento $i: $status"
    if [ "$status" = "200" ]; then
        echo "✓ App Service healthy"
        break
    fi
    sleep 6
done
if [ "$status" != "200" ]; then
    echo "ERROR: Health check falló"
    exit 1
fi

echo "=== Deploy completado exitosamente ==="