# Chat Multi-Salons - README

Ce projet est une application de chat en temps réel multi-salons, basée sur Node.js, Socket.IO et Redis (avec Pub/Sub pour la scalabilité).

## Prérequis

- Node.js (v16+ recommandé)
- Docker (pour Redis)
- npm (pour installer les dépendances)

## Installation

1. Clonez le projet ou téléchargez les fichiers.
2. Installez les dépendances Node.js :
   ```
   npm install
   ```

## Lancement du serveur Redis

Le projet utilise Redis via Docker. Un script `.bat` est fourni pour automatiser le lancement du conteneur Redis et des serveurs Node.js.

- Pour tout réinitialiser et démarrer :
  ```
  double-cliquez sur start-chat.bat
  ```
  Ce script :
  - Arrête et supprime le conteneur Redis si il existe nommé `my-redis`
  - Crée et démarre un nouveau conteneur Redis sur le port 6379
  - Lance trois serveurs Node.js sur les ports 3000, 3001 et 3002
  - Ouvre automatiquement les trois instances dans votre navigateur

## Lancement manuel

Vous pouvez aussi lancer Redis et le serveur manuellement :

1. Démarrez Redis avec Docker :
   ```
   docker run --name my-redis -d -p 6379:6379 my-redis
   ```
2. Lancez le serveur Node.js sur le port de votre choix :
   ```
   node index.js 3000
   ```
   (Remplacez `3000` par le port désiré.)

## Utilisation

- Accédez à `http://localhost:3000/` (ou 3001, 3002).
- Entrez un pseudo et le nom du salon pour rejoindre.
- Discutez en temps réel avec les utilisateurs du même salon.
- La liste des utilisateurs et l’historique des messages sont synchronisés entre toutes les instances grâce à Redis.

## Arrêt

Pour arrêter tous les serveurs et le conteneur Redis :
```
docker stop my-redis
docker rm my-redis
```

---

Bon chat !