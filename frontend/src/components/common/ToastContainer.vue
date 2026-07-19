<template>
  <teleport to="body">
    <div class="toast-container">
      <transition-group name="toast" tag="div">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="getToastClasses(notification.type)"
          :style="getToastPosition()"
          class="toast-notification"
        >
          <div class="toast-content">
            <div class="toast-icon">
              <!-- Success Icon -->
              <svg v-if="notification.type === 'success'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              
              <!-- Error Icon -->
              <svg v-else-if="notification.type === 'error'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              
              <!-- Warning Icon -->
              <svg v-else-if="notification.type === 'warning'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              
              <!-- Info Icon -->
              <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="toast-message">
              {{ notification.message }}
            </div>
            <button 
              @click="removeNotification(notification.id)"
              class="toast-close"
              title="Cerrar"
            >
              <!-- Close Icon -->
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup>
import { useToast } from '../../composables/useToast'

const { notifications, mousePosition, removeNotification } = useToast()

const getToastClasses = (type) => {
  const baseClasses = 'toast-base'
  const typeClasses = {
    success: 'toast-success',
    error: 'toast-error', 
    warning: 'toast-warning',
    info: 'toast-info'
  }
  return `${baseClasses} ${typeClasses[type] || typeClasses.info}`
}

const getToastPosition = () => {
  // Posicionar cerca del mouse con un offset
  const offset = 20
  return {
    position: 'fixed',
    left: `${mousePosition.x + offset}px`,
    top: `${mousePosition.y - offset}px`,
    zIndex: 9999,
    pointerEvents: 'auto'
  }
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 9999;
}

.toast-notification {
  pointer-events: auto;
  transform-origin: center;
}

.toast-base {
  min-width: 200px;
  max-width: 400px;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(4px);
  border: 1px solid;
  display: flex;
  align-items: flex-start;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  animation: slideInFromMouse 0.3s ease-out;
}

.toast-success {
  background-color: rgba(240, 253, 244, 0.95);
  border-color: rgb(187, 247, 208);
  color: rgb(22, 101, 52);
}

.toast-error {
  background-color: rgba(254, 242, 242, 0.95);
  border-color: rgb(254, 202, 202);
  color: rgb(153, 27, 27);
}

.toast-warning {
  background-color: rgba(255, 251, 235, 0.95);
  border-color: rgb(253, 230, 138);
  color: rgb(146, 64, 14);
}

.toast-info {
  background-color: rgba(239, 246, 255, 0.95);
  border-color: rgb(191, 219, 254);
  color: rgb(30, 64, 175);
}

.toast-content {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  width: 100%;
}

.toast-icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.toast-success .toast-icon {
  color: rgb(74, 222, 128);
}

.toast-error .toast-icon {
  color: rgb(248, 113, 113);
}

.toast-warning .toast-icon {
  color: rgb(251, 191, 36);
}

.toast-info .toast-icon {
  color: rgb(96, 165, 250);
}

.toast-message {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
}

.toast-close {
  flex-shrink: 0;
  margin-left: auto;
  padding-left: 0.5rem;
  opacity: 0.6;
  color: rgb(156, 163, 175);
  transition: opacity 0.2s;
  background: none;
  border: none;
  cursor: pointer;
}

.toast-close:hover {
  opacity: 1;
  color: rgb(75, 85, 99);
}

/* Animaciones de transición */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(-10px);
}

.toast-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(-10px);
}

@keyframes slideInFromMouse {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Modo oscuro */
@media (prefers-color-scheme: dark) {
  .toast-success {
    background-color: rgba(20, 83, 45, 0.95);
    border-color: rgb(21, 128, 61);
    color: rgb(187, 247, 208);
  }
  
  .toast-error {
    background-color: rgba(127, 29, 29, 0.95);
    border-color: rgb(185, 28, 28);
    color: rgb(254, 202, 202);
  }
  
  .toast-warning {
    background-color: rgba(120, 53, 15, 0.95);
    border-color: rgb(180, 83, 9);
    color: rgb(253, 230, 138);
  }
  
  .toast-info {
    background-color: rgba(30, 58, 138, 0.95);
    border-color: rgb(37, 99, 235);
    color: rgb(191, 219, 254);
  }

  .toast-close:hover {
    color: rgb(209, 213, 219);
  }
}
</style>