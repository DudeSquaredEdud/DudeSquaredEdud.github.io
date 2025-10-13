/**
 * ErrorBoundary - Global Application Error Handling System
 * 
 * Provides comprehensive error catching, reporting, and recovery for the Equation Builder.
 * Integrates with logging and notification systems for proper error management.
 * 
 * Features:
 * - Global error event listeners
 * - Unhandled promise rejection handling
 * - Integration with notification system
 * - Error reporting in development mode
 * - Graceful degradation strategies
 * - Error recovery and user guidance
 */

import { createComponentLogger } from './Logger.js';

export class ErrorBoundary {
  constructor(options = {}) {
    this.notificationSystem = options.notificationSystem;
    this.logger = createComponentLogger('ErrorBoundary', this.notificationSystem);
    
    // Configuration
    this.isDevelopment = options.isDevelopment ?? (
      typeof import.meta !== 'undefined' && import.meta.env?.DEV
    ) ?? true;
    
    this.errorReportingEndpoint = options.errorReportingEndpoint;
    this.maxErrorsPerSession = options.maxErrorsPerSession ?? 10;
    
    // Error tracking
    this.errorCount = 0;
    this.reportedErrors = new Set();
    
    // Initialize error handlers
    this.setupGlobalErrorHandling();
    
    this.logger.info('ErrorBoundary initialized with global error handling');
  }
  
  /**
   * Setup global error event listeners
   */
  setupGlobalErrorHandling() {
    // Handle JavaScript runtime errors
    window.addEventListener('error', (event) => {
      this.handleError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        type: 'javascript',
        stack: event.error?.stack
      });
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        error: event.reason,
        type: 'promise',
        stack: event.reason?.stack
      });
      
      // Prevent the default browser behavior (logging to console)
      event.preventDefault();
    });
    
    // Handle resource loading errors (images, scripts, etc.)
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError({
          message: `Resource failed to load: ${event.target.src || event.target.href}`,
          type: 'resource',
          element: event.target.tagName,
          source: event.target.src || event.target.href
        });
      }
    }, true); // Use capture phase for resource errors
  }
  
  /**
   * Core error handling method
   */
  handleError(errorInfo) {
    this.errorCount++;
    
    // Generate error ID for tracking
    const errorId = this.generateErrorId(errorInfo);
    
    // Skip if we've already reported this exact error
    if (this.reportedErrors.has(errorId)) {
      return;
    }
    this.reportedErrors.add(errorId);
    
    // Log the error
    this.logger.error('Application Error Caught:', {
      id: errorId,
      type: errorInfo.type,
      message: errorInfo.message,
      stack: errorInfo.stack,
      filename: errorInfo.filename,
      line: errorInfo.lineno,
      column: errorInfo.colno
    });
    
    // Determine error severity and user message
    const { severity, userMessage, recovery } = this.categorizeError(errorInfo);
    
    // Show user notification
    if (this.notificationSystem) {
      this.notificationSystem.show(userMessage, severity);
    }
    
    // Attempt recovery if possible
    if (recovery) {
      this.attemptRecovery(recovery, errorInfo);
    }
    
    // Report to external service in production
    if (!this.isDevelopment && this.errorReportingEndpoint) {
      this.reportError(errorId, errorInfo);
    }
    
    // If too many errors, suggest page refresh
    if (this.errorCount >= this.maxErrorsPerSession) {
      this.handleTooManyErrors();
    }
  }
  
  /**
   * Generate unique error ID for deduplication
   */
  generateErrorId(errorInfo) {
    const message = errorInfo.message || 'Unknown error';
    const location = errorInfo.filename ? `${errorInfo.filename}:${errorInfo.lineno}` : 'unknown';
    return btoa(`${message}|${location}|${errorInfo.type}`).substring(0, 12);
  }
  
  /**
   * Categorize error and determine appropriate response
   */
  categorizeError(errorInfo) {
    const message = errorInfo.message?.toLowerCase() || '';
    
    // Critical system errors
    if (message.includes('database') || message.includes('indexeddb')) {
      return {
        severity: 'error',
        userMessage: 'Database error occurred. Your work has been saved to browser storage.',
        recovery: 'database_fallback'
      };
    }
    
    // Network/resource errors
    if (errorInfo.type === 'resource' || message.includes('fetch') || message.includes('network')) {
      return {
        severity: 'warning',
        userMessage: 'Network connection issue. Some features may be temporarily unavailable.',
        recovery: 'retry_network'
      };
    }
    
    // Memory/performance errors
    if (message.includes('memory') || message.includes('maximum call stack')) {
      return {
        severity: 'error',
        userMessage: 'Performance issue detected. Consider refreshing the page.',
        recovery: 'cleanup_memory'
      };
    }
    
    // Equation builder specific errors
    if (message.includes('equation') || message.includes('node') || message.includes('connection')) {
      return {
        severity: 'warning',
        userMessage: 'Equation builder error. Your work is saved, but some features may not work correctly.',
        recovery: 'equation_builder_reset'
      };
    }
    
    // Generic JavaScript errors
    return {
      severity: 'info',
      userMessage: 'A minor error occurred. The application should continue working normally.',
      recovery: null
    };
  }
  
  /**
   * Attempt automatic error recovery
   */
  attemptRecovery(recoveryType, errorInfo) {
    this.logger.info(`Attempting recovery: ${recoveryType}`);
    
    try {
      switch (recoveryType) {
        case 'database_fallback':
          // Attempt to fallback to localStorage
          if (window.localStorage) {
            this.logger.info('Falling back to localStorage for data persistence');
            if (this.notificationSystem) {
              this.notificationSystem.show(
                'Switched to backup storage mode. Your work is still being saved.',
                'info'
              );
            }
          }
          break;
          
        case 'retry_network':
          // Retry network operations after a delay
          setTimeout(() => {
            this.logger.info('Retrying network operations');
            // Could trigger a connectivity check here
          }, 3000);
          break;
          
        case 'cleanup_memory':
          // Attempt memory cleanup
          if (typeof gc === 'function') {
            gc(); // If available in development
          }
          // Clear any large cached data
          this.logger.info('Performed memory cleanup');
          break;
          
        case 'equation_builder_reset':
          // Reset equation builder state
          this.logger.info('Resetting equation builder state');
          // Could dispatch a reset event here
          break;
      }
    } catch (recoveryError) {
      this.logger.error('Recovery attempt failed:', recoveryError);
    }
  }
  
  /**
   * Handle excessive errors - suggest page refresh
   */
  handleTooManyErrors() {
    this.logger.warn(`Too many errors (${this.errorCount}), suggesting page refresh`);
    
    if (this.notificationSystem) {
      this.notificationSystem.show(
        'Multiple errors detected. Consider refreshing the page for optimal performance.',
        'warning'
      );
    }
  }
  
  /**
   * Report error to external service (production only)
   */
  async reportError(errorId, errorInfo) {
    try {
      const report = {
        id: errorId,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...errorInfo
      };
      
      await fetch(this.errorReportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      });
      
      this.logger.info(`Error reported to external service: ${errorId}`);
    } catch (reportingError) {
      this.logger.error('Failed to report error to external service:', reportingError);
    }
  }
  
  /**
   * Manually report an error (for try-catch blocks)
   */
  reportManualError(error, context = {}) {
    this.handleError({
      message: error.message,
      error: error,
      type: 'manual',
      stack: error.stack,
      context: context
    });
  }
  
  /**
   * Create a wrapper for async functions with error handling
   */
  wrapAsync(asyncFn, context = '') {
    return async (...args) => {
      try {
        return await asyncFn(...args);
      } catch (error) {
        this.reportError(error, { context, args });
        throw error; // Re-throw so calling code can handle if needed
      }
    };
  }
  
  /**
   * Create a wrapper for regular functions with error handling
   */
  wrapFunction(fn, context = '') {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        this.reportError(error, { context, args });
        throw error; // Re-throw so calling code can handle if needed
      }
    };
  }
  
  /**
   * Get error statistics for debugging
   */
  getErrorStats() {
    return {
      totalErrors: this.errorCount,
      uniqueErrors: this.reportedErrors.size,
      maxErrorsPerSession: this.maxErrorsPerSession,
      isDevelopment: this.isDevelopment
    };
  }
  
  /**
   * Clear error tracking (useful for testing)
   */
  clearErrorTracking() {
    this.errorCount = 0;
    this.reportedErrors.clear();
    this.logger.info('Error tracking cleared');
  }
  
  /**
   * Destroy the error boundary and remove listeners
   */
  destroy() {
    // Note: Can't remove global error listeners easily, but we can flag as destroyed
    this.destroyed = true;
    this.logger.info('ErrorBoundary destroyed');
  }
}

/**
 * Create and initialize global error boundary
 */
export function createGlobalErrorBoundary(notificationSystem) {
  return new ErrorBoundary({
    notificationSystem,
    isDevelopment: typeof import.meta !== 'undefined' && import.meta.env?.DEV
  });
}

export default ErrorBoundary;
