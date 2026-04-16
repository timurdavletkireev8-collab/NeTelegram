// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDtbTs3c5EEU0AdWXDw4qxCmwDwBJVtMwY",
    authDomain: "netelegram-d8c52.firebaseapp.com",
    databaseURL: "https://netelegram-d8c52-default-rtdb.firebaseio.com",
    projectId: "netelegram-d8c52",
    storageBucket: "netelegram-d8c52.firebasestorage.app",
    messagingSenderId: "214817548440",
    appId: "1:214817548440:web:05e6113620f7ce7a9548ed",
    measurementId: "G-GK4RMTBV4X"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Admin credentials
const ADMIN_LOGIN = 'tima';
const ADMIN_PASSWORD = 'timur1212';

// Current user state
let currentUser = null;
let isAdmin = false;
let selectedAvatar = '🧑';

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const authForm = document.getElementById('auth-form');
const authBtn = document.getElementById('auth-btn');
const authToggleLink = document.getElementById('auth-toggle-link');
const authToggleText = document.getElementById('auth-toggle-text');
const registerFields = document.getElementById('register-fields');
const authError = document.getElementById('auth-error');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPanel = document.getElementById('emoji-panel');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const menuToggle = document.getElementById('menu-toggle');
const sidebarClose = document.getElementById('sidebar-close');
const logoutBtn = document.getElementById('logout-btn');
const themeToggle = document.getElementById('theme-toggle');
const modalOverlay = document.getElementById('modal-overlay');

let isRegisterMode = false;
let modalCallback = null;

// ==================== AUTHENTICATION ====================

// Toggle between login and register
authToggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    
    if (isRegisterMode) {
        registerFields.style.display = 'block';
        authBtn.textContent = 'Зарегистрироваться';
        authToggleText.textContent = 'Уже есть аккаунт?';
        authToggleLink.textContent = 'Войти';
    } else {
        registerFields.style.display = 'none';
        authBtn.textContent = 'Войти';
        authToggleText.textContent = 'Нет аккаунта?';
        authToggleLink.textContent = 'Зарегистрироваться';
    }
});

// Handle auth form submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    
    if (!username || !password) {
        showError('Заполните все поля');
        return;
    }
    
    try {
        if (isRegisterMode) {
            const name = document.getElementById('register-name').value.trim();
            const surname = document.getElementById('register-surname').value.trim();
            
            if (!name || !surname) {
                showError('Введите имя и фамилию');
                return;
            }
            
            // Check if user exists
            const snapshot = await database.ref(`users/${username}`).once('value');
            if (snapshot.exists()) {
                showError('Пользователь уже существует');
                return;
            }
            
            // Create new user
            await database.ref(`users/${username}`).set({
                username: username,
                name: name,
                surname: surname,
                password: password,
                avatar: '🧑',
                status: 'онлайн',
                class: '8А',
                createdAt: Date.now()
            });
            
            // Auto login after registration
            loginUser(username, password);
        } else {
            // Check for admin login
            if (username === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
                loginUser(username, password, true);
            } else {
                loginUser(username, password, false);
            }
        }
    } catch (error) {
        showError('Ошибка: ' + error.message);
    }
});

async function loginUser(username, password, adminCheck = false) {
    try {
        let userData;
        
        if (adminCheck) {
            userData = {
                username: ADMIN_LOGIN,
                name: 'Учитель',
                surname: '',
                avatar: '👨‍🏫',
                status: 'онлайн',
                class: '8А',
                isAdmin: true
            };
        } else {
            const snapshot = await database.ref(`users/${username}`).once('value');
            if (!snapshot.exists()) {
                showError('Пользователь не найден');
                return;
            }
            
            userData = snapshot.val();
            if (userData.password !== password) {
                showError('Неверный пароль');
                return;
            }
        }
        
        // Update status to online
        await database.ref(`users/${username}/status`).set('онлайн');
        
        currentUser = { username, ...userData };
        isAdmin = userData.isAdmin || false;
        
        // Save session
        localStorage.setItem('netelegram_user', JSON.stringify(currentUser));
        
        // Show main screen
        showMainScreen();
    } catch (error) {
        showError('Ошибка входа: ' + error.message);
    }
}

function showError(message) {
    authError.textContent = message;
    authError.style.display = 'block';
    setTimeout(() => {
        authError.style.display = 'none';
    }, 5000);
}

// ==================== MAIN SCREEN ====================

function showMainScreen() {
    authScreen.classList.remove('active');
    mainScreen.classList.add('active');
    
    // Update sidebar
    document.getElementById('sidebar-avatar').textContent = currentUser.avatar || '🧑';
    document.getElementById('sidebar-name').textContent = 
        `${currentUser.name} ${currentUser.surname}`;
    
    // Show admin menu item if admin
    if (isAdmin) {
        document.getElementById('admin-menu-item').style.display = 'flex';
    }
    
    // Load chat messages
    loadMessages();
    
    // Load members
    loadMembers();
    
    // Load admin data if admin
    if (isAdmin) {
        loadAdminData();
    }
}

// ==================== NAVIGATION ====================

menuToggle.addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
});

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
}

sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// Section navigation
document.querySelectorAll('.sidebar-menu li').forEach(item => {
    item.addEventListener('click', () => {
        const sectionId = item.dataset.section;
        
        // Update active states
        document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
        item.classList.add('active');
        
        document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
        
        closeSidebar();
    });
});

// Logout
logoutBtn.addEventListener('click', async () => {
    if (currentUser) {
        await database.ref(`users/${currentUser.username}/status`).set('офлайн');
    }
    localStorage.removeItem('netelegram_user');
    location.reload();
});

// ==================== THEME ====================

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeToggle.innerHTML = isLight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    localStorage.setItem('netelegram_theme', isLight ? 'light' : 'dark');
});

// Load saved theme
if (localStorage.getItem('netelegram_theme') === 'light') {
    document.body.classList.add('light-theme');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
}

// ==================== CHAT ====================

// Send message
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentUser) return;
    
    const messageRef = database.ref('messages').push();
    messageRef.set({
        id: messageRef.key,
        username: currentUser.username,
        name: `${currentUser.name} ${currentUser.surname}`,
        avatar: currentUser.avatar || '🧑',
        text: text,
        timestamp: Date.now(),
        class: '8А'
    });
    
    messageInput.value = '';
    emojiPanel.style.display = 'none';
}

// Load messages
function loadMessages() {
    const messagesRef = database.ref('messages').limitToLast(50);
    
    messagesRef.on('child_added', (snapshot) => {
        const msg = snapshot.val();
        renderMessage(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
    
    messagesRef.on('child_removed', (snapshot) => {
        const msgId = snapshot.val().id;
        const msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
        if (msgEl) msgEl.remove();
    });
}

function renderMessage(msg) {
    const isOwn = currentUser && msg.username === currentUser.username;
    const isAnnouncement = msg.isAnnouncement;
    
    const div = document.createElement('div');
    div.className = `message ${isOwn ? 'own' : ''} ${isAnnouncement ? 'announcement-message' : ''}`;
    div.dataset.msgId = msg.id;
    
    let deleteBtn = '';
    if (currentUser) {
        if (isAdmin || isOwn) {
            deleteBtn = `<button class="message-delete" onclick="deleteMessage('${msg.id}')">
                <i class="fas fa-trash"></i>
            </button>`;
        }
    }
    
    const time = new Date(msg.timestamp).toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    if (isAnnouncement) {
        div.innerHTML = `
            <div class="message-content" style="max-width: 100%;">
                <div class="message-header">
                    <span class="message-author">📢 ОБЪЯВЛЕНИЕ</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text">${escapeHtml(msg.text)}</div>
                ${deleteBtn}
            </div>
        `;
    } else {
        div.innerHTML = `
            <div class="message-avatar">${msg.avatar}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${escapeHtml(msg.name)}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text">${escapeHtml(msg.text)}</div>
                ${deleteBtn}
            </div>
        `;
    }
    
    chatMessages.appendChild(div);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Delete message
window.deleteMessage = async function(msgId) {
    showModal('Удалить сообщение', 'Вы уверены, что хотите удалить это сообщение?', async () => {
        await database.ref(`messages/${msgId}`).remove();
    });
};

// ==================== EMOJI ====================

emojiBtn.addEventListener('click', () => {
    emojiPanel.style.display = emojiPanel.style.display === 'none' ? 'block' : 'none';
});

document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        messageInput.value += btn.textContent;
        emojiPanel.style.display = 'none';
    });
});

// Close emoji panel when clicking outside
document.addEventListener('click', (e) => {
    if (!emojiBtn.contains(e.target) && !emojiPanel.contains(e.target)) {
        emojiPanel.style.display = 'none';
    }
});

// ==================== MEMBERS ====================

function loadMembers() {
    const usersRef = database.ref('users');
    
    usersRef.on('value', (snapshot) => {
        const membersList = document.getElementById('members-list');
        membersList.innerHTML = '';
        
        snapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            const div = document.createElement('div');
            div.className = 'member-card';
            div.innerHTML = `
                <div class="member-avatar">${user.avatar || '🧑'}</div>
                <div class="member-info">
                    <div class="member-name">${user.name} ${user.surname}</div>
                    <div class="member-status ${user.status === 'онлайн' ? 'online' : ''}">${user.status}</div>
                </div>
            `;
            membersList.appendChild(div);
        });
    });
}

// ==================== PROFILE ====================

// Avatar selection
document.querySelectorAll('.avatar-option').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedAvatar = btn.dataset.avatar;
        document.getElementById('current-avatar').textContent = selectedAvatar;
    });
});

// Profile form
document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    const name = document.getElementById('profile-name').value.trim();
    const surname = document.getElementById('profile-surname').value.trim();
    const newUsername = document.getElementById('profile-username').value.trim();
    const newPassword = document.getElementById('profile-password').value;
    const confirmPassword = document.getElementById('profile-password-confirm').value;
    const status = document.getElementById('profile-status').value;
    
    if (!name || !surname) {
        showModal('Ошибка', 'Введите имя и фамилию');
        return;
    }
    
    if (newPassword && newPassword !== confirmPassword) {
        showModal('Ошибка', 'Пароли не совпадают');
        return;
    }
    
    // Check if username changed
    if (newUsername && newUsername !== currentUser.username) {
        const snapshot = await database.ref(`users/${newUsername}`).once('value');
        if (snapshot.exists()) {
            showModal('Ошибка', 'Такой логин уже занят');
            return;
        }
    }
    
    try {
        const updates = {
            name: name,
            surname: surname,
            avatar: selectedAvatar,
            status: status
        };
        
        if (newPassword) {
            updates.password = newPassword;
        }
        
        // If username changed, create new user and delete old
        if (newUsername && newUsername !== currentUser.username) {
            await database.ref(`users/${newUsername}`).set({
                ...currentUser,
                ...updates,
                username: newUsername
            });
            await database.ref(`users/${currentUser.username}`).remove();
            currentUser.username = newUsername;
        } else {
            await database.ref(`users/${currentUser.username}`).update(updates);
        }
        
        // Update local state
        currentUser = { ...currentUser, ...updates };
        localStorage.setItem('netelegram_user', JSON.stringify(currentUser));
        
        // Update UI
        document.getElementById('sidebar-name').textContent = `${name} ${surname}`;
        
        showModal('Успешно', 'Профиль обновлён');
    } catch (error) {
        showModal('Ошибка', error.message);
    }
});

// Load profile data
function loadProfileData() {
    if (!currentUser) return;
    
    document.getElementById('profile-name').value = currentUser.name || '';
    document.getElementById('profile-surname').value = currentUser.surname || '';
    document.getElementById('profile-username').value = currentUser.username || '';
    document.getElementById('profile-status').value = currentUser.status || 'онлайн';
    
    if (currentUser.avatar) {
        selectedAvatar = currentUser.avatar;
        document.getElementById('current-avatar').textContent = selectedAvatar;
        document.querySelectorAll('.avatar-option').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.avatar === selectedAvatar);
        });
    }
}

// ==================== ADMIN ====================

function loadAdminData() {
    loadAdminStudents();
}

function loadAdminStudents() {
    const usersRef = database.ref('users');
    
    usersRef.on('value', (snapshot) => {
        const list = document.getElementById('admin-students-list');
        list.innerHTML = '';
        
        snapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            if (user.username === ADMIN_LOGIN) return; // Skip admin
            
            const div = document.createElement('div');
            div.className = 'admin-student';
            div.innerHTML = `
                <div class="admin-student-info">
                    <span>${user.avatar || '🧑'}</span>
                    <span class="admin-student-name">${user.name} ${user.surname} (@${user.username})</span>
                </div>
                <div class="admin-student-actions">
                    <button class="btn btn-secondary" onclick="resetPassword('${user.username}')" title="Сбросить пароль">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteStudent('${user.username}')" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.appendChild(div);
        });
    });
}

window.resetPassword = async function(username) {
    showModal('Сбросить пароль', `Сбросить пароль для ${username}?`, async () => {
        await database.ref(`users/${username}/password`).set('123456');
        showModal('Готово', 'Пароль сброшен на 123456');
    });
};

window.deleteStudent = async function(username) {
    showModal('Удалить учащегося', `Удалить ${username} из 8А?`, async () => {
        await database.ref(`users/${username}`).remove();
        // Also delete their messages
        const messages = await database.ref('messages').orderByChild('username').equalTo(username).once('value');
        messages.forEach(msg => msg.ref.remove());
    });
};

// Announcement form
document.getElementById('announcement-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const text = document.getElementById('announcement-text').value.trim();
    if (!text || !currentUser) return;
    
    const messageRef = database.ref('messages').push();
    await messageRef.set({
        id: messageRef.key,
        username: currentUser.username,
        name: `${currentUser.name} ${currentUser.surname}`,
        avatar: currentUser.avatar || '🧑',
        text: text,
        timestamp: Date.now(),
        class: '8А',
        isAnnouncement: true
    });
    
    document.getElementById('announcement-text').value = '';
    showModal('Готово', 'Объявление опубликовано');
});

// ==================== MODAL ====================

function showModal(title, message, onConfirm) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    modalOverlay.style.display = 'flex';
    
    modalCallback = onConfirm;
}

document.getElementById('modal-confirm').addEventListener('click', () => {
    if (modalCallback) modalCallback();
    modalOverlay.style.display = 'none';
    modalCallback = null;
});

document.getElementById('modal-cancel').addEventListener('click', () => {
    modalOverlay.style.display = 'none';
    modalCallback = null;
});

// ==================== INITIALIZATION ====================

// Check for existing session
async function checkSession() {
    const savedUser = localStorage.getItem('netelegram_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            isAdmin = currentUser.isAdmin || false;
            
            // Verify user still exists
            if (!isAdmin) {
                const snapshot = await database.ref(`users/${currentUser.username}`).once('value');
                if (!snapshot.exists()) {
                    localStorage.removeItem('netelegram_user');
                    return;
                }
            }
            
            // Update status
            await database.ref(`users/${currentUser.username}/status`).set('онлайн');
            showMainScreen();
            loadProfileData();
        } catch (error) {
            localStorage.removeItem('netelegram_user');
        }
    }
}

// Clean up on page unload
window.addEventListener('beforeunload', async () => {
    if (currentUser && currentUser.username) {
        await database.ref(`users/${currentUser.username}/status`).set('офлайн');
    }
});

// Start app
checkSession();