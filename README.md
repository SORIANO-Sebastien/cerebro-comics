# ⚡ Comics & BD Manager Pro

> **Le gestionnaire ultime de collection BD, Marvel Panini Comics, DC Comics & Mangas**  
> *100% Hors-ligne & PWA Mobile • Scan Caméra & Rafale • Radar de Sorties • Anti-Doublon Brocante • Détection Automatique des Collections • Synchro Cloud Google Drive*

---

## 📑 Sommaire

1. [🌟 Présentation](#-présentation)
2. [🚀 Démarrage Rapide sur PC](#-démarrage-rapide-sur-pc)
3. [📱 Installation sur Smartphone (PWA Android & iOS)](#-installation-sur-smartphone-pwa-android--ios)
4. [✨ Fonctionnalités Majeures](#-fonctionnalités-majeures)
   - [Comptes, Rôle Admin & Authentik (OpenID Connect)](#-comptes-rôle-admin--authentik-openid-connect)
   - [Bibliothèques Familiales & Cadeaux (« Ce qu'il lui manque »)](#-bibliothèques-familiales--cadeaux-ce-quil-lui-manque)
   - [Panneau d'Administration & Clés API](#-panneau-dadministration--clés-api)
   - [Brocante & Anti-Doublon Express](#-mode-brocante--magasin-doccasion-anti-doublon-express)
   - [Planning des Sorties & Nouveautés](#-planning-des-sorties--radar-des-éditeurs)
   - [Emplacement Physique dans la Pièce](#-emplacement-physique-dans-la-pièce-où-est-rangé-ce-livre-)
   - [Scanner Code-Barres & Mode Rafale](#-scanner-code-barres--mode-scan-en-rafale)
   - [Assistant Comics IA](#-assistant-comics-ia)
   - [Synchronisation Cloud Google Drive](#-synchronisation-cloud-google-drive)
   - [Détection Automatique des Collections](#-détection-automatique-des-collections)
   - [Ordres de Lecture & Frises Chronologiques](#-ordres-de-lecture--frises-chronologiques)
   - [Tranches 3D, Détecteur de Manquants, Variantes & Étiquettes](#-autres-outils-de-gestion)
5. [💾 Sauvegardes, Exports & Impression](#-sauvegardes-exports--impression)
6. [🛠️ Architecture & Fichiers du Projet](#️-architecture--fichiers-du-projet)
7. [🐧 Déploiement Linux, Proxmox & Docker](#-déploiement-linux-proxmox--docker)
8. [❓ Foire Aux Questions (FAQ)](#-foire-aux-questions-faq)

---

## 🌟 Présentation

**Comics & BD Manager Pro** est une application web moderne, autonome et responsive, conçue spécialement pour les passionnés et collectionneurs de bandes dessinées et de comics en France.

* **Aucune installation lourde requise** : fonctionne directement dans n'importe quel navigateur web moderne (Chrome, Edge, Firefox, Safari).
* **Multi-supports instantané** : utilisable sur PC, Mac, tablettes et smartphones avec une interface adaptée à toutes les résolutions.
* **Respect de la vie privée & Stockage local** : toutes vos données sont stockées en priorité sur votre appareil (`localStorage`), sans dépendance obligatoire à un serveur tiers.
* **Catalogue exhaustif pré-intégré** : plus de **1 700+ albums récents et cultes** (Panini Marvel, Urban DC, Star Wars, Indés) avec métadonnées officielles, prix neufs éditeurs et couvertures Haute Définition.

---

## 🚀 Démarrage Rapide sur PC

### Option 1 : En 1 clic (Recommandé)
Double-cliquez simplement sur **`lancer_appli.bat`** (ou ouvrez directement `AppliBD.html` / `index.html`). L'application se lance immédiatement dans votre navigateur par défaut.

### Option 2 : Mode Application Dédiée (PWA Windows)
1. Lancez le serveur local via **`lancer_serveur_pwa.bat`** et ouvrez `http://localhost:8080`.
2. Dans Google Chrome ou Microsoft Edge, cliquez sur le bouton **« 📲 Installer l'App »** dans la barre supérieure (ou sur l'icône d'écran à droite dans la barre d'adresse).
3. L'application s'ouvre désormais dans sa propre fenêtre indépendante, avec son icône dans la barre des tâches Windows !

---

## 📱 Installation sur Smartphone (PWA Android & iOS)

Pour emmener votre collection dans votre poche en brocante, librairie ou convention :

### Étape 1 : Activer le serveur local Wi-Fi sur votre PC
1. Lancez **`lancer_serveur_pwa.bat`**.
2. La console affiche votre adresse réseau locale (ex. : `http://192.168.1.35:8080`).

### Étape 2 : Se connecter depuis le smartphone
1. Connectez votre smartphone au **même réseau Wi-Fi** que votre PC.
2. Ouvrez Chrome (Android) ou Safari (iPhone) et tapez l'adresse IP affichée (ex. `http://192.168.1.35:8080`).

### Étape 3 : Installer sur l'écran d'accueil
* **Sur Android (Chrome / Brave / Edge) :**
  Appuyez sur le menu (les 3 points `⋮` en haut à droite) ➔ **« Installer l'application »** (ou *« Ajouter à l'écran d'accueil »*).
* **Sur iPhone / iPad (Safari) :**
  Appuyez sur l'icône de partage `📤` (en bas au centre) ➔ faites défiler ➔ **« Sur l'écran d'accueil »** (`+`).

L'application s'affiche maintenant en **plein écran sans barre d'adresse**, exactement comme une application native téléchargée sur l'App Store ou le Play Store !

---

## ✨ Fonctionnalités Majeures

### 👑 Comptes, Rôle Admin & Authentik (OpenID Connect)

> Accessible via le bouton **`🔑 Connexion`** / **`👑 Configurer Admin`** dans l'en-tête.

L'application intègre désormais un système d'authentification robuste et multi-utilisateurs :
* **Règle du Premier Compte (Super Administrateur) :**
  * Dès le premier lancement, l'application détecte qu'aucun compte n'existe encore.
  * **Le tout premier compte enregistré devient automatiquement le Super Administrateur (`role: "admin"`)**.
  * Les comptes créés ultérieurement sont de simples membres (`role: "user"`), sauf si l'administrateur décide de les promouvoir.
* **Connexion Classique Identifiant / Mot de passe :**
  * Hachage sécurisé avec sel via l'algorithme `scrypt` natif de Node.js (aucune dépendance externe requise).
  * Gestion de session avec jetons sécurisés et persistance automatique.
* **🛡️ Compatibilité Authentik & Fournisseurs OpenID Connect (SSO) :**
  * Intégration native avec **Authentik** (ainsi que Keycloak, Authelia, Google Workspace, etc.).
  * Flux complet Authorization Code avec découverte automatique `/.well-known/openid-configuration`, échange de token sécurisé et synchronisation du profil utilisateur.
  * Bouton direct **« 🛡️ Se connecter avec Authentik »** sur la page de connexion.
* **Collection Personnelle par Utilisateur :**
  * Chaque utilisateur possède sa propre collection isolée sur le serveur (`data/user_collections/<userId>.json`).
  * En se connectant sur smartphone, tablette ou PC, l'utilisateur retrouve instantanément l'ensemble de ses albums !

---

### 👥 Bibliothèques Familiales & Cadeaux (« Ce qu'il lui manque »)

> Accessible en un clic via le bouton **`👥 Famille & Amis`** dans l'en-tête.

Conçu spécialement pour les proches et parents qui achètent régulièrement des comics et veulent éviter les doublons :
* **Consultation d'une autre collection en un clic :**
  * Choisissez le membre de votre famille (ex: *Titou*) pour charger instantanément toute sa collection en mode consultation sécurisé.
  * Un bandeau ambre indique clairement la collection consultée, son total d'albums et son nombre d'envies en Wishlist.
* **🎁 Mode Shopping & Cadeaux (« Ce qu'il lui manque ») :**
  * Cliquez sur le bouton **`🎁 Ce qu'il lui manque`** devant un membre : l'application ouvre directement le **Mode Brocante** configuré sur la collection de ce proche !
  * **Onglet Tomes Manquants :** L'application liste série par série tous les tomes que ce proche ne possède pas encore (ex: *Spider-Man : tomes 3 et 5 manquants*) pour savoir exactement quoi acheter en librairie ou brocante.
  * **Onglet Wishlist :** Consultez ses souhaits d'achats prioritaires avec couvertures et prix neufs officiels.
  * **Recherche & Scan Anti-Doublon :** En magasin, tapez le titre ou scannez le code-barres d'un livre :
    * 🟩 **VERT** : *Déjà possédé par ce proche* (Ne pas acheter !).
    * 🟧 **ORANGE** : *Dans sa Wishlist* (À lui offrir en priorité !).
    * 🟦 **BLEU** : *Absent de sa collection* (Idée de cadeau sans risque de doublon !).
* **Retour instantané :**
  * Un simple clic sur **`✕ Revenir à ma collection`** restaure votre propre bibliothèque en mémoire.

---

### ⚙️ Panneau d'Administration & Clés API

> Accessible exclusivement aux administrateurs via le bouton doré **`👑 Admin`** ou le menu profil.

Le Panneau d'Administration centralise tous les paramètres avancés et sensibles :
1. **⚙️ Paramètres Généraux & Clés API :**
   * **🔑 Clé API Google Gemini partagée :** Renseignez une seule fois votre clé API Google Gemini pour que **tous les utilisateurs connectés** bénéficient de l'Assistant IA expert et des recommandations sans avoir à créer de compte Google AI.
   * **Titre de l'application & Inscriptions :** Activez ou désactivez les inscriptions locales libres.
   * **Fréquence de synchronisation automatique :** Définissez l'intervalle de rafraîchissement automatique du catalogue en arrière-plan (par défaut 24h).
2. **🛡️ Configuration Authentik / OpenID Connect :**
   * Case à cocher pour activer/désactiver le bouton SSO Authentik.
   * Configuration intuitive : **Issuer URL**, **Client ID**, **Client Secret**.
   * Bouton **« 📋 Copier l'URI de Redirection »** pour coller en 1 clic l'URL exacte dans votre Provider Authentik (`http://<ip>:8080/api/auth/oidc/callback`).
   * Guide pas-à-pas d'intégration Authentik intégré dans la fenêtre.
3. **👥 Gestion Complète des Utilisateurs :**
   * Liste en direct de tous les comptes enregistrés avec leurs badges de rôle (`ADMIN` / `MEMBRE`), fournisseur (`Local` / `Authentik`) et nombre d'albums possédés.
   * **Promouvoir / Rétrograder :** Passez un membre en Administrateur ou inversement en un clic (avec sécurité empêchant de supprimer ou rétrograder le dernier admin).
   * **Réinitialiser le mot de passe :** Permet à l'administrateur de redéfinir le mot de passe d'un utilisateur en cas d'oubli.
   * **Créer des utilisateurs :** Formulaire dédié pour pré-créer des comptes pour vos proches.
   * **Suppression de compte :** Suppression sécurisée avec nettoyage de session.
4. **📊 Tableau de Bord Système & Synchronisation :**
   * Statistiques en direct : nombre de comptes, albums au catalogue (1 700+), collections surveillées (103+), uptime serveur et mémoire vive consommée.
   * Déclencheur manuel pour forcer une détection et synchro immédiate.

---

### 🏷️ Mode « Brocante & Magasin d'Occasion » (Anti-Doublon Express)

> Accessible en un clic via le bouton **`🏷️ Brocante`** en haut de l'écran.

Conçu spécialement pour les chineurs et acheteurs en magasin d'occasion :
* **Recherche Anti-Doublon Visuelle :**
  Tapez les premières lettres d'un titre ou scannez le code-barres d'une BD dans le bac :
  * 🟩 **VERT — DÉJÀ POSSÉDÉ** : Ne pas acheter ! L'album est déjà présent dans votre bibliothèque.
  * 🟧 **ORANGE — DANS MA WISHLIST** : À acheter en priorité ! L'album figure dans vos envies d'achat.
  * 🟦 **BLEU — NON POSSÉDÉ** : Absent de votre collection. Affiche la couverture HD, le prix neuf officiel et propose un bouton **« + Ajouter en 1 clic »** à votre collection ou en Wishlist.
* **⚠️ Tomes Manquants par Série :**
  Affiche automatiquement la liste des tomes qui manquent à vos séries en cours pour savoir exactement quel numéro chercher sans fouiller de mémoire.
* **❤️ Ma Wishlist :**
  Retrouvez instantanément tous vos albums désirés avec visuels et prix neufs indicatifs.

---

### 📅 Planning des Sorties & Radar des Éditeurs

> Accessible via le bouton **`📅 Sorties`** dans la barre d'action.

* **🎯 Radar « Mes Séries Suivies » :**
  L'application analyse intelligemment les séries et héros que vous possédez déjà (*Spider-Man*, *Batman*, *X-Men*, *Daredevil*, etc.) et vous alerte sur les tomes récents et à paraître. Un bouton **« ❤️ Wishlist »** permet de programmer ses achats en un clic.
* **🌐 Radar Global des Nouveautés :**
  Catalogue complet des sorties Panini Comics et Urban Comics pour 2025 et 2026, avec formats (*Omnibus, Deluxe, Must-Have, Nomades*), prix neufs officiels et dates de sortie.

---

### 📍 Emplacement Physique dans la Pièce (« Où est rangé ce livre ? »)

Ne cherchez plus jamais vos tomes dans vos bibliothèques :
* **Pastille visuelle violette** `📍 Kallax Salon B2` affichée directement sur la carte de chaque album dans la grille.
* **Filtre déroulant dédié** `📍 Tous les emplacements` dans la barre d'outils pour isoler en un clic tous les comics rangés dans un bac ou sur une étagère précise.
* **Autocomplétion intelligente** lors de la saisie (suggère vos étagères déjà enregistrées).
* **Changement d'emplacement express en 1 clic** directement depuis la vue détaillée d'un album.

---

### 📷 Scanner Code-Barres & Mode « Scan en Rafale »

* **Scan standard (1 par 1) :** Ouvre la caméra du smartphone ou de la webcam PC pour identifier l'ISBN et pré-remplir la fiche de l'album.
* **Mode « Scan en Rafale » (Continu) :** La caméra reste allumée en continu. Passez vos comics les uns après les autres : un bip sonore valide chaque détection et l'album s'enregistre automatiquement sans interruption ! Idéal pour cataloguer 30 BDs en 2 minutes.
* **Mode Photo Couverture Secours :** Si le code-barres est abîmé ou absent, prenez simplement une photo de la couverture pour la joindre à l'album.

---

### 🤖 Assistant Comics IA

> Accessible via le bouton **`🤖 Assistant IA`** en haut de l'écran.

Un conseiller virtuel expert en bandes dessinées et comics disponible à tout moment :
* **🎯 Conseils selon mes 5 étoiles :** Analyse vos albums préférés dans votre collection et vous suggère des chefs-d'œuvre incontournables du même registre.
* **🗺️ Ordre de lecture conseillé :** Vous guide à travers les grands événements complexes (*Civil War*, *Secret Wars*, *Flashpoint*, *Crisis*...).
* **🦸 Fiches Origines & Repères :** Résumés sans spoiler et meilleurs points d'entrée pour découvrir un personnage.
* **Double moteur d'intelligence :**
  1. *Mode Hors-ligne (Intégré)* : Base de connaissances locale experte sans aucune configuration.
  2. *Mode Cloud (Google Gemini)* : Vous pouvez renseigner votre clé API Google Gemini gratuite dans les Paramètres (`⚙️`) pour dialoguer librement avec l'IA et obtenir des réponses sur mesure.

---

### ☁️ Synchronisation Cloud Google Drive

> Accessible via le bouton **`☁️ Google Drive`** (ou *Synchronisation & Sauvegardes*).

* **Sauvegarde Cloud automatique :** Connectez votre compte Google en 1 clic (via Google Identity Services). Votre collection est enregistrée dans un fichier unique sécurisé `appli_bd_collection.json` sur votre espace personnel Google Drive.
* **Synchronisation transparente PC ↔ Mobile :** Tout ajout effectué sur PC ou smartphone se synchronise automatiquement.
* **Sécurité totale :** Vos données restent sous votre contrôle absolu sur votre Drive privé, protégées contre toute perte de cache ou changement d'appareil.

---

### ⚡ Détection Automatique des Collections

Le moteur de synchronisation autonome analyse en continu les parutions et les rayons éditeurs :
* **100% Automatique :** Cliquez sur **« 📚 Collections »** ➔ **« ⚡ Détecter Tout en Automatique »** pour scanner l'arborescence complète (Excalibur Comics, BnF, etc.) et découvrir plus de **103 collections officielles** (*Marvel Deluxe, Omnibus, Epic Collection, Must-Have, DC Infinite, Black Label, Carrefour, etc.*).
* **Tâche de fond quotidienne :** Lorsque le serveur réseau tourne, une vérification automatique silencieuse est exécutée toutes les 24 heures.
* **Ajout manuel simplifié :** Possibilité d'ajouter des rayons personnalisés ou des opérations promotionnelles directement via l'interface ou dans `collections_config.json`.

---

### 🗺️ Ordres de Lecture & Frises Chronologiques

* Onglet dédié **« 🗺️ Chronologies & Événements »** traçant les grands arcs narratifs Marvel et DC.
* Coche verte automatique `✓` sur les tomes que vous possédez déjà pour visualiser l'avancement de votre saga en un coup d'œil.

---

### 📚 Autres Outils de Gestion

| Outil | Description |
| :--- | :--- |
| **🧱 Tranches 3D** | Affichage immersif simulant les tranches de vos tomes sur des étagères en bois réalistes. |
| **🎲 Que lire ce soir ?** | Sélecteur aléatoire animé avec filtres (*Non lus uniquement*, *Marvel*, *DC*, *Tous*) pour choisir sa lecture du jour. |
| **📊 Infographies & Stats** | Graphiques interactifs sur vos héros favoris, vos auteurs les plus lus et la valeur financière de votre collection. |
| **💎 Variantes & Dédicaces** | Gestion des couvertures variantes, tirages limités numérotés et suivi des albums dédicacés avec dates et festivals. |
| **🤝 Suivi des Prêts** | Notez à qui vous avez confié vos albums pour ne plus jamais égarer un tome prêté. |
| **🏷️ Planche d'Étiquettes QR** | Génère une planche prête à imprimer d'étiquettes QR Codes individuelles pour vos pochettes de protection (*sleeves*). |

---

## 💾 Sauvegardes, Exports & Impression

Toutes ces options sont regroupées dans le menu **`☁️ Google Drive`** :
* **📄 Imprimer Catalogue / PDF illustré** : impression papier propre ou export PDF complet de votre bibliothèque.
* **🏷️ Planche Étiquettes QR Codes** : génère une grille prête à l'impression avec QR codes uniques par livre.
* **📊 Export Excel (CSV)** : export tableur compatible Excel, LibreOffice et Google Sheets.
* **⬇️ Sauvegarde JSON locale** : téléchargement instantané d'une copie de secours de votre fichier de données.
* **⬆️ Importer JSON** : restauration instantanée d'une sauvegarde précédente.

---

## 🛠️ Architecture & Fichiers du Projet

```text
AppliBD_Package_Complet/
│
├── AppliBD.html               # Application principale complète autonome
├── index.html                 # Copie miroir servie automatiquement par le serveur web
├── lancer_appli.bat           # Lanceur 1-clic pour ouvrir l'application sur PC
├── lancer_serveur_pwa.bat     # Démarre le serveur local Node.js pour smartphone/PWA
├── serveur_reseau.js          # Serveur HTTP local PWA, API auth, auto-discover & cron 24h
├── auth_system.js             # Moteur d'authentification, rôles, Authentik OIDC & sessions
├── sync_catalog.js            # Moteur de synchronisation et de scraping des collections
├── collections_config.json    # Configuration des 103+ collections détectées
├── all_comics_catalog.json    # Base de données locale de 1 700+ comics pré-remplis
├── data/                      # Données du serveur (users.json, settings.json, collections/)
├── manifest.json              # Métadonnées PWA (icônes, nom, couleurs)
├── sw.js                      # Service Worker pour le fonctionnement 100% hors-ligne
├── GUIDE_UTILISATION_COMPLET.txt # Guide d'utilisation textuel
└── README.md                  # Documentation technique et guide complet Markdown
```

---

---

## 🐧 Déploiement Production sur Serveur OVH (Docker & Traefik)

### 🏗️ Architecture Retenue

L'application est déployée directement sur votre serveur bare metal OVH aux côtés de **Traefik** (reverse proxy HTTPS) et **Authentik** (SSO OpenID Connect) :

* **Accès public HTTPS direct :** Accessible depuis n'importe quel smartphone en magasin ou brocante (`https://comics.votredomaine.fr`) sans dépendre de votre connexion Internet résidentielle.
* **Scan Caméra PWA opérationnel :** Le certificat SSL Let's Encrypt fourni par Traefik autorise l'accès caméra pour le scanner de codes-barres.
* **Authentik en réseau interne :** Échange instantané des jetons OIDC sur le réseau Docker partagé.

---

### 🚀 CI/CD Automatique avec GitHub Actions (`ghcr.io`)

Un workflow GitHub Actions complet est fourni dans **[`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml)** :

1. À chaque `git push` sur votre branche `main` (ou lors d'une release), GitHub Actions :
   * Construit automatiquement l'image Docker multi-architectures (`linux/amd64` pour votre serveur OVH et `linux/arm64`).
   * Publie l'image directement sur **GitHub Container Registry** (`ghcr.io/<votre-user>/comics-bd-manager:latest`).
   * Met en cache les couches Docker pour un build ultra-rapide (moins de 30 secondes).
2. Vous pouvez également déclencher la construction manuellement à tout moment depuis l'onglet **Actions** de votre dépôt GitHub (*Run workflow*).

---

### 🐳 Déploiement en 1 Clic sur le Serveur OVH

1. **Sur votre serveur OVH**, créez un dossier pour l'application :
   ```bash
   mkdir -p /opt/comics-manager && cd /opt/comics-manager
   ```
2. **Copiez le fichier `docker-compose.yml`** (et créez un fichier `.env` pour vos variables) :
   ```bash
   # Création du fichier .env
   cat << 'EOF' > .env
   COMICS_DOMAIN=comics.votredomaine.fr
   TRAEFIK_CERTRESOLVER=letsencrypt
   GHCR_IMAGE=votre-pseudo-github/comics-bd-manager
   EOF
   ```
3. **Lancez le conteneur :**
   ```bash
   # Si vous utilisez l'image GitHub Packages :
   docker compose pull && docker compose up -d

   # Ou si vous copiez les sources complètes et buildez sur place :
   docker compose up -d --build
   ```
4. Vos données utilisateurs, collections et clés API sont automatiquement sauvegardées sur l'hôte dans `./data`.

---

### 🛡️ Configuration Authentik sur OVH (2 minutes)

1. Dans votre interface **Authentik** :
   * Allez dans **Applications** ➔ **Providers** ➔ **Créer un Provider OAuth2/OpenID**.
   * Nom : `Comics Manager`
   * Type : `Confidentiel`
   * Redirect URI : `https://comics.votredomaine.fr/api/auth/oidc/callback`
   * Créez une **Application** liée à ce Provider.
2. Dans **Comics & BD Manager Pro** :
   * Connectez-vous avec votre premier compte (Super Admin).
   * Ouvrez le bouton doré **`👑 Admin`** ➔ Onglet **`🛡️ Authentik / OpenID`**.
   * Cochez *Activer la connexion Authentik*, collez l'**Issuer URL**, le **Client ID** et le **Client Secret**, puis enregistrez !

---

### 📦 Alternatives d'hébergement local (Proxmox / OMV)

Si vous souhaitez également exécuter une instance en local sur votre réseau Headscale :
* **Proxmox LXC :** Installez Node.js dans un conteneur LXC Debian 12 et activez le service `comics-manager.service` fourni.
* **Raspberry Pi 4 (OMV Argon SSD) :** Le Dockerfile est multi-arch et supporte nativement l'architecture ARM64 du Pi 4.

---

## ❓ Foire Aux Questions (FAQ)

#### Mes données sont-elles conservées si je ferme le navigateur ?
> **Oui.** Tout est enregistré instantanément dans le `localStorage` de votre navigateur. Si vous activez la synchronisation Google Drive, vos données sont également sauvegardées en continu sur votre Cloud.

#### L'application fonctionne-t-elle sans connexion Internet ?
> **Oui.** Grâce au Service Worker (`sw.js`) et au stockage local, l'application s'ouvre et s'utilise même sans connexion Internet.

#### Comment synchroniser entre mon PC et mon téléphone ?
> Activez **Google Drive** sur les deux appareils via le bouton `☁️ Google Drive`, ou utilisez le serveur local Wi-Fi (`lancer_serveur_pwa.bat`) pour accéder à la même instance depuis votre téléphone.

#### Comment obtenir une clé API Gemini pour l'Assistant IA ?
> L'assistant fonctionne déjà hors-ligne avec des conseils intégrés. Pour activer l'IA étendue, rendez-vous gratuitement sur [Google AI Studio](https://aistudio.google.com/), générez une clé API et collez-la dans les **Paramètres (`⚙️`)** de l'application.

---

*Fait avec passion pour les collectionneurs de BD & Comics.*
