const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const usersInRoom = {};
const messagesInRoom = {}; // Add this line

// Servir le fichier index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Écoute des connexions Socket.IO
io.on('connection', (socket) => {
  console.log('Un utilisateur est connecté');

  socket.on('join room', ({ username, room }) => {
    socket.join(room);
    socket.username = username;
    socket.room = room;

    // Add user to room list
    if (!usersInRoom[room]) usersInRoom[room] = [];
    if (!usersInRoom[room].includes(username)) usersInRoom[room].push(username);

    // Send old messages to the newly joined user
    if (!messagesInRoom[room]) messagesInRoom[room] = [];
    socket.emit('old messages', messagesInRoom[room]);

    io.to(room).emit('room message', { message: `${username} a rejoint le salon ${room}.` });
    io.to(room).emit('users list', usersInRoom[room]);
    console.log(`${username} a rejoint le salon ${room}`);
  });
  socket.on('chat message', ({ message, username, room }) => {
    // Save message to memory
    if (!messagesInRoom[room]) messagesInRoom[room] = [];
    messagesInRoom[room].push({ message, username, room });
    io.to(room).emit('chat message', { message, username, room });
  });
  socket.on('leave room', ({ username, room }) => {
    socket.leave(room);
    if (usersInRoom[room]) {
      usersInRoom[room] = usersInRoom[room].filter(u => u !== username);
      io.to(room).emit('users list', usersInRoom[room]);
    }
    io.to(room).emit('room message', { message: `${username} a quitté le salon.` });
    console.log(`${username} a quitté le salon ${room}`);
  });

  socket.on('disconnect', () => {
    if (socket.username && socket.room && usersInRoom[socket.room]) {
      usersInRoom[socket.room] = usersInRoom[socket.room].filter(u => u !== socket.username);
      io.to(socket.room).emit('users list', usersInRoom[socket.room]);
      socket.to(socket.room).emit('room message', { message: `${socket.username} a quitté le salon.` });
    }
    console.log('Un utilisateur est déconnecté');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});