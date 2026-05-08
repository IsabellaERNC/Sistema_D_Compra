
const API_URL = 'http://localhost:3000';

(function() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
        localStorage.setItem('token', token);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
})();

let productos = [];
let carrito = JSON.parse(localStorage.getItem(getCarritoKey())) || [];

async function cargarProductos() {
    try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        const response = await fetch(`${API_URL}/api/productos`, { headers });
        const data = await response.json();
        
        if (data.error) {
            console.error('Error cargando productos:', data.error);

            productos = [];
            return;
        }
        
        productos = data.productos || [];
    } catch (err) {
        console.error('Error de red cargando productos:', err);
        productos = [];
    }
}

function getStock() {
    return productos;
}

function mostrarProductos() {
    const lista = document.getElementById('lista-productos');
    lista.innerHTML = '';
    const disponibles = productos.filter(p => p.stock > 0);

    if (disponibles.length === 0) {
        lista.innerHTML = '<p>No hay productos disponibles por el momento.</p>';
        return;
    }

    disponibles.forEach(p => {
        lista.innerHTML += `
            <div class="producto">
                <h3>${p.nombre}</h3>
                <p>Precio: $${Number(p.precio).toLocaleString()}</p>
                <p class="stock">Stock: ${p.stock} unidades</p>
                <button onclick="agregarAlCarrito('${p.id}')">
                    Agregar al carrito
                </button>
            </div>
        `;
    });
}

function agregarAlCarrito(id) {
    const producto = productos.find(p => p.id === id);

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
    
    localStorage.setItem(getCarritoKey(), JSON.stringify(carrito));

    // Sincronizar con backend si el usuario está autenticado
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        const token = localStorage.getItem('token');
        fetch(`${API_URL}/api/carrito`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                producto_id: producto.id,
                nombre: producto.nombre,
                precio_unitario: producto.precio,
                cantidad: 1
            })
        }).catch(err => console.error('Error al sincronizar carrito con backend:', err));
    }

    actualizarContador();
    mostrarProductos();
    alert('"' + producto.nombre + '" agregado al carrito.');
}

function actualizarContador() {
    const total = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const el = document.getElementById('contador');
    if (el) el.innerText = total;
}

cargarProductos().then(() => {
    mostrarProductos();
    actualizarContador();
});
