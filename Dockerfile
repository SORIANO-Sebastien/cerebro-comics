# ==============================================================================
# Comics & BD Manager Pro - Production Dockerfile
# Multi-architecture: linux/amd64 (OVH bare metal / Proxmox) & linux/arm64 (Raspberry Pi)
# ==============================================================================
FROM node:20-alpine

# Métadonnées Open Containers Initiative (OCI) pour GitHub Container Registry
LABEL org.opencontainers.image.title="Comics & BD Manager Pro" \
      org.opencontainers.image.description="Gestionnaire ultime de collection BD, Marvel & DC Comics avec PWA, Authentik OIDC et scan brocante" \
      org.opencontainers.image.source="https://github.com" \
      org.opencontainers.image.licenses="MIT"

# Répertoire applicatif
WORKDIR /app

# Variables d'environnement de production
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

# Copie de l'application
COPY . /app

# Création du dossier data et des collections s'ils n'existent pas
RUN mkdir -p /app/data/user_collections

# Exposition du port HTTP
EXPOSE 8080

# Volume de persistance des données utilisateur et paramètres
VOLUME ["/app/data"]

# Healthcheck de surveillance
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/api/settings/public || exit 1

# Lancement du serveur Node.js natif (zéro dépendance externe)
CMD ["node", "serveur_reseau.js"]
