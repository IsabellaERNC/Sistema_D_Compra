//localhost:3000';//localhost:3000';

function isLoggedIn() {
    return !!localStorage.getItem('token');
}

function getCarritoKey() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    return usuario.id ? 'carrito_' + usuario.id : 'carrito_guest';
}

function procederAlPago() {
    if (!isLoggedIn()) {
        // Save current cart before redirecting
        const carritoKey = getCarritoKey();
        const carrito = JSON.parse(localStorage.getItem(carritoKey)) || [];
        localStorage.setItem('carrito_pending_checkout', JSON.stringify(carrito));
        
        // Redirect to login with redirect param
        localStorage.setItem('redirect_after_login', 'checkout');
        window.location.href = 'login.html?redirect=checkout';
        return;
    }
    
    // User is logged in — proceed to checkout summary
    window.location.href = 'checkout.html';
}

// Check for pending checkout after login
function checkPendingCheckout() {
    const pending = localStorage.getItem('carrito_pending_checkout');
    if (pending) {
        const carritoKey = getCarritoKey();
        localStorage.setItem(carritoKey, pending);
        localStorage.removeItem('carrito_pending_checkout');
    }
}

async function iniciarCheckout() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Debes iniciar sesión para continuar con el pago.');
        localStorage.setItem('redirect_after_login', 'checkout');
        window.location.href = 'login.html?redirect=checkout';
        return;
    }

    const carritoKey = getCarritoKey();
    const carrito = JSON.parse(localStorage.getItem(carritoKey)) || [];

    if (carrito.length === 0) {
        alert('El carrito está vacío. Agrega productos antes de continuar.');
        return;
    }

    const items = carrito.map(item => ({
        producto_id: item.id,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio
    }));

    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    try {
        const respuesta = await fetch(`${API_URL}/api/checkout/iniciar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ items, total, moneda: 'MXN' })
        });

        const resultado = await respuesta.json();

        if (respuesta.status === 409) {
            const detalle = resultado.items_sin_stock
                ? resultado.items_sin_stock.map(i => `${i.nombre} (solicitado: ${i.cantidad_solicitada}, disponible: ${i.stock_disponible})`).join('\n')
                : '';
            alert('Stock insuficiente:\n' + detalle);
            return;
        }

        if (respuesta.status === 400) {
            alert(resultado.error || 'Carrito inválido.');
            return;
        }

        if (!respuesta.ok) {
            alert(resultado.error || 'Error al iniciar el checkout. Inténtalo de nuevo.');
            return;
        }

        if (resultado.checkout_url) {
            window.location.href = resultado.checkout_url;
        } else {
            alert('No se recibió la URL de pago. Inténtalo de nuevo.');
        }
    } catch (error) {
        console.error('Error iniciando checkout:', error);
        alert('Error de conexión. Revisa que el servidor esté corriendo.');
    }
}

