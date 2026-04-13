const productosBase = [
    { id: 1, nombre: 'Producto 1', precio: 10000, stock: 3 },
    { id: 2, nombre: 'Producto 2', precio: 25000, stock: 3 },
    { id: 3, nombre: 'Producto 3', precio: 15000, stock: 3 },
];

if (!localStorage.getItem('stock')) {
    localStorage.setItem('stock', JSON.stringify(productosBase));
}

function getStock() {
    return JSON.parse(localStorage.getItem('stock'));
}

// Lee desde la clave correcta (getCarritoKey viene de auth.js)
let carrito = JSON.parse(localStorage.getItem(getCarritoKey())) || [];

function mostrarProductos() {
    const lista = document.getElementById('lista-productos');
    lista.innerHTML = '';
    const productos = getStock();
    const disponibles = productos.filter(p => p.stock > 0);

    if (disponibles.length === 0) {
        lista.innerHTML = '<p>No hay productos disponibles por el momento.</p>';
        return;
    }

    disponibles.forEach(p => {
        lista.innerHTML += `
            <div class="producto">
                <h3>${p.nombre}</h3>
                <p>Precio: $${p.precio.toLocaleString()}</p>
                <p class="stock">Stock: ${p.stock} unidades</p>
                <button onclick="agregarAlCarrito(${p.id})">
                    Agregar al carrito
                </button>
            </div>
        `;
    });
}

function agregarAlCarrito(id) {
    const productos = getStock();
    const producto  = productos.find(p => p.id === id);

    if (!producto) {
        alert('Este producto no existe.');
        return;
    }
    if (producto.stock <= 0) {
        alert('Lo sentimos, "' + producto.nombre + '" está agotado.');
        mostrarProductos();
        return;
    }

    const existe = carrito.find(item => item.id === id);
    if (existe) {
        existe.cantidad++;
    } else {
        carrito.push({ id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1 });
    }

    producto.stock--;
    localStorage.setItem('stock', JSON.stringify(productos));
    localStorage.setItem(getCarritoKey(), JSON.stringify(carrito));

    actualizarContador();
    mostrarProductos();
    alert('"' + producto.nombre + '" agregado al carrito.');
}

function actualizarContador() {
    const total = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const el = document.getElementById('contador');
    if (el) el.innerText = total;
}

function onLoginExitoso() {
    const usuario  = getUsuario();
    const userKey  = 'carrito_' + usuario.id;
    const guestKey = 'carrito_guest';

    const carritoGuest   = JSON.parse(localStorage.getItem(guestKey)) || [];
    const carritoUsuario = JSON.parse(localStorage.getItem(userKey))  || [];

    carritoGuest.forEach(function(itemGuest) {
        const existente = carritoUsuario.find(function(i) { return i.id === itemGuest.id; });
        if (existente) {
            existente.cantidad += itemGuest.cantidad;
        } else {
            carritoUsuario.push(itemGuest);
        }
    });

    localStorage.removeItem(guestKey);
    localStorage.setItem(userKey, JSON.stringify(carritoUsuario));

    carrito = carritoUsuario;
    renderAuthNav();
    actualizarContador();
}

mostrarProductos();
actualizarContador();