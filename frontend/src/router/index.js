import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/carrito' },
    { path: '/carrito', name: 'cart', component: () => import('../views/CartView.vue') },
    { path: '/checkout', name: 'checkout', component: () => import('../views/CheckoutView.vue') },
    { path: '/pago', name: 'payment', component: () => import('../views/PaymentView.vue') },
    { path: '/confirmacion', name: 'confirmation', component: () => import('../views/ConfirmationView.vue') },
    { path: '/pedidos', name: 'orders', component: () => import('../views/OrdersView.vue') },
    { path: '/vendedor', name: 'vendor', component: () => import('../views/VendorView.vue') },
    { path: '/direcciones', name: 'addresses', component: () => import('../views/DireccionesView.vue') }
  ]
})

export default router
