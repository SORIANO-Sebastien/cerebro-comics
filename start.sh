#!/bin/sh
# ==============================================================================
# Script de lancement pour Linux (Debian / Ubuntu / Raspberry Pi / Alpine)
# ==============================================================================

# Se positionner dans le répertoire du script
cd "$(dirname "$0")" || exit 1

# Vérifier si Node.js est installé
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Erreur : Node.js n'est pas installé sur ce système."
    echo "💡 Installez-le avec : sudo apt install nodejs (Debian/Ubuntu/Raspberry Pi)"
    exit 1
fi

echo "==============================================================="
echo "🚀 Démarrage de Comics & BD Manager Pro sur Linux..."
echo "==============================================================="
echo "Node version : $(node -v)"
echo "Port d'écoute : ${PORT:-8080}"
echo "==============================================================="

# Lancement du serveur Node.js
exec node serveur_reseau.js
