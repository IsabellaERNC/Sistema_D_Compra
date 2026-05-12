/**
 * Módulo de pedidos - gestión de pedidos y tracking en tiempo real
 * Se conecta a Socket.IO para recibir actualizaciones de estado en tiempo real
 */

const API_URL = window.API_URL || 'http://localhost:3000';

/**
 * Obtiene el token del localStorage
 */
function getToken() {
    return localStorage.getItem('token') || '';
}

/**
 * Obtiene el usuario del localStorage
 */
function getUsuario() {
    try {
        return JSON.parse(localStorage.getItem('usuario') || '{}');
    } catch {
        return {};
    }
}

/**
 * Verifica si el usuario está autenticado
 */
function isLoggedIn() {
    return !!getToken() && !!getUsuario().id;
}

/**
 * Lista pedidos del usuario actual
 * @returns {Promise<Array>} Lista de pedidos
 */
async function listarPedidos() {
    const token = getToken();
    if (!token) return [];

    try {
        const res = await fetch(`${API_URL}/api/pedidos`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.pedidos || [];
    } catch (err) {
        console.error('[pedidos] Error listando pedidos:', err);
        return [];
    }
}

/**
 * Obtiene detalle de un pedido
 * @param {string} pedidoId - ID del pedido
 * @returns {Promise<object>} Detalle del pedido
 */
async function obtenerPedido(pedidoId) {
    const token = getToken();
    if (!token || !pedidoId) return null;

    try {
        const res = await fetch(`${API_URL}/api/pedidos/${pedidoId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.pedido || null;
    } catch (err) {
        console.error('[pedidos] Error obteniendo pedido:', err);
        return null;
    }
}

/**
 * Mapea estado a color de badge
 * @param {string} estado
 * @returns {string} Clase CSS
 */
function estadoBadgeClass(estado) {
    const map = {
        'Pendiente': 'badge-pending',
        'Procesando': 'badge-processing',
        'Enviado': 'badge-shipped',
        'Entregado': 'badge-delivered',
        'Cancelado': 'badge-cancelled'
    };
    return map[estado] || 'badge-pending';
}

/**
 * Formatea fecha a formato legible
 * @param {string} fecha
 * @returns {string} Fecha formateada
 */
function formatearFecha(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-CO', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

/**
 * Renderiza la lista de pedidos en el contenedor
 * @param {HTMLElement} container - Contenedor donde renderizar
 * @param {Array} pedidos - Lista de pedidos
 */
function renderPedidos(container, pedidos) {
    if (!container) return;

    if (!pedidos || pedidos.length === 0) {
        container.innerHTML = `
            <div class="pedidos-vacio">
                <p>📦 Aún no tienes pedidos</p>
                <a href="index.html" class="btn">Explorar productos</a>
            </div>
        `;
        return;
    }

    let html = '<div class="pedidos-lista">';
    for (const pedido of pedidos) {
        const badgeClass = estadoBadgeClass(pedido.estado);
        const items = Array.isArray(pedido.items) ? pedido.items : JSON.parse(pedido.items || '[]');
        html += `
            <div class="pedido-card" data-pedido-id="${pedido.id}">
                <div class="pedido-header" onclick="togglePedidoDetalle('${pedido.id}')">
                    <div class="pedido-info">
                        <div class="pedido-id">Pedido #${pedido.id.substring(0, 8)}...</div>
                        <div class="pedido-fecha">${formatearFecha(pedido.created_at)}</div>
                    </div>
                    <div class="pedido-right">
                        <span class="badge ${badgeClass}">${pedido.estado || 'Pendiente'}</span>
                        <span class="pedido-total">$${Number(pedido.monto_total || 0).toLocaleString('es-CO')}</span>
                        <span class="pedido-items-count">${items.length} item(s)</span>
                        <span class="expand-icon">▼</span>
                    </div>
                </div>
                <div class="pedido-detalle" id="detalle-${pedido.id}" style="display:none;">
                    <div class="detalle-items">
                        <h4>Productos</h4>
                        ${items.map(item => `
                            <div class="item-row">
                                <span class="item-nombre">${item.nombre || item.producto_nombre || 'Producto'}</span>
                                <span class="item-cantidad">x${item.cantidad}</span>
                                <span class="item-precio">$${Number(item.precio_unitario || 0).toLocaleString('es-CO')}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="detalle-total">
                        <strong>Total:</strong>
                        <strong>$${Number(pedido.monto_total || 0).toLocaleString('es-CO')}</strong>
                    </div>
                    ${['Pendiente', 'Procesando'].includes(pedido.estado) ? `
                    <div class="cancelar-container">
                        <button class="btn-cancelar" id="btn-cancelar-${pedido.id}" onclick="cancelarPedido('${pedido.id}')">
                            Cancelar pedido
                        </button>
                    </div>
                    <div id="cancelar-msg-${pedido.id}" style="display:none;" class="cancelar-msg"></div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Toggle expand/collapse del detalle de un pedido
 * @param {string} pedidoId
 */
function togglePedidoDetalle(pedidoId) {
    const detalle = document.getElementById(`detalle-${pedidoId}`);
    if (!detalle) return;
    detalle.style.display = detalle.style.display === 'none' ? 'block' : 'none';
}

// =============================================================================
// WebSocket - Tracking en tiempo real
// =============================================================================

let socket = null;

/**
 * Conecta al WebSocket de pedidos
 * Recibe eventos de cambio de estado en tiempo real
 */
function connectWebSocket() {
    if (!isLoggedIn()) return;

    const token = getToken();
    const usuario = getUsuario();

    // Usar la biblioteca socket.io del servidor si está disponible
    if (typeof io !== 'undefined') {
        socket = io(`${API_URL}/pedidos`, {
            auth: { token },
            transports: ['websocket', 'polling']
        });
    } else {
        // Fallback: polling manual (no ideal pero funcional)
        console.warn('[pedidos] Socket.IO no disponible - usando polling');
        startPolling();
        return;
    }

    socket.on('connect', () => {
        console.log('[WebSocket] Conectado a /pedidos');
    });

    socket.on('disconnect', () => {
        console.log('[WebSocket] Desconectado de /pedidos');
    });

    // Evento: pedido cambió de estado
    socket.on('pedido:estado-cambiado', (data) => {
        console.log('[WebSocket] Estado de pedido actualizado:', data);
        // Actualizar badge en tiempo real
        actualizarBadgePedido(data.pedidoId, data.nuevoEstado);
    });

    socket.on('connect_error', (err) => {
        console.error('[WebSocket] Error de conexión:', err.message);
        // Fallback a polling
        startPolling();
    });
}

/**
 * Actualiza el badge de estado de un pedido específico en la UI
 * @param {string} pedidoId
 * @param {string} nuevoEstado
 */
function actualizarBadgePedido(pedidoId, nuevoEstado) {
    const card = document.querySelector(`[data-pedido-id="${pedidoId}"]`);
    if (!card) return;

    const badge = card.querySelector('.badge');
    if (badge) {
        badge.className = `badge ${estadoBadgeClass(nuevoEstado)}`;
        badge.textContent = nuevoEstado;
    }

    const btn = document.getElementById(`btn-cancelar-${pedidoId}`);
    if (btn) btn.style.display = 'none';

    const msg = document.getElementById(`cancelar-msg-${pedidoId}`);
    if (msg && nuevoEstado === 'Cancelado') {
        msg.textContent = 'Pedido cancelado';
        msg.style.display = 'inline-block';
    }
}

async function cancelarPedido(pedidoId) {
    if (!confirm('¿Estás seguro de que deseas cancelar este pedido?')) return;

    const btn = document.getElementById(`btn-cancelar-${pedidoId}`);
    btn.disabled = true;
    btn.textContent = 'Cancelando...';

    try {
        const res = await fetch(`${API_URL}/api/pedidos/${pedidoId}/cancelar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        const result = await res.json();

        if (result.error) {
            alert('Error: ' + result.error);
            btn.disabled = false;
            btn.textContent = 'Cancelar pedido';
        } else {
            actualizarBadgePedido(pedidoId, 'Cancelado');
            alert('Pedido cancelado exitosamente.');
        }
    } catch (err) {
        alert('Error de conexión.');
        btn.disabled = false;
        btn.textContent = 'Cancelar pedido';
    }
}

/**
 * Polling fallback cuando WebSocket no está disponible
 */
let pollingInterval = null;

function startPolling() {
    if (pollingInterval) return;
    pollingInterval = setInterval(async () => {
        try {
            const pedidos = await listarPedidos();
            // Verificar cambios de estado vs UI actual
            const container = document.getElementById('pedidos-container');
            if (container && pedidos.length > 0) {
                renderPedidos(container, pedidos);
            }
        } catch (err) {
            // Silencioso
        }
    }, 15000); // Cada 15 segundos
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

