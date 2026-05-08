const API_URL = 'http://localhost:3000';

function isLoggedIn() {
    return !!localStorage.getItem('token');
}

function getToken() {
    return localStorage.getItem('token');
}

function getUsuario() {
    const u = localStorage.getItem('usuario');
    return u ? JSON.parse(u) : null;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.reload();
}

function renderAuthNav() {
    const container = document.getElementById('auth-nav-btn');
    if (!container) return;

    if (isLoggedIn()) {
        const usuario = getUsuario();
        container.innerHTML = `
            <div class="nav-perfil">
                <button class="btn-nav btn-perfil" onclick="toggleDropdown()">
                    👤 ${usuario ? usuario.nombre.split(' ')[0] : 'Mi Perfil'}
                    <span class="flecha">▾</span>
                </button>
                <div class="dropdown" id="dropdown-perfil" style="display:none;">
                    <p class="dropdown-email">${usuario ? usuario.email : ''}</p>
                    <hr>
                    <button onclick="logout()" class="btn-logout">Cerrar sesión</button>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button class="btn-nav btn-login" onclick="redirectToAuth()">
                🔑 Login
            </button>
        `;
    }
}

function toggleDropdown() {
    const dd = document.getElementById('dropdown-perfil');
    if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.nav-perfil')) {
        const dd = document.getElementById('dropdown-perfil');
        if (dd) dd.style.display = 'none';
    }
});

// ????????? Carrito: compartida por main.js y carrito.js ??????????????
function getCarritoKey() {
    try {
        const usuario = typeof getUsuario === 'function' ? getUsuario() : null;
        return usuario && usuario.id ? `carrito_${usuario.id}` : 'carrito_guest';
    } catch (e) {
        return 'carrito_guest';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    renderAuthNav();
});

const AUTH_LOGIN_URL = 'http://localhost:4000/auth/login?redirect=';

function guardarToken(token) {
    localStorage.setItem('token', token);
}

function decodeTokenPayload(token) {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

function obtenerUsuarioDesdeToken(token) {
    const payload = decodeTokenPayload(token);
    if (!payload) return null;
    const usuario = payload.usuario || payload.user || payload;
    return {
        id: usuario.id || usuario.sub || usuario.user_id,
        nombre: usuario.nombre || usuario.name || usuario.username || '',
        email: usuario.email || usuario.mail || ''
    };
}

async function fusionarCarritoGuest(token) {
    const guestCartRaw = localStorage.getItem('carrito_guest');
    if (!guestCartRaw) return;

    let guestCart;
    try {
        guestCart = JSON.parse(guestCartRaw);
    } catch (e) {
        console.error('Error parseando carrito guest:', e);
        return;
    }

    if (!Array.isArray(guestCart) || guestCart.length === 0) return;

    const items = guestCart.map(function(item) {
        return {
            producto_id: item.id,
            nombre: item.nombre,
            precio_unitario: item.precio,
            cantidad: item.cantidad
        };
    });

    try {
        const respuesta = await fetch(API_URL + '/api/carrito/fusionar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ items: items })
        });

        if (!respuesta.ok) {
            console.error('Error fusionando carrito:', respuesta.status);
            return;
        }

        const userKey = getCarritoKey();
        let userCart = JSON.parse(localStorage.getItem(userKey)) || [];

        guestCart.forEach(function(guestItem) {
            const existing = userCart.find(function(item) { return item.id === guestItem.id; });
            if (existing) {
                existing.cantidad += guestItem.cantidad;
            } else {
                userCart.push({
                    id: guestItem.id,
                    nombre: guestItem.nombre,
                    precio: guestItem.precio,
                    cantidad: guestItem.cantidad
                });
            }
        });

        localStorage.setItem(userKey, JSON.stringify(userCart));
        localStorage.removeItem('carrito_guest');
        console.log('✅ Carrito guest fusionado exitosamente');
    } catch (error) {
        console.error('Error de conexión al fusionar carrito:', error);
    }
}

async function procesarAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        localStorage.setItem('token', token);

        const usuario = obtenerUsuarioDesdeToken(token);
        if (usuario && usuario.id) {
            localStorage.setItem('usuario', JSON.stringify(usuario));
        }

        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('✅ Token recibido y guardado desde callback');

        await fusionarCarritoGuest(token);
    }
}

function redirectToAuth() {
    window.location.href = AUTH_LOGIN_URL + encodeURIComponent(window.location.href);
}