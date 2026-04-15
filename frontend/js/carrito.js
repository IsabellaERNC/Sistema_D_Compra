// getCarritoKey() viene de auth.js — disponible en todas las páginas
let carrito = JSON.parse(localStorage.getItem(getCarritoKey())) || [];

function getStock() {
    return JSON.parse(localStorage.getItem('stock')) || [];
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
        const stockDisponible = getStock().find(function(p) { return p.id === item.id; })?.stock || 0;
        lista.innerHTML += `
            <div class="item-carrito">
                <h3>${item.nombre}</h3>
                <p>Precio unitario: $${item.precio.toLocaleString()}</p>
                <div class="controles">
                    <button onclick="disminuir(${index})">➖</button>
                    <span>${item.cantidad}</span>
                    <button onclick="aumentar(${index})"
                        ${stockDisponible <= 0 ? 'disabled style="opacity:0.4"' : ''}>➕</button>
                </div>
                <p>Subtotal: $${(item.precio * item.cantidad).toLocaleString()}</p>
                <button onclick="eliminar(${index})">🗑️ Eliminar</button>
            </div>
        `;
    });

    calcularTotal();
}

function aumentar(index) {
    const productos = getStock();
    const producto  = productos.find(function(p) { return p.id === carrito[index].id; });

    if (!producto || producto.stock <= 0) {
        alert('⚠️ No hay más stock disponible de "' + carrito[index].nombre + '".');
        return;
    }

    carrito[index].cantidad++;
    producto.stock--;
    localStorage.setItem('stock', JSON.stringify(productos));
    guardar();
}

function disminuir(index) {
    const productos = getStock();
    const producto  = productos.find(function(p) { return p.id === carrito[index].id; });

    if (carrito[index].cantidad > 1) {
        carrito[index].cantidad--;
        if (producto) producto.stock++;
    } else {
        if (producto) producto.stock++;
        carrito.splice(index, 1);
    }

    localStorage.setItem('stock', JSON.stringify(productos));
    guardar();
}

function eliminar(index) {
    const productos = getStock();
    const producto  = productos.find(function(p) { return p.id === carrito[index].id; });
    if (producto) producto.stock += carrito[index].cantidad;

    localStorage.setItem('stock', JSON.stringify(productos));
    carrito.splice(index, 1);
    guardar();
}

function vaciarCarrito() {
    const productos = getStock();
    carrito.forEach(function(item) {
        const producto = productos.find(function(p) { return p.id === item.id; });
        if (producto) producto.stock += item.cantidad;
    });
    localStorage.setItem('stock', JSON.stringify(productos));
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

mostrarCarrito();


// ==========================================
// MÓDULO DE PAGOS Y CONEXIÓN CON BACKEND
// ==========================================

async function procesarPagoConBackend() {
    const token = localStorage.getItem('token');

    if (!token) {
        alert("¡Pilas! Debes iniciar sesión para poder pagar.");
        window.location.href = 'login.html';
        return;
    }

    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    console.log("Calculando total en carrito:", total);

    if (total <= 0) {
        alert("El carrito está vacío. No puedes procesar un pago en $0.");
        return;
    }

    const nombreUsuario = JSON.parse(localStorage.getItem('usuario'))?.nombre || 'Usuario';

    const datosTransaccion = {
        monto: total,
        descripcion: `Compra realizada por ${nombreUsuario}`
    };

    try {
        const respuesta = await fetch('http://localhost:3000/api/transacciones', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(datosTransaccion)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            // ✅ CORRECCIÓN BUG 2: resultado.transaccion.id (no resultado.id)
            console.log('✅ Transacción registrada (Pendiente) con ID:', resultado.transaccion.id);
            window.location.href = `../pages/pago.html?transactionId=${resultado.transaccion.id}`;
        } else {
            alert('Error del servidor: ' + (resultado.error || 'No se pudo crear la transacción'));
        }
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        alert('No hay conexión con el backend. Revisa que el servidor Node esté corriendo.');
    }
}