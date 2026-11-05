#!/usr/bin/env sh
set -eu

DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$DIR"

if [ -d "$HOME/.nvm/versions/node" ]; then
  LATEST_NVM="$(ls -1 "$HOME/.nvm/versions/node" 2>/dev/null | tail -n 1 || true)"
  if [ -n "$LATEST_NVM" ]; then
    PATH="$HOME/.nvm/versions/node/$LATEST_NVM/bin:$PATH"
  fi
fi
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$HOME/.local/share/fnm/aliases/default/bin:$PATH"

echo "========================================================"
echo "       INICIANDO PROYECTOR LLDM PARA OBS STUDIO"
echo "========================================================"

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "[ERROR] No se encontro Node.js instalado en esta computadora."
  echo "Por favor descarga e instala Node.js (LTS) desde: https://nodejs.org/"
  echo ""
  printf "Presiona Enter para cerrar..."
  read -r _ || true
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo ""
  echo "[PRIMERA VEZ] Instalando componentes necesarios automaticamente..."
  echo "Esto tomara solo unos segundos. Por favor espera..."
  echo ""
  if ! npm ci --omit=dev --ignore-scripts; then
    echo "[ERROR] No se pudieron instalar los componentes. Revisa internet y vuelve a abrir este archivo."
    printf "Presiona Enter para cerrar..."
    read -r _ || true
    exit 1
  fi
fi

export PROYECTOR_OPEN_BROWSER=1
node server.js
