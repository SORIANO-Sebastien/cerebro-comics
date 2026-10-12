#!/bin/sh
# ==============================================================================
# Script de synchronisation manuelle du catalogue comics (Linux)
# ==============================================================================
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
    echo "❌ Erreur : Node.js n'est pas installé."
    exit 1
fi

echo "🔄 Lancement de la synchronisation du catalogue comics..."
node sync_catalog.js
