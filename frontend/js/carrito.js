let carrito = JSON.parse(localStorage.getItem(getCarritoKey())) || [];

function getStock() {

    return [];
}

function mostrarCarrito() {
    const lista = document.getElementById('lista-carrito');
    lista.innerHTML = '';

    if (carrito.length === 0) {
        lista.innerHTML = '<p>⚠️ No hay productos en el carrito.</p>';
        document.getElementById('total').innerText = '$0';
        return;
    }


    carrito.forEach(function(item, index) {
        lista.innerHTML += `
            <div class="item-carrito">
                <h3>${item.nombre}</h3>
                <p>Precio unitario: $${Number(item.precio).toLocaleString()}</p>
                <div class="controles">
                    <button onclick="disminuir(${index})">➖</button>
                    <span>${item.cantidad}</span>
                    <button onclick="aumentar(${index})">➕</button>
                </div>
                <p>Subtotal: $${(item.precio * item.cantidad).toLocaleString()}</p>
                <button onclick="eliminar(${index})">🗑️ Eliminar</button>
            </div>
        `;
    });

    calcularTotal();
}

function aumentar(index) {

    carrito[index].cantidad++;
    guardar();
}

function disminuir(index) {
    if (carrito[index].cantidad > 1) {
        carrito[index].cantidad--;
    } else {
        carrito.splice(index, 1);
    }
    guardar();
}

function eliminar(index) {
    carrito.splice(index, 1);
    guardar();
}

function vaciarCarrito() {

    carrito = [];
    guardar();
}

function calcularTotal() {
    const total = carrito.reduce(function(sum, item) { return sum + (item.precio * item.cantidad); }, 0);
    document.getElementById('total').innerText = '$' + total.toLocaleString();
}

function guardar() {
    localStorage.setItem(getCarritoKey(), JSON.stringify(carrito));
    mostrarCarrito();
}

const AUTH_LOGIN_URL = 'http://localhost:4000/auth/login?redirect=';

function verificarAuthYProcesarPago() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.href = AUTH_LOGIN_URL + currentUrl;
        return false;
    }
    
    procesarPagoConBackend();
    return true;
}


async function handleAuthCallback() {
    if (typeof procesarAuthCallback === 'function') {
        await procesarAuthCallback();
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
            localStorage.setItem('token', token);
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('✅ Token recibido y guardado desde callback');
        }
    }

    carrito = JSON.parse(localStorage.getItem(getCarritoKey())) || [];
    mostrarCarrito();
}


document.addEventListener('DOMContentLoaded', function() {
    handleAuthCallback();
});

mostrarCarrito();


async function procesarPagoConBackend() {
    const token = localStorage.getItem('token');

    if (!token) {
        alert("¡Pilas! Debes iniciar sesión para poder pagar.");
        window.location.href = AUTH_LOGIN_URL + encodeURIComponent(window.location.href);
        return;
    }

    if (carrito.length === 0) {
        alert("El carrito está vacío. Agrega productos antes de pagar.");
        return;
    }

    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    if (total <= 0) {
        alert("El total es $0. No puedes procesar un pago en $0.");
        return;
    }


    const usuario = JSON.parse(localStorage.getItem('usuario'));
    
    const datosCheckout = {
        items: carrito.map(item => ({
            producto_id: item.id,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precio_unitario: item.precio
        })),
        total: total,
        moneda: 'MXN'
    };

    try {
        const respuesta = await fetch('http://localhost:3000/api/checkout/iniciar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(datosCheckout)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok && resultado.init_point) {

            console.log('🔄 Redireccionando al servicio de pagos...');
            window.location.href = resultado.init_point;
        } else if (resultado.error) {
            alert('Error al iniciar checkout: ' + resultado.error);
        } else {
            alert('Error del servidor: No se pudo iniciar el checkout');
        }
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        alert('No hay conexión con el backend. Revisa que el servidor Node esté corriendo.');
    }
}
