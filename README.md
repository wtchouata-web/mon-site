# Rose Amour Cameroun 🌹🇨🇲
> **Version 1.2.2 — Stable & Production-Ready**

Rose Amour Cameroun est une plateforme web moderne et hautement sécurisée de catalogue privé d'hôtesses et d'accompagnatrices indépendantes au Cameroun. Elle intègre un système de gestion autonome de profils, des options de boost VIP premium avec paiement intégré via **CinetPay** (mobile money & cartes bancaires), ainsi qu'un chat en temps réel et un système d'appel RTC audio/vidéo sécurisé.

Ce projet utilise une architecture full-stack robuste, modulaire et optimisée : **React 19 (Vite) + Tailwind CSS v4 + Express + PostgreSQL (Drizzle ORM) + Socket.IO**.

---

## 🏗️ Architecture Technique & Sécurité

- **Frontend** : React 19 avec Vite, Tailwind CSS v4 (compilation ultra-rapide sans PostCSS), Motion pour des micro-animations fluides, et Lucid React pour les icônes.
- **Backend** : Serveur Express sous Node.js compilé sous forme de bundle unique CommonJS (`dist/server.cjs`) par `esbuild` pour des démarrages de conteneurs ultra-rapides.
- **Base de données** : PostgreSQL de production géré de façon type-safe via Drizzle ORM avec indexes optimisés et transactions SQL strictes pour toutes les opérations critiques (paiements, messages, statuts).
- **Temps réel** : Socket.IO avec passerelle anti-spam de blocage et limitation de bande passante (`SocketRateLimiter`), gestion de présence multi-appareils et indicateurs de saisie.
- **Sécurité DevSecOps** :
  - **Helmet** : En-têtes HTTP de sécurité renforcés.
  - **CORS** : Configuration stricte avec validation d'origine.
  - **Rate Limiters** : Limitation de débit sur l'API HTTP (`apiLimiter`) et sur Socket.IO pour bloquer les attaques par déni de service.
  - **JWT & Bcrypt** : Authentification stateless avec mot de passe hautement haché.
  - **Replay Protection** : Validation d'idempotence stricte pour éviter le double traitement des webhooks de paiement CinetPay.

---

## 🔑 Variables d'Environnement

Configurez les variables suivantes dans votre fichier `.env` à la racine (ou via le panneau d'administration de votre hébergeur comme Render) :

```env
# Port d'écoute du serveur
PORT=3000

# Clé de chiffrement JWT pour les sessions utilisateurs
JWT_SECRET=votre_cle_jwt_super_securisee

# Connexion PostgreSQL (Chaîne de connexion directe standard)
SQL_URL=postgresql://user:password@host:port/database?sslmode=require

# Configuration alternative si SQL_URL n'est pas fournie directement
SQL_USER=votre_utilisateur_db
SQL_PASSWORD=votre_mot_de_passe_db
SQL_HOST=votre_hote_db
SQL_PORT=5432
SQL_DB_NAME=rose_amour_db

# Moteur de Paiement Unique : CinetPay (Production)
CINETPAY_API_KEY=votre_cle_api_cinetpay_ici
CINETPAY_SITE_ID=votre_site_id_cinetpay_ici
CINETPAY_SECRET_KEY=votre_cle_secrete_cinetpay_pour_les_webhooks
CINETPAY_NOTIFY_URL=https://votre-domaine.com/api/v2/payment/webhook/cinetpay
CINETPAY_RETURN_URL=https://votre-domaine.com/payment-return
```

> **💡 Mode Simulation (Bac à Sable / Dev)** : Si les clés `CINETPAY_API_KEY` et `CINETPAY_SITE_ID` ne sont pas configurées, l'application bascule automatiquement et de façon sécurisée en **mode simulation**, en redirigeant les paiements vers un simulateur de passerelle CinetPay local intégré (`/payment/cinetpay-sim`) afin de valider et tester l'activation des boosts et fiches sans utiliser d'argent réel.

---

## 🚀 Installation & Développement Local

### Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée)
- Un serveur [PostgreSQL](https://www.postgresql.org/) actif

### 1. Installation des dépendances
```bash
npm install
```

### 2. Démarrage en mode Développement (Vite HMR + Express Dev)
Le serveur Express démarre à l'adresse `http://localhost:3000` et gère simultanément les endpoints API, les sockets temps réel et les requêtes assets :
```bash
npm run dev
```

---

## 📦 Build & Démarrage en Production

Le build compile à la fois les fichiers statiques du catalogue React dans `dist/` et le serveur TypeScript d'arrière-plan dans un fichier de production unique `dist/server.cjs` à l'aide d'esbuild.

### 1. Compiler l'application
```bash
npm run build
```

### 2. Démarrer en mode Production
```bash
npm start
```

---

## 📂 Gestion de la Base de Données (Drizzle ORM)

### Synchronisation du schéma avec PostgreSQL (Push direct)
Idéal pour le déploiement rapide ou la mise à jour de la structure SQL :
```bash
npx drizzle-kit push
```

### Génération des fichiers de migration SQL
```bash
npx drizzle-kit generate
```

### Exécution des migrations SQL
```bash
npx drizzle-kit migrate
```

### Seeding ou Migration des anciennes données JSON vers SQL
Si vous possédez un fichier d'importation `rose-amour-db.json` à la racine, vous pouvez le migrer vers PostgreSQL avec :
```bash
node src/db/migrate-data.ts
```

---

## 📈 Guide de Déploiement

### 1. GitHub
Poussez le projet sur un dépôt GitHub privé ou public. Assurez-vous que le fichier `.gitignore` bloque l'envoi des dossiers `node_modules/`, `dist/`, et de vos fichiers `.env` contenant vos secrets de production.

### 2. Render
Déployez facilement l'application sur [Render.com](https://render.com) en tant que **Web Service** :

- **Runtime** : `Node`
- **Build Command** : `npm install && npm run build`
- **Start Command** : `npm start`
- **Variables d'environnement** : Configurez `SQL_URL`, `JWT_SECRET`, et vos clés `CINETPAY_*` dans le panneau **Environment** du service Render.
- **Port** : L'infrastructure de Render détectera automatiquement l'écoute du port `3000` ou injectera la variable d'environnement `PORT`.

---

## 🔗 Intégration WordPress (Plugin inclus)

Le fichier `rose-amour-wp-plugin.php` présent à la racine est un plugin de pont d'intégration WordPress complet.
Il permet de :
1. Déclarer un Custom Post Type personnalisé `rose_amour_profile` dans la base MySQL de WordPress pour y stocker les profils réels d'hôtesses.
2. Ouvrir des routes API REST sécurisées (`/wp-json/rose-amour/v1/profiles`) lues par l'application React.
3. Afficher le catalogue React de façon fluide sur n'importe quelle page WordPress à l'aide du shortcode `[rose_amour_catalog]`.
4. Injecter dynamiquement les scripts et fichiers CSS compilés par Vite tout en gérant le cache du navigateur.

---

## 🛠️ Commandes Utiles de Maintenance

| Commande | Action |
| :--- | :--- |
| `npm install` | Installe proprement les dépendances. |
| `npm run lint` | Valide la syntaxe et la cohérence des types TypeScript. |
| `npm run build` | Compile le frontend React et bundle le serveur backend pour la production. |
| `npm start` | Lance le serveur web de production haute performance. |
| `npm run clean` | Supprime les répertoires de compilation temporaires. |
| `npx drizzle-kit studio` | Démarre une interface d'administration visuelle pour explorer votre base PostgreSQL. |
