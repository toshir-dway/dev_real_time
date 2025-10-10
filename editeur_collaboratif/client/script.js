let socket = null;
let currentUser = null;
let currentRoom = null;
let isTyping = false;
let typingTimeout = null;
let lastContent = '';
let isApplyingRemoteUpdate = false;
let debounceTimeout = null;

// Éléments DOM
const loginPage = document.getElementById('login-page');
const mainPage = document.getElementById('main-page');
const editor = document.getElementById('editor');
const usersList = document.getElementById('users-list');
const notifications = document.getElementById('notifications');
const typingIndicator = document.getElementById('typing-indicator');
const connectionStatus = document.getElementById('connection-status');
const userCount = document.getElementById('user-count');
const currentUserElement = document.getElementById('current-user');
const currentRoomElement = document.getElementById('current-room');

// Rejoindre une room
function joinRoom() {
    const username = document.getElementById('username').value.trim();
    const room = document.getElementById('room').value.trim();
    const token = document.getElementById('token').value.trim();
    const joinBtn = document.getElementById('join-btn');

    if (!username || !room || !token) {
        alert('Veuillez remplir tous les champs');
        return;
    }

    if (username.length < 2) {
        alert('Le pseudonyme doit contenir au moins 2 caractères');
        return;
    }

    joinBtn.disabled = true;
    joinBtn.textContent = 'Connexion...';

    // Initialiser la connexion Socket.IO
    socket = io({
        auth: {
            username: username,
            room: room,
            token: token
        }
    });

    currentUser = username;
    currentRoom = room;

    setupSocketEvents();
}

// Configurer les événements Socket.IO
function setupSocketEvents() {
    // Connexion établie
    socket.on('connect', () => {
        console.log('✅ Connecté au serveur');
        connectionStatus.textContent = '🟢 Connecté';
        connectionStatus.style.background = 'rgba(40, 167, 69, 0.9)';
        
        // Afficher la page principale
        loginPage.style.display = 'none';
        mainPage.style.display = 'block';
        
        currentUserElement.textContent = currentUser;
        currentRoomElement.textContent = currentRoom;
        
        addNotification(`Connecté à la room "${currentRoom}"`, 'system');
    });

    // Erreur de connexion
    socket.on('connect_error', (error) => {
        console.error('❌ Erreur de connexion:', error);
        alert('Erreur: ' + error.message);
        
        const joinBtn = document.getElementById('join-btn');
        joinBtn.disabled = false;
        joinBtn.textContent = 'Rejoindre la session';
    });

    // Mise à jour du contenu
    socket.on('content_update', (data) => {
        // Ne pas mettre à jour si le contenu est identique
        if (data.content === editor.value) {
            return;
        }

        // Sauvegarder la position du curseur et le scroll
        const cursorPosition = editor.selectionStart;
        const scrollPosition = editor.scrollTop;
        
        // Appliquer la mise à jour
        isApplyingRemoteUpdate = true;
        editor.value = data.content;
        lastContent = data.content;
        isApplyingRemoteUpdate = false;
        
        // Restaurer la position du curseur
        editor.setSelectionRange(cursorPosition, cursorPosition);
        editor.scrollTop = scrollPosition;
        
        if (data.user && data.user !== currentUser) {
            addNotification(`${data.user} a modifié le document`, 'update');
        }
    });

    // Mise à jour de la liste des utilisateurs
    socket.on('users_update', (users) => {
        updateUsersList(users);
    });

    // Notifications
    socket.on('notification', (data) => {
        addNotification(data.message, data.type);
        
        if (data.users) {
            updateUsersList(data.users);
        }
    });

    // Indicateur de frappe
    socket.on('user_typing', (data) => {
        updateTypingIndicator(data);
    });

    // Déconnexion
    socket.on('disconnect', (reason) => {
        console.log('🔴 Déconnecté:', reason);
        connectionStatus.textContent = '🔴 Déconnecté';
        connectionStatus.style.background = 'rgba(220, 53, 69, 0.9)';
        
        if (reason === 'io server disconnect') {
            // Déconnexion forcée par le serveur
            alert('Déconnecté par le serveur');
            location.reload();
        }
    });

    // Erreurs
    socket.on('error', (error) => {
        console.error('❌ Erreur:', error);
        alert('Erreur: ' + error.message);
    });
}

// Gestion des modifications de contenu avec debounce
function onContentChange() {
    if (isApplyingRemoteUpdate) {
        return;
    }

    const currentContent = editor.value;
    
    // Ne pas émettre si le contenu n'a pas changé
    if (currentContent === lastContent) {
        return;
    }

    // Annuler le timeout précédent
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
    }

    // Débouncer l'envoi pour éviter le spam
    debounceTimeout = setTimeout(() => {
        if (socket && socket.connected) {
            socket.emit('content_change', {
                content: currentContent
            });
            lastContent = currentContent;
        }
    }, 100); // 100ms de debounce
}

// Gestion du typing indicator
function onTypingStart() {
    if (!isTyping && socket && socket.connected) {
        isTyping = true;
        socket.emit('typing_start');
    }
    
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
}

function onTypingStop() {
    if (isTyping && socket && socket.connected) {
        typingTimeout = setTimeout(() => {
            isTyping = false;
            socket.emit('typing_stop');
        }, 1000);
    }
}

// Mettre à jour la liste des utilisateurs
function updateUsersList(users) {
    usersList.innerHTML = '';
    userCount.textContent = users.length;
    
    users.forEach(user => {
        const li = document.createElement('li');
        li.className = 'user-item';
        
        if (user.username === currentUser) {
            li.classList.add('user-you');
        }
        
        const userInfo = document.createElement('span');
        userInfo.textContent = user.username + (user.username === currentUser ? ' (Vous)' : '');
        
        const joinTime = document.createElement('small');
        joinTime.textContent = new Date(user.joinedAt).toLocaleTimeString();
        joinTime.style.opacity = '0.7';
        
        li.appendChild(userInfo);
        li.appendChild(joinTime);
        usersList.appendChild(li);
    });
}

// Ajouter une notification
function addNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const time = document.createElement('small');
    time.textContent = new Date().toLocaleTimeString();
    time.style.display = 'block';
    time.style.opacity = '0.7';
    notification.appendChild(time);
    
    notifications.appendChild(notification);
    
    notifications.scrollTop = notifications.scrollHeight;
    
    if (notifications.children.length > 50) {
        notifications.removeChild(notifications.firstChild);
    }
}

// Mettre à jour l'indicateur de frappe
function updateTypingIndicator(data) {
    if (data.isTyping) {
        let existing = typingIndicator.querySelector(`[data-user="${data.username}"]`);
        if (!existing) {
            const span = document.createElement('span');
            span.textContent = `${data.username} tape... `;
            span.setAttribute('data-user', data.username);
            typingIndicator.appendChild(span);
        }
    } else {
        const existing = typingIndicator.querySelector(`[data-user="${data.username}"]`);
        if (existing) {
            existing.remove();
        }
    }
}

// Déconnexion
function disconnect() {
    if (socket) {
        socket.disconnect();
    }
    location.reload();
}

// Gestion de la déconnexion avant fermeture de la page
window.addEventListener('beforeunload', () => {
    if (socket) {
        socket.disconnect();
    }
});

// Raccourcis clavier
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        joinRoom();
    }
    
    if (e.key === 'Escape') {
        disconnect();
    }
});

// Connexion automatique pour le développement
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    document.getElementById('username').value = 'Utilisateur' + Math.floor(Math.random() * 1000);
    document.getElementById('room').value = 'dev-room';
    document.getElementById('token').value = '12345';
}