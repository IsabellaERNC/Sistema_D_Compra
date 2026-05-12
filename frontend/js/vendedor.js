/**
 * Panel de vendedor - gestión de pedidos desde el lado del vendedor
 */

const API_URL = window.API_URL || 'http://localhost:3000';

function getToken() { return localStorage.getItem('token') || ''; }
function getUsuario() {
    try { return JSON.parse(localStorage.getItem('usuario') || '{}'); }
    catch { return {}; }
}
function isVendedor() {
    const u = getUsuario();
    return u.rol === 'vendedor' && u.vendor_id;
}

async function listarPedidosVendedor() {
    const res = await fetch(`${API_URL}/api/vendedor/pedidos`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.pedidos || [];
}

async function cambiarEstado(pedidoId, nuevoEstado) {
    const res = await fetch(`${API_URL}/api/vendedor/pedidos/${pedidoId}/estado`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ estado: nuevoEstado })
    });
    return res.json();
}

function estadoBadge(estado) {
    const map = {
        'Pendiente': 'badge-pending',
        'Procesando': 'badge-processing',
        'Enviado': 'badge-shipped',
        'Entregado': 'badge-delivered',
        'Cancelado': 'badge-cancelled'
    };
    return map[estado] || 'badge-pending';
}

function estadoOptions(estadoActual) {
    const flujos = {
        'Pendiente': ['Procesando', 'Cancelado'],
        'Procesando': ['Enviado', 'Cancelado'],
        'Enviado': ['Entregado'],
        'Entregado': [],
        'Cancelado': []
    };
    return flujos[estadoActual] || [];
}

function renderPedidosVendedor(pedidos) {
    const container = document.getElementById('pedidos-lista');
    if (!pedidos || pedidos.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#666;">No tienes pedidos con productos tuyos.</p>';
        return;
    }

    let html = '';
    for (const pedido of pedidos) {
        const items = Array.isArray(pedido.items) ? pedido.items : JSON.parse(pedido.items || '[]');
        const itemsDelVendor = items.filter(i =>
            String(i.vendor_id || i.vendorId || '') === String(getUsuario().vendor_id)
        );
        const opciones = estadoOptions(pedido.estado);

        html += `
        <div class="pedido-card">
            <div class="pedido-header">
                <div class="pedido-info">
                    <div class="pedido-id">Pedido #${pedido.id.substring(0, 8)}</div>
                    <div class="pedido-fecha">${new Date(pedido.created_at).toLocaleString('es-CO')}</div>
                </div>
                <div class="pedido-right">
                    <span class="badge ${estadoBadge(pedido.estado)}">${pedido.estado}</span>
                    <span class="pedido-total">$${Number(pedido.monto_total || 0).toLocaleString('es-CO')}</span>
                </div>
            </div>
            <div class="pedido-detalle">
                <h4>Tus productos en este pedido</h4>
                ${itemsDelVendor.map(item => `
                    <div class="item-row">
                        <span>${item.nombre || item.producto_nombre || 'Producto'}</span>
                        <span>x${item.cantidad}</span>
                    </div>
                `).join('')}
                ${opciones.length > 0 ? `
                <div class="cambiar-estado">
                    <label>Cambiar estado:</label>
                    <select id="select-${pedido.id}">
                        ${opciones.map(op => `<option value="${op}">${op}</option>`).join('')}
                    </select>
                    <button class="btn btn-primary btn-sm" onclick="actualizarEstado('${pedido.id}')">
                        Actualizar
                    </button>
                </div>
                ` : '<p class="no-transitions">No hay transición de estado disponible</p>'}
            </div>
        </div>`;
    }
    container.innerHTML = html;
}

async function actualizarEstado(pedidoId) {
    const select = document.getElementById(`select-${pedidoId}`);
    const nuevoEstado = select.value;
    const btn = select.nextElementSibling;

    btn.disabled = true;
    btn.textContent = 'Actualizando...';

    try {
        const result = await cambiarEstado(pedidoId, nuevoEstado);
        if (result.error) {
            alert('Error: ' + result.error);
        } else {
            alert('Estado actualizado a "' + nuevoEstado + '"');
            init();
        }
    } catch (err) {
        alert('Error de conexión');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Actualizar';
    }
}

// WebSocket para updates en tiempo real
let socket = null;
function connectWS() {
    if (typeof io === 'undefined') return;
    socket = io(`${API_URL}/pedidos`, {
        auth: { token: getToken() },
        transports: ['websocket', 'polling']
    });
    socket.on('pedido:estado-cambiado', (data) => {
        console.log('[WS] Pedido actualizado:', data);
        init();
    });
}

async function init() {
    if (!isVendedor()) {
        document.getElementById('main').innerHTML = '<p style="text-align:center;padding:40px;">Acceso denegado. Se requiere rol de vendedor.</p>';
        return;
    }
    const pedidos = await listarPedidosVendedor();
    renderPedidosVendedor(pedidos);
    connectWS();
}

