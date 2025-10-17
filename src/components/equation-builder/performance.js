/**
 * Performance Optimization Module
 * Handles throttling, debouncing, and memory management for the equation builder
 */

export class PerformanceManager {
  constructor() {
    this.throttleCache = new Map();
    this.debounceCache = new Map();
    this.observers = new Set();
    
    // Set up performance monitoring
    this.setupPerformanceMonitoring();
  }

  /**
   * Throttle function execution
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in ms
   * @param {string} key - Unique key for this throttle
   */
  throttle(func, limit, key = 'default') {
    if (this.throttleCache.has(key)) return;
    
    this.throttleCache.set(key, true);
    func.apply(this, arguments);
    
    setTimeout(() => {
      this.throttleCache.delete(key);
    }, limit);
  }

  /**
   * Debounce function execution
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @param {string} key - Unique key for this debounce
   */
  debounce(func, wait, key = 'default') {
    if (this.debounceCache.has(key)) {
      clearTimeout(this.debounceCache.get(key));
    }
    
    const timeout = setTimeout(() => {
      func.apply(this, arguments);
      this.debounceCache.delete(key);
    }, wait);
    
    this.debounceCache.set(key, timeout);
  }

  /**
   * Set up Intersection Observer for lazy loading/rendering
   * @param {Element} target - Element to observe
   * @param {Function} callback - Callback when element is visible
   * @param {Object} options - Observer options
   */
  observeElement(target, callback, options = {}) {
    if (!window.IntersectionObserver) return null;
    
    const observer = new window.IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry);
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });
    
    observer.observe(target);
    this.observers.add(observer);
    
    return observer;
  }

  /**
   * Memory cleanup for canvas nodes
   * @param {Array} nodes - Array of node objects
   */
  cleanupNodes(nodes) {
    nodes.forEach(node => {
      // Remove event listeners
      if (node.element) {
        node.element.replaceWith(node.element.cloneNode(true));
      }
      
      // Clear references
      node.connections = null;
      node.element = null;
    });
  }

  /**
   * Batch DOM updates for better performance
   * @param {Function} updateFunc - Function containing DOM updates
   */
  batchDOMUpdates(updateFunc) {
    requestAnimationFrame(() => {
      updateFunc();
    });
  }

  /**
   * Monitor performance metrics
   */
  setupPerformanceMonitoring() {
    if (!window.performance || !window.PerformanceObserver) return;
    
    try {
      const observer = new window.PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'measure' && entry.duration > 100) {
            // Log performance issues for development
            if (process.env.NODE_ENV === 'development') {
              // eslint-disable-next-line no-console
              console.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`);
            }
          }
        });
      });
      
      observer.observe({ entryTypes: ['measure', 'navigation'] });
      this.observers.add(observer);
    } catch {
      // Performance observer not supported - graceful degradation
    }
  }

  /**
   * Measure performance of a function
   * @param {string} name - Name for the measurement
   * @param {Function} func - Function to measure
   */
  measure(name, func) {
    performance.mark(`${name}-start`);
    const result = func();
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    return result;
  }

  /**
   * Clean up all observers and caches
   */
  cleanup() {
    // Clear throttle and debounce caches
    this.throttleCache.forEach(timeout => clearTimeout(timeout));
    this.debounceCache.forEach(timeout => clearTimeout(timeout));
    this.throttleCache.clear();
    this.debounceCache.clear();
    
    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }

  /**
   * Check if we should reduce animations based on user preference
   */
  shouldReduceMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Get optimized animation duration based on user preferences
   * @param {number} defaultDuration - Default duration in ms
   */
  getAnimationDuration(defaultDuration = 300) {
    return this.shouldReduceMotion() ? 0 : defaultDuration;
  }
}

// Create global instance
export const performanceManager = new PerformanceManager();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  performanceManager.cleanup();
});
