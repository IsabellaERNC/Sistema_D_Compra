const API_URL = window.API_URL || 'http://localhost:3000';

function getToken() { return localStorage.getItem('token') || ''; }

async function obtenerRecomendaciones() {
    const token = getToken();
    const res = await fetch(`${API_URL}/api/productos/recomendaciones`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.productos || [];
}

function renderRecomendaciones(productos) {
    const container = document.getElementById('recomendaciones-lista');
    if (!productos || productos.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#666;">No hay recomendaciones disponibles.</p>';
        return;
    }

    let html = '<div class="productos-grid">';
    for (const p of productos) {
        html += `
        <div class="producto-card">
            <img src="${p.imagen || 'https://via.placeholder.com/200?text=Sin+imagen'}" alt="${p.nombre}" style="width:100%;height:180px;object-fit:cover;border-radius:6px;">
            <h3>${p.nombre}</h3>
            <p class="precio">$${Number(p.precio || 0).toLocaleString('es-CO')}</p>
            <button class="btn btn-primary btn-sm" onclick="agregarAlCarrito('${p.id}', '${p.nombre}', ${p.precio})">
                Agregar al carrito
            </button>
        </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

function agregarAlCarrito(productoId, nombre, precio) {
    const key = localStorage.getItem('token') ? (() => {
        const u = JSON.parse(localStorage.getItem('usuario') || '{}');
        return u.id ? 'carrito_' + u.id : 'carrito_guest';
    })() : 'carrito_guest';

    const carrito = JSON.parse(localStorage.getItem(key) || '[]');
    const existente = carrito.find(i => i.id === productoId);
    if (existente) {
        existente.cantidad += 1;
    } else {
        carrito.push({ id: productoId, nombre, precio: parseFloat(precio), cantidad: 1 });
    }
    localStorage.setItem(key, JSON.stringify(carrito));
    alert('Producto agregado al carrito');
}

async function init() {
    const productos = await obtenerRecomendaciones();
    renderRecomendaciones(productos);
}
