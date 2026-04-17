/**
 * NeTelegram Database Module
 * Handles Firebase Realtime Database operations for user data
 */

import { database, ref, set, push, onValue, update, remove } from './firebase-config.js';

const NeTelegramDB = {
    // Database references
    USERS_REF: ref(database, 'users'),
    SESSION_REF: ref(database, 'sessions'),
    CHATS_REF: ref(database, 'chats'),
    ALLOWED_PHONES_REF: ref(database, 'allowedPhones'),

    /**
     * Initialize database on load
     */
    async init() {
        try {
            // Check if admin user exists
            const users = await this.getUsers();
            if (users.length === 0) {
                // Create default admin user
                const adminUser = {
                    id: this.generateId(),
                    nickname: 'tima',
                    password: 'timur1212',
                    phone: '0000',
                    role: 'admin',
                    photo: null,
                    createdAt: new Date().toISOString()
                };
                await this.saveUser(adminUser);
                console.log('NeTelegram: Default admin user created');
            }
            
            // Initialize group chat if not exists
            await this.initGroupChat();
            
            // Initialize allowed phones list if not exists
            await this.initAllowedPhones();
        } catch (error) {
            console.error('NeTelegram DB Error - init:', error);
        }
    },

    /**
     * Initialize allowed phones list
     */
    async initAllowedPhones() {
        try {
            const allowedPhones = await this.getAllowedPhones();
            if (allowedPhones.length === 0) {
                // By default, allow the admin phone
                await this.saveAllowedPhones(['0000']);
            }
        } catch (error) {
            console.error('NeTelegram DB Error - initAllowedPhones:', error);
        }
    },

    /**
     * Get allowed phones list
     * @returns {Promise<Array>} Array of allowed phone numbers
     */
    async getAllowedPhones() {
        try {
            const snapshot = await new Promise((resolve, reject) => {
                onValue(this.ALLOWED_PHONES_REF, (snapshot) => {
                    resolve(snapshot);
                }, reject);
            });
            
            const phones = snapshot.val();
            return phones ? Object.values(phones) : [];
        } catch (error) {
            console.error('NeTelegram DB Error - getAllowedPhones:', error);
            return [];
        }
    },

    /**
     * Save allowed phones list
     * @param {Array} phones - Array of phone numbers
     */
    async saveAllowedPhones(phones) {
        try {
            await set(this.ALLOWED_PHONES_REF, phones);
        } catch (error) {
            console.error('NeTelegram DB Error - saveAllowedPhones:', error);
        }
    },

    /**
     * Check if phone is allowed
     * @param {string} phone - Phone number to check
     * @returns {Promise<boolean>} True if phone is allowed
     */
    async isPhoneAllowed(phone) {
        try {
            const allowedPhones = await this.getAllowedPhones();
            const cleanPhone = phone.replace(/\D/g, '');
            return allowedPhones.some(p => p.replace(/\D/g, '') === cleanPhone);
        } catch (error) {
            console.error('NeTelegram DB Error - isPhoneAllowed:', error);
            return false;
        }
    },

    /**
     * Add phone to allowed list
     * @param {string} phone - Phone number to add
     * @returns {Promise<Object>} Result object
     */
    async addAllowedPhone(phone) {
        try {
            const allowedPhones = await this.getAllowedPhones();
            const cleanPhone = phone.replace(/\D/g, '');
            
            if (allowedPhones.some(p => p.replace(/\D/g, '') === cleanPhone)) {
                return { success: false, error: 'Номер уже в списке' };
            }
            
            allowedPhones.push(cleanPhone);
            await this.saveAllowedPhones(allowedPhones);
            return { success: true };
        } catch (error) {
            console.error('NeTelegram DB Error - addAllowedPhone:', error);
            return { success: false, error: 'Ошибка при добавлении номера' };
        }
    },

    /**
     * Remove phone from allowed list
     * @param {string} phone - Phone number to remove
     */
    async removeAllowedPhone(phone) {
        try {
            const allowedPhones = await this.getAllowedPhones();
            const cleanPhone = phone.replace(/\D/g, '');
            const filtered = allowedPhones.filter(p => p.replace(/\D/g, '') !== cleanPhone);
            await this.saveAllowedPhones(filtered);
        } catch (error) {
            console.error('NeTelegram DB Error - removeAllowedPhone:', error);
        }
    },

    /**
     * Set pinned message for a chat
     * @param {string} chatId - Chat ID
     * @param {Object} message - Message to pin
     */
    async setPinnedMessage(chatId, message) {
        try {
            const chatRef = ref(database, `chats/${chatId}`);
            await update(chatRef, { pinnedMessage: message });
        } catch (error) {
            console.error('NeTelegram DB Error - setPinnedMessage:', error);
        }
    },

    /**
     * Remove pinned message from a chat
     * @param {string} chatId - Chat ID
     */
    async removePinnedMessage(chatId) {
        try {
            const chatRef = ref(database, `chats/${chatId}/pinnedMessage`);
            await remove(chatRef);
        } catch (error) {
            console.error('NeTelegram DB Error - removePinnedMessage:', error);
        }
    },

    /**
     * Get pinned message for a chat
     * @param {string} chatId - Chat ID
     * @returns {Promise<Object|null>} Pinned message or null
     */
    async getPinnedMessage(chatId) {
        try {
            const chatRef = ref(database, `chats/${chatId}/pinnedMessage`);
            const snapshot = await new Promise((resolve, reject) => {
                onValue(chatRef, (snapshot) => {
                    resolve(snapshot);
                }, reject);
            });
            
            return snapshot.val() || null;
        } catch (error) {
            console.error('NeTelegram DB Error - getPinnedMessage:', error);
            return null;
        }
    },

    /**
     * Delete a message from a chat
     * @param {string} chatId - Chat ID
     * @param {string} messageId - Message ID
     * @returns {Promise<Object>} Result object
     */
    async deleteMessage(chatId, messageId) {
        try {
            const chatRef = ref(database, `chats/${chatId}`);
            const snapshot = await new Promise((resolve, reject) => {
                onValue(chatRef, (snapshot) => {
                    resolve(snapshot);
                }, reject);
            });
            
            const chat = snapshot.val();
            if (!chat) {
                return { success: false, error: 'Чат не найден' };
            }
            
            const messages = chat.messages || [];
            const msgIndex = messages.findIndex(msg => msg.id === messageId);
            
            if (msgIndex === -1) {
                return { success: false, error: 'Сообщение не найдено' };
            }
            
            // Remove the message
            messages.splice(msgIndex, 1);
            await update(chatRef, { messages: messages });
            
            // Also remove from pinned if it was pinned
            if (chat.pinnedMessage && chat.pinnedMessage.id === messageId) {
                await this.removePinnedMessage(chatId);
            }
            
            return { success: true };
        } catch (error) {
            console.error('NeTelegram DB Error - deleteMessage:', error);
            return { success: false, error: 'Ошибка при удалении сообщения' };
        }
    },

    /**
     * Initialize the 8A group chat
     */
    async initGroupChat() {
        try {
            const chats = await this.getChats();
            const groupChatExists = chats.some(chat => chat.type === 'group' && chat.id === 'group_8a');
            
            if (!groupChatExists) {
                const groupChat = {
                    id: 'group_8a',
                    type: 'group',
                    name: 'БЕСЕДА 8А',
                    participants: [], // All users are participants
                    messages: [],
                    createdAt: new Date().toISOString(),
                    pinned: true
                };
                
                const chatRef = ref(database, `chats/${groupChat.id}`);
                await set(chatRef, groupChat);
                console.log('NeTelegram: Group chat 8A created');
            }
        } catch (error) {
            console.error('NeTelegram DB Error - initGroupChat:', error);
        }
    },

    /**
     * Get all chats from Firebase
     * @returns {Promise<Array>} Array of chat objects
     */
    async getChats() {
        try {
            const snapshot = await new Promise((resolve, reject) => {
                onValue(this.CHATS_REF, (snapshot) => {
                    resolve(snapshot);
                }, reject);
            });
            
            const chats = snapshot.val();
            return chats ? Object.values(chats) : [];
        } catch (error) {
            console.error('NeTelegram DB Error - getChats:', error);
            return [];
        }
    },

    /**
     * Save chats array to Firebase
     * @param {Array} chats - Array of chat objects
     */
    async saveChats(chats) {
        try {
            const chatPromises = chats.map(chat => {
                const chatRef = ref(database, `chats/${chat.id}`);
                return set(chatRef, chat);
            });
            await Promise.all(chatPromises);
        } catch (error) {
            console.error('NeTelegram DB Error - saveChats:', error);
        }
    },

    /**
     * Get chat by ID
     * @param {string} chatId - Chat ID
     * @returns {Promise<Object|null>} Chat object or null
     */
    async getChatById(chatId) {
        try {
            const chatRef = ref(database, `chats/${chatId}`);
            const snapshot = await new Promise((resolve, reject) => {
                onValue(chatRef, (snapshot) => {
                    resolve(snapshot);
                }, reject);
            });
            
            return snapshot.val() || null;
        } catch (error) {
            console.error('NeTelegram DB Error - getChatById:', error);
            return null;
        }
    },

    /**
     * Get or create personal chat between two users
     * @param {string} userId1 - First user ID
     * @param {string} userId2 - Second user ID
     * @returns {Promise<Object>} Chat object
     */
    async getOrCreatePersonalChat(userId1, userId2) {
        try {
            const chats = await this.getChats();
            
            // Check if chat already exists
            const existingChat = chats.find(chat => 
                chat.type === 'personal' && 
                chat.participants &&
                chat.participants.includes(userId1) && 
                chat.participants.includes(userId2)
            );
            
            if (existingChat) {
                return existingChat;
            }
            
            // Create new personal chat
            const newChat = {
                id: 'personal_' + Date.now(),
                type: 'personal',
                participants: [userId1, userId2],
                messages: [],
                createdAt: new Date().toISOString(),
                pinned: false
            };
            
            const chatRef = ref(database, `chats/${newChat.id}`);
            await set(chatRef, newChat);
            
            return newChat;
        } catch (error) {
            console.error('NeTelegram DB Error - getOrCreatePersonalChat:', error);
            throw error;
        }
    },

    /**
     * Send a message to a chat
     * @param {string} chatId - Chat ID
     * @param {string} senderId - Sender user ID
     * @param {string} content - Message content
     * @param {string} type - Message type (text, image, video, audio)
     * @returns {Promise<Object>} Result object
     */
    async sendMessage(chatId, senderId, content, type = 'text') {
        try {
            const chatRef = ref(database, `chats/${chatId}`);
            const snapshot = await new Promise((resolve, reject) => {
                onValue(chatRef, (snapshot) => {
                    resolve(snapshot);
                }, reject);
            });
            
            const chat = snapshot.val();
            if (!chat) {
                return { success: false, error: 'Чат не найден' };
            }
            
            const message = {
                id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                senderId: senderId,
                content: content,
                type: type,
                timestamp: new Date().toISOString()
            };
            
            const messages = chat.messages || [];
            messages.push(message);
            
            await update(chatRef, { messages: messages });
            
            return { success: true, message };
        } catch (error) {
            console.error('NeTelegram DB Error - sendMessage:', error);
            return { success: false, error: 'Ошибка при отправке сообщения' };
        }
    },

    /**
     * Get messages for a chat
     * @param {string} chatId - Chat ID
     * @returns {Promise<Array>} Array of messages
     */
    async getChatMessages(chatId) {
        try {
            const chat = await this.getChatById(chatId);
            return chat ? (chat.messages || []) : [];
        } catch (error) {
            console.error('NeTelegram DB Error - getChatMessages:', error);
            return [];
        }
    },

    /**
     * Get user chats (including group chat and personal chats)
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of chats user is participant of
     */
    async getUserChats(userId) {
        try {
            const chats = await this.getChats();
            return chats.filter(chat => {
                if (chat.type === 'group') return true; // All users can see group chat
                return chat.participants && chat.participants.includes(userId);
            });
        } catch (error) {
            console.error('NeTelegram DB Error - getUserChats:', error);
            return [];
        }
    },

    /**
     * Get all users except current user
     * @param {string} currentUserId - Current user ID
     * @returns {Promise<Array>} Array of user objects
     */
    async getOtherUsers(currentUserId) {
        try {
            const users = await this.getUsers();
            return users.filter(user => user.id !== currentUserId);
        } catch (error) {
            console.error('NeTelegram DB Error - getOtherUsers:', error);
            return [];
        }
    },

    /**
     * Get user info by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User object or null
     */
    async getUserInfo(userId) {
        try {
            const users = await this.getUsers();
            return users.find(user => user.id === userId) || null;
        } catch (error) {
            console.error('NeTelegram DB Error - getUserInfo:', error);
            return null;
        }
    },

    /**
     * Get chat name for display
     * @param {Object} chat - Chat object
     * @param {string} currentUserId - Current user ID
     * @returns {string} Display name
     */
    getChatDisplayName(chat, currentUserId) {
        if (chat.type === 'group') {
            return chat.name;
        }
        
        // Personal chat - get other user's name
        const otherUserId = chat.participants && chat.participants.find(id => id !== currentUserId);
        if (otherUserId) {
            const user = this.getUserInfo(otherUserId);
            return user ? user.nickname : 'Неизвестный';
        }
        
        return 'Чат';
    },

    /**
     * Get all users from Firebase
     * @returns {Promise<Array>} Array of user objects
     */
    async getUsers() {
        try {
            const snapshot = await new Promise((resolve, reject) => {
                onValue(this.USERS_REF, (snapshot) => {
                    resolve(snapshot);
                }, reject);
            });
            
            const users = snapshot.val();
            return users ? Object.values(users) : [];
        } catch (error) {
            console.error('NeTelegram DB Error - getUsers:', error);
            return [];
        }
    },

    /**
     * Save user to Firebase
     * @param {Object} user - User object
     */
    async saveUser(user) {
        try {
            const userRef = ref(database, `users/${user.id}`);
            await set(userRef, user);
        } catch (error) {
            console.error('NeTelegram DB Error - saveUser:', error);
        }
    },

    /**
     * Generate unique ID for new users
     * @returns {string} Unique ID
     */
    generateId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Check if nickname already exists
     * @param {string} nickname - Nickname to check
     * @returns {Promise<boolean>} True if nickname exists
     */
    async isNicknameTaken(nickname) {
        try {
            const users = await this.getUsers();
            return users.some(user => user.nickname.toLowerCase() === nickname.toLowerCase());
        } catch (error) {
            console.error('NeTelegram DB Error - isNicknameTaken:', error);
            return false;
        }
    },

    /**
     * Register a new user
     * @param {Object} userData - User data object
     * @returns {Promise<Object>} Result object with success status and user/error
     */
    async registerUser(userData) {
        try {
            const { phone, nickname, password, photo } = userData;

            // Validate input
            if (!phone || !nickname || !password) {
                return {
                    success: false,
                    error: 'Все поля обязательны для заполнения'
                };
            }

            // Check nickname uniqueness
            if (await this.isNicknameTaken(nickname)) {
                return {
                    success: false,
                    error: 'Этот ник уже занят'
                };
            }

            // Validate password length
            if (password.length < 4) {
                return {
                    success: false,
                    error: 'Пароль должен быть не менее 4 символов'
                };
            }

            // Create new user
            const newUser = {
                id: this.generateId(),
                nickname: nickname,
                password: password,
                phone: phone,
                role: 'user',
                photo: photo || null,
                createdAt: new Date().toISOString()
            };

            // Save user
            await this.saveUser(newUser);

            return {
                success: true,
                user: {
                    id: newUser.id,
                    nickname: newUser.nickname,
                    phone: newUser.phone,
                    role: newUser.role,
                    photo: newUser.photo
                }
            };
        } catch (error) {
            console.error('NeTelegram DB Error - registerUser:', error);
            return {
                success: false,
                error: 'Ошибка при регистрации'
            };
        }
    },

    /**
     * Authenticate user login
     * @param {string} nickname - User nickname
     * @param {string} password - User password
     * @returns {Promise<Object>} Result object with success status and user/error
     */
    async loginUser(nickname, password) {
        try {
            // Validate input
            if (!nickname || !password) {
                return {
                    success: false,
                    error: 'Введите ник и пароль'
                };
            }

            const users = await this.getUsers();
            const user = users.find(u => 
                u.nickname.toLowerCase() === nickname.toLowerCase() && 
                u.password === password
            );

            if (!user) {
                return {
                    success: false,
                    error: 'Неверный ник или пароль'
                };
            }

            // Create session
            await this.createSession(user);

            return {
                success: true,
                user: {
                    id: user.id,
                    nickname: user.nickname,
                    phone: user.phone,
                    role: user.role,
                    photo: user.photo
                }
            };
        } catch (error) {
            console.error('NeTelegram DB Error - loginUser:', error);
            return {
                success: false,
                error: 'Ошибка при входе'
            };
        }
    },

    /**
     * Create user session
     * @param {Object} user - User object
     */
    async createSession(user) {
        try {
            const session = {
                userId: user.id,
                nickname: user.nickname,
                photo: user.photo,
                role: user.role,
                loggedInAt: new Date().toISOString()
            };
            
            const sessionRef = ref(database, `sessions/${user.id}`);
            await set(sessionRef, session);
        } catch (error) {
            console.error('NeTelegram DB Error - createSession:', error);
        }
    },

    /**
     * Get current session
     * @returns {Promise<Object|null>} Session object or null
     */
    async getSession() {
        try {
            // For simplicity, we'll store session in localStorage for now
            // In a real Firebase app, you'd use Firebase Auth
            const sessionJSON = localStorage.getItem('neTelegramSession');
            return sessionJSON ? JSON.parse(sessionJSON) : null;
        } catch (error) {
            console.error('NeTelegram DB Error - getSession:', error);
            return null;
        }
    },

    /**
     * Check if user is logged in
     * @returns {Promise<boolean>} True if user is logged in
     */
    async isLoggedIn() {
        return await this.getSession() !== null;
    },

    /**
     * Logout current user
     */
    async logout() {
        try {
            const session = await this.getSession();
            if (session) {
                const sessionRef = ref(database, `sessions/${session.userId}`);
                await remove(sessionRef);
            }
            localStorage.removeItem('neTelegramSession');
        } catch (error) {
            console.error('NeTelegram DB Error - logout:', error);
        }
    },

    /**
     * Get user by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User object or null
     */
    async getUserById(userId) {
        try {
            const users = await this.getUsers();
            return users.find(u => u.id === userId) || null;
        } catch (error) {
            console.error('NeTelegram DB Error - getUserById:', error);
            return null;
        }
    },

    /**
     * Update user data
     * @param {string} userId - User ID
     * @param {Object} updates - Object with fields to update
     * @returns {Promise<Object>} Result object with success status
     */
    async updateUser(userId, updates) {
        try {
            const userRef = ref(database, `users/${userId}`);
            await update(userRef, updates);
            
            // Update session if needed
            const session = await this.getSession();
            if (session && session.userId === userId) {
                await this.createSession({ ...session, ...updates });
            }

            return {
                success: true
            };
        } catch (error) {
            console.error('NeTelegram DB Error - updateUser:', error);
            return {
                success: false,
                error: 'Ошибка при обновлении профиля'
            };
        }
    },

    /**
     * Get current logged in user
     * @returns {Promise<Object|null>} User object or null
     */
    async getCurrentUser() {
        try {
            const session = await this.getSession();
            if (!session) return null;
            return await this.getUserById(session.userId);
        } catch (error) {
            console.error('NeTelegram DB Error - getCurrentUser:', error);
            return null;
        }
    }
};

// Initialize database on load
document.addEventListener('DOMContentLoaded', () => {
    NeTelegramDB.init();
});

// Export for use in other modules
export default NeTelegramDB;