/**
 * AdsMoney - Telegram Mini App
 * Main Application JavaScript
 */

// Initialize Telegram Web App
const tg = window.Telegram.WebApp;

// Ready the app
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

/**
 * Initialize the application
 */
function initApp() {
    // Expand Telegram Web App to full height
    if (tg && tg.expand) {
        tg.expand();
    }

    // Initialize navigation
    initNavigation();
    
    // Initialize tabs
    initTabs();
    
    // Initialize buttons
    initButtons();
    
    // Initialize animations
    initAnimations();
    
    // Set initial screen
    setActiveScreen('screen-ads');
    
    console.log('AdsMoney App initialized');
}

/**
 * Navigation System
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const screenId = item.getAttribute('data-screen');
            
            // Update navigation
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Switch screen
            setActiveScreen(screenId);
            
            // Haptic feedback (Telegram)
            if (tg && tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
        });
    });
}

/**
 * Set active screen
 */
function setActiveScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    
    screens.forEach(screen => {
        screen.classList.remove('active');
        if (screen.id === screenId) {
            screen.classList.add('active');
            // Scroll to top of screen
            screen.scrollTop = 0;
        }
    });
    
    // Update navigation state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(nav => {
        nav.classList.remove('active');
        if (nav.getAttribute('data-screen') === screenId) {
            nav.classList.add('active');
        }
    });
}

/**
 * Tabs System
 */
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // Update tab buttons
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show corresponding content
            const leaderboardEarnings = document.getElementById('leaderboard-earnings');
            const leaderboardReferrals = document.getElementById('leaderboard-referrals');
            
            if (tabId === 'earnings') {
                leaderboardEarnings.classList.remove('hidden');
                leaderboardReferrals.classList.add('hidden');
            } else if (tabId === 'referrals') {
                leaderboardEarnings.classList.add('hidden');
                leaderboardReferrals.classList.remove('hidden');
            }
            
            // Haptic feedback
            if (tg && tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
        });
    });
}

/**
 * Initialize buttons
 */
function initButtons() {
    // Watch Ads Button
    const watchAdsBtn = document.querySelector('.watch-ads-btn');
    if (watchAdsBtn) {
        watchAdsBtn.addEventListener('click', () => {
            // Simulate opening AdsGram ad
            showToast('📺 Открываем рекламу...');
            
            if (tg && tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('heavy');
            }
            
            // In real implementation, this would open AdsGram
            // For demo, we show a toast
            setTimeout(() => {
                showToast('✅ Реклама просмотрена! +0.05 TON');
            }, 2000);
        });
    }
    
    // Gmail Action Button
    const gmailActionBtn = document.querySelector('.action-btn');
    if (gmailActionBtn) {
        gmailActionBtn.addEventListener('click', () => {
            showToast('📧 Переход к регистрации Gmail...');
            
            if (tg && tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('medium');
            }
        });
    }
    
    // Add Gmail Button
    const addGmailBtn = document.querySelector('.add-gmail-btn');
    if (addGmailBtn) {
        addGmailBtn.addEventListener('click', () => {
            showToast('➕ Форма добавления Gmail');
            
            if (tg && tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
        });
    }
    
    // Share Button
    const shareBtn = document.querySelector('.share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            shareReferralLink();
        });
    }
    
    // Withdraw Button
    const withdrawBtn = document.querySelector('.withdraw-btn');
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', () => {
            showToast('💳 Открытие формы вывода средств...');
            
            if (tg && tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('heavy');
            }
            
            setTimeout(() => {
                showToast('⏳ Минимальная сумма: 5 TON');
            }, 1500);
        });
    }
}

/**
 * Copy referral link
 */
function copyRefLink() {
    const refLink = document.querySelector('.ref-link');
    
    if (refLink) {
        const linkText = refLink.value;
        
        // Copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(linkText).then(() => {
                showToast('📋 Ссылка скопирована!');
            }).catch(() => {
                fallbackCopy(linkText);
            });
        } else {
            fallbackCopy(linkText);
        }
        
        if (tg && tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    }
}

/**
 * Fallback copy method
 */
function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast('📋 Ссылка скопирована!');
    } catch (err) {
        showToast('❌ Не удалось скопировать');
    }
    
    document.body.removeChild(textArea);
}

/**
 * Share referral link
 */
function shareReferralLink() {
    const refLink = document.querySelector('.ref-link');
    
    if (refLink) {
        const linkText = refLink.value;
        const shareText = `🔥 Зарабатывай на просмотре рекламы в AdsMoney! Используй мою ссылку: ${linkText}`;
        
        // Try Telegram share
        if (tg && tg.shareURL) {
            tg.shareURL(linkText, 'Зарабатывай на просмотре рекламы в AdsMoney!');
        } else if (navigator.share) {
            navigator.share({
                title: 'AdsMoney',
                text: 'Зарабатывай на просмотре рекламы!',
                url: linkText
            }).catch(() => {
                fallbackCopy(linkText);
                showToast('📋 Ссылка скопирована!');
            });
        } else {
            fallbackCopy(linkText);
            showToast('📋 Ссылка скопирована!');
        }
        
        if (tg && tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    }
}

/**
 * Show toast notification
 */
function showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Show toast
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3000);
}

/**
 * Initialize animations
 */
function initAnimations() {
    // Add intersection observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe glass cards
    const glassCards = document.querySelectorAll('.glass-card');
    glassCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(card);
    });
    
    // Animate balance card on load
    const balanceCard = document.querySelector('.balance-card');
    if (balanceCard) {
        balanceCard.style.opacity = '0';
        balanceCard.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            balanceCard.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            balanceCard.style.opacity = '1';
            balanceCard.style.transform = 'translateY(0)';
        }, 200);
    }
    
    // Animate watch button
    const watchBtn = document.querySelector('.watch-ads-btn');
    if (watchBtn) {
        watchBtn.style.opacity = '0';
        watchBtn.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            watchBtn.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            watchBtn.style.opacity = '1';
            watchBtn.style.transform = 'scale(1)';
        }, 400);
    }
}

/**
 * Simulate balance update (for demo purposes)
 */
function updateBalance(newBalance) {
    const amountElement = document.querySelector('.amount');
    const usdElement = document.querySelector('.balance-usd');
    
    if (amountElement) {
        // Animate number change
        const currentBalance = parseFloat(amountElement.textContent);
        const targetBalance = newBalance;
        const duration = 500;
        const startTime = performance.now();
        
        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const current = currentBalance + (targetBalance - currentBalance) * easeOut;
            amountElement.textContent = current.toFixed(2);
            
            if (usdElement) {
                const usdValue = current * 7; // Approximate TON to USD
                usdElement.textContent = `≈ $${usdValue.toFixed(2)} USD`;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }
}

/**
 * Simulate adding a new email (for demo purposes)
 */
function addGmailEmail(email) {
    const gmailList = document.querySelector('.gmail-list');
    
    if (gmailList) {
        const newItem = document.createElement('div');
        newItem.className = 'gmail-item';
        newItem.innerHTML = `
            <span class="gmail-status verified">✓</span>
            <span class="gmail-address">${email}</span>
            <span class="gmail-earnings">+0.5 TON</span>
        `;
        
        // Insert before the add button
        const addBtn = gmailList.querySelector('.add-gmail-btn');
        gmailList.insertBefore(newItem, addBtn);
        
        // Animate entry
        newItem.style.opacity = '0';
        newItem.style.transform = 'translateX(-20px)';
        requestAnimationFrame(() => {
            newItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            newItem.style.opacity = '1';
            newItem.style.transform = 'translateX(0)';
        });
        
        // Update balance
        const currentBalance = parseFloat(document.querySelector('.amount').textContent);
        updateBalance(currentBalance + 0.5);
        
        showToast(`✅ ${email} добавлен! +0.5 TON`);
    }
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format TON amount
 */
function formatTON(amount) {
    return `${parseFloat(amount).toFixed(2)} TON`;
}

// Export functions for global access
window.copyRefLink = copyRefLink;
window.showToast = showToast;
window.updateBalance = updateBalance;
window.formatTON = formatTON;

// Handle Telegram theme changes
if (tg && tg.onEvent) {
    tg.onEvent('themeChanged', () => {
        console.log('Telegram theme changed');
        // Could update colors based on Telegram theme
    });
}

// Handle visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // App became visible, could refresh data
        console.log('App became visible');
    }
});

// Prevent pull-to-refresh on mobile
document.addEventListener('touchmove', (e) => {
    if (e.touches[0].clientY <= 10 && window.scrollY === 0) {
        e.preventDefault();
    }
}, { passive: false });

// Log app ready
console.log('AdsMoney App JS loaded');