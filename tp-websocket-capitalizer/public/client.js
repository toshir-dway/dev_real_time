const input = document.getElementById('inputText');
const button = document.getElementById('sendBtn');
const responseDiv = document.getElementById('response');

const ws = new WebSocket('ws://localhost:8080');

function showMessage(msg, color = 'green') {
    responseDiv.textContent = msg;
    responseDiv.style.color = color;
}

ws.onopen = () => {
    showMessage('Connecté au serveur WebSocket', 'blue');
    console.log('Connecté au serveur WebSocket');
};

ws.onmessage = (event) => {
    showMessage(`Réponse du serveur : ${event.data}`, 'green');
};

ws.onclose = () => {
    showMessage('Déconnecté du serveur WebSocket', 'red');
    console.log('Déconnecté du serveur WebSocket');
};

ws.onerror = (error) => {
    showMessage('Erreur WebSocket', 'orange');
    console.error('Erreur WebSocket :', error);
};

button.addEventListener('click', () => {
    const text = input.value;
    if (text) {
        ws.send(text);
        input.value = '';
    }
});