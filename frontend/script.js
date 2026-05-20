// =============================================
//  CONFIG — change this to your backend URL
// =============================================
const API_BASE = 'http://localhost:5000/api';
const THEME_STORAGE_KEY = 'letschill_theme';

// =============================================
//  STATE
// =============================================
let spots = [];
let hacks = [];
let trendingSpots = [];
let wishlistIds = [];
let currentSearch = "";
let tempImgs = { p: null, r: null };
let tempEditId = null;
let tempEditType = null;
let activeView = "explore";
let currentFilter = null;
let currentUser = JSON.parse(localStorage.getItem('letschill_user')) || null;
let currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'light';

// =============================================
//  API HELPER
// =============================================
async function apiFetch(endpoint, options = {}) {
    const token = currentUser?.token;
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };
    const res = await fetch(API_BASE + endpoint, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Something went wrong');
    return data;
}

// Format date to readable format
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function applyTheme(theme) {
    currentTheme = theme === 'dark' ? 'dark' : 'light';
    document.body.classList.toggle('dark-mode', currentTheme === 'dark');
    localStorage.setItem(THEME_STORAGE_KEY, currentTheme);

    const toggle = document.getElementById('theme-toggle');
    const label = document.getElementById('theme-toggle-label');
    if (toggle) toggle.setAttribute('aria-pressed', String(currentTheme === 'dark'));
    if (label) label.textContent = currentTheme === 'dark' ? 'Dark Mode On' : 'Light Mode On';
}

function toggleTheme() {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    notify(currentTheme === 'dark' ? 'Dark mode activated 🌙' : 'Light mode activated ☀️');
}

// =============================================
//  AUTH
// =============================================
function saveUser(userData) {
    currentUser = userData;
    localStorage.setItem('letschill_user', JSON.stringify(userData));
    // sync wishlistIds from saved items
    wishlistIds = [];
    if (currentUser.savedSpots && Array.isArray(currentUser.savedSpots)) wishlistIds.push(...currentUser.savedSpots.map(s => s._id || s));
    if (currentUser.savedHacks && Array.isArray(currentUser.savedHacks)) wishlistIds.push(...currentUser.savedHacks.map(h => h._id || h));
    document.getElementById('wishlist-count').textContent = wishlistIds.length;
}

function toggleAuth(isLogin) {
    document.getElementById('login-box').classList.toggle('hidden', !isLogin);
    document.getElementById('signup-box').classList.toggle('hidden', isLogin);
}

document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.classList.add('hidden');
    try {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: document.getElementById('login-email').value,
                password: document.getElementById('login-password').value
            })
        });
        saveUser(data);
        enterApp();
        notify("Welcome Back! 📓");
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
    }
};

document.getElementById('signup-form').onsubmit = async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('signup-error');
    errEl.classList.add('hidden');
    try {
        const data = await apiFetch('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({
                name: document.getElementById('signup-name').value,
                email: document.getElementById('signup-email').value,
                password: document.getElementById('signup-password').value
            })
        });
        saveUser(data);
        enterApp();
        notify("Welcome to the Gang, " + data.name + "! ✨");
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
    }
};

function enterApp() {
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    // Fill profile fields
    document.getElementById('profile-name-input').value = currentUser.name || '';
    document.getElementById('profile-email-input').value = currentUser.email || '';
    if (currentUser.profilePic) {
        document.getElementById('profile-pic-display').innerHTML = `<img src="${currentUser.profilePic}">`;
    }
    applyTheme(currentTheme);
    showView('explore');
}

function logout() {
    localStorage.removeItem('letschill_user');
    currentUser = null;
    wishlistIds = [];
    spots = [];
    hacks = [];
    // Clear all auth form fields
    document.getElementById('login-form').reset();
    document.getElementById('signup-form').reset();
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('signup-error').classList.add('hidden');
    document.getElementById('app-layout').classList.add('hidden');
    document.getElementById('auth-view').classList.remove('hidden');
    notify("Stay Chill! 👋");
}

// =============================================
//  PROFILE
// =============================================
async function saveProfile() {
    const name = document.getElementById('profile-name-input').value;
    const email = document.getElementById('profile-email-input').value;
    const password = document.getElementById('profile-password-input').value;

    const payload = { name, email };
    if (password.trim() !== '') payload.password = password;

    // Include profile pic if changed
    const picEl = document.getElementById('profile-pic-display').querySelector('img');
    if (picEl) payload.profilePic = picEl.src;

    try {
        const updated = await apiFetch('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        saveUser(updated);
        document.getElementById('profile-password-input').value = '';
        notify("Folder updated! ");
    } catch (err) {
        notify("Update failed: " + err.message);
    }
}

document.getElementById('profile-pic-input').onchange = (e) => {
    if (e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('profile-pic-display').innerHTML = `<img src="${ev.target.result}">`;
            notify("Looking good! 📸");
        };
        reader.readAsDataURL(e.target.files[0]);
    }
};

// =============================================
//  NAVIGATION & UI
// =============================================
function notify(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('active');
    setTimeout(() => t.classList.remove('active'), 2500);
}

function showView(view) {
    activeView = view;
    ['explore-view', 'cook-view', 'profile-view', 'wishlist-view', 'recipe-detail-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(view + '-view');
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.getElementById('nav-' + view);
    if (navEl) navEl.classList.add('active');

    if (view === 'explore') loadAndRenderSpots();
    if (view === 'cook') loadAndRenderHacks();
    if (view === 'wishlist') renderWishlist();

    window.scrollTo(0, 0);
}

function handleSearch(val) {
    currentSearch = val.toLowerCase();
    if (activeView === 'explore') renderExplore();
    if (activeView === 'cook') renderCook();
    if (activeView === 'wishlist') renderWishlist();
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) {
    document.getElementById(id).style.display = 'none';
    tempImgs.p = null;
    tempImgs.r = null;
    document.getElementById('p-img-label').textContent = "📸 SELECT PHOTO";
    document.getElementById('r-img-label').textContent = " FOOD PIC";
}

// =============================================
//  LOAD FROM API
// =============================================
async function loadAndRenderSpots() {
    const loading = document.getElementById('explore-loading');
    loading.classList.remove('hidden');
    try {
        spots = await apiFetch('/spots');
        await loadTrendingSpots();
        loading.classList.add('hidden');
        renderExplore();
    } catch (err) {
        loading.textContent = 'Could not load spots 😢';
    }
}

async function loadAndRenderHacks() {
    const loading = document.getElementById('cook-loading');
    loading.classList.remove('hidden');
    try {
        hacks = await apiFetch('/hacks');
        loading.classList.add('hidden');
        renderCook();
    } catch (err) {
        loading.textContent = 'Could not load hacks 😢';
    }
}

// =============================================
//  RENDER
// =============================================
function renderExplore() {
    const grid = document.getElementById('explore-grid');
    if (!grid) return;
    
    // First apply the budget or other filter
    let results = spots;
    if (currentFilter && currentFilter.startsWith('budget:')) {
        const range = currentFilter.split(':')[1];
        results = results.filter(s => budgetMatchesRange(s.budget, range));
    } else if (currentFilter === 'vibe') {
        results = results.filter(s => s.desc && s.desc.trim().length > 0);
    } else if (currentFilter === 'open-late') {
        results = results.filter(s => s.isOpenLate === true);
    } else if (currentFilter === 'study-friendly') {
        results = results.filter(s => s.isStudyFriendly === true);
    } else if (currentFilter === 'date-spot') {
        results = results.filter(s => s.isDateSpot === true);
    }
    
    // Then apply search filter
    const filtered = results.filter(s =>
        s.name.toLowerCase().includes(currentSearch) ||
        s.area.toLowerCase().includes(currentSearch)
    );
    
    grid.innerHTML = filtered.map(s => {
        const isSaved = wishlistIds.includes(s._id);
        const isOwner = currentUser && s.postedBy._id === currentUser._id;
        const poster = s.postedBy?.name || 'Someone';
        const likeCount = s.likes?.length || 0;
        const isLiked = s.likes?.includes(currentUser?._id);
        
        return `
        <div class="card">
            <div class="tape"></div>
            <div class="bookmark-btn ${isSaved ? 'active' : ''}" onclick="toggleWishlist(event, '${s._id}')">
                ${isSaved ? '❤️' : '🤍'}
            </div>
            ${isOwner ? `<div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 8px;">
                <button class="btn btn-small" style="padding: 4px 8px; font-size: 0.8rem; background: #fff3cd;" onclick="openEditModal('spot', '${s._id}')">✏️ EDIT</button>
                <button class="btn btn-small" style="padding: 4px 8px; font-size: 0.8rem; background: #f8d7da;" onclick="deletePost('spot', '${s._id}')">🗑️ DELETE</button>
            </div>` : ''}
            <img src="${s.img}" class="card-img" alt="${s.name}" onerror="this.src='https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'">
            <span class="handwritten" style="background:var(--accent); padding:2px 8px; border:1.5px solid black; font-size:1.1rem;">📍 ${s.area}</span>
            <h3 style="margin-top:10px; font-size:1.8rem;">${s.name}</h3>
            <p class="handwritten" style="font-size:1.1rem; margin-bottom:10px;">${s.desc}</p>
            <div class="poster-badge">👤 ${poster} • ${formatDate(s.createdAt)}</div>
            <div style="display:flex; justify-content: space-between; align-items: center; border-top: 1.5px dashed var(--border); padding-top: 10px; margin-top: 10px;">
                <div style="display: flex; gap: 15px; align-items: center;">
                    <span style="font-weight: 800; font-family:'Gochi Hand', cursive; font-size: 1.2rem;">${s.budget}</span>
                    <button onclick="likePost(event, 'spot', '${s._id}')" style="background: none; border: none; font-size: 1.3rem; cursor: pointer; opacity: ${isLiked ? 1 : 0.6};">
                        ${isLiked ? '❤️' : '🤍'} <span style="font-size: 0.8rem; font-weight: bold;">${likeCount}</span>
                    </button>
                </div>
                <a href="https://www.google.com/maps/search/${encodeURIComponent(s.name + ' Bangalore')}" target="_blank" class="btn btn-small" style="background:var(--primary); color:white;">MAP 🗺️</a>
            </div>
        </div>`;
    }).join('');
}

function renderCook() {
    const grid = document.getElementById('cook-grid');
    if (!grid) return;
    const filtered = hacks.filter(h => h.name.toLowerCase().includes(currentSearch));
    grid.innerHTML = filtered.map(h => {
        const isSaved = wishlistIds.includes(h._id);
        const isOwner = currentUser && h.postedBy._id === currentUser._id;
        const poster = h.postedBy?.name || 'Someone';
        const likeCount = h.likes?.length || 0;
        const isLiked = h.likes?.includes(currentUser?._id);
        
        return `
        <div class="card" onclick="viewRecipe('${h._id}')">
            <div class="bookmark-btn ${isSaved ? 'active' : ''}" onclick="toggleWishlist(event, '${h._id}')">
                ${isSaved ? '❤️' : '🤍'}
            </div>
            <div class="sticker" style="background:var(--secondary); color:white;">${h.time} MINS</div>
            ${isOwner ? `<div style="position: absolute; top: 50px; right: 10px; display: flex; gap: 8px;">
                <button class="btn btn-small" style="padding: 4px 8px; font-size: 0.8rem; background: #fff3cd;" onclick="event.stopPropagation(); openEditModal('hack', '${h._id}')">✏️ EDIT</button>
                <button class="btn btn-small" style="padding: 4px 8px; font-size: 0.8rem; background: #f8d7da;" onclick="event.stopPropagation(); deletePost('hack', '${h._id}')">🗑️ DELETE</button>
            </div>` : ''}
            <img src="${h.img}" class="card-img" alt="${h.name}" onerror="this.src='https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=800&q=80'">
            <h3 style="font-size:1.8rem;">${h.name}</h3>
            <div class="poster-badge">👤 ${poster} • ${formatDate(h.createdAt)}</div>
            <p class="handwritten">Tap to see how to hack it...</p>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 10px;">
                <button onclick="likePost(event, 'hack', '${h._id}'); event.stopPropagation();" style="background: none; border: none; font-size: 1.3rem; cursor: pointer; opacity: ${isLiked ? 1 : 0.6};">
                    ${isLiked ? '❤️' : '🤍'} <span style="font-size: 0.8rem; font-weight: bold;">${likeCount}</span>
                </button>
                <button class="btn btn-small" style="flex: 1; background:var(--accent);">COOK NOW 🔥</button>
            </div>
        </div>`;
    }).join('');
}

function renderWishlist() {
    const grid = document.getElementById('wishlist-grid');
    const emptyMsg = document.getElementById('wishlist-empty');
    const all = [...spots, ...hacks].filter(item => wishlistIds.includes(item._id));

    if (all.length === 0) {
        grid.innerHTML = "";
        emptyMsg.classList.remove('hidden');
        return;
    }
    emptyMsg.classList.add('hidden');

    grid.innerHTML = all.map(item => {
        const isSpot = spots.some(s => s._id === item._id);
        return `
        <div class="card" ${!isSpot ? `onclick="viewRecipe('${item._id}')"` : ''}>
            <div class="tape" style="background:${isSpot ? 'rgba(255,255,0,0.3)' : 'rgba(255,0,255,0.2)'}"></div>
            <div class="bookmark-btn active" onclick="toggleWishlist(event, '${item._id}')">💔</div>
            <img src="${item.img}" class="card-img" alt="${item.name}">
            <span class="handwritten" style="background:var(--accent); padding:2px 8px; border:1.5px solid black; font-size:1.1rem;">
                ${isSpot ? '📍 ' + item.area : ' RECIPE'}
            </span>
            <h3 style="margin-top:10px; font-size:1.8rem;">${item.name}</h3>
            <div style="display:flex; justify-content: flex-end; border-top: 1.5px dashed var(--border); padding-top: 10px;">
                ${isSpot
                    ? `<a href="https://www.google.com/maps/search/${encodeURIComponent(item.name + ' Bangalore')}" target="_blank" class="btn btn-small" style="background:var(--primary); color:white;">MAP</a>`
                    : `<button class="btn btn-small" style="background:var(--secondary); color:white;">DETAILS</button>`}
            </div>
        </div>`;
    }).join('');
}

// =============================================
//  WISHLIST TOGGLE
// =============================================
async function toggleWishlist(e, id) {
    e.stopPropagation();
    const isSpot = spots.some(s => s._id === id);
    const isHack = hacks.some(h => h._id === id);
    if (!currentUser) { notify('Please login to save items'); return; }

    try {
        const endpoint = isSpot ? `/spots/${id}/save` : (isHack ? `/hacks/${id}/save` : null);
        if (!endpoint) {
            // unknown type, optimistically toggle locally
            const idx = wishlistIds.indexOf(id);
            if (idx > -1) { wishlistIds.splice(idx, 1); notify("Removed 💔"); }
            else { wishlistIds.push(id); notify("Saved ❤️"); }
        } else {
            const res = await apiFetch(endpoint, { method: 'POST' });
            // res contains savedSpots and savedHacks arrays
            currentUser.savedSpots = res.savedSpots || [];
            currentUser.savedHacks = res.savedHacks || [];
            saveUser(currentUser);
            notify(res.savedSpots && res.savedSpots.find(s => s._id === id) || (res.savedHacks && res.savedHacks.find(h => h._id === id)) ? 'Saved ❤️' : 'Removed 💔');
        }

        document.getElementById('wishlist-count').textContent = wishlistIds.length;
        if (activeView === 'explore') renderExplore();
        if (activeView === 'cook') renderCook();
        if (activeView === 'wishlist') renderWishlist();
    } catch (err) {
        notify('Save failed: ' + err.message);
    }
}

// =============================================
//  LIKE/UNLIKE POST
// =============================================
async function likePost(e, type, id) {
    e.stopPropagation();
    try {
        const endpoint = type === 'spot' ? `/spots/${id}/like` : `/hacks/${id}/like`;
        const updated = await apiFetch(endpoint, { method: 'POST' });
        
        if (type === 'spot') {
            const idx = spots.findIndex(s => s._id === id);
            if (idx > -1) spots[idx] = updated;
        } else {
            const idx = hacks.findIndex(h => h._id === id);
            if (idx > -1) hacks[idx] = updated;
        }
        
        if (activeView === 'explore') renderExplore();
        if (activeView === 'cook') renderCook();
        if (activeView === 'wishlist') renderWishlist();
    } catch (err) {
        notify("Like failed: " + err.message);
    }
}

// =============================================
//  DELETE POST
// =============================================
async function deletePost(type, id) {
    if (!confirm('Delete this post? ')) return;
    try {
        const endpoint = type === 'spot' ? `/spots/${id}` : `/hacks/${id}`;
        await apiFetch(endpoint, { method: 'DELETE' });
        
        if (type === 'spot') {
            spots = spots.filter(s => s._id !== id);
        } else {
            hacks = hacks.filter(h => h._id !== id);
        }
        
        if (activeView === 'explore') renderExplore();
        if (activeView === 'cook') renderCook();
        notify("Post deleted 👋");
    } catch (err) {
        notify("Delete failed: " + err.message);
    }
}

// =============================================
//  OPEN EDIT MODAL
// =============================================
function openEditModal(type, id) {
    tempEditType = type;
    tempEditId = id;
    
    if (type === 'spot') {
        const spot = spots.find(s => s._id === id);
        if (!spot) return;
        document.getElementById('e-name').value = spot.name;
        document.getElementById('e-area').value = spot.area;
        document.getElementById('e-budget-range').value = spot.budget;
        document.getElementById('e-desc').value = spot.desc;
        document.getElementById('e-open-late').checked = spot.isOpenLate || false;
        document.getElementById('e-study-friendly').checked = spot.isStudyFriendly || false;
        document.getElementById('e-date-spot').checked = spot.isDateSpot || false;
        openModal('edit-spot-modal');
    } else {
        const hack = hacks.find(h => h._id === id);
        if (!hack) return;
        document.getElementById('e-hack-name').value = hack.name;
        document.getElementById('e-hack-time').value = hack.time;
        document.getElementById('e-hack-ingredients').value = hack.ingredients;
        document.getElementById('e-hack-steps').value = hack.steps;
        openModal('edit-hack-modal');
    }
}

// =============================================
//  VIEW RECIPE DETAIL
// =============================================
function viewRecipe(id) {
    const h = hacks.find(x => x._id === id);
    if (!h) return;
    const poster = h.postedBy?.name || 'Someone';
    document.getElementById('recipe-content-target').innerHTML = `
        <div class="sticker" style="background:var(--accent)">SCRAPBOOK</div>
        <h1 style="font-size: 3.5rem; line-height:1;">${h.name}</h1>
        <div class="poster-badge" style="margin: 10px 0;">👤 Posted by ${poster}</div>
        <div style="display:flex; gap: 30px; margin-top: 20px; flex-wrap: wrap;">
            <img src="${h.img}" style="width: 100%; max-width:350px; height: 350px; object-fit: cover; border: var(--thick-border) solid var(--border); box-shadow: 8px 8px 0px var(--secondary);">
            <div style="flex: 1; min-width: 250px;">
                <h3 class="handwritten" style="background: var(--dark); color: var(--paper); padding: 5px 15px; display: inline-block;">NEED</h3>
                <p class="handwritten" style="font-size: 1.5rem; margin: 15px 0;">${h.ingredients}</p>
                <h3 class="handwritten" style="background: var(--primary); color: white; padding: 5px 15px; display: inline-block;">STEPS</h3>
                <p class="handwritten" style="font-size: 1.4rem; margin-top: 15px; line-height:1.5;">${h.steps}</p>
            </div>
        </div>`;
    showView('recipe-detail');
}

function parseBudgetRange(budget) {
    if (!budget || typeof budget !== 'string') return null;
    const cleaned = budget.replace(/[₹,\s]/g, '');
    const parts = cleaned.split('-').map(Number);
    if (parts.length !== 2 || parts.some(isNaN)) return null;
    return { min: parts[0], max: parts[1] };
}

function budgetMatchesRange(budget, range) {
    const spot = parseBudgetRange(budget);
    if (!spot) return false;
    const [low, high] = range.split('-').map(Number);
    if (isNaN(low) || isNaN(high)) return false;
    // Check for actual overlap (not just touching at boundaries)
    return spot.max > low && spot.min < high;
}

// =============================================
//  ADD FORMS
// =============================================
// Image to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

document.getElementById('p-img').onchange = async (e) => {
    if (e.target.files[0]) {
        tempImgs.p = await fileToBase64(e.target.files[0]);
        document.getElementById('p-img-label').textContent = "✅ CLIPPED!";
    }
};

document.getElementById('r-img').onchange = async (e) => {
    if (e.target.files[0]) {
        tempImgs.r = await fileToBase64(e.target.files[0]);
        document.getElementById('r-img-label').textContent = "✅ READY!";
    }
};

document.getElementById('add-place-form').onsubmit = async (e) => {
    e.preventDefault();
    const budgetVal = document.getElementById('p-budget-range').value;
    const formattedBudget = budgetVal.startsWith('₹') ? budgetVal : '₹' + budgetVal;
    try {
        const newSpot = await apiFetch('/spots', {
            method: 'POST',
            body: JSON.stringify({
                name: document.getElementById('p-name').value,
                area: document.getElementById('p-area').value,
                budget: formattedBudget,
                desc: document.getElementById('p-desc').value,
                img: tempImgs.p || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80"
            })
        });
        spots.unshift(newSpot);
        renderExplore();
        closeModal('place-modal');
        notify("Spot clipped! 📍");
        e.target.reset();
    } catch (err) {
        notify("Failed: " + err.message);
    }
};

document.getElementById('add-recipe-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
        const newHack = await apiFetch('/hacks', {
            method: 'POST',
            body: JSON.stringify({
                name: document.getElementById('r-name').value,
                time: document.getElementById('r-time').value,
                ingredients: document.getElementById('r-ingredients').value,
                steps: document.getElementById('r-steps').value,
                img: tempImgs.r || "https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=800&q=80"
            })
        });
        hacks.unshift(newHack);
        renderCook();
        closeModal('recipe-modal');
        notify("Hack added! 🔥");
        e.target.reset();
    } catch (err) {
        notify("Failed: " + err.message);
    }
};

// =============================================
//  EDIT FORMS
// =============================================
document.getElementById('edit-spot-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
        const updated = await apiFetch(`/spots/${tempEditId}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: document.getElementById('e-name').value,
                area: document.getElementById('e-area').value,
                budget: document.getElementById('e-budget-range').value,
                desc: document.getElementById('e-desc').value,
                isOpenLate: document.getElementById('e-open-late').checked,
                isStudyFriendly: document.getElementById('e-study-friendly').checked,
                isDateSpot: document.getElementById('e-date-spot').checked,
                img: tempImgs.p || undefined
            })
        });
        const idx = spots.findIndex(s => s._id === tempEditId);
        if (idx > -1) spots[idx] = updated;
        renderExplore();
        closeModal('edit-spot-modal');
        notify("Spot updated! 📍");
        tempEditId = null;
        tempEditType = null;
    } catch (err) {
        notify("Update failed: " + err.message);
    }
};

document.getElementById('edit-hack-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
        const updated = await apiFetch(`/hacks/${tempEditId}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: document.getElementById('e-hack-name').value,
                time: document.getElementById('e-hack-time').value,
                ingredients: document.getElementById('e-hack-ingredients').value,
                steps: document.getElementById('e-hack-steps').value,
                img: tempImgs.r || undefined
            })
        });
        const idx = hacks.findIndex(h => h._id === tempEditId);
        if (idx > -1) hacks[idx] = updated;
        renderCook();
        closeModal('edit-hack-modal');
        notify("Hack updated! 🔥");
        tempEditId = null;
        tempEditType = null;
    } catch (err) {
        notify("Update failed: " + err.message);
    }
};

document.getElementById('e-img').onchange = async (e) => {
    if (e.target.files[0]) {
        tempImgs.p = await fileToBase64(e.target.files[0]);
        document.getElementById('e-img-label').textContent = "✅ CLIPPED!";
    }
};

document.getElementById('e-hack-img').onchange = async (e) => {
    if (e.target.files[0]) {
        tempImgs.r = await fileToBase64(e.target.files[0]);
        document.getElementById('e-hack-img-label').textContent = "✅ READY!";
    }
};

// =============================================
//  FILTER & TRENDING
// =============================================
async function applyFilter(filter) {
    currentFilter = filter;
    if (!filter) {
        const budgetSelect = document.getElementById('budget-select');
        if (budgetSelect) budgetSelect.value = '';
        renderExplore();
        return;
    }
    if (filter !== '' && !filter.startsWith('budget:')) {
        const budgetSelect = document.getElementById('budget-select');
        if (budgetSelect) budgetSelect.value = '';
    }
    
    try {
        let filtered = [];
        if (filter.startsWith('budget:')) {
            const range = filter.split(':')[1];
            filtered = spots.filter(s => budgetMatchesRange(s.budget, range));
        } else if (filter === 'vibe') {
            filtered = spots.filter(s => s.desc && s.desc.trim().length > 0);
        } else if (filter === 'open-late') {
            filtered = spots.filter(s => s.isOpenLate === true);
        } else if (filter === 'study-friendly') {
            filtered = spots.filter(s => s.isStudyFriendly === true);
        } else if (filter === 'date-spot') {
            filtered = spots.filter(s => s.isDateSpot === true);
        }
        
        const grid = document.getElementById('explore-grid');
        grid.innerHTML = filtered.map(s => {
            const isSaved = wishlistIds.includes(s._id);
            const isOwner = currentUser && s.postedBy._id === currentUser._id;
            const poster = s.postedBy?.name || 'Someone';
            const likeCount = s.likes?.length || 0;
            const isLiked = s.likes?.includes(currentUser?._id);
            
            return `
            <div class="card">
                <div class="tape"></div>
                <div class="bookmark-btn ${isSaved ? 'active' : ''}" onclick="toggleWishlist(event, '${s._id}')">
                    ${isSaved ? '❤️' : '🤍'}
                </div>
                ${isOwner ? `<div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 8px;">
                    <button class="btn btn-small" style="padding: 4px 8px; font-size: 0.8rem; background: #fff3cd;" onclick="openEditModal('spot', '${s._id}')">✏️ EDIT</button>
                    <button class="btn btn-small" style="padding: 4px 8px; font-size: 0.8rem; background: #f8d7da;" onclick="deletePost('spot', '${s._id}')">🗑️ DELETE</button>
                </div>` : ''}
                <img src="${s.img}" class="card-img" alt="${s.name}" onerror="this.src='https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'">
                <span class="handwritten" style="background:var(--accent); padding:2px 8px; border:1.5px solid black; font-size:1.1rem;">📍 ${s.area}</span>
                <h3 style="margin-top:10px; font-size:1.8rem;">${s.name}</h3>
                <p class="handwritten" style="font-size:1.1rem; margin-bottom:10px;">${s.desc}</p>
                <div class="poster-badge">👤 ${poster} • ${formatDate(s.createdAt)}</div>
                <div style="display:flex; justify-content: space-between; align-items: center; border-top: 1.5px dashed var(--border); padding-top: 10px; margin-top: 10px;">
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <span style="font-weight: 800; font-family:'Gochi Hand', cursive; font-size: 1.2rem;">${s.budget}</span>
                        <button onclick="likePost(event, 'spot', '${s._id}')" style="background: none; border: none; font-size: 1.3rem; cursor: pointer; opacity: ${isLiked ? 1 : 0.6};">
                            ${isLiked ? '❤️' : '🤍'} <span style="font-size: 0.8rem; font-weight: bold;">${likeCount}</span>
                        </button>
                    </div>
                    <a href="https://www.google.com/maps/search/${encodeURIComponent(s.name + ' Bangalore')}" target="_blank" class="btn btn-small" style="background:var(--primary); color:white;">MAP 🗺️</a>
                </div>
            </div>`;
        }).join('');
        
        if (filtered.length === 0) {
            grid.innerHTML = '<div class="handwritten" style="text-align: center; padding: 40px; color: var(--text-soft); grid-column: 1 / -1;">No spots found with this filter 🤔</div>';
        }
    } catch (err) {
        notify("Filter failed: " + err.message);
    }
}

async function loadTrendingSpots() {
    try {
        trendingSpots = await apiFetch('/spots/trending/week');
        if (trendingSpots.length > 0) {
            const trendingSection = document.getElementById('trending-section');
            trendingSection.style.display = 'block';
            
            const grid = document.getElementById('trending-grid');
            grid.innerHTML = trendingSpots.map(s => {
                const isSaved = wishlistIds.includes(s._id);
                const isOwner = currentUser && s.postedBy._id === currentUser._id;
                const poster = s.postedBy?.name || 'Someone';
                const likeCount = s.likes?.length || 0;
                const isLiked = s.likes?.includes(currentUser?._id);
                
                return `
                <div class="card">
                    <div class="tape" style="background: rgba(255, 200, 0, 0.4);"></div>
                    <div class="sticker" style="background: #FFD700; color: black; font-weight: bold;">🔥 TRENDING</div>
                    <div class="bookmark-btn ${isSaved ? 'active' : ''}" onclick="toggleWishlist(event, '${s._id}')">
                        ${isSaved ? '❤️' : '🤍'}
                    </div>
                    <img src="${s.img}" class="card-img" alt="${s.name}" onerror="this.src='https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'">
                    <span class="handwritten" style="background:var(--accent); padding:2px 8px; border:1.5px solid black; font-size:1.1rem;">📍 ${s.area}</span>
                    <h3 style="margin-top:10px; font-size:1.8rem;">${s.name}</h3>
                    <p class="handwritten" style="font-size:1.1rem; margin-bottom:10px;">${s.desc}</p>
                    <div class="poster-badge">👤 ${poster} • ${formatDate(s.createdAt)}</div>
                    <div style="display:flex; justify-content: space-between; align-items: center; border-top: 1.5px dashed var(--border); padding-top: 10px; margin-top: 10px;">
                        <div style="display: flex; gap: 15px; align-items: center;">
                            <span style="font-weight: 800; font-family:'Gochi Hand', cursive; font-size: 1.2rem;">${s.budget}</span>
                            <button onclick="likePost(event, 'spot', '${s._id}')" style="background: none; border: none; font-size: 1.3rem; cursor: pointer; opacity: ${isLiked ? 1 : 0.6};">
                                ${isLiked ? '❤️' : '🤍'} <span style="font-size: 0.8rem; font-weight: bold;">${likeCount}</span>
                            </button>
                        </div>
                        <a href="https://www.google.com/maps/search/${encodeURIComponent(s.name + ' Bangalore')}" target="_blank" class="btn btn-small" style="background:var(--primary); color:white;">MAP 🗺️</a>
                    </div>
                </div>`;
            }).join('');
        }
    } catch (err) {
        console.log("Could not load trending spots");
    }
}

// Auto-enter app if user already logged in
applyTheme(currentTheme);

if (currentUser && currentUser.token) {
    enterApp();
}
