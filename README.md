# Taxi Express

A modern taxi booking and management application.

## Structure du projet (Monorepo)

Ce projet suit une architecture monorepo avec une séparation claire entre le backend et les frontends :

```text
/
├── backend/           # Code serveur Node.js/Express
│   └── src/           # Code source du backend
│       └── server.js  # Serveur principal
├── frontend-web/      # Application web React
│   └── package.json   # Dépendances spécifiques au frontend web
├── frontend-mobile/   # Application mobile React Native
│   └── package.json   # Dépendances spécifiques au frontend mobile
├── index.js           # Point d'entrée principal pour le déploiement
├── package.json       # Configuration du backend (racine du projet)
├── .env               # Variables d'environnement
├── .gitignore         # Fichiers ignorés par Git
├── Procfile           # Configuration pour Heroku
├── railway.json       # Configuration pour Railway
└── scripts/           # Scripts utilitaires
```

## Getting Started

Instructions for setting up and running the project will be added here.

## Déploiement cloud

Le projet est structuré comme un monorepo propre pour garantir une compatibilité optimale avec les plateformes de déploiement comme Railway, Render et Heroku :

### Structure de déploiement

- **Point d'entrée unique** : Le fichier `index.js` à la racine sert de point d'entrée principal pour toutes les plateformes de déploiement.

- **Configuration package.json unifiée** : Un seul fichier `package.json` à la racine du projet qui :
  - Définit `"main": "index.js"` comme point d'entrée
  - Utilise `"start": "node index.js"` comme script de démarrage
  - Contient toutes les dépendances nécessaires au backend

- **Procfile standardisé** : Un seul Procfile à la racine avec la commande `web: node index.js`.

- **Configuration Railway** : Le fichier `railway.json` à la racine définit les commandes de build et de démarrage.

- **Séparation frontend/backend** : Les frontends (web et mobile) conservent leurs propres `package.json` pour gérer leurs dépendances spécifiques.

### Fonctionnement du déploiement

Le point d'entrée `index.js` est conçu pour :

1. Charger les variables d'environnement via dotenv
2. Importer l'application principale depuis `./backend/src/server.js`
3. Fournir un serveur de secours en cas d'échec de chargement du serveur principal

### Vérification du déploiement

Une fois déployée, l'API devrait répondre à l'endpoint GET / avec le message "Taxi Express API is running", confirmant le succès du déploiement.

### Notes importantes

- Cette structure monorepo est **impérative** pour le bon fonctionnement avec Railway/Nixpacks, Render et Heroku.
- Ne pas créer de fichiers de configuration en double dans les sous-dossiers.
- Toujours déployer depuis la racine du projet, pas depuis un sous-dossier.
- Les variables d'environnement doivent être configurées sur la plateforme de déploiement selon le modèle du fichier `.env.example`.

## License

This project is licensed under the terms of the MIT license.
