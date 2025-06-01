# Taxi Express

A modern taxi booking and management application.

## Project Structure

- `backend/` - Server-side code and API
- `docs/` - Documentation
- `frontend-mobile/` - Mobile application
- `frontend-web/` - Web application
- `scripts/` - Utility scripts

## Getting Started

Instructions for setting up and running the project will be added here.

## Déploiement cloud

Le projet est structuré pour être compatible avec les plateformes de déploiement comme Railway, Render et Heroku :

- **Point d'entrée unique** : Le fichier `index.js` à la racine sert de point d'entrée principal pour toutes les plateformes de déploiement.

- **Configuration package.json** : Le fichier `package.json` à la racine pointe vers `index.js` comme fichier principal et utilise la commande `node index.js` comme script de démarrage.

- **Procfile** : Inclus à la racine pour Heroku et autres plateformes compatibles, avec la commande `web: node index.js`.

- **Architecture adaptative** : Le point d'entrée `index.js` charge l'application principale depuis le dossier backend ou utilise un serveur de secours si nécessaire.

### Vérification du déploiement

Une fois déployée, l'API devrait répondre à l'endpoint GET / avec le message "Taxi Express API is running", confirmant le succès du déploiement.

### Notes importantes

Cette structure est **impérative** pour le bon fonctionnement avec Railway/Nixpacks, Render et Heroku. Ne pas modifier la structure des points d'entrée sans adapter les configurations de déploiement.

## License

This project is licensed under the terms of the MIT license.
