import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, addDoc, onSnapshot, getDocs, query, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBYzmAZQ8sKHjXgVh_t-vbtYN_gRzBstw8",
    authDomain: "ticket-backend-5ee83.firebaseapp.com",
    projectId: "ticket-backend-5ee83",
    storageBucket: "ticket-backend-5ee83.firebasestorage.app",
    messagingSenderId: "370130815796",
    appId: "1:370130815796:web:33df8249fcc68ddc0f7361",
    measurementId: "G-CED9W20PBK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// 2. CONSTANTS & GLOBAL STATE
// ==========================================
const APP_COLLECTION_ROOT = 'ticket_events_data';
const ADMIN_EMAIL = 'admin.test@gmail.com';

const MANAGED_USERS = [
    { email: 'eveman.test@gmail.com', role: 'Event Manager' },
    { email: 'regdesk.test@gmail.com', role: 'Registration Desk' },
    { email: 'sechead.test@gmail.com', role: 'Security Head' }
];

// User & Auth State
let currentUser = null;
let currentDeviceId = null;

// Firestore Unsubscribers
let ticketsUnsubscribe = null;
let settingsUnsubscribe = null;
let adminPresenceUnsubscribes = []; // Array to store multiple listeners for admin

// Intervals
let autoCheckInterval = null;
let heartbeatInterval = null;
let adminUiRefreshInterval = null;

// Data State
let bookedTickets = [];
let currentFilteredTickets = []; 
let selectedTicketIds = new Set(); 
let eventSettings = { name: '', place: '', deadline: '' };

// Admin/Security State
let remoteLockedTabs = []; // Tabs locked for this user
let selectedUserForConfig = null; // Admin selection
let managedUsersDeviceCache = {}; // Cache for instant admin updates

// UI State
let searchTerm = '';
let currentFilter = 'all'; 
let currentGenderFilter = 'all';
let currentSort = 'newest';
let isSelectionMode = false;
let isCooldown = false; // For scanner

// ==========================================
// 3. DOM ELEMENT SELECTION
// ==========================================

// Login & Loading
const loginOverlay = document.getElementById('login-overlay');
const loadingScreen = document.getElementById('loading-screen');
const appContent = document.getElementById('appContent');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const togglePassword = document.getElementById('togglePassword');
const loginButton = document.getElementById('loginButton');
const authError = document.getElementById('auth-error');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const logoutBtn = document.getElementById('logoutBtn');

// Navigation
const navButtons = document.querySelectorAll('.nav-btn');
const tabs = document.querySelectorAll('.tab-content');

// Admin Panel
const adminLockPanel = document.getElementById('admin-lock-panel');
const userLockStatus = document.getElementById('user-lock-status');
const managedUsersList = document.getElementById('managed-users-list');
const userLockConfigArea = document.getElementById('user-lock-config-area');
const selectedUserEmailSpan = document.getElementById('selected-user-email');
const remoteLockCheckboxes = document.querySelectorAll('.remote-lock-checkbox');
const triggerLockModalBtn = document.getElementById('triggerLockModalBtn');

// Admin Lock Modal
const adminLockModal = document.getElementById('admin-lock-modal');
const lockTargetEmailSpan = document.getElementById('lock-target-email');
const adminLockPassword = document.getElementById('adminLockPassword');
const cancelAdminLock = document.getElementById('cancelAdminLock');
const confirmAdminLock = document.getElementById('confirmAdminLock');

// Scanner
const startScanBtn = document.getElementById('startScanBtn');
const scannerVideo = document.getElementById('scanner-video');
const scanResult = document.getElementById('scanResult');

// Guest List & Filters
const bookedTicketsTable = document.getElementById('bookedTicketsTable');
const refreshStatusIndicator = document.getElementById('refreshStatusIndicator');
const searchInput = document.getElementById('searchGuestInput');
const filterSortBtn = document.getElementById('filterSortBtn');
const filterDropdown = document.getElementById('filterDropdown');

// Selection & Export
const selectBtn = document.getElementById('selectBtn');
const deleteBtn = document.getElementById('deleteBtn');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const selectAllContainer = document.querySelector('.select-all-container');
const selectionCountSpan = document.getElementById('selectionCount');
const exportTriggerBtn = document.getElementById('exportTriggerBtn');
const exportModal = document.getElementById('export-modal');
const exportFileName = document.getElementById('exportFileName');
const exportFormat = document.getElementById('exportFormat');
const cancelExportBtn = document.getElementById('cancelExport');
const confirmExportBtn = document.getElementById('confirmExport');
const exportCountMsg = document.getElementById('export-count-msg');

// Ticket Creation & Views
const ticketForm = document.getElementById('ticketForm');
const eventSettingsForm = document.getElementById('eventSettingsForm');
const whatsappBtn = document.getElementById('whatsappBtn');
const ticketViewModal = document.getElementById('ticket-view-modal');
const closeTicketModal = document.getElementById('closeTicketModal');
const modalWhatsAppBtn = document.getElementById('modalWhatsAppBtn');

// Delete Modal
const confirmModal = document.getElementById('confirm-modal');
const deleteCountSpan = document.getElementById('delete-count');
const cancelDeleteBtn = document.getElementById('cancelDelete');
const confirmDeleteBtn = document.getElementById('confirmDelete');
let pendingDeleteIds = [];

// Contact Tray
const contactTray = document.getElementById('contactTray');
const trayToggle = document.getElementById('trayToggle');
const trayIcon = document.getElementById('trayIcon');


// ==========================================
// 4. HEARTBEAT & PRESENCE LOGIC
// ==========================================

// Helper to generate a persistent ID for this browser
function getDeviceId() {
    let id = localStorage.getItem('device_session_id');
    if (!id) {
        id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('device_session_id', id);
    }
    return id;
}

function startHeartbeat(userEmail) {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    currentDeviceId = getDeviceId();
    
    // Immediate update
    updateHeartbeat(userEmail);

    // Update every 10 seconds
    heartbeatInterval = setInterval(() => {
        updateHeartbeat(userEmail);
    }, 10000);
}

async function updateHeartbeat(userEmail) {
    try {
        // Path: /global_presence/{userEmail}/devices/{deviceId}
        const deviceRef = doc(db, 'global_presence', userEmail, 'devices', currentDeviceId);
        
        await setDoc(deviceRef, {
            lastSeen: Date.now(),
            userAgent: navigator.userAgent
        }, { merge: true });
    } catch (e) {
        console.error("Heartbeat failed (Check Rules):", e);
    }
}


// ==========================================
// 5. AUTHENTICATION LIFECYCLE
// ==========================================

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // --- LOGGED IN ---
        currentUser = user;
        userEmailDisplay.textContent = user.email;
        
        // UI Transitions
        loadingScreen.style.display = 'none';
        loginOverlay.style.display = 'none';
        appContent.style.display = 'block';
        
        // 1. Setup Standard Data Listeners (Tickets, Settings)
        setupRealtimeListeners(user.uid);
        
        // 2. Start Presence Heartbeat (So Admin sees us)
        startHeartbeat(user.email);

        // 3. Conditional Setup based on Role
        if (user.email === ADMIN_EMAIL) {
            setupAdminPanel();
        } else {
            // Listen for locks applied TO this user
            listenForRemoteLocks(user.email);
            // UI Adjustments for non-admin
            adminLockPanel.style.display = 'none';
            userLockStatus.style.display = 'block';
        }

        // 4. Start Auto-Sync for Guest List (15s)
        if(autoCheckInterval) clearInterval(autoCheckInterval);
        autoCheckInterval = setInterval(performSync, 15000);

    } else {
        // --- LOGGED OUT ---
        currentUser = null;
        
        // UI Transitions
        loadingScreen.style.display = 'none';
        loginOverlay.style.display = 'flex';
        appContent.style.display = 'none';
        
        // Cleanup
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (adminUiRefreshInterval) clearInterval(adminUiRefreshInterval);
        if (ticketsUnsubscribe) ticketsUnsubscribe();
        if (settingsUnsubscribe) settingsUnsubscribe();
        
        // Unsubscribe all admin listeners
        adminPresenceUnsubscribes.forEach(unsub => unsub());
        adminPresenceUnsubscribes = [];
    }
});

// Login Button Action
loginButton.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    authError.style.display = 'none';
    loginButton.textContent = "Verifying...";
    loginButton.disabled = true;

    if (!email || !password) {
        showError("Please enter email and password.");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Login Error:", error);
        showError("Access Denied. Please check credentials.");
    } finally {
        loginButton.textContent = "Authenticate";
        loginButton.disabled = false;
    }
});

function showError(msg) {
    authError.textContent = msg;
    authError.style.display = 'block';
    loginButton.textContent = "Authenticate";
    loginButton.disabled = false;
}

// Logout Button Action
logoutBtn.addEventListener('click', () => {
    signOut(auth);
    // Reloading ensures a clean state
    window.location.reload();
});

// Password Visibility Toggle
if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
}


// ==========================================
// 6. INSTANT ADMIN DASHBOARD LOGIC
// ==========================================

function setupAdminPanel() {
    adminLockPanel.style.display = 'block';
    userLockStatus.style.display = 'none';
    
    // Clear old listeners if re-initializing
    adminPresenceUnsubscribes.forEach(unsub => unsub());
    adminPresenceUnsubscribes = [];
    managedUsersDeviceCache = {};

    // 1. Attach Real-time Listener for EACH user
    MANAGED_USERS.forEach(user => {
        const devicesRef = collection(db, 'global_presence', user.email, 'devices');
        
        // This triggers INSTANTLY whenever any device document changes (heartbeat update)
        const unsub = onSnapshot(devicesRef, (snapshot) => {
            const timestamps = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if(data.lastSeen) timestamps.push(data.lastSeen);
            });
            
            // Update cache
            managedUsersDeviceCache[user.email] = timestamps;
            
            // Re-render purely for status updates
            renderManagedUsersList();
        });

        adminPresenceUnsubscribes.push(unsub);
    });

    // 2. Set interval ONLY for local timeout check (rendering only, no network calls)
    if(adminUiRefreshInterval) clearInterval(adminUiRefreshInterval);
    adminUiRefreshInterval = setInterval(renderManagedUsersList, 5000); 
    
    // Initial Render
    renderManagedUsersList();
}

function renderManagedUsersList() {
    // Pure rendering function - UPDATED to prevent recreating DOM elements
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return;
    
    const container = managedUsersList;
    const now = Date.now();

    // 1. Initial Creation: Only build if empty
    if (container.children.length === 0) {
        MANAGED_USERS.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.dataset.email = user.email; // Use data attribute to identify
            
            // Use JS onclick to avoid global namespace scope issues in modules
            card.onclick = () => selectUserForConfig(user.email);
            
            card.innerHTML = `
                <div class="user-card-info">
                    <span class="user-card-email">${user.email}</span>
                    <span class="user-card-role">${user.role}</span>
                </div>
                <div class="user-status-indicator" data-status-target="${user.email}">
                    Offline
                </div>
            `;
            container.appendChild(card);
        });
    }

    // 2. Update existing elements (Diffing logic)
    Array.from(container.children).forEach(card => {
        const email = card.dataset.email;
        if (!email) return;

        // A. Handle Active Selection Highlight
        if (selectedUserForConfig === email) {
            if (!card.classList.contains('active-selection')) {
                card.classList.add('active-selection');
            }
        } else {
            if (card.classList.contains('active-selection')) {
                card.classList.remove('active-selection');
            }
        }

        // B. Handle Online/Offline Status
        const timestamps = managedUsersDeviceCache[email] || [];
        let activeDevices = 0;
        timestamps.forEach(ts => {
            if (now - ts < 30000) activeDevices++;
        });

        const isOnline = activeDevices > 0;
        const statusEl = card.querySelector(`[data-status-target="${email}"]`);
        
        const newClass = isOnline ? 'online' : '';
        const newText = isOnline 
            ? `<span class="status-dot-pulse"></span>Online • ${activeDevices} Device${activeDevices > 1 ? 's' : ''}` 
            : 'Offline';

        // Update class only if needed
        const baseClass = 'user-status-indicator';
        if (statusEl.className !== `${baseClass} ${newClass}`.trim()) {
            statusEl.className = `${baseClass} ${newClass}`.trim();
        }

        // Update HTML only if text changed (prevents micro-flashing)
        if (statusEl.innerHTML !== newText) {
            statusEl.innerHTML = newText;
        }
    });
}

// Global function exposed for HTML onclick events
async function selectUserForConfig(email) {
    selectedUserForConfig = email;
    selectedUserEmailSpan.textContent = email;
    userLockConfigArea.style.display = 'block';
    
    // Refresh list to show active highlight immediately
    renderManagedUsersList(); 
    
    // Reset checkboxes when switching users
    remoteLockCheckboxes.forEach(cb => cb.checked = false);
}

// Trigger Admin Lock Modal
triggerLockModalBtn.addEventListener('click', () => {
    if (!selectedUserForConfig) return;
    lockTargetEmailSpan.textContent = selectedUserForConfig;
    adminLockModal.style.display = 'flex';
    adminLockPassword.value = '';
    adminLockPassword.focus();
});

cancelAdminLock.addEventListener('click', () => {
    adminLockModal.style.display = 'none';
});

// Confirm & Write Lock to Firestore
confirmAdminLock.addEventListener('click', async () => {
    const password = adminLockPassword.value;
    if (!password) {
        alert("Please enter a password to secure this lock.");
        return;
    }
    
    const lockedTabs = [];
    remoteLockCheckboxes.forEach(cb => {
        if (cb.checked) lockedTabs.push(cb.value);
    });

    const lockRef = doc(db, 'global_locks', selectedUserForConfig);
    const originalText = confirmAdminLock.textContent;
    confirmAdminLock.textContent = "Syncing...";
    
    try {
        await setDoc(lockRef, {
            lockedTabs: lockedTabs,
            adminPassword: password,
            updatedAt: Date.now()
        }, { merge: true });
        
        showToast("Sync Successful", `Settings pushed to ${selectedUserForConfig}`);
        adminLockModal.style.display = 'none';
    } catch (e) {
        console.error("Lock sync failed:", e);
        alert("Failed to sync locks. Check permissions.");
    } finally {
        confirmAdminLock.textContent = originalText;
    }
});


// ==========================================
// 7. USER REMOTE LOCK LISTENER
// ==========================================

function listenForRemoteLocks(userEmail) {
    const lockRef = doc(db, 'global_locks', userEmail);
    
    onSnapshot(lockRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            applyRemoteLocks(data.lockedTabs || []);
        } else {
            applyRemoteLocks([]); 
        }
    });
}

function applyRemoteLocks(tabsToLock) {
    remoteLockedTabs = tabsToLock;
    const allNavs = document.querySelectorAll('.nav-btn');
    
    // 1. Reset visual state
    allNavs.forEach(btn => btn.classList.remove('locked'));

    // 2. Apply Lock Icons
    tabsToLock.forEach(tabName => {
        const btn = document.querySelector(`[data-tab="${tabName}"]`);
        if(btn) btn.classList.add('locked');
    });

    // 3. Security Kick
    const currentActive = document.querySelector('.nav-btn.active');
    if (currentActive && tabsToLock.includes(currentActive.dataset.tab)) {
        const allTabs = ['create', 'booked', 'scanner', 'settings'];
        const safeTab = allTabs.find(t => !tabsToLock.includes(t));
        
        if (safeTab) {
            document.querySelector(`[data-tab="${safeTab}"]`).click();
            showToast("Access Restricted", "Administrator has locked this tab.");
            playError();
        } else {
            document.querySelector('[data-tab="settings"]').click();
        }
    }
}


// ==========================================
// 8. VISUALS & UTILITIES
// ==========================================

function createStars() {
    const container = document.getElementById('star-container');
    const numberOfStars = 100;
    for (let i = 0; i < numberOfStars; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        const size = Math.random() * 3 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${Math.random() * 100}vw`;
        star.style.top = `${Math.random() * 100}vh`;
        star.style.animationDuration = `${Math.random() * 2 + 1}s`;
        container.appendChild(star);
    }
}
createStars();

function showToast(title, msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${msg}</div>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}

function playBeep() {
    const audio = new Audio('success.mp3');
    audio.play().catch(() => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.frequency.value = 800;
        osc.start();
        setTimeout(() => osc.stop(), 100);
    });
}

function playError() {
    const audio = new Audio('error.mp3');
    audio.play().catch(() => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.connect(ctx.destination);
        osc.frequency.value = 150;
        osc.start();
        setTimeout(() => osc.stop(), 300);
    });
}


// ==========================================
// 9. APP NAVIGATION & DATA SYNC
// ==========================================

navButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const targetTab = button.dataset.tab;

        // Security Check
        if (remoteLockedTabs.includes(targetTab)) {
            e.preventDefault();
            showToast("Access Denied", "This tab is currently locked by the Administrator.");
            playError();
            return;
        }

        if (scannerVideo.srcObject && button.dataset.tab !== 'scanner') {
            stopScan();
        }

        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.id === button.dataset.tab) {
                tab.classList.add('active');
            }
        });
    });
});

function setupRealtimeListeners(userId) {
    const ticketsRef = collection(db, APP_COLLECTION_ROOT, userId, 'tickets');
    const q = query(ticketsRef);
    
    ticketsUnsubscribe = onSnapshot(q, (snapshot) => {
        bookedTickets = [];
        snapshot.forEach((doc) => {
            bookedTickets.push({ id: doc.id, ...doc.data() });
        });
        renderBookedTickets();
    });

    const settingsRef = doc(db, APP_COLLECTION_ROOT, userId, 'settings', 'config');
    settingsUnsubscribe = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            eventSettings = docSnap.data();
            updateSettingsDisplay();
        }
    });
}

async function performSync() {
    if(!currentUser) return;
    const icon = refreshStatusIndicator.querySelector('i');
    if(icon) {
        icon.classList.add('fa-spin');
        icon.style.color = 'var(--accent-secondary)'; 
    }
    const startTime = Date.now();
    try {
        const ticketsRef = collection(db, APP_COLLECTION_ROOT, currentUser.uid, 'tickets');
        const q = query(ticketsRef);
        const snapshot = await getDocs(q);
        bookedTickets = [];
        snapshot.forEach((doc) => {
            bookedTickets.push({ id: doc.id, ...doc.data() });
        });
        renderBookedTickets();
    } catch (err) {
        console.error("Auto-sync error:", err);
    } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 1000 - elapsed);
        setTimeout(() => {
            if(icon) {
                icon.classList.remove('fa-spin');
                icon.style.color = ''; 
            }
        }, remaining);
    }
}
refreshStatusIndicator.addEventListener('click', performSync);


// ==========================================
// 10. TICKET CREATION & PREVIEW
// ==========================================

ticketForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const name = document.getElementById('name').value;
    const gender = document.getElementById('gender').value;
    const age = document.getElementById('age').value;
    const phone = document.getElementById('phone').value;

    const newTicket = {
        name,
        gender,
        age,
        phone: '+91' + phone,
        status: 'coming-soon',
        scanned: false,
        createdAt: Date.now()
    };

    try {
        const docRef = await addDoc(collection(db, APP_COLLECTION_ROOT, currentUser.uid, 'tickets'), newTicket);
        updateTicketPreview({ ...newTicket, id: docRef.id });
        ticketForm.reset();
        showToast("Success", "Ticket generated.");
    } catch (err) {
        alert("Error creating ticket");
    }
});

function updateTicketPreview(ticket) {
    document.getElementById('ticketName').textContent = ticket.name;
    document.getElementById('ticketAgeGender').textContent = `${ticket.age} / ${ticket.gender}`;
    document.getElementById('ticketPhone').textContent = ticket.phone;
    document.getElementById('ticketSerial').textContent = `ID: ${ticket.id}`;
    
    const qrcodeContainer = document.getElementById('qrcode');
    qrcodeContainer.innerHTML = '';
    new QRCode(qrcodeContainer, {
        text: ticket.id,
        width: 100,
        height: 100,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    whatsappBtn.disabled = false;
}

whatsappBtn.addEventListener('click', () => {
    const btn = whatsappBtn;
    const originalText = btn.textContent;
    btn.textContent = "Processing...";
    btn.disabled = true;

    const ticketTemplate = document.getElementById('ticketTemplate');
    const originalBorder = ticketTemplate.style.border;
    ticketTemplate.style.border = 'none';

    html2canvas(ticketTemplate, {
        scale: 3,
        backgroundColor: null, 
        useCORS: true
    }).then(canvas => {
        ticketTemplate.style.border = originalBorder;
        const now = new Date();
        const pad = (num) => String(num).padStart(2, '0');
        const timestamp = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const link = document.createElement('a');
        link.download = `ticket-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
            const phone = document.getElementById('ticketPhone').textContent.replace(/\D/g,'');
            const name = document.getElementById('ticketName').textContent;
            const message = encodeURIComponent(`Hello ${name}, here is your Entry Pass 🎫.\n*Keep this QR code ready at the entrance.*`);
            window.location.href = `https://wa.me/${phone}?text=${message}`;
            
            btn.textContent = originalText;
            btn.disabled = true;
            document.getElementById('ticketName').textContent = '--';
            document.getElementById('qrcode').innerHTML = '';
        }, 1500);
    }).catch(err => {
        console.error(err);
        btn.textContent = originalText;
        btn.disabled = false;
        alert("Error processing ticket.");
    });
});


// ==========================================
// 11. GUEST LIST LOGIC
// ==========================================

function renderBookedTickets() {
    bookedTicketsTable.innerHTML = '';
    
    const checkHeader = document.querySelector('.tickets-table thead th:first-child');
    if(checkHeader) {
        checkHeader.style.display = isSelectionMode ? 'table-cell' : 'none';
    }

    let displayTickets = bookedTickets.filter(ticket => {
        const matchesSearch = ticket.name.toLowerCase().includes(searchTerm) || ticket.phone.includes(searchTerm);
        if (!matchesSearch) return false;
        if (currentFilter !== 'all' && ticket.status !== currentFilter) return false;
        if (currentGenderFilter !== 'all' && ticket.gender !== currentGenderFilter) return false;
        return true;
    });

    displayTickets.sort((a, b) => {
        if (currentSort === 'newest') return b.createdAt - a.createdAt;
        if (currentSort === 'oldest') return a.createdAt - b.createdAt;
        if (currentSort === 'name-asc') return a.name.localeCompare(b.name);
        return 0;
    });

    currentFilteredTickets = displayTickets;

    if(displayTickets.length === 0) {
        bookedTicketsTable.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 30px; color: #666;">No matching guests found.</td></tr>';
        return;
    }

    const checkboxDisplayStyle = isSelectionMode ? 'table-cell' : 'none';

    displayTickets.forEach((ticket, index) => {
        const tr = document.createElement('tr');
        tr.dataset.id = ticket.id;
        
        let statusHtml = `<span class="status-badge status-${ticket.status}">${ticket.status.replace('-', ' ')}</span>`;
        if(ticket.status === 'arrived' && ticket.scannedAt) {
            const dateObj = new Date(ticket.scannedAt);
            const dateStr = dateObj.toLocaleDateString();
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            statusHtml += `<div style="font-size: 0.6rem; color: #888; margin-top: 3px; white-space: nowrap;">${dateStr}</div>`;
            statusHtml += `<div style="font-size: 0.6rem; color: #888; white-space: nowrap;">${timeStr}</div>`;
        }

        const isChecked = selectedTicketIds.has(ticket.id) ? 'checked' : '';

        tr.innerHTML = `
            <td style="display: ${checkboxDisplayStyle};"><input type="checkbox" class="ticket-checkbox" style="transform: scale(1.2);" ${isChecked}></td>
            <td style="text-align: center; color: var(--accent-secondary); font-weight: bold;">${index + 1}</td>
            <td style="font-weight: 500; color: white;">${ticket.name}</td>
            <td>${ticket.age} / ${ticket.gender}</td>
            <td>${ticket.phone}</td>
            <td style="font-family: monospace;">${ticket.id.substring(0, 8)}...</td>
            <td>${statusHtml}</td>
            <td><button class="action-btn-small view-ticket-btn" data-id="${ticket.id}">View</button></td>
        `;
        bookedTicketsTable.appendChild(tr);
    });

    document.querySelectorAll('.view-ticket-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ticket = bookedTickets.find(t => t.id === e.target.dataset.id);
            if(ticket) openTicketModal(ticket);
        });
    });

    document.querySelectorAll('.ticket-checkbox').forEach(box => {
        box.addEventListener('change', (e) => {
            const rowId = e.target.closest('tr').dataset.id;
            if(e.target.checked) selectedTicketIds.add(rowId);
            else selectedTicketIds.delete(rowId);
            updateSelectionCount();
        });
    });
}

searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase().trim();
    renderBookedTickets();
});

filterSortBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    filterDropdown.classList.toggle('show');
});

window.addEventListener('click', () => {
    filterDropdown.classList.remove('show');
});

document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = item.dataset.type;
        const val = item.dataset.val;
        document.querySelectorAll(`.dropdown-item[data-type="${type}"]`).forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        if(type === 'filter') currentFilter = val;
        if(type === 'filter-gender') currentGenderFilter = val;
        if(type === 'sort') currentSort = val;
        renderBookedTickets();
        filterDropdown.classList.remove('show');
    });
});


// ==========================================
// 12. SELECTION, DELETE & EXPORT
// ==========================================

function updateSelectionCount() {
    const count = selectedTicketIds.size;
    selectionCountSpan.textContent = `(${count} selected)`;
    exportTriggerBtn.disabled = count === 0;
    
    const allVisibleSelected = currentFilteredTickets.length > 0 && 
                               currentFilteredTickets.every(t => selectedTicketIds.has(t.id));
    
    if(currentFilteredTickets.length === 0) selectAllCheckbox.checked = false;
    else selectAllCheckbox.checked = allVisibleSelected;
}

selectBtn.addEventListener('click', () => {
    isSelectionMode = !isSelectionMode;
    deleteBtn.style.display = isSelectionMode ? 'inline-block' : 'none';
    selectAllContainer.style.display = isSelectionMode ? 'flex' : 'none'; 
    selectBtn.textContent = isSelectionMode ? 'Cancel' : 'Select';
    if(!isSelectionMode) {
        selectedTicketIds.clear(); 
        selectAllCheckbox.checked = false;
        updateSelectionCount();
    }
    renderBookedTickets(); 
});

selectAllCheckbox.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    currentFilteredTickets.forEach(t => {
        if(isChecked) selectedTicketIds.add(t.id);
        else selectedTicketIds.delete(t.id);
    });
    renderBookedTickets();
    updateSelectionCount();
});

deleteBtn.addEventListener('click', () => {
    const selectedIds = Array.from(selectedTicketIds);
    if(selectedIds.length === 0) return alert('Select tickets to delete');
    pendingDeleteIds = selectedIds;
    deleteCountSpan.textContent = selectedIds.length;
    confirmModal.style.display = 'flex';
});

cancelDeleteBtn.addEventListener('click', () => {
    confirmModal.style.display = 'none';
    pendingDeleteIds = [];
});

confirmDeleteBtn.addEventListener('click', async () => {
    if(pendingDeleteIds.length > 0) {
        confirmDeleteBtn.textContent = "Deleting...";
        for(const id of pendingDeleteIds) {
            await deleteDoc(doc(db, APP_COLLECTION_ROOT, currentUser.uid, 'tickets', id));
        }
        confirmModal.style.display = 'none';
        confirmDeleteBtn.textContent = "Delete";
        pendingDeleteIds = [];
        selectedTicketIds.clear(); 
        selectBtn.click(); 
    }
});

// Export Logic
exportTriggerBtn.addEventListener('click', () => {
    const count = selectedTicketIds.size;
    if(count === 0) return; 
    exportCountMsg.textContent = `Ready to export ${count} item${count !== 1 ? 's' : ''}.`;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
    exportFileName.value = `guest_list_${today}`;
    exportModal.style.display = 'flex';
});

cancelExportBtn.addEventListener('click', () => {
    exportModal.style.display = 'none';
});

confirmExportBtn.addEventListener('click', () => {
    const filename = exportFileName.value || 'guest_list';
    const format = exportFormat.value;
    
    let listToExport = [];
    if (selectedTicketIds.size > 0) {
        listToExport = currentFilteredTickets.filter(t => selectedTicketIds.has(t.id));
    } else {
        exportModal.style.display = 'none';
        return alert("No data selected to export.");
    }
    
    switch(format) {
        case 'csv': exportCSV(listToExport, filename); break;
        case 'xlsx': exportXLSX(listToExport, filename); break;
        case 'pdf': exportPDF(listToExport, filename); break;
        case 'txt': exportTXT(listToExport, filename); break;
        case 'json': exportJSON(listToExport, filename); break;
        case 'doc': exportDOC(listToExport, filename); break;
    }
    exportModal.style.display = 'none';
    showToast("Export Complete", `${listToExport.length} records saved.`);
});

function downloadFile(uri, filename) {
    const link = document.createElement("a");
    link.href = uri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportCSV(data, filename) {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "S.No.,Guest Name,Age,Gender,Phone,Status,Ticket ID,Entry Time\n";
    data.forEach((row, index) => {
        const scannedTime = row.scannedAt ? new Date(row.scannedAt).toLocaleTimeString() : "";
        const cleanName = row.name.replace(/,/g, ""); 
        const rowStr = `${index + 1},${cleanName},${row.age},${row.gender},${row.phone},${row.status},${row.id},${scannedTime}`;
        csvContent += rowStr + "\n";
    });
    downloadFile(encodeURI(csvContent), `${filename}.csv`);
}

function exportXLSX(data, filename) {
    const worksheetData = data.map((row, index) => ({
        "S.No.": index + 1,
        "Guest Name": row.name,
        "Age": row.age,
        "Gender": row.gender,
        "Phone": row.phone,
        "Status": row.status,
        "Ticket ID": row.id,
        "Entry Time": row.scannedAt ? new Date(row.scannedAt).toLocaleTimeString() : ""
    }));
    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Guests");
    XLSX.writeFile(wb, `${filename}.xlsx`);
}

function exportPDF(data, filename) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Event Guest List", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
    const tableColumn = ["#", "Name", "Age", "Gender", "Phone", "Status", "Entry Time"];
    const tableRows = [];
    data.forEach((row, index) => {
        tableRows.push([
            index + 1,
            row.name,
            row.age,
            row.gender,
            row.phone,
            row.status.toUpperCase(),
            row.scannedAt ? new Date(row.scannedAt).toLocaleTimeString() : "--"
        ]);
    });
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 32 });
    doc.save(`${filename}.pdf`);
}

function exportTXT(data, filename) {
    let content = `GUEST LIST EXPORT - ${new Date().toLocaleString()}\n\n`;
    data.forEach((row, i) => {
        content += `${i+1}. ${row.name.toUpperCase()} \n`;
        content += `   Details: ${row.age} / ${row.gender}\n`;
        content += `   Phone: ${row.phone}\n`;
        content += `   Status: ${row.status.toUpperCase()}\n`;
        if(row.scannedAt) content += `   Entry: ${new Date(row.scannedAt).toLocaleTimeString()}\n`;
        content += `   ID: ${row.id}\n`;
        content += "----------------------------------------\n";
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    downloadFile(url, `${filename}.txt`);
}

function exportJSON(data, filename) {
    const jsonWithSerial = data.map((item, index) => ({ s_no: index + 1, ...item }));
    const jsonStr = JSON.stringify(jsonWithSerial, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    downloadFile(url, `${filename}.json`);
}

function exportDOC(data, filename) {
    let htmlBody = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Guest List</title></head><body>
        <h2>Guest List Export</h2>
        <table border="1" style="border-collapse: collapse; width: 100%;">
            <tr style="background: #eee;">
                <th>S.No.</th><th>Name</th><th>Age/Gender</th><th>Phone</th><th>Status</th>
            </tr>
    `;
    data.forEach((row, index) => {
        htmlBody += `<tr><td>${index + 1}</td><td>${row.name}</td><td>${row.age} / ${row.gender}</td><td>${row.phone}</td><td>${row.status}</td></tr>`;
    });
    htmlBody += "</table></body></html>";
    const blob = new Blob(['\ufeff', htmlBody], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    downloadFile(url, `${filename}.doc`);
}


// ==========================================
// 13. TICKET VIEW MODAL
// ==========================================

function openTicketModal(ticket) {
    document.getElementById('modalTicketName').textContent = ticket.name;
    document.getElementById('modalTicketAgeGender').textContent = `${ticket.age} / ${ticket.gender}`;
    document.getElementById('modalTicketPhone').textContent = ticket.phone;
    document.getElementById('modalTicketSerial').textContent = `ID: ${ticket.id}`;
    
    const modalQrcodeContainer = document.getElementById('modalQrcode');
    modalQrcodeContainer.innerHTML = '';
    new QRCode(modalQrcodeContainer, {
        text: ticket.id,
        width: 100,
        height: 100,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    ticketViewModal.style.display = 'flex';
}

closeTicketModal.addEventListener('click', () => {
    ticketViewModal.style.display = 'none';
});

modalWhatsAppBtn.addEventListener('click', () => {
    const btn = modalWhatsAppBtn;
    const originalContent = btn.innerHTML;
    btn.textContent = "Processing...";
    btn.disabled = true;

    const ticketTemplate = document.getElementById('modalTicketTemplate');
    const originalBorder = ticketTemplate.style.border;
    ticketTemplate.style.border = 'none';

    html2canvas(ticketTemplate, {
        scale: 3,
        backgroundColor: null, 
        useCORS: true
    }).then(canvas => {
        ticketTemplate.style.border = originalBorder;
        
        const now = new Date();
        const pad = (num) => String(num).padStart(2, '0');
        const timestamp = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        
        const link = document.createElement('a');
        link.download = `ticket-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
            const phone = document.getElementById('modalTicketPhone').textContent.replace(/\D/g,'');
            const name = document.getElementById('modalTicketName').textContent;
            const message = encodeURIComponent(`Hello ${name}, here is your Entry Pass 🎫.\n*Keep this QR code ready at the entrance.*`);
            window.location.href = `https://wa.me/${phone}?text=${message}`;
            
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }, 1500);

    }).catch(err => {
        console.error(err);
        alert("Error generating ticket image");
        btn.innerHTML = originalContent;
        btn.disabled = false;
    });
});


// ==========================================
// 14. SCANNER LOGIC
// ==========================================

startScanBtn.addEventListener('click', () => {
    if (scannerVideo.srcObject) stopScan();
    else startScan();
});

function startScan() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            scannerVideo.srcObject = stream;
            scannerVideo.setAttribute("playsinline", true); 
            scannerVideo.play();
            startScanBtn.textContent = 'Deactivate Camera';
            scanResult.style.display = 'block';
            scanResult.style.background = 'rgba(255,255,255,0.1)';
            scanResult.style.color = 'white';
            scanResult.textContent = 'Searching for QR Code...';
            requestAnimationFrame(tick);
        }).catch(err => {
            alert("Camera error: " + err);
        });
}

function stopScan() {
    if (scannerVideo.srcObject) scannerVideo.srcObject.getTracks().forEach(t => t.stop());
    scannerVideo.srcObject = null;
    startScanBtn.textContent = 'Activate Camera';
}

function tick() {
    if (!scannerVideo.srcObject) return;
    if (scannerVideo.readyState === scannerVideo.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = scannerVideo.videoWidth;
        canvas.height = scannerVideo.videoHeight;
        ctx.drawImage(scannerVideo, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0,0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        if(code && !isCooldown) {
            isCooldown = true;
            validateTicket(code.data);
            setTimeout(() => {
                isCooldown = false;
            }, 1500);
        }
    }
    if (scannerVideo.srcObject) {
        requestAnimationFrame(tick);
    }
}

async function validateTicket(ticketId) {
    const ticket = bookedTickets.find(t => t.id === ticketId);
    scanResult.style.display = 'block';
    
    if(ticket) {
        if(ticket.status === 'coming-soon' && !ticket.scanned) {
            await updateDoc(doc(db, APP_COLLECTION_ROOT, currentUser.uid, 'tickets', ticketId), {
                status: 'arrived',
                scanned: true,
                scannedAt: Date.now()
            });
            scanResult.style.background = 'rgba(16, 185, 129, 0.2)';
            scanResult.style.color = '#10b981';
            scanResult.style.border = '1px solid #10b981';
            scanResult.textContent = `✅ ACCESS GRANTED: ${ticket.name}`;
            playBeep();
        } else {
            scanResult.style.background = 'rgba(239, 68, 68, 0.2)';
            scanResult.style.color = '#ef4444';
            scanResult.style.border = '1px solid #ef4444';
            scanResult.textContent = `❌ DENIED: Already Scanned or Invalid Status`;
            playError();
        }
    } else {
        scanResult.style.background = 'rgba(239, 68, 68, 0.2)';
        scanResult.style.color = '#ef4444';
        scanResult.textContent = `❌ DENIED: Invalid Ticket ID`;
        playError();
    }
}


// ==========================================
// 15. SETTINGS FORM
// ==========================================

eventSettingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const newSettings = {
        name: document.getElementById('eventName').value,
        place: document.getElementById('eventPlace').value,
        deadline: document.getElementById('arrivalDeadline').value
    };

    const settingsRef = doc(db, APP_COLLECTION_ROOT, currentUser.uid, 'settings', 'config');
    await setDoc(settingsRef, newSettings, { merge: true });
    showToast("Settings Saved", "Event details updated.");
});

function updateSettingsDisplay() {
    document.getElementById('currentEventName').textContent = eventSettings.name || 'Not set';
    document.getElementById('currentEventPlace').textContent = eventSettings.place || 'Not set';
    document.getElementById('currentDeadline').textContent = eventSettings.deadline ? new Date(eventSettings.deadline).toLocaleString() : 'Not set';
    document.getElementById('eventNamePlace').textContent = eventSettings.name && eventSettings.place ? `${eventSettings.name} | ${eventSettings.place}` : 'EVENT DETAILS';
    
    // Form Values
    document.getElementById('eventName').value = eventSettings.name || '';
    document.getElementById('eventPlace').value = eventSettings.place || '';
    document.getElementById('arrivalDeadline').value = eventSettings.deadline || '';
    
    // Modal
    document.getElementById('modalEventNamePlace').textContent = eventSettings.name && eventSettings.place ? `${eventSettings.name} | ${eventSettings.place}` : 'EVENT DETAILS';
}


// ==========================================
// 16. SIDE TRAY & PWA
// ==========================================

if (trayToggle && contactTray) {
    trayToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        contactTray.classList.toggle('open');
        
        if (contactTray.classList.contains('open')) {
            trayIcon.classList.remove('fa-chevron-left');
            trayIcon.classList.add('fa-chevron-right');
            document.getElementById('appContent').classList.add('content-blur');
            document.getElementById('star-container').classList.add('content-blur');
        } else {
            trayIcon.classList.remove('fa-chevron-right');
            trayIcon.classList.add('fa-chevron-left');
            document.getElementById('appContent').classList.remove('content-blur');
            document.getElementById('star-container').classList.remove('content-blur');
        }
    });

    document.addEventListener('click', (e) => {
        if (contactTray.classList.contains('open') && 
            !contactTray.contains(e.target) && 
            !trayToggle.contains(e.target)) {
            
            contactTray.classList.remove('open');
            trayIcon.classList.remove('fa-chevron-right');
            trayIcon.classList.add('fa-chevron-left');
            document.getElementById('appContent').classList.remove('content-blur');
            document.getElementById('star-container').classList.remove('content-blur');
        }
    });
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js").catch(err => console.log("SW failed:", err));
    });
}
