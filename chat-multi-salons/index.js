const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Redis = require('ioredis');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Connexion à Redis
const redis = new Redis(); // Par défaut : localhost:6379

// Exemple de test de connexion
redis.on('connect', () => {
  console.log('Connecté à Redis (ioredis)');
});
redis.on('error', (err) => {
  console.error('Erreur Redis:', err);
});

// Créer un client Redis dédié à la souscription
const redisSubscriber = new Redis();

// Souscription au canal 'chat_messages'
redisSubscriber.subscribe('chat_messages', (err, count) => {
  if (err) {
    console.error('Erreur de souscription Redis:', err);
  } else {
    console.log(`Souscrit au canal Redis 'chat_messages' (${count} canaux)`);
  }
});

// Écoute des messages du canal Redis et diffusion aux clients WebSocket locaux
redisSubscriber.on('message', (channel, message) => {
  if (channel === 'chat_messages') {
    try {
      const data = JSON.parse(message);
      // Diffuser le message à tous les clients du salon concerné
      io.to(data.room).emit('chat message', data);
    } catch (e) {
      console.error('Erreur lors du parsing du message Redis:', e);
    }
  }
});

// Servir le fichier index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Écoute des connexions Socket.IO
io.on('connection', (socket) => {
  console.log('Un utilisateur est connecté');

  socket.on('join room', async ({ username, room }) => {
    if (!room || !username) return; // Ignore if missing

    socket.join(room);
    socket.username = username;
    socket.room = room;

    // Add user to room list
    await redis.sadd(`users:${room}`, username);

    // Récupère la liste des utilisateurs du salon
    const users = await redis.smembers(`users:${room}`);
    io.to(room).emit('users list', users);

    // Get old messages from Redis
    let oldMessages = [];
    try {
      const msgs = await redis.lrange(`messages:${room}`, 0, -1);
      oldMessages = msgs.map(m => JSON.parse(m));
    } catch (e) {
      console.error('Erreur lors de la récupération des messages Redis:', e);
    }
    socket.emit('old messages', oldMessages);

    // Publish join notification
    redis.publish('chat_messages', JSON.stringify({
      type: 'room message',
      message: `${username} a rejoint le salon ${room}.`,
      room,
      username
    }));

    // Publish users list
    io.to(room).emit('users list', users);
    console.log(`${username} a rejoint le salon ${room}`);
  });

  socket.on('chat message', async ({ message, username, room }) => {
    if (!room || !username || !message) return;

    await redis.rpush(`messages:${room}`, JSON.stringify({
      type: 'chat message',
      message,
      username,
      room
    }));

    await redis.publish('chat_messages', JSON.stringify({
      type: 'chat message',
      message,
      username,
      room
    }));
  });

  socket.on('leave room', async ({ username, room }) => {
    if (!room || !username) return;

    socket.leave(room);
    await redis.srem(`users:${room}`, username);
    const users = await redis.smembers(`users:${room}`);
    io.to(room).emit('users list', users);

    await redis.publish('chat_messages', JSON.stringify({
      type: 'room message',
      message: `${username} a quitté le salon.`,
      room,
      username
    }));
    console.log(`${username} a quitté le salon ${room}`);
  });

  socket.on('disconnect', async () => {
    if (socket.username && socket.room) {
      await redis.srem(`users:${socket.room}`, socket.username);
      const users = await redis.smembers(`users:${socket.room}`);
      io.to(socket.room).emit('users list', users);

      await redis.publish('chat_messages', JSON.stringify({
        type: 'room message',
        message: `${socket.username} a quitté le salon.`,
        room: socket.room,
        username: socket.username
      }));
    }
    console.log('Un utilisateur est déconnecté');
  });
});

// Récupérer le port depuis les arguments de la ligne de commande ou utiliser 3000 par défaut
const argPort = process.argv[2];
const PORT = argPort ? parseInt(argPort, 10) : (process.env.PORT || 3000);

server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});