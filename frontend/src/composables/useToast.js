import { ref, reactive } from 'vue'
import { DateTime } from 'luxon'

// Estado global para las notificaciones
const notifications = ref([])
let nextId = 1

// Posición del mouse
const mousePosition = reactive({
  x: 0,
  y: 0
})

// Función para rastrear el mouse
let mouseTracker = null
let mouseTimeout = null

const trackMouse = (event) => {
  mousePosition.x = event.clientX
  mousePosition.y = event.clientY
  
  // Limpiar timeout anterior
  if (mouseTimeout) {
    clearTimeout(mouseTimeout)
  }
  
  // Ocultar notificaciones después de 500ms de inactividad del mouse
  mouseTimeout = setTimeout(() => {
    clearAllNotifications()
  }, 500)
}

// Inicializar rastreador de mouse
const initMouseTracker = () => {
  if (!mouseTracker) {
    mouseTracker = true
    document.addEventListener('mousemove', trackMouse)
  }
}

// Función para mostrar notificación
const showNotification = (message, type = 'info', duration = 3000) => {
  initMouseTracker()
  
  const notification = {
    id: nextId++,
    message,
    type, // 'success', 'error', 'warning', 'info'
    duration,
    timestamp: DateTime.now().toMillis()
  }
  
  notifications.value.push(notification)
  
  // Auto remover después de la duración especificada (independiente del mouse)
  setTimeout(() => {
    removeNotification(notification.id)
  }, duration)
  
  return notification.id
}

// Función para remover una notificación específica
const removeNotification = (id) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

// Función para limpiar todas las notificaciones
const clearAllNotifications = () => {
  notifications.value = []
}

// Funciones de conveniencia para diferentes tipos
const showSuccess = (message, duration = 3000) => {
  return showNotification(message, 'success', duration)
}

const showError = (message, duration = 5000) => {
  return showNotification(message, 'error', duration)
}

const showWarning = (message, duration = 4000) => {
  return showNotification(message, 'warning', duration)
}

const showInfo = (message, duration = 3000) => {
  return showNotification(message, 'info', duration)
}

// Composable principal
export const useToast = () => {
  return {
    notifications,
    mousePosition,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    clearAllNotifications
  }
}