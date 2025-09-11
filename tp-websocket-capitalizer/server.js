const WebSocket = require('ws');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
    console.log('Nouveau client connecté');

    ws.on('message', (message) => {
        try {
            let strMessage;
            if (typeof message === 'string') {
                strMessage = message;
            } else {
                strMessage = String(message);
            }
            const capitalized = strMessage.toUpperCase();
            ws.send(capitalized);
        } catch (err) {
            ws.send('Erreur : impossible de traiter le message.');
        }
    });

    ws.on('close', () => {
        console.log('Client déconnecté');
    });

    ws.on('error', (err) => {
        console.error('Erreur du client :', err);
    });
});

wss.on('error', (err) => {
    console.error('Erreur du serveur :', err);
});

console.log(`Serveur WebSocket démarré et écoute sur le port ${PORT}`);