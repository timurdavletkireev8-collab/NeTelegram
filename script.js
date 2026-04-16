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

// Test database connection
database.ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === true) {
        console.log('✅ Firebase connected successfully');
    } else {
        console.log('❌ Firebase connection lost');
        showError('Ошибка подключения к серверу');
    }
});

// Admin credentials
const ADMIN_LOGIN = 'tima';
const ADMIN_PASSWORD = 'timur1212';

// Current user state
let currentUser = null;
let isAdmin = false;
let selectedAvatar = '🧑';

// Notification settings
let notificationSettings = {
    sound: true,
    browser: true,
    mentionsOnly: false
};

// Unread messages counter
let unreadMessages = 0;
let notifications = [];

// Audio context for notification sound
let audioContext = null;

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

// ==================== NOTIFICATION SYSTEM ====================

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Show browser notification
function showBrowserNotification(title, body, onClick) {
    if (notificationSettings.browser && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: body,
            icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111646.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/2111/2111646.png',
            requireInteraction: false
        });
        
        notification.onclick = () => {
            window.focus();
            if (onClick) onClick();
            notification.close();
        };
        
        // Auto close after 5 seconds
        setTimeout(() => notification.close(), 5000);
    }
}

// Play notification sound
function playNotificationSound() {
    if (!notificationSettings.sound) return;
    
    // Use the audio module if available
    if (window.audioNotification) {
        window.audioNotification.playNotificationSound();
    } else {
        // Fallback to simple beep
        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
        } catch (e) {
            console.log('Audio notification failed:', e);
        }
    }
}

// Add notification to list
function addNotification(type, text, senderName, timestamp) {
    const notification = {
        id: Date.now(),
        type: type,
        text: text,
        senderName: senderName,
        timestamp: timestamp,
        read: false
    };
    
    notifications.unshift(notification);
    updateNotificationsList();
    updateNotificationBadge();
}

// Update notifications list UI
function updateNotificationsList() {
    const list = document.getElementById('notifications-list');
    if (!list) return;
    
    if (notifications.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell"></i>
                <p>Нет новых уведомлений</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.read ? '' : 'unread'}" data-id="${notif.id}">
            <div class="notification-header">
                <span class="notification-type ${notif.type}">${notif.type === 'mention' ? '🔔 Упоминание' : '💬 Сообщение'}</span>
                <span class="notification-time">${formatTime(notif.timestamp)}</span>
            </div>
            <div class="notification-text">${notif.text}</div>
        </div>
    `).join('');
}

// Update notification badge
function updateNotificationBadge() {
    const badge = document.getElementById('notif-badge');
    if (badge) {
        const unreadCount = notifications.filter(n => !n.read).length;
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Mark all notifications as read
function markNotificationsAsRead() {
    notifications.forEach(n => n.read = true);
    updateNotificationsList();
    updateNotificationBadge();
}

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
        console.error('Auth error:', error);
        showError('Ошибка подключения: ' + error.message);
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
        
        // Request notification permission
        requestNotificationPermission();
        
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
        const adminMenuItem = document.getElementById('admin-menu-item');
        const adminTab = document.getElementById('admin-tab');
        if (adminMenuItem) adminMenuItem.style.display = 'flex';
        if (adminTab) adminTab.style.display = 'flex';
    }
    
    // Load chat messages
    loadMessages();
    
    // Load members
    loadMembers();
    
    // Load admin data if admin
    if (isAdmin) {
        loadAdminData();
    }
    
    // Load notification settings
    loadNotificationSettings();
    
    // Initialize tab bar
    initTabBar();
}

// ==================== TAB BAR ====================

function initTabBar() {
    const tabItems = document.querySelectorAll('.tab-item');
    
    tabItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.dataset.section;
            
            // Update active states
            tabItems.forEach(tab => tab.classList.remove('active'));
            item.classList.add('active');
            
            // Show corresponding section
            document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(sectionId)?.classList.add('active');
            
            // Mark notifications as read when viewing notifications
            if (sectionId === 'notifications') {
                markNotificationsAsRead();
            }
            
            // Close sidebar if open
            closeSidebar();
        });
    });
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
        document.getElementById(sectionId)?.classList.add('active');
        
        // Mark notifications as read when viewing notifications
        if (sectionId === 'notifications') {
            markNotificationsAsRead();
        }
        
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
        class: '8А',
        read: false
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
        
        // Check for mentions
        const mentions = extractMentions(msg.text);
        mentions.forEach(username => {
            if (username === currentUser.username) {
                handleMention(msg);
            }
        });
        
        // Handle notifications for new messages
        if (msg.username !== currentUser.username) {
            handleNewMessage(msg);
        }
    });
    
    messagesRef.on('child_removed', (snapshot) => {
        const msgId = snapshot.val().id;
        const msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
        if (msgEl) msgEl.remove();
    });
}

// Extract @mentions from text
function extractMentions(text) {
    const regex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        mentions.push(match[1]);
    }
    return mentions;
}

// Handle mention notification
async function handleMention(msg) {
    playNotificationSound();
    
    const senderName = msg.name;
    const messageText = msg.text;
    
    showBrowserNotification(
        '🔔 Вас упомянули!',
        `${senderName}: ${messageText.substring(0, 50)}...`,
        () => {
            // Focus on chat
            document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
            document.getElementById('chat-section').classList.add('active');
        }
    );
    
    addNotification('mention', `Вас упомянули в сообщении: "${messageText.substring(0, 100)}"`, senderName, msg.timestamp);
}

// Handle new message notification
function handleNewMessage(msg) {
    if (notificationSettings.mentionsOnly) return;
    
    playNotificationSound();
    
    const senderName = msg.name;
    const messageText = msg.text;
    
    showBrowserNotification(
        '💬 Новое сообщение',
        `${senderName}: ${messageText.substring(0, 50)}...`,
        () => {
            // Focus on chat
            document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
            document.getElementById('chat-section').classList.add('active');
        }
    );
    
    // Update unread counter
    unreadMessages++;
    updateChatBadge();
}

// Update chat badge
function updateChatBadge() {
    const badge = document.getElementById('chat-badge');
    if (badge) {
        if (unreadMessages > 0) {
            badge.textContent = unreadMessages > 99 ? '99+' : unreadMessages;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Mark messages as read
function markMessagesAsRead() {
    const messagesRef = database.ref('messages').limitToLast(50);
    messagesRef.once('value', (snapshot) => {
        const updates = {};
        snapshot.forEach((childSnapshot) => {
            const msg = childSnapshot.val();
            if (!msg.read) {
                updates[`messages/${msg.id}/read`] = true;
            }
        });
        database.ref().update(updates);
    });
    unreadMessages = 0;
    updateChatBadge();
}

// Render message with enhanced styling
function renderMessage(msg) {
    const isOwn = currentUser && msg.username === currentUser.username;
    const isAnnouncement = msg.isAnnouncement;
    
    const div = document.createElement('div');
    div.className = `message ${isOwn ? 'own' : ''} ${isAnnouncement ? 'announcement-message' : ''}`;
    div.dataset.msgId = msg.id;
    
    // Process mentions in text
    let processedText = escapeHtml(msg.text);
    const mentions = extractMentions(msg.text);
    mentions.forEach(username => {
        const regex = new RegExp(`@${username}`, 'g');
        processedText = processedText.replace(regex, `<span class="mention">@${username}</span>`);
    });
    
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
    
    // Read status for own messages
    let readStatus = '';
    if (isOwn && msg.read !== undefined) {
        readStatus = `
            <div class="message-read-status">
                <div class="read-indicator">
                    <span class="check">✓</span>
                </div>
            </div>
        `;
    }
    
    if (isAnnouncement) {
        div.innerHTML = `
            <div class="message-content" style="max-width: 100%;">
                <div class="message-header">
                    <span class="message-author">📢 ОБЪЯВЛЕНИЕ</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text">${processedText}</div>
                ${readStatus}
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
                <div class="message-text">${processedText}</div>
                ${readStatus}
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
        try {
            await database.ref(`messages/${msgId}`).remove();
            showModal('Готово', 'Сообщение удалено');
        } catch (error) {
            showModal('Ошибка', 'Не удалось удалить сообщение: ' + error.message);
        }
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

// ==================== NOTIFICATION SETTINGS ====================

function loadNotificationSettings() {
    const saved = localStorage.getItem('netelegram_notifications');
    if (saved) {
        notificationSettings = JSON.parse(saved);
    }
    
    // Apply to UI
    const soundToggle = document.getElementById('sound-toggle');
    const browserNotifToggle = document.getElementById('browser-notif-toggle');
    const mentionsOnlyToggle = document.getElementById('mentions-only-toggle');
    
    if (soundToggle) soundToggle.checked = notificationSettings.sound;
    if (browserNotifToggle) browserNotifToggle.checked = notificationSettings.browser;
    if (mentionsOnlyToggle) mentionsOnlyToggle.checked = notificationSettings.mentionsOnly;
    
    // Add listeners
    soundToggle?.addEventListener('change', (e) => {
        notificationSettings.sound = e.target.checked;
        saveNotificationSettings();
    });
    
    browserNotifToggle?.addEventListener('change', (e) => {
        notificationSettings.browser = e.target.checked;
        if (e.target.checked) {
            requestNotificationPermission();
        }
        saveNotificationSettings();
    });
    
    mentionsOnlyToggle?.addEventListener('change', (e) => {
        notificationSettings.mentionsOnly = e.target.checked;
        saveNotificationSettings();
    });
}

function saveNotificationSettings() {
    localStorage.setItem('netelegram_notifications', JSON.stringify(notificationSettings));
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
        isAnnouncement: true,
        read: false
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

// ==================== UTILITY FUNCTIONS ====================

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

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

// Mark messages as read when viewing chat
document.addEventListener('click', (e) => {
    if (e.target.closest('#chat-section')) {
        markMessagesAsRead();
    }
});

// Start app
checkSession();