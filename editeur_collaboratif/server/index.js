const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configuration
const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const INSTANCE_ID = process.env.INSTANCE_ID || 'default';

console.log(`🏷️ Démarrage de l'instance: ${INSTANCE_ID}`);
console.log(`🔗 Tentative de connexion à Redis: ${REDIS_URL}`);

// Stockage en mémoire
const connectedUsers = new Map();
const rooms = new Map();
const validTokens = new Set(['12345', 'collab2024', 'secret123']);

// Middleware
app.use(express.static(path.join(__dirname, '../client')));
app.use(express.json());

// Initialisation de Redis avec meilleure gestion d'erreurs
async function initializeRedisAdapter() {
    try {
        console.log('🔄 Initialisation de Redis Adapter...');
        
        const pubClient = createClient({ 
            url: REDIS_URL,
            socket: {
                reconnectStrategy: (retries) => {
                    console.log(`🔄 Tentative de reconnexion Redis #${retries}`);
                    return Math.min(retries * 100, 3000);
                }
            }
        });

        const subClient = pubClient.duplicate();

        // Gestion des événements Redis
        pubClient.on('connect', () => {
            console.log('✅ Connecté à Redis (Pub)');
        });

        pubClient.on('error', (err) => {
            console.error('❌ Erreur Redis Pub Client:', err.message);
        });

        subClient.on('connect', () => {
            console.log('✅ Connecté à Redis (Sub)');
        });

        subClient.on('error', (err) => {
            console.error('❌ Erreur Redis Sub Client:', err.message);
        });

        // Connexion avec timeout
        const connectPromise = Promise.all([
            pubClient.connect().catch(err => { throw new Error(`Pub: ${err.message}`); }),
            subClient.connect().catch(err => { throw new Error(`Sub: ${err.message}`); })
        ]);

        // Timeout de 5 secondes pour la connexion Redis
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout de connexion Redis')), 5000);
        });

        await Promise.race([connectPromise, timeoutPromise]);
        
        io.adapter(createAdapter(pubClient, subClient));
        console.log('✅ Redis Adapter configuré avec succès');

        // Événements de monitoring Redis
        io.of("/").adapter.on("create-room", (room) => {
            console.log(`🆕 Room créée via Redis: ${room}`);
        });

        io.of("/").adapter.on("delete-room", (room) => {
            console.log(`🗑️ Room supprimée via Redis: ${room}`);
        });

    } catch (error) {
        console.error('❌ Impossible d\'initialiser Redis Adapter:', error.message);
        console.log('🔄 Utilisation du adapter par défaut (mémoire locale)');
        console.log('💡 Vérifiez que Redis est démarré: docker run -d -p 6379:6379 --name my-redis redis');
    }
}

// Routes (reste inchangé)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/status', (req, res) => {
    const activeRooms = Array.from(rooms.entries()).map(([name, room]) => ({
        name,
        userCount: room.users.size,
        users: Array.from(room.users).map(socketId => ({
            id: socketId,
            username: connectedUsers.get(socketId)?.username || 'Unknown'
        }))
    }));

    res.json({
        instance: INSTANCE_ID,
        port: PORT,
        activeConnections: connectedUsers.size,
        activeRooms: rooms.size,
        redis: {
            adapter: io.of("/").adapter.constructor.name,
            connected: io.of("/").adapter.constructor.name.includes('Redis')
        },
        timestamp: new Date().toISOString()
    });
});

// Middleware d'authentification Socket.IO (reste inchangé)
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

// Gestion des connexions Socket.IO (reste inchangé)
io.on('connection', (socket) => {
    const { username, room, token } = socket.handshake.auth;
    const userRoom = room.trim();
    const userInfo = { 
        id: socket.id, 
        username: username.trim(), 
        room: userRoom,
        joinedAt: new Date(),
        instance: INSTANCE_ID
    };

    // Initialiser la room si elle n'existe pas
    if (!rooms.has(userRoom)) {
        rooms.set(userRoom, { 
            users: new Set(), 
            content: '',
            createdAt: new Date()
        });
    }

    rooms.get(userRoom).users.add(socket.id);
    connectedUsers.set(socket.id, userInfo);

    socket.join(userRoom);

    console.log(`👤 [${INSTANCE_ID}] ${username} a rejoint ${userRoom}`);

    // Notifier les autres utilisateurs
    socket.to(userRoom).emit('notification', {
        type: 'user_joined',
        username: userInfo.username,
        message: `${userInfo.username} a rejoint la session (${INSTANCE_ID})`,
        timestamp: new Date(),
        users: getRoomUsers(userRoom)
    });

    // Envoyer le contenu actuel
    const roomData = rooms.get(userRoom);
    socket.emit('content_update', {
        content: roomData.content,
        user: 'system'
    });

    socket.emit('users_update', getRoomUsers(userRoom));

    // Gestion des modifications de contenu
    socket.on('content_change', (data) => {
        if (!connectedUsers.has(socket.id)) return;

        const user = connectedUsers.get(socket.id);
        const roomData = rooms.get(user.room);

        if (roomData && data.content !== undefined && data.content !== roomData.content) {
            roomData.content = data.content;
            
            socket.to(user.room).emit('content_update', {
                content: data.content,
                user: user.username,
                timestamp: new Date()
            });

            console.log(`📝 [${INSTANCE_ID}] ${user.username} a modifié ${user.room}`);
        }
    });

    // Gestion des déconnexions
    socket.on('disconnect', () => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            const roomData = rooms.get(user.room);
            if (roomData) {
                roomData.users.delete(socket.id);
                
                if (roomData.users.size === 0) {
                    rooms.delete(user.room);
                } else {
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
            console.log(`👋 [${INSTANCE_ID}] ${user.username} déconnecté`);
        }
    });
});

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

// Démarrer le serveur
async function startServer() {
    await initializeRedisAdapter();
    
    server.listen(PORT, () => {
        console.log(`🚀 Instance ${INSTANCE_ID} démarrée sur http://localhost:${PORT}`);
        console.log(`📊 Statut: http://localhost:${PORT}/status`);
    });
}

startServer().catch(console.error);