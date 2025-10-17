/**
 * Animation and UX Enhancement Module
 * Provides smooth transitions, user feedback, and enhanced interactions
 */

import { performanceManager } from './performance.js';

export class UXEnhancer {
  constructor() {
    this.animations = new Set();
    this.setupAnimationFramework();
  }

  /**
   * Setup animation framework with accessibility considerations
   */
  setupAnimationFramework() {
    // Create CSS animation utility classes
    this.injectAnimationStyles();
    
    // Setup intersection observer for entrance animations
    this.setupEntranceAnimations();
  }

  /**
   * Inject CSS animation styles into the document
   */
  injectAnimationStyles() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      /* Animation utilities with reduced motion support */
      .animate-fade-in {
        animation: fadeIn var(--animation-duration, 300ms) ease-out;
      }
      
      .animate-slide-in-left {
        animation: slideInLeft var(--animation-duration, 300ms) ease-out;
      }
      
      .animate-slide-in-right {
        animation: slideInRight var(--animation-duration, 300ms) ease-out;
      }
      
      .animate-scale-in {
        animation: scaleIn var(--animation-duration, 200ms) ease-out;
      }
      
      .animate-bounce {
        animation: bounce var(--animation-duration, 600ms) ease-out;
      }
      
      /* Keyframes */
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideInLeft {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes scaleIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      @keyframes bounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0,0,0);
        }
        40%, 43% {
          transform: translate3d(0, -6px, 0);
        }
        70% {
          transform: translate3d(0, -3px, 0);
        }
        90% {
          transform: translate3d(0, -1px, 0);
        }
      }
      
      /* Reduced motion overrides */
      @media (prefers-reduced-motion: reduce) {
        .animate-fade-in,
        .animate-slide-in-left,
        .animate-slide-in-right,
        .animate-scale-in,
        .animate-bounce {
          animation: none;
        }
      }
      
      /* Focus enhancements */
      .enhanced-focus:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
        border-radius: var(--radius-md);
      }
      
      /* Loading shimmer effect */
      .shimmer {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }
      
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      
      @media (prefers-reduced-motion: reduce) {
        .shimmer {
          animation: none;
          background: #f0f0f0;
        }
      }
    `;
    
    document.head.appendChild(styleSheet);
  }

  /**
   * Setup entrance animations for elements
   */
  setupEntranceAnimations() {
    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const animationType = element.dataset.animateIn || 'fade-in';
          this.animateIn(element, animationType);
        }
      });
    };

    if (!window.IntersectionObserver) return;
    
    const observer = new window.IntersectionObserver(observerCallback, {
      threshold: 0.1,
      rootMargin: '50px'
    });

    // Observe elements with data-animate-in attribute
    document.querySelectorAll('[data-animate-in]').forEach(el => {
      observer.observe(el);
    });
  }

  /**
   * Animate element entrance
   * @param {Element} element - Element to animate
   * @param {string} animationType - Type of animation
   */
  animateIn(element, animationType = 'fade-in') {
    const duration = performanceManager.getAnimationDuration(300);
    
    element.style.setProperty('--animation-duration', `${duration}ms`);
    element.classList.add(`animate-${animationType}`);
    
    // Remove animation class after completion
    setTimeout(() => {
      element.classList.remove(`animate-${animationType}`);
    }, duration);
  }

  /**
   * Show success feedback
   * @param {string} message - Success message
   * @param {Element} target - Target element for positioning
   */
  showSuccess(message, target = null) {
    this.showToast(message, 'success', target);
  }

  /**
   * Show error feedback
   * @param {string} message - Error message
   * @param {Element} target - Target element for positioning
   */
  showError(message, target = null) {
    this.showToast(message, 'error', target);
  }

  /**
   * Show info feedback
   * @param {string} message - Info message
   * @param {Element} target - Target element for positioning
   */
  showInfo(message, target = null) {
    this.showToast(message, 'info', target);
  }

  /**
   * Show toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, info)
   * @param {Element} target - Target element for positioning
   */
  showToast(message, type = 'info', target = null) {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️'
    };
    
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon" aria-hidden="true">${icons[type]}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Close notification" type="button">×</button>
      </div>
    `;

    // Add toast styles
    this.injectToastStyles();
    
    // Position toast
    if (target) {
      const rect = target.getBoundingClientRect();
      toast.style.position = 'fixed';
      toast.style.top = `${rect.bottom + 10}px`;
      toast.style.left = `${rect.left}px`;
      toast.style.zIndex = '10000';
    }
    
    document.body.appendChild(toast);
    
    // Animate in
    this.animateIn(toast, 'slide-in-right');
    
    // Auto-remove after 4 seconds
    const removeToast = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    };
    
    const autoRemove = setTimeout(removeToast, 4000);
    
    // Close button handler
    toast.querySelector('.toast-close').addEventListener('click', () => {
      clearTimeout(autoRemove);
      removeToast();
    });
  }

  /**
   * Inject toast styles
   */
  injectToastStyles() {
    if (document.querySelector('#toast-styles')) return;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'toast-styles';
    styleSheet.textContent = `
      .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        background: white;
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        border: 1px solid var(--color-border);
        transform: translateX(100%);
        transition: all 300ms ease-out;
      }
      
      .toast--success {
        border-left: 4px solid #10b981;
      }
      
      .toast--error {
        border-left: 4px solid #ef4444;
      }
      
      .toast--info {
        border-left: 4px solid #3b82f6;
      }
      
      .toast-content {
        display: flex;
        align-items: center;
        padding: 1rem;
        gap: 0.75rem;
      }
      
      .toast-icon {
        font-size: 1.25rem;
      }
      
      .toast-message {
        flex: 1;
        font-size: 0.875rem;
        line-height: 1.5;
      }
      
      .toast-close {
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: var(--radius-sm);
        color: var(--color-text-subtle);
      }
      
      .toast-close:hover {
        background: var(--color-surface-hover);
        color: var(--color-text);
      }
    `;
    
    document.head.appendChild(styleSheet);
  }

  /**
   * Add ripple effect to button
   * @param {Element} button - Button element
   * @param {Event} event - Click event
   */
  addRippleEffect(button, event) {
    if (performanceManager.shouldReduceMotion()) return;
    
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      top: ${y}px;
      left: ${x}px;
      width: ${size}px;
      height: ${size}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 600ms ease-out;
      pointer-events: none;
    `;
    
    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);
    
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  /**
   * Enhance form field with better UX
   * @param {Element} field - Form field element
   */
  enhanceFormField(field) {
    // Add floating label effect
    const wrapper = document.createElement('div');
    wrapper.className = 'enhanced-field';
    field.parentNode.insertBefore(wrapper, field);
    wrapper.appendChild(field);
    
    // Add focus enhancement
    field.classList.add('enhanced-focus');
    
    // Add validation feedback
    field.addEventListener('invalid', () => {
      this.showError('Please check this field', field);
    });
  }

  /**
   * Clean up animations and event listeners
   */
  cleanup() {
    this.animations.forEach(animation => {
      if (animation.cancel) {
        animation.cancel();
      }
    });
    this.animations.clear();
  }
}

// Create global instance
export const uxEnhancer = new UXEnhancer();

// Auto-enhance buttons with ripple effect
document.addEventListener('click', (event) => {
  if (event.target.matches('button, .btn')) {
    uxEnhancer.addRippleEffect(event.target, event);
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  uxEnhancer.cleanup();
});
