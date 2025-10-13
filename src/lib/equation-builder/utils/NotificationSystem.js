/**
 * Notification System for Equation Builder
 * 
 * This module handles all user notifications including success messages,
 * errors, warnings, and informational messages.
 */

/**
 * Notification types with their styling
 */
export const NOTIFICATION_TYPES = {
  SUCCESS: {
    className: 'notification-success',
    backgroundColor: '#10b981',
    icon: '✅',
    duration: 3000
  },
  ERROR: {
    className: 'notification-error', 
    backgroundColor: '#ef4444',
    icon: '❌',
    duration: 5000
  },
  WARNING: {
    className: 'notification-warning',
    backgroundColor: '#f59e0b',
    icon: '⚠️',
    duration: 4000
  },
  INFO: {
    className: 'notification-info',
    backgroundColor: '#3b82f6',
    icon: 'ℹ️',
    duration: 3000
  }
};

/**
 * Notification manager class
 */
export class NotificationSystem {
  constructor() {
    this.notifications = new Map();
    this.notificationId = 0;
    this.container = null;
    this.initialized = false;
  }

  /**
   * Initialize the notification system
   */
  init() {
    if (this.initialized) return;
    
    this.createContainer();
    this.initialized = true;
  }

  /**
   * Create the notification container
   */
  createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 400px;
    `;
    
    document.body.appendChild(this.container);
  }

  /**
   * Show a notification
   */
  show(message, type = 'INFO', options = {}) {
    if (!this.initialized) {
      this.init();
    }

    const notificationType = NOTIFICATION_TYPES[type.toUpperCase()] || NOTIFICATION_TYPES.INFO;
    const notificationId = this.notificationId++;
    
    const notification = this.createNotificationElement(
      message, 
      notificationType, 
      notificationId,
      options
    );
    
    this.container.appendChild(notification);
    this.notifications.set(notificationId, notification);
    
    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    });
    
    // Auto-dismiss
    const duration = options.duration || notificationType.duration;
    if (options.autoDismiss !== false) {
      setTimeout(() => {
        this.dismiss(notificationId);
      }, duration);
    }
    
    return notificationId;
  }

  /**
   * Create notification element
   */
  createNotificationElement(message, type, id, options) {
    const notification = document.createElement('div');
    notification.className = `notification ${type.className}`;
    notification.dataset.notificationId = id;
    
    notification.style.cssText = `
      background: ${type.backgroundColor};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      pointer-events: auto;
      cursor: pointer;
      transition: all 0.3s ease;
      transform: translateX(100%);
      opacity: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      word-break: break-word;
    `;
    
    // Add icon if specified
    if (options.showIcon !== false) {
      const icon = document.createElement('span');
      icon.textContent = type.icon;
      icon.style.fontSize = '16px';
      notification.appendChild(icon);
    }
    
    // Add message
    const messageElement = document.createElement('span');
    messageElement.textContent = message;
    messageElement.style.flex = '1';
    notification.appendChild(messageElement);
    
    // Add close button if specified
    if (options.showClose !== false) {
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '×';
      closeButton.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        padding: 0;
        margin-left: 8px;
        opacity: 0.7;
        transition: opacity 0.2s ease;
      `;
      
      closeButton.addEventListener('mouseenter', () => {
        closeButton.style.opacity = '1';
      });
      
      closeButton.addEventListener('mouseleave', () => {
        closeButton.style.opacity = '0.7';
      });
      
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismiss(id);
      });
      
      notification.appendChild(closeButton);
    }
    
    // Click to dismiss
    notification.addEventListener('click', () => {
      this.dismiss(id);
    });
    
    // Hover effects
    notification.addEventListener('mouseenter', () => {
      notification.style.transform = 'translateX(0) scale(1.02)';
    });
    
    notification.addEventListener('mouseleave', () => {
      notification.style.transform = 'translateX(0) scale(1)';
    });
    
    return notification;
  }

  /**
   * Dismiss a notification
   */
  dismiss(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;
    
    // Animate out
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(notificationId);
    }, 300);
  }

  /**
   * Clear all notifications
   */
  clear() {
    for (const [id] of this.notifications) {
      this.dismiss(id);
    }
  }

  /**
   * Convenience methods for different notification types
   */
  success(message, options = {}) {
    return this.show(message, 'SUCCESS', options);
  }

  error(message, options = {}) {
    return this.show(message, 'ERROR', options);
  }

  warning(message, options = {}) {
    return this.show(message, 'WARNING', options);
  }

  info(message, options = {}) {
    return this.show(message, 'INFO', options);
  }

  /**
   * Show validation error notification
   */
  validationError(field, error) {
    return this.error(`${field}: ${error}`, {
      duration: 4000,
      showIcon: true
    });
  }

  /**
   * Show batch validation errors
   */
  batchValidationErrors(errors) {
    if (errors.length === 1) {
      return this.error(errors[0]);
    } else if (errors.length > 1) {
      const message = `Multiple errors:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...' : ''}`;
      return this.error(message, { duration: 6000 });
    }
  }

  /**
   * Show progress notification (doesn't auto-dismiss)
   */
  progress(message, options = {}) {
    return this.show(message, 'INFO', {
      ...options,
      autoDismiss: false,
      showClose: true
    });
  }
}

// Create global instance
export const notifications = new NotificationSystem();

/**
 * Convenience functions that use the global instance
 */
export function showNotification(message, type = 'info', options = {}) {
  return notifications.show(message, type, options);
}

export function showSuccess(message, options = {}) {
  return notifications.success(message, options);
}

export function showError(message, options = {}) {
  return notifications.error(message, options);
}

export function showWarning(message, options = {}) {
  return notifications.warning(message, options);
}

export function showInfo(message, options = {}) {
  return notifications.info(message, options);
}

export function clearNotifications() {
  notifications.clear();
}

/**
 * Initialize the notification system when the DOM is ready
 */
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => notifications.init());
  } else {
    notifications.init();
  }
}
