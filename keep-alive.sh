#!/bin/bash
# keep-alive.sh - Ping a Supabase cada hora para evitar que la DB free se pausa

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: No se encontro ${ENV_FILE}"
  exit 1
fi

SUPABASE_URL=$(grep '^SUPABASE_URL=' "$ENV_FILE" | cut -d'=' -f2-)
SUPABASE_ANON_KEY=$(grep '^SUPABASE_ANON_KEY=' "$ENV_FILE" | cut -d'=' -f2-)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "Error: SUPABASE_URL o SUPABASE_ANON_KEY no encontrados en ${ENV_FILE}"
  exit 1
fi

echo "Supabase keep-alive iniciado. URL: ${SUPABASE_URL}"
echo "Ping cada 3600 segundos (1 hora). Presiona Ctrl+C para detener."

while true; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    "${SUPABASE_URL}/rest/v1/accounts?select=id&limit=1")

  if [ "$RESPONSE" -ge 200 ] && [ "$RESPONSE" -lt 300 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Ping OK (HTTP ${RESPONSE})"
  else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Ping fallo (HTTP ${RESPONSE})"
  fi

  sleep 3600
done
