# 🚀 CollabBoard

Éditeur de texte collaboratif en temps réel avec Socket.IO et Redis.

## ✨ Fonctionnalités

- 📝 Édition collaborative en temps réel
- 🏠 Rooms multiples et isolation
- 🔄 Synchronisation multi-instances avec Redis
- 🔐 Authentification par tokens
- 👥 Indicateurs de frappe et présence
- 📊 Monitoring en temps réel

## 🚀 Installation rapide

```bash
# 1. Cloner et installer
git clone <repo>
cd editeur_collaboratif
npm install

# 2. Démarrer Redis
docker run -d --name my-redis -p 6379:6379 redis

# 3. Lancer l'application
npm run dev:redis      # Développement avec Redis
npm run start:both     # Deux instances
npm test:redis         # Test connexion Redis