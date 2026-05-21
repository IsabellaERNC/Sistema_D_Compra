<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from '@/composables/useToast'
import { useApi } from '@/composables/useApi'
import { useSocket } from '@/composables/useSocket'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const router = useRouter()
const auth = useAuthStore()
const { showToast } = useToast()
const { get, post, patch, del } = useApi()
const { on } = useSocket()

const direcciones = ref([])
const cargando = ref(true)
const showForm = ref(false)
const editando = ref(null)

const form = ref({ alias: '', calle: '', ciudad: '', departamento: '', codigo_postal: '', predeterminada: false })
const enviando = ref(false)

const confirmOpen = ref(false)
const confirmId = ref(null)

onMounted(async () => {
  if (!auth.isLoggedIn) {
    router.push('/carrito')
    return
  }
  await cargar()
  on('direcciones:actualizadas', () => cargar())
})

async function cargar() {
  try {
    const data = await get('/api/direcciones')
    direcciones.value = data.direcciones || []
  } catch (err) {
    showToast('Error al cargar direcciones', 'error')
  } finally {
    cargando.value = false
  }
}

function nuevo() {
  editando.value = null
  form.value = { alias: '', calle: '', ciudad: '', departamento: '', codigo_postal: '', predeterminada: false }
  showForm.value = true
}

async function guardar() {
  if (!form.value.alias || !form.value.calle || !form.value.ciudad || !form.value.departamento) {
    showToast('Completa los campos obligatorios', 'warning')
    return
  }
  enviando.value = true
  try {
    const endpoint = editando.value ? `/api/direcciones/${editando.value}` : '/api/direcciones'
    const fn = editando.value ? patch : post
    await fn(endpoint, form.value)
    showToast(editando.value ? 'Dirección actualizada' : 'Dirección creada', 'success')
    showForm.value = false
    await cargar()
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    enviando.value = false
  }
}

function solicitarEliminar(id) {
  confirmId.value = id
  confirmOpen.value = true
}

async function eliminarConfirmado() {
  const id = confirmId.value
  if (!id) return
  try {
    await del(`/api/direcciones/${id}`)
    showToast('Dirección eliminada', 'info')
    await cargar()
  } catch (err) {
    showToast('Error al eliminar', 'error')
  } finally {
    confirmId.value = null
  }
}

function editar(dir) {
  editando.value = dir.id
  form.value = { alias: dir.alias, calle: dir.calle, ciudad: dir.ciudad, departamento: dir.departamento, codigo_postal: dir.codigo_postal || '', predeterminada: dir.predeterminada }
  showForm.value = true
}

function cancelar() {
  showForm.value = false
  editando.value = null
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Mis Direcciones</h1>
      <button v-if="!showForm && direcciones.length < 5" @click="nuevo" class="btn btn-primary btn-pill">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nueva dirección
      </button>
    </div>

    <div v-if="cargando" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else-if="showForm" class="card" style="padding: var(--space-6); margin-bottom: var(--space-6);">
      <h3 style="margin-bottom: var(--space-4); font-weight: 700;">{{ editando ? 'Editar' : 'Nueva' }} dirección</h3>
      <div style="display: grid; gap: var(--space-4); max-width: 480px;">
        <div>
          <label>Alias *</label>
          <input v-model="form.alias" placeholder="Ej: Casa, Oficina" />
        </div>
        <div>
          <label>Calle *</label>
          <input v-model="form.calle" placeholder="Calle y número" />
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
          <div>
            <label>Ciudad *</label>
            <input v-model="form.ciudad" placeholder="Ciudad" />
          </div>
          <div>
            <label>Departamento</label>
            <input v-model="form.departamento" placeholder="Departamento" />
          </div>
        </div>
        <div>
          <label>Código postal</label>
          <input v-model="form.codigo_postal" placeholder="000000" />
        </div>
        <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
          <input type="checkbox" v-model="form.predeterminada" style="width: auto;" />
          <span style="font-weight: 500;">Dirección predeterminada</span>
        </label>
        <div style="display: flex; gap: var(--space-3);">
          <button @click="guardar" class="btn btn-primary" :disabled="enviando" :class="{ loading: enviando }">
            <span class="spinner spinner-sm"></span>
            <span class="btn-text">{{ enviando ? 'Guardando...' : 'Guardar' }}</span>
          </button>
          <button @click="cancelar" class="btn btn-ghost">Cancelar</button>
        </div>
      </div>
    </div>

    <div v-else-if="direcciones.length === 0" class="empty-state">
      <div class="empty-state-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <h3>Sin direcciones</h3>
      <p>Agrega una dirección de envío para tus compras.</p>
      <button @click="nuevo" class="btn btn-primary">Agregar dirección</button>
    </div>

    <div v-else class="direcciones-list">
      <div v-for="dir in direcciones" :key="dir.id" class="direccion-card card">
        <div class="direccion-content">
          <div class="direccion-header">
            <span class="direccion-alias">{{ dir.alias }}</span>
            <span v-if="dir.predeterminada" class="badge badge-delivered">Predeterminada</span>
          </div>
          <p class="direccion-texto">{{ dir.calle }}, {{ dir.ciudad }}, {{ dir.departamento }}</p>
          <p v-if="dir.codigo_postal" class="direccion-cp">CP: {{ dir.codigo_postal }}</p>
        </div>
        <div class="direccion-actions">
          <button @click="editar(dir)" class="btn btn-ghost btn-sm" title="Editar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button @click="solicitarEliminar(dir.id)" class="btn btn-ghost btn-sm" title="Eliminar" style="color: var(--rose-500);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model:open="confirmOpen"
      title="Eliminar dirección"
      message="¿Seguro que deseas eliminar esta dirección?"
      confirm-text="Eliminar"
      cancel-text="Cancelar"
      :destructive="true"
      @confirm="eliminarConfirmado"
    />
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-8);
  flex-wrap: wrap;
  gap: var(--space-4);
}

.page-header .page-title {
  margin-bottom: 0;
}

.direcciones-list {
  display: grid;
  gap: var(--space-3);
}

.direccion-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--space-5);
  gap: var(--space-4);
}

.direccion-content { flex: 1; }

.direccion-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.direccion-alias {
  font-weight: 700;
  color: var(--gray-800);
  font-size: 1rem;
}

.direccion-texto {
  color: var(--gray-500);
  font-size: 0.9rem;
  margin-top: var(--space-1);
}

.direccion-cp {
  color: var(--gray-400);
  font-size: 0.8rem;
  margin-top: var(--space-1);
}

.direccion-actions {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .page-header { flex-direction: column; align-items: stretch; }
  .page-header .btn { width: 100%; }
  .direccion-card { flex-direction: column; }
  .direccion-actions { align-self: flex-end; }
}
</style>
