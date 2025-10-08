const WebSocket = require('ws');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

console.log(`WebSocket server listening on port ${PORT}`);

wss.on('connection', (ws) => {
    console.log('Nouveau client connecté');

    ws.on('message', (message) => {
        let msgObj;
        try {
            msgObj = JSON.parse(typeof message === 'string' ? message : message.toString());
        } catch {
            msgObj = { message: typeof message === 'string' ? message : message.toString(), clientId: null };
        }
        console.log(`Message reçu: ${msgObj.message}`);

        // Broadcast à tous les autres clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(msgObj));
            }
        });
    });
});
