# Partie 1 – Théorie

## Question 1 – Les technologies temps réel

### Polling long
**Principe** : Le client envoie des requêtes HTTP périodiques au serveur. Le serveur retient la connexion jusqu'à ce qu'il ait des données nouvelles ou qu'un timeout soit atteint.

**Sens de communication** : Bidirectionnel asynchrone (client → serveur pour les requêtes, serveur → client pour les réponses)

**Avantages** :
- Compatible avec tous les navigateurs
- Simple à mettre en œuvre

**Limites** :
- Latence élevée
- Consommation importante de ressources
- Inefficace pour les applications très temps réel

**Cas d'usage** : Mise à jour de données peu fréquentes (ex: statut de commande)

### Server-Sent Events (SSE)
**Principe** : Connexion HTTP persistante unidirectionnelle où le serveur peut envoyer des messages au client spontanément.

**Sens de communication** : Unidirectionnel (serveur → client)

**Avantages** :
- Natif dans les navigateurs modernes
- Reconnexion automatique
- Protocole HTTP standard

**Limites** :
- Unidirectionnel seulement
- Limité au texte

**Cas d'usage** : Flux de notifications en temps réel (ex: fil d'actualités)

### WebSockets
**Principe** : Établit une connexion full-duplex persistante sur un socket TCP unique.

**Sens de communication** : Bidirectionnel

**Avantages** :
- Faible latence
- Communication bidirectionnelle
- Efficace pour les hautes fréquences

**Limites** :
- Plus complexe à mettre en œuvre
- Nécessite un proxy inverse compatible

**Cas d'usage** : Applications collaboratives (ex: éditeur de texte en temps réel)

---

## Question 2 – Les fondements de Socket.IO

### Namespaces
**Rôle** : Segmente l'application en différents points de terminaison logiques, permettant une séparation des préoccupations.

**Intérêt** : Évite les collisions entre différents modules de l'application.

**Exemple** :
```javascript
// Namespace pour le chat
const chatNamespace = io.of('/chat');
chatNamespace.on('connection', (socket) => {
    socket.emit('message', 'Bienvenue dans le chat');
});

// Namespace pour les notifications
const notificationNamespace = io.of('/notifications');
```

### Rooms
**Rôle** : Permet de regrouper des sockets au sein d'un namespace pour diffuser des messages à un sous-ensemble de clients.

**Intérêt** : Cible précisément des groupes d'utilisateurs.

**Exemple** :
```javascript
// Un utilisateur rejoint une salle de discussion
socket.join('room-123');
// Diffuser un message uniquement à cette salle
io.to('room-123').emit('new-message', 'Hello room!');
```

### Broadcast
**Rôle** : Envoie un message à tous les clients connectés sauf l'émetteur.

**Intérêt** : Notifie les autres utilisateurs sans inclure l'émetteur.

**Exemple** :
```javascript
socket.on('typing', () => {
    // Tous les autres utilisateurs voient que quelqu'un tape
    socket.broadcast.emit('user-typing', socket.id);
});
```

---

## Question 3 – Scalabilité et Redis Pub/Sub

### Problème de distribution des messages
Les messages émis depuis une instance ne peuvent pas atteindre tous les clients car chaque instance Socket.IO maintient ses propres connexions sans partager l'état avec les autres instances.

### Solution Redis Pub/Sub
Redis agit comme un bus de messages centralisé :
- Chaque instance s'abonne aux canaux Redis
- Quand une instance émet un message, elle le publie dans Redis
- Redis le redistribue à toutes les instances abonnées
- Chaque instance le diffuse à ses clients connectés

### Architecture Socket.IO + Redis Adapter
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client A  │    │   Client B  │    │   Client C  │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
┌──────┴──────────────────┴──────────────────┴──────┐
│               Load Balancer                       │
└──────┬──────────────────┬──────────────────┬──────┘
       │                  │                  │
┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐
│ Instance 1  │    │ Instance 2  │    │ Instance 3  │
│ Socket.IO   │    │ Socket.IO   │    │ Socket.IO   │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                 ┌────────┴────────┐
                 │   Redis Pub/Sub │
                 │    (Adapter)    │
                 └─────────────────┘
```

---

## Question 4 – Sécurité et Monitoring

### Risques de sécurité
1. **Attaques par déni de service** : Surcharge du serveur avec de nombreuses connexions
2. **Injection de messages** : Envoi de données malveillantes via les sockets
3. **Exposition de données sensibles** : Transmission non chiffrée d'informations confidentielles

### Bonnes pratiques de sécurité
1. **Validation des données** : Sanitizer tous les messages entrants côté serveur
2. **Authentification** : Implémenter JWT ou des tokens de session
3. **Chiffrement** : Utiliser WSS (WebSocket Secure) et TLS

### Métriques à surveiller
1. **Connexions simultanées** : Nombre de clients connectés
2. **Latence des messages** : Temps d'acheminement des messages
3. **Taux d'erreur** : Pourcentage de déconnexions anormales

### Outils de monitoring
- **Prometheus + Grafana** : Pour les métriques en temps réel
- **Console Socket.IO** : Pour le débogage en développement
- **Logs structurés** : Avec Elastic Stack (ELK) pour l'analyse

---

## Question 5 – Bonnes pratiques

### Côté serveur
1. **Utiliser Redis Adapter** pour la scalabilité horizontale
2. **Implémenter l'authentification** sur la connexion socket
3. **Valider et sanitizer** tous les messages entrants

### Côté client
4. **Gérer les déconnexions** avec des mécanismes de reconnexion automatique
5. **Optimiser la fréquence** d'envoi des messages pour éviter la surcharge

### Général
6. **Monitorer les performances** avec des métriques appropriées
7. **Utiliser le compression** pour réduire la taille des messages
8. **Mettre en place des timeouts** et heartbeats pour détecter les connexions mortes

### Développement
9. **Tester avec différents scénarios** de charge et de déconnexion
10. **Documenter les événements** et leur format pour maintenabilité