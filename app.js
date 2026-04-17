/**
 * NeTelegram Application Logic
 * Handles UI interactions, form validation, and navigation
 */

// Utility functions
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

async function logout() {
    await NeTelegramDB.logout();
    showScreen('welcome-screen');
    showToast('Вы вышли из аккаунта', 'success');
}

// Photo upload handling
let selectedPhoto = null;

function initPhotoUpload() {
    const photoPreview = document.getElementById('photo-preview');
    const photoInput = document.getElementById('register-photo');
    
    photoPreview.addEventListener('click', () => {
        photoInput.click();
    });
    
    photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast('Пожалуйста, выберите изображение', 'error');
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showToast('Файл слишком большой. Максимум 5MB', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedPhoto = e.target.result;
                photoPreview.innerHTML = `
                    <img src="${selectedPhoto}" alt="Preview">
                `;
                photoPreview.classList.add('has-image');
            };
            reader.readAsDataURL(file);
        }
    });
}

// Form validation
function validatePhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}

function formatPhoneInput(input) {
    const value = input.value.replace(/\D/g, '');
    if (value.length >= 1) {
        input.value = '+7 (' + value.slice(0, 3) + ') ' + 
                     (value.length > 3 ? value.slice(3, 6) : '') + 
                     (value.length > 6 ? '-' + value.slice(6, 8) : '') + 
                     (value.length > 8 ? '-' + value.slice(8, 10) : '');
    }
}

// Registration form handling
async function initRegistration() {
    const form = document.getElementById('register-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const phone = document.getElementById('register-phone').value.trim();
        const nickname = document.getElementById('register-nickname').value.trim();
        const password = document.getElementById('register-password').value;
        
        // Validate phone
        if (!validatePhone(phone)) {
            showToast('Введите корректный номер телефона', 'error');
            return;
        }
        
        // Check if phone is allowed (whitelist) - only if whitelist is not empty
        const allowedPhones = await NeTelegramDB.getAllowedPhones();
        if (allowedPhones.length > 0 && !await NeTelegramDB.isPhoneAllowed(phone)) {
            showToast('Извините, мессенджер доступен пока что только для особых участников', 'error');
            return;
        }
        
        // Validate nickname
        if (nickname.length < 3) {
            showToast('Ник должен быть не менее 3 символов', 'error');
            return;
        }
        
        // Validate password
        if (password.length < 4) {
            showToast('Пароль должен be не менее 4 символов', 'error');
            return;
        }
        
        // Register user
        const result = await NeTelegramDB.registerUser({
            phone: phone,
            nickname: nickname,
            password: password,
            photo: selectedPhoto
        });
        
        if (result.success) {
            showToast('Регистрация успешна!', 'success');
            form.reset();
            selectedPhoto = null;
            document.getElementById('photo-preview').innerHTML = `
                <svg viewBox="0 0 24 24" width="48" height="48">
                    <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                <span>Нажмите для загрузки</span>
            `;
            document.getElementById('photo-preview').classList.remove('has-image');
            // Автоматический вход после регистрации
            loadMainScreen(result.user);
        } else {
            showToast(result.error, 'error');
        }
    });
    
    // Phone input formatting
    document.getElementById('register-phone').addEventListener('input', (e) => {
        formatPhoneInput(e.target);
    });
}

// Login form handling
async function initLogin() {
    const form = document.getElementById('login-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nickname = document.getElementById('login-nickname').value.trim();
        const password = document.getElementById('login-password').value;
        
        const result = await NeTelegramDB.loginUser(nickname, password);
        
        if (result.success) {
            showToast('Добро пожаловать, ' + result.user.nickname + '!', 'success');
            form.reset();
            loadMainScreen(result.user);
        } else {
            showToast(result.error, 'error');
        }
    });
}

// Main screen handling
async function loadMainScreen(user) {
    // Set header user info
    const headerUserAvatar = document.getElementById('header-user-avatar');
    const headerUserNickname = document.getElementById('header-user-nickname');
    
    if (headerUserNickname) {
        headerUserNickname.textContent = user.nickname;
    }
    
    if (headerUserAvatar) {
        if (user.photo) {
            headerUserAvatar.src = user.photo;
        } else {
            headerUserAvatar.src = '';
            headerUserAvatar.style.backgroundColor = '#f0f0f0';
        }
    }
    
    // Set profile form data
    const profileNickname = document.getElementById('profile-nickname');
    const profilePhone = document.getElementById('profile-phone');
    const profilePhotoPreview = document.getElementById('profile-photo-preview');
    
    if (profileNickname) profileNickname.value = user.nickname;
    if (profilePhone) profilePhone.value = user.phone;
    
    if (profilePhotoPreview) {
        if (user.photo) {
            profilePhotoPreview.innerHTML = `<img src="${user.photo}" alt="Profile">`;
            profilePhotoPreview.classList.add('has-image');
        } else {
            profilePhotoPreview.innerHTML = `
                <svg viewBox="0 0 24 24" width="48" height="48">
                    <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
            `;
            profilePhotoPreview.classList.remove('has-image');
        }
    }
    
    // Reset profile photo
    selectedProfilePhoto = null;
    
    // Reset to first tab
    switchTab('tab-chats');
    
    // Show main screen
    showScreen('main-screen');
    
    // Load chats list
    await loadChatsList();
}

// Tab switching functionality
function switchTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show target tab
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Update nav buttons (both bottom and side nav)
    document.querySelectorAll('.nav-btn, .nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        }
    });
    
    // Close side nav if open
    closeSideNav();
}

// Side navigation
function openSideNav() {
    const sideNav = document.getElementById('side-nav');
    const overlay = document.getElementById('nav-overlay');
    sideNav.classList.add('open');
    overlay.classList.add('show');
}

function closeSideNav() {
    const sideNav = document.getElementById('side-nav');
    const overlay = document.getElementById('nav-overlay');
    sideNav.classList.remove('open');
    overlay.classList.remove('show');
}

// Open diary function
function openDiary() {
    alert('Сайт дневника откроется позже');
}

// Profile photo handling
let selectedProfilePhoto = null;

function initProfilePhotoUpload() {
    const photoPreview = document.getElementById('profile-photo-preview');
    const photoInput = document.getElementById('profile-photo-input');
    
    photoPreview.addEventListener('click', () => {
        photoInput.click();
    });
    
    photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast('Пожалуйста, выберите изображение', 'error');
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showToast('Файл слишком большой. Максимум 5MB', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedProfilePhoto = e.target.result;
                photoPreview.innerHTML = `<img src="${selectedProfilePhoto}" alt="Preview">`;
                photoPreview.classList.add('has-image');
            };
            reader.readAsDataURL(file);
        }
    });
}

// Profile form handling
async function initProfileForm() {
    const form = document.getElementById('profile-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const session = await NeTelegramDB.getSession();
        if (!session) {
            showToast('Ошибка сессии. Пожалуйста, войдите снова.', 'error');
            return;
        }
        
        const nickname = document.getElementById('profile-nickname').value.trim();
        const password = document.getElementById('profile-password').value;
        
        // Validate nickname
        if (nickname.length < 3) {
            showToast('Ник должен быть не менее 3 символов', 'error');
            return;
        }
        
        // Check if nickname is taken by another user
        if (nickname.toLowerCase() !== session.nickname.toLowerCase() && await NeTelegramDB.isNicknameTaken(nickname)) {
            showToast('Этот ник уже занят', 'error');
            return;
        }
        
        // Prepare updates
        const updates = {
            nickname: nickname
        };
        
        if (password.length > 0) {
            if (password.length < 4) {
                showToast('Пароль должен be не менее 4 символов', 'error');
                return;
            }
            updates.password = password;
        }
        
        if (selectedProfilePhoto !== null) {
            updates.photo = selectedProfilePhoto;
        }
        
        // Update user
        const result = await NeTelegramDB.updateUser(session.userId, updates);
        
        if (result.success) {
            showToast('Профиль успешно обновлен!', 'success');
            document.getElementById('profile-password').value = '';
            
            // Update header display
            const headerUserNickname = document.getElementById('header-user-avatar');
            const headerUserNicknameEl = document.getElementById('header-user-nickname');
            
            const updatedUser = await NeTelegramDB.getCurrentUser();
            if (updatedUser) {
                headerUserNicknameEl.textContent = updatedUser.nickname;
                if (updatedUser.photo) {
                    headerUserAvatar.src = updatedUser.photo;
                }
            }
        } else {
            showToast(result.error, 'error');
        }
    });
}

// Current chat state
let currentChat = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

// Check for existing session on load
async function checkSession() {
    if (await NeTelegramDB.isLoggedIn()) {
        const user = await NeTelegramDB.getCurrentUser();
        if (user) {
            loadMainScreen(user);
        }
    }
}

// Check if user is admin
async function isAdmin() {
    const session = await NeTelegramDB.getSession();
    if (!session) return false;
    const user = await NeTelegramDB.getUserInfo(session.userId);
    return user && user.nickname === 'tima';
}

// Initialize admin panel
async function initAdminPanel() {
    if (!await isAdmin()) return;
    
    // Show admin tab
    const adminTab = document.getElementById('tab-admin');
    if (adminTab) {
        adminTab.style.display = 'block';
    }
    
    // Show admin item in side nav
    const adminNavItem = document.getElementById('admin-nav-item');
    if (adminNavItem) {
        adminNavItem.style.display = 'flex';
    }
    
    // Initialize whitelist management
    initWhitelistManagement();
}

// Initialize whitelist management
function initWhitelistManagement() {
    const phoneInput = document.getElementById('whitelist-phone-input');
    const addButton = document.getElementById('add-phone-btn');
    const whitelistList = document.getElementById('whitelist-list');
    
    // Load existing phones
    loadWhitelistPhones();
    
    // Add phone handler
    addButton.addEventListener('click', async () => {
        const phone = phoneInput.value.trim();
        if (!phone) {
            showToast('Введите номер телефона', 'error');
            return;
        }
        
        const result = await NeTelegramDB.addAllowedPhone(phone);
        if (result.success) {
            showToast('Номер добавлен в список', 'success');
            phoneInput.value = '';
            loadWhitelistPhones();
        } else {
            showToast(result.error, 'error');
        }
    });
    
    // Phone input formatting
    phoneInput.addEventListener('input', (e) => {
        formatPhoneInput(e.target);
    });
}

// Load whitelist phones
async function loadWhitelistPhones() {
    const whitelistList = document.getElementById('whitelist-list');
    const allowedPhones = await NeTelegramDB.getAllowedPhones();
    
    if (allowedPhones.length === 0) {
        whitelistList.innerHTML = '<div class="tab-placeholder"><p>Список разрешенных номеров пуст</p></div>';
        return;
    }
    
    whitelistList.innerHTML = allowedPhones.map(phone => `
        <div class="whitelist-item">
            <span class="phone-number">${phone}</span>
            <button class="btn-remove-phone" onclick="removeWhitelistPhone('${phone}')">✕</button>
        </div>
    `).join('');
}

// Remove phone from whitelist
async function removeWhitelistPhone(phone) {
    await NeTelegramDB.removeAllowedPhone(phone);
    showToast('Номер удален из списка', 'success');
    loadWhitelistPhones();
}

// Initialize side navigation
function initSideNavigation() {
    // Menu toggle button
    const menuToggle = document.getElementById('menu-toggle');
    const overlay = document.getElementById('nav-overlay');
    const sideNav = document.getElementById('side-nav');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            if (sideNav.classList.contains('open')) {
                closeSideNav();
            } else {
                openSideNav();
            }
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeSideNav);
    }
    
    // Side nav items
    document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = btn.dataset.tab;
            switchTab(tabId);
            closeSideNav();
        });
    });
    
    // Update side nav header with user info
    updateSideNavHeader();
}

// Update side nav header with user info
async function updateSideNavHeader() {
    const session = await NeTelegramDB.getSession();
    if (!session) return;
    
    const navAvatar = document.getElementById('nav-user-avatar');
    const navNickname = document.getElementById('nav-user-nickname');
    
    if (navNickname) {
        navNickname.textContent = session.nickname;
    }
    
    if (navAvatar) {
        if (session.photo) {
            navAvatar.src = session.photo;
        } else {
            navAvatar.src = '';
            navAvatar.style.backgroundColor = '#f0f0f0';
            navAvatar.style.display = 'flex';
            navAvatar.style.alignItems = 'center';
            navAvatar.style.justifyContent = 'center';
            navAvatar.style.color = '#666';
            navAvatar.style.fontWeight = 'bold';
            navAvatar.style.fontSize = '24px';
            navAvatar.textContent = session.nickname.charAt(0).toUpperCase();
        }
    }
}

// Load chats list
async function loadChatsList() {
    const session = await NeTelegramDB.getSession();
    if (!session) return;
    
    const chats = await NeTelegramDB.getUserChats(session.userId);
    const chatsList = document.getElementById('chats-list');
    
    if (chats.length === 0) {
        chatsList.innerHTML = '<div class="tab-placeholder"><p>У вас пока нет чатов</p></div>';
        return;
    }
    
    chatsList.innerHTML = chats.map(chat => {
        const displayName = NeTelegramDB.getChatDisplayName(chat, session.userId);
        const lastMessage = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
        const lastMessageText = lastMessage ? (lastMessage.type === 'text' ? lastMessage.content : '📎 Медиа') : 'Нет сообщений';
        const time = lastMessage ? formatMessageTime(lastMessage.timestamp) : '';
        
        return `
            <div class="chat-item" data-chat-id="${chat.id}">
                <div class="chat-avatar" style="background-color: ${chat.type === 'group' ? '#667eea' : '#f0f0f0'}; display: flex; align-items: center; justify-content: center; color: ${chat.type === 'group' ? '#fff' : '#666'}; font-weight: bold; font-size: 18px;">
                    ${chat.type === 'group' ? '👥' : displayName.charAt(0).toUpperCase()}
                </div>
                <div class="chat-info">
                    <div class="chat-name">${displayName}</div>
                    <div class="chat-last-message">${lastMessageText}</div>
                </div>
                <div class="chat-time">${time}</div>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    chatsList.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => {
            const chatId = item.dataset.chatId;
            openChat(chatId);
        });
    });
}

// Format message time
function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' мин';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' ч';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// Open chat window
async function openChat(chatId) {
    const chat = await NeTelegramDB.getChatById(chatId);
    if (!chat) return;
    
    currentChat = chat;
    
    // Update chat header
    const session = await NeTelegramDB.getSession();
    const displayName = NeTelegramDB.getChatDisplayName(chat, session.userId);
    document.getElementById('chat-title').textContent = displayName;
    document.getElementById('chat-subtitle').textContent = chat.type === 'group' ? 'Групповой чат' : 'Личный чат';
    
    // Show chat window, hide chat list
    document.getElementById('chat-list-container').style.display = 'none';
    document.getElementById('chat-window-container').style.display = 'flex';
    
    // Load messages
    await loadMessages();
}

// Load messages for current chat
async function loadMessages() {
    if (!currentChat) return;
    
    const messagesContainer = document.getElementById('messages-container');
    const messages = currentChat.messages;
    const session = await NeTelegramDB.getSession();
    
    if (messages.length === 0) {
        messagesContainer.innerHTML = '<div class="tab-placeholder"><p>Сообщений пока нет. Напишите первое!</p></div>';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return;
    }
    
    messagesContainer.innerHTML = messages.map(msg => {
        const isOwn = msg.senderId === session.userId;
        const sender = NeTelegramDB.getUserInfo(msg.senderId);
        const senderName = sender ? sender.nickname : 'Неизвестный';
        const time = formatMessageTime(msg.timestamp);
        
        let content = '';
        if (msg.type === 'text') {
            content = `<div class="message-content">${escapeHtml(msg.content)}</div>`;
        } else if (msg.type === 'image') {
            content = `<img src="${msg.content}" alt="Image">`;
        } else if (msg.type === 'video') {
            content = `<video src="${msg.content}" controls></video>`;
        } else if (msg.type === 'audio') {
            content = `
                <div class="audio-controls">
                    <button class="btn-icon" onclick="playAudio('${msg.id}')">▶</button>
                    <div class="audio-wave"></div>
                    <span>🎤</span>
                </div>
            `;
        }
        
        return `
            <div class="message ${isOwn ? 'own' : 'other'} ${msg.type !== 'text' ? 'media' : ''}">
                ${!isOwn ? `<div class="message-sender">${senderName}</div>` : ''}
                ${content}
                <div class="message-time">${time}</div>
            </div>
        `;
    }).join('');
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Send text message
async function sendTextMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (!text || !currentChat) return;
    
    const session = await NeTelegramDB.getSession();
    if (!session) return;
    
    const result = await NeTelegramDB.sendMessage(currentChat.id, session.userId, text, 'text');
    
    if (result.success) {
        input.value = '';
        currentChat = await NeTelegramDB.getChatById(currentChat.id); // Refresh chat
        await loadMessages();
        await loadChatsList(); // Update chat list with new message
    }
}

// Send media message
async function sendMediaMessage(file) {
    if (!currentChat) return;
    
    const session = await NeTelegramDB.getSession();
    if (!session) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64 = e.target.result;
        const type = file.type.startsWith('image/') ? 'image' : 'video';
        
        const result = await NeTelegramDB.sendMessage(currentChat.id, session.userId, base64, type);
        
        if (result.success) {
            currentChat = await NeTelegramDB.getChatById(currentChat.id);
            await loadMessages();
            await loadChatsList();
            showToast('Медиа отправлено!', 'success');
        }
    };
    reader.readAsDataURL(file);
}

// Voice recording
function startRecording() {
    if (isRecording) {
        stopRecording();
        return;
    }
    
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(async stream => {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = (e) => {
                audioChunks.push(e.data);
            };
            
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onload = async (e) => {
                    if (!currentChat) return;
                    
                    const session = await NeTelegramDB.getSession();
                    if (!session) return;
                    
                    const result = await NeTelegramDB.sendMessage(currentChat.id, session.userId, e.target.result, 'audio');
                    
                    if (result.success) {
                        currentChat = await NeTelegramDB.getChatById(currentChat.id);
                        await loadMessages();
                        await loadChatsList();
                        showToast('Голосовое отправлено!', 'success');
                    }
                };
                reader.readAsDataURL(audioBlob);
            };
            
            mediaRecorder.start();
            isRecording = true;
            document.getElementById('voice-record-btn').style.color = '#e74c3c';
            showToast('Запись началась. Нажмите ещё раз, чтобы остановить.', 'info');
        })
        .catch(err => {
            console.error('Microphone access denied:', err);
            showToast('Нет доступа к микрофону', 'error');
        });
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        document.getElementById('voice-record-btn').style.color = '';
    }
}

// Open new chat modal
async function openNewChatModal() {
    const session = await NeTelegramDB.getSession();
    if (!session) return;
    
    const users = await NeTelegramDB.getOtherUsers(session.userId);
    const usersList = document.getElementById('users-list');
    
    if (users.length === 0) {
        usersList.innerHTML = '<div class="tab-placeholder"><p>Нет других пользователей</p></div>';
    } else {
        usersList.innerHTML = users.map(user => `
            <div class="user-item" data-user-id="${user.id}">
                <div class="user-avatar" style="${user.photo ? 'background-image: url(' + user.photo + '); background-size: cover;' : 'background-color: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666; font-weight: bold;'}">
                    ${!user.photo ? user.nickname.charAt(0).toUpperCase() : ''}
                </div>
                <div class="user-info">
                    <div class="user-name">${user.nickname}</div>
                    <div class="user-role">${user.role === 'admin' ? 'Администратор' : 'Пользователь'}</div>
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        usersList.querySelectorAll('.user-item').forEach(item => {
            item.addEventListener('click', async () => {
                const userId = item.dataset.userId;
                await createPersonalChat(userId);
            });
        });
    }
    
    document.getElementById('new-chat-modal').style.display = 'flex';
}

function closeNewChatModal() {
    document.getElementById('new-chat-modal').style.display = 'none';
}

// Create personal chat
async function createPersonalChat(userId) {
    const session = await NeTelegramDB.getSession();
    if (!session) return;
    
    const chat = await NeTelegramDB.getOrCreatePersonalChat(session.userId, userId);
    closeNewChatModal();
    openChat(chat.id);
}

// Back to chats list
function backToChatsList() {
    currentChat = null;
    document.getElementById('chat-list-container').style.display = 'flex';
    document.getElementById('chat-window-container').style.display = 'none';
}

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize photo uploads
    initPhotoUpload();
    initProfilePhotoUpload();
    
    // Initialize forms
    initRegistration();
    initLogin();
    initProfileForm();
    
    // Initialize tab navigation
    document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            switchTab(tabId);
        });
    });
    
    // Initialize chat functionality
    document.getElementById('new-chat-btn').addEventListener('click', () => openNewChatModal());
    document.getElementById('close-new-chat-modal').addEventListener('click', closeNewChatModal);
    document.getElementById('back-to-chats-btn').addEventListener('click', backToChatsList);
    document.getElementById('send-message-btn').addEventListener('click', () => sendTextMessage());
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendTextMessage();
    });
    document.getElementById('voice-record-btn').addEventListener('click', startRecording);
    document.getElementById('attach-file-btn').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    document.getElementById('file-input').addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            sendMediaMessage(files[0]);
        }
        e.target.value = ''; // Reset input
    });
    
    // Close modal on overlay click
    document.getElementById('new-chat-modal').addEventListener('click', (e) => {
        if (e.target.id === 'new-chat-modal') {
            closeNewChatModal();
        }
    });
    
    // Check for existing session
    await checkSession();
    
    // Initialize admin panel if user is admin
    await initAdminPanel();
    
    // Initialize side navigation
    initSideNavigation();
    
    // Add some visual feedback for buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            btn.style.transform = 'scale(0.98)';
        });
        
        btn.addEventListener('touchend', (e) => {
            btn.style.transform = 'scale(1)';
        });
    });
});