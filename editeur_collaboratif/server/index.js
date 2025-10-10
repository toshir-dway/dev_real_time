const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configuration
const PORT = process.env.PORT || 3000;

// Stockage en mémoire
const connectedUsers = new Map(); // socket.id -> userInfo
const rooms = new Map(); // roomName -> { users: Set, content: string }
const validTokens = new Set(['12345', 'collab2024', 'secret123']); // Tokens valides

// Middleware
app.use(express.static(path.join(__dirname, '../client')));
app.use(express.json());

// Monitoring
let eventsPerMinute = 0;
let activeConnections = 0;

// Reset du compteur d'événements chaque minute
setInterval(() => {
    console.log(`[STATS] Événements cette minute: ${eventsPerMinute}`);
    eventsPerMinute = 0;
}, 60000);

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Endpoint de statut
app.get('/status', (req, res) => {
    const activeRooms = Array.from(rooms.entries()).map(([name, room]) => ({
        name,
        userCount: room.users.size,
        users: Array.from(room.users).map(socketId => connectedUsers.get(socketId)?.username || 'Unknown')
    }));

    res.json({
        activeConnections,
        eventsPerMinute,
        activeRooms,
        totalUsers: connectedUsers.size
    });
});

// Middleware d'authentification Socket.IO
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const username = socket.handshake.auth.username;
    const room = socket.handshake.auth.room;

    if (!token || !validTokens.has(token)) {
        return next(new Error('Token invalide'));
    }

    if (!username || username.trim().length < 2) {
        return next(new Error('Nom d\'utilisateur invalide'));
    }

    if (!room || room.trim().length === 0) {
        return next(new Error('Room invalide'));
    }

    next();
});

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
    activeConnections++;
    eventsPerMinute++;
    
    const { username, room, token } = socket.handshake.auth;
    const userRoom = room.trim();
    const userInfo = { 
        id: socket.id, 
        username: username.trim(), 
        room: userRoom,
        joinedAt: new Date()
    };

    // Initialiser la room si elle n'existe pas
    if (!rooms.has(userRoom)) {
        rooms.set(userRoom, { 
            users: new Set(), 
            content: '',
            createdAt: new Date()
        });
    }

    // Ajouter l'utilisateur à la room
    rooms.get(userRoom).users.add(socket.id);
    connectedUsers.set(socket.id, userInfo);

    // Rejoindre la room Socket.IO
    socket.join(userRoom);

    console.log(`👤 ${username} a rejoint la room ${userRoom} (${socket.id})`);
    console.log(`📊 Connexions actives: ${activeConnections}, Rooms actives: ${rooms.size}`);

    // Notifier les autres utilisateurs de l'arrivée
    socket.to(userRoom).emit('notification', {
        type: 'user_joined',
        username: userInfo.username,
        message: `${userInfo.username} a rejoint la session`,
        timestamp: new Date(),
        users: getRoomUsers(userRoom)
    });

    // Envoyer le contenu actuel au nouveau utilisateur
    const roomData = rooms.get(userRoom);
    socket.emit('content_update', {
        content: roomData.content,
        user: 'system'
    });

    // Envoyer la liste des utilisateurs
    socket.emit('users_update', getRoomUsers(userRoom));

    // Gestion des modifications de contenu
    socket.on('content_change', (data) => {
        eventsPerMinute++;
        
        if (!connectedUsers.has(socket.id)) {
            socket.emit('error', { message: 'Utilisateur non authentifié' });
            return;
        }

        const user = connectedUsers.get(socket.id);
        const roomData = rooms.get(user.room);

        if (roomData && data.content !== undefined) {
            // Vérifier si le contenu a vraiment changé
            if (data.content === roomData.content) {
                return; // Ignorer si le contenu est identique
            }

            // Mettre à jour le contenu de la room
            roomData.content = data.content;

            // Diffuser la mise à jour à tous les utilisateurs de la room (sauf l'émetteur)
            socket.to(user.room).emit('content_update', {
                content: data.content,
                user: user.username,
                timestamp: new Date()
            });

            console.log(`📝 ${user.username} a modifié le contenu dans ${user.room}`);
        }
    });


    // Gestion du typing indicator
    socket.on('typing_start', () => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            socket.to(user.room).emit('user_typing', {
                username: user.username,
                isTyping: true
            });
        }
    });

    socket.on('typing_stop', () => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            socket.to(user.room).emit('user_typing', {
                username: user.username,
                isTyping: false
            });
        }
    });

    // Gestion des déconnexions
    socket.on('disconnect', (reason) => {
        activeConnections--;
        eventsPerMinute++;

        const user = connectedUsers.get(socket.id);
        if (user) {
            const roomData = rooms.get(user.room);
            
            if (roomData) {
                roomData.users.delete(socket.id);
                
                // Supprimer la room si elle est vide
                if (roomData.users.size === 0) {
                    rooms.delete(user.room);
                    console.log(`🗑️ Room ${user.room} supprimée (plus d'utilisateurs)`);
                } else {
                    // Notifier les autres utilisateurs du départ
                    socket.to(user.room).emit('notification', {
                        type: 'user_left',
                        username: user.username,
                        message: `${user.username} a quitté la session`,
                        timestamp: new Date(),
                        users: getRoomUsers(user.room)
                    });
                }
            }

            connectedUsers.delete(socket.id);
            console.log(`👋 ${user.username} déconnecté (${reason})`);
            console.log(`📊 Connexions actives: ${activeConnections}, Rooms actives: ${rooms.size}`);
        }
    });

    // Gestion des erreurs
    socket.on('error', (error) => {
        console.error(`❌ Erreur Socket.IO pour ${socket.id}:`, error);
    });
});

// Fonction utilitaire pour obtenir les utilisateurs d'une room
function getRoomUsers(roomName) {
    const room = rooms.get(roomName);
    if (!room) return [];

    return Array.from(room.users)
        .map(socketId => connectedUsers.get(socketId))
        .filter(user => user !== undefined)
        .map(user => ({
            username: user.username,
            joinedAt: user.joinedAt
        }));
}

// Démarrage du serveur
server.listen(PORT, () => {
    console.log(`🚀 Serveur CollabBoard démarré sur le port ${PORT}`);
    console.log(`📊 Page de statut disponible sur: http://localhost:${PORT}/status`);
    console.log(`🔑 Tokens valides: ${Array.from(validTokens).join(', ')}`);
});