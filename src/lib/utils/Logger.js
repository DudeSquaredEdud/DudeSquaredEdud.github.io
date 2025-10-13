/**
 * Logger Utility - Environment-Aware Logging System
 * 
 * Provides structured logging with development/production awareness.
 * Replaces console.log pollution with controlled, configurable logging.
 * 
 * Features:
 * - Environment-based log level control
 * - Structured log formatting with timestamps
 * - Integration with notification systems
 * - Performance-friendly production mode
 * - Categorized logging (info, warn, error, debug)
 */

export class Logger {
  constructor(options = {}) {
    // Detect environment - development vs production
    this.isDevelopment = options.isDevelopment ?? (
      typeof import.meta !== 'undefined' && import.meta.env?.DEV
    ) ?? (
      typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'
    ) ?? true; // Default to development for safety
    
    // Configuration options
    this.enabledLevels = options.enabledLevels ?? {
      error: true,     // Always enabled - critical errors
      warn: true,      // Always enabled - important warnings  
      info: this.isDevelopment,    // Development only - general info
      debug: this.isDevelopment,   // Development only - debugging
      log: this.isDevelopment      // Development only - general logging
    };
    
    // Optional notification system integration
    this.notificationSystem = options.notificationSystem;
    
    // Component/module name for structured logging
    this.component = options.component || 'App';
    
    // Performance tracking
    this.performanceTimers = new Map();
  }
  
  /**
   * Format log message with timestamp and component info
   */
  formatMessage(level, message, component = this.component) {
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase().padEnd(5);
    return `[${timestamp}] ${levelUpper} [${component}] ${message}`;
  }
  
  /**
   * Core logging method - handles all log levels
   */
  log(level, message, ...args) {
    if (!this.enabledLevels[level]) return;
    
    const formattedMessage = this.formatMessage(level, message);
    
    // Use appropriate native console method
    const nativeConsole = globalThis.console;
    switch (level) {
      case 'error':
        nativeConsole.error(formattedMessage, ...args);
        // Also send to notification system if available
        if (this.notificationSystem) {
          this.notificationSystem.show(message, 'error');
        }
        break;
      case 'warn':
        nativeConsole.warn(formattedMessage, ...args);
        if (this.notificationSystem && this.isDevelopment) {
          this.notificationSystem.show(message, 'warning');
        }
        break;
      case 'info':
        nativeConsole.info(formattedMessage, ...args);
        break;
      case 'debug':
        nativeConsole.debug(formattedMessage, ...args);
        break;
      default:
        nativeConsole.log(formattedMessage, ...args);
    }
  }
  
  /**
   * Convenience methods for different log levels
   */
  info(message, ...args) {
    this.log('info', message, ...args);
  }
  
  warn(message, ...args) {
    this.log('warn', message, ...args);
  }
  
  error(message, ...args) {
    this.log('error', message, ...args);
  }
  
  debug(message, ...args) {
    this.log('debug', message, ...args);
  }
  
  /**
   * Performance timing utilities
   */
  time(label) {
    if (!this.isDevelopment) return;
    this.performanceTimers.set(label, performance.now());
    this.debug(`Timer started: ${label}`);
  }
  
  timeEnd(label) {
    if (!this.isDevelopment) return;
    const startTime = this.performanceTimers.get(label);
    if (startTime === undefined) {
      this.warn(`Timer '${label}' does not exist`);
      return;
    }
    
    const duration = performance.now() - startTime;
    this.performanceTimers.delete(label);
    this.info(`${label}: ${duration.toFixed(2)}ms`);
    return duration;
  }
  
  /**
   * Group logging for related operations
   */
  group(label, collapsed = false) {
    if (!this.isDevelopment) return;
    const nativeConsole = globalThis.console;
    if (collapsed) {
      nativeConsole.groupCollapsed(this.formatMessage('group', label));
    } else {
      nativeConsole.group(this.formatMessage('group', label));
    }
  }
  
  groupEnd() {
    if (!this.isDevelopment) return;
    globalThis.console.groupEnd();
  }
  
  /**
   * Table logging for structured data
   */
  table(data, columns) {
    if (!this.isDevelopment) return;
    globalThis.console.table(data, columns);
  }
  
  /**
   * Create a child logger for a specific component
   */
  createChild(componentName) {
    return new Logger({
      isDevelopment: this.isDevelopment,
      enabledLevels: this.enabledLevels,
      notificationSystem: this.notificationSystem,
      component: `${this.component}:${componentName}`
    });
  }
  
  /**
   * Configure logging levels at runtime
   */
  setLevel(level, enabled) {
    this.enabledLevels[level] = enabled;
  }
  
  /**
   * Enable/disable development mode
   */
  setDevelopmentMode(isDev) {
    this.isDevelopment = isDev;
    this.enabledLevels.info = isDev;
    this.enabledLevels.debug = isDev;
    this.enabledLevels.log = isDev;
  }
}

/**
 * Default logger instance - can be imported and used directly
 * Automatically detects environment and configures appropriately
 */
export const logger = new Logger({
  component: 'EquationBuilder'
});

/**
 * Create logger for specific components
 * Usage: const dbLogger = createComponentLogger('LocalDBManager', notificationSystem);
 */
export function createComponentLogger(componentName, notificationSystem = null) {
  return new Logger({
    component: componentName,
    notificationSystem
  });
}

/**
 * Legacy console replacement - for gradual migration
 * Can be used as drop-in replacement: import { console } from './Logger.js'
 */
export const console = {
  log: (...args) => logger.log('log', args.join(' ')),
  info: (...args) => logger.info(args.join(' ')),
  warn: (...args) => logger.warn(args.join(' ')),
  error: (...args) => logger.error(args.join(' ')),
  debug: (...args) => logger.debug(args.join(' ')),
  group: (label) => logger.group(label),
  groupCollapsed: (label) => logger.group(label, true),
  groupEnd: () => logger.groupEnd(),
  table: (data, columns) => logger.table(data, columns),
  time: (label) => logger.time(label),
  timeEnd: (label) => logger.timeEnd(label)
};

export default Logger;
