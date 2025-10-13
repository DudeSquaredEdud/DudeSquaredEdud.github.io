/**
 * DynamicCanvasManager - Advanced Canvas Sizing and Viewport Management
 * 
 * Provides comprehensive canvas management with:
 * - Dynamic canvas stretching based on node positions
 * - Smooth auto-resizing with minimum/maximum constraints
 * - Intelligent viewport tracking and optimization
 * - Pan and zoom integration with bounds management
 * - Performance-optimized rendering updates
 * 
 * Research-driven implementation for professional canvas behavior
 */

export class DynamicCanvasManager {
  constructor(canvasElement, notificationSystem) {
    this.canvas = canvasElement;
    this.notificationSystem = notificationSystem;
    
    // Canvas size configuration
    this.config = {
      minWidth: 800,
      minHeight: 600,
      maxWidth: 5000,
      maxHeight: 5000,
      padding: 100, // Extra space around nodes
      autoResizeThrottle: 150, // ms
      smoothResize: true,
      resizeTransitionDuration: 300 // ms
    };
    
    // Current state tracking
    this.currentBounds = {
      minX: 0,
      minY: 0,
      maxX: this.config.minWidth,
      maxY: this.config.minHeight
    };
    
    // Performance optimization
    this.resizeTimer = null;
    this.lastResizeTime = 0;
    this.pendingResize = false;
    
    // Observers and event tracking
    this.nodeObservers = new Map();
    this.isResizing = false;
    
    this.initialize();
    console.log('DynamicCanvasManager initialized with advanced canvas management');
  }

  /**
   * Initialize the dynamic canvas system
   */
  initialize() {
    // Set initial canvas size
    this.setCanvasSize(this.config.minWidth, this.config.minHeight);
    
    // Apply initial styles
    this.applyCanvasStyles();
    
    // Setup resize observer for performance monitoring
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(entries => {
        this.handleCanvasResize(entries);
      });
      this.resizeObserver.observe(this.canvas);
    }
    
    // Setup mutation observer for dynamic node tracking
    this.setupNodeTracker();
    
    console.log('Dynamic canvas system initialized');
  }

  /**
   * Setup node position tracking system
   */
  setupNodeTracker() {
    // Observe canvas for node additions and removals
    this.mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        // Handle added nodes
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('node')) {
            this.registerNode(node);
          }
        });
        
        // Handle removed nodes
        mutation.removedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('node')) {
            this.unregisterNode(node);
          }
        });
      });
    });
    
    this.mutationObserver.observe(this.canvas, {
      childList: true,
      subtree: true
    });
    
    // Register existing nodes
    const existingNodes = this.canvas.querySelectorAll('.node');
    existingNodes.forEach(node => this.registerNode(node));
  }

  /**
   * Register a node for position tracking with throttling
   * PERFORMANCE OPTIMIZATION: Throttled observers prevent excessive updates
   * @param {HTMLElement} nodeElement - Node element to track
   */
  registerNode(nodeElement) {
    if (!nodeElement.id) {
      return;
    }
    
    const nodeId = nodeElement.id;
    
    // PERFORMANCE: Create throttled position tracker
    const throttledPositionTracker = this.createThrottledTracker(nodeElement);
    
    // Create position observer for this node with throttling
    const observer = new MutationObserver(() => {
      throttledPositionTracker();
    });
    
    // Observe style changes (position updates)
    observer.observe(nodeElement, {
      attributes: true,
      attributeFilter: ['style']
    });
    
    // PERFORMANCE: Throttled event listeners for drag events
    nodeElement.addEventListener('dragstart', throttledPositionTracker);
    nodeElement.addEventListener('drag', throttledPositionTracker);
    nodeElement.addEventListener('dragend', throttledPositionTracker);
    
    // Store observer reference with cleanup tasks
    this.nodeObservers.set(nodeId, {
      observer,
      positionTracker: throttledPositionTracker,
      element: nodeElement,
      cleanup: () => {
        observer.disconnect();
        nodeElement.removeEventListener('dragstart', throttledPositionTracker);
        nodeElement.removeEventListener('drag', throttledPositionTracker);
        nodeElement.removeEventListener('dragend', throttledPositionTracker);
      }
    });
    
    // Initial position check
    this.handleNodePositionChange(nodeElement);
  }

  /**
   * Create throttled tracker function for a node
   * PERFORMANCE OPTIMIZATION: Prevents excessive position updates
   */
  createThrottledTracker(nodeElement) {
    let throttleTimer = null;
    
    return () => {
      if (throttleTimer) return; // Already scheduled
      
      throttleTimer = setTimeout(() => {
        this.handleNodePositionChange(nodeElement);
        throttleTimer = null;
      }, this.config.autoResizeThrottle);
    };
  }

  /**
   * Unregister a node from position tracking with proper cleanup
   * PERFORMANCE OPTIMIZATION: Proper cleanup prevents memory leaks
   * @param {HTMLElement} nodeElement - Node element to stop tracking
   */
  unregisterNode(nodeElement) {
    const nodeId = nodeElement.id;
    
    if (this.nodeObservers.has(nodeId)) {
      const nodeData = this.nodeObservers.get(nodeId);
      
      // PERFORMANCE: Use cleanup function to prevent memory leaks
      if (nodeData.cleanup) {
        nodeData.cleanup();
      }
      
      // Remove from tracking
      this.nodeObservers.delete(nodeId);
    }
    
    // Recalculate canvas size without this node
    this.scheduleCanvasResize();
  }

  /**
   * Handle node position changes
   * @param {HTMLElement} nodeElement - Node that moved
   */
  handleNodePositionChange(nodeElement) {
    if (this.isResizing) return; // Avoid recursive resizing
    
    const rect = nodeElement.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    
    // Calculate relative position within canvas
    const nodePosition = {
      left: rect.left - canvasRect.left + this.canvas.scrollLeft,
      top: rect.top - canvasRect.top + this.canvas.scrollTop,
      right: rect.right - canvasRect.left + this.canvas.scrollLeft,
      bottom: rect.bottom - canvasRect.top + this.canvas.scrollTop,
      width: rect.width,
      height: rect.height
    };
    
    // Check if canvas needs to be resized
    const needsResize = this.checkCanvasResizeNeeded(nodePosition);
    
    if (needsResize) {
      this.scheduleCanvasResize();
    }
    
    // Update position tracking
    this.trackNodePosition(nodeElement.id, nodePosition);
  }

  /**
   * Check if canvas resize is needed based on node position
   * @param {Object} nodePosition - Node position data
   * @returns {boolean} Whether resize is needed
   */
  checkCanvasResizeNeeded(nodePosition) {
    const currentWidth = this.canvas.offsetWidth;
    const currentHeight = this.canvas.offsetHeight;
    
    // Check if node is approaching or exceeding canvas boundaries
    const needsWidthIncrease = nodePosition.right + this.config.padding > currentWidth;
    const needsHeightIncrease = nodePosition.bottom + this.config.padding > currentHeight;
    
    // Check if canvas can be shrunk (all nodes are well within boundaries)
    const farFromRightEdge = nodePosition.right < currentWidth - this.config.padding * 2;
    const farFromBottomEdge = nodePosition.bottom < currentHeight - this.config.padding * 2;
    
    return needsWidthIncrease || needsHeightIncrease || 
           (farFromRightEdge && farFromBottomEdge && this.canShrinkCanvas());
  }

  /**
   * Track node position for canvas optimization
   * @param {string} nodeId - Node identifier
   * @param {Object} position - Node position data
   */
  trackNodePosition(nodeId, position) {
    // Update global bounds
    this.currentBounds.minX = Math.min(this.currentBounds.minX, position.left);
    this.currentBounds.minY = Math.min(this.currentBounds.minY, position.top);
    this.currentBounds.maxX = Math.max(this.currentBounds.maxX, position.right);
    this.currentBounds.maxY = Math.max(this.currentBounds.maxY, position.bottom);
  }

  /**
   * Schedule canvas resize with throttling
   */
  scheduleCanvasResize() {
    if (this.pendingResize) return;
    
    this.pendingResize = true;
    
    // Throttle resize operations
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.performCanvasResize();
      this.pendingResize = false;
    }, this.config.autoResizeThrottle);
  }

  /**
   * Perform the actual canvas resize operation
   */
  performCanvasResize() {
    if (this.isResizing) return;
    
    this.isResizing = true;
    
    try {
      // Recalculate optimal canvas size
      const optimalSize = this.calculateOptimalCanvasSize();
      
      // Apply new size with smooth transition
      if (this.config.smoothResize) {
        this.smoothResizeCanvas(optimalSize.width, optimalSize.height);
      } else {
        this.setCanvasSize(optimalSize.width, optimalSize.height);
      }
      
      this.lastResizeTime = Date.now();
      
    } catch (error) {
      console.error('Canvas resize failed:', error);
    } finally {
      // Reset resize flag after transition
      setTimeout(() => {
        this.isResizing = false;
      }, this.config.resizeTransitionDuration + 50);
    }
  }

  /**
   * Calculate optimal canvas size based on node positions
   * @returns {Object} Optimal width and height
   */
  calculateOptimalCanvasSize() {
    // Recalculate bounds from all current nodes
    this.recalculateBounds();
    
    // Calculate required dimensions
    const requiredWidth = Math.max(
      this.config.minWidth,
      this.currentBounds.maxX + this.config.padding
    );
    
    const requiredHeight = Math.max(
      this.config.minHeight,
      this.currentBounds.maxY + this.config.padding
    );
    
    // Apply maximum constraints
    const optimalWidth = Math.min(requiredWidth, this.config.maxWidth);
    const optimalHeight = Math.min(requiredHeight, this.config.maxHeight);
    
    return {
      width: optimalWidth,
      height: optimalHeight,
      bounded: optimalWidth === this.config.maxWidth || optimalHeight === this.config.maxHeight
    };
  }

  /**
   * Recalculate bounds from all current nodes
   */
  recalculateBounds() {
    // Reset bounds
    this.currentBounds = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    };
    
    // Check all tracked nodes
    const nodes = this.canvas.querySelectorAll('.node');
    
    if (nodes.length === 0) {
      // No nodes - use minimum canvas size
      this.currentBounds = {
        minX: 0,
        minY: 0,
        maxX: this.config.minWidth,
        maxY: this.config.minHeight
      };
      return;
    }
    
    nodes.forEach(node => {
      const rect = node.getBoundingClientRect();
      const canvasRect = this.canvas.getBoundingClientRect();
      
      const left = rect.left - canvasRect.left + this.canvas.scrollLeft;
      const top = rect.top - canvasRect.top + this.canvas.scrollTop;
      const right = left + rect.width;
      const bottom = top + rect.height;
      
      this.currentBounds.minX = Math.min(this.currentBounds.minX, left);
      this.currentBounds.minY = Math.min(this.currentBounds.minY, top);
      this.currentBounds.maxX = Math.max(this.currentBounds.maxX, right);
      this.currentBounds.maxY = Math.max(this.currentBounds.maxY, bottom);
    });
    
    // Ensure bounds are reasonable
    if (this.currentBounds.minX === Infinity) {
      this.currentBounds.minX = 0;
    }
    if (this.currentBounds.minY === Infinity) {
      this.currentBounds.minY = 0;
    }
    if (this.currentBounds.maxX === -Infinity) {
      this.currentBounds.maxX = this.config.minWidth;
    }
    if (this.currentBounds.maxY === -Infinity) {
      this.currentBounds.maxY = this.config.minHeight;
    }
  }

  /**
   * Check if canvas can be shrunk
   * @returns {boolean} Whether canvas can be made smaller
   */
  canShrinkCanvas() {
    const currentWidth = this.canvas.offsetWidth;
    const currentHeight = this.canvas.offsetHeight;
    
    // Don't shrink below minimum size
    if (currentWidth <= this.config.minWidth || currentHeight <= this.config.minHeight) {
      return false;
    }
    
    // Check if all nodes would still fit with padding
    const wouldFitWidth = this.currentBounds.maxX + this.config.padding < currentWidth - 100;
    const wouldFitHeight = this.currentBounds.maxY + this.config.padding < currentHeight - 100;
    
    return wouldFitWidth || wouldFitHeight;
  }

  /**
   * Set canvas size directly
   * @param {number} width - New canvas width
   * @param {number} height - New canvas height
   */
  setCanvasSize(width, height) {
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    // Update scroll container if it exists
    const scrollContainer = this.canvas.closest('.canvas-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTop = Math.min(scrollContainer.scrollTop, height - scrollContainer.clientHeight);
      scrollContainer.scrollLeft = Math.min(scrollContainer.scrollLeft, width - scrollContainer.clientWidth);
    }
    
    console.log(`Canvas resized to: ${width}x${height}`);
  }

  /**
   * Smoothly resize canvas with transition
   * @param {number} targetWidth - Target canvas width
   * @param {number} targetHeight - Target canvas height
   */
  smoothResizeCanvas(targetWidth, targetHeight) {
    const currentWidth = this.canvas.offsetWidth;
    const currentHeight = this.canvas.offsetHeight;
    
    // Skip if no change needed
    if (Math.abs(currentWidth - targetWidth) < 5 && Math.abs(currentHeight - targetHeight) < 5) {
      return;
    }
    
    // Apply transition
    this.canvas.style.transition = `width ${this.config.resizeTransitionDuration}ms ease-out, height ${this.config.resizeTransitionDuration}ms ease-out`;
    
    // Set new size
    this.setCanvasSize(targetWidth, targetHeight);
    
    // Remove transition after animation
    setTimeout(() => {
      this.canvas.style.transition = '';
    }, this.config.resizeTransitionDuration);
  }

  /**
   * Apply canvas styling for dynamic behavior
   */
  applyCanvasStyles() {
    // Ensure canvas is properly styled for dynamic sizing
    this.canvas.style.position = 'relative';
    this.canvas.style.overflow = 'visible';
    this.canvas.style.minWidth = `${this.config.minWidth}px`;
    this.canvas.style.minHeight = `${this.config.minHeight}px`;
    
    // Add canvas-specific class for styling
    this.canvas.classList.add('dynamic-canvas');
    
    // Apply styles if not already added
    this.addDynamicCanvasStyles();
  }

  /**
   * Add CSS styles for dynamic canvas behavior
   */
  addDynamicCanvasStyles() {
    if (document.querySelector('#dynamic-canvas-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'dynamic-canvas-styles';
    style.textContent = `
      .dynamic-canvas {
        background: 
          radial-gradient(circle at 20px 20px, #e0e0e0 2px, transparent 2px),
          linear-gradient(to right, #f5f5f5 0%, #fafafa 100%);
        background-size: 40px 40px, 100% 100%;
        border: 2px solid #e5e5e5;
        border-radius: 8px;
        box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.05);
      }
      
      .canvas-scroll-container {
        overflow: auto;
        max-width: 100%;
        max-height: 100vh;
        border-radius: 8px;
        background: #f8f9fa;
        padding: 20px;
      }
      
      .canvas-scroll-container::-webkit-scrollbar {
        width: 12px;
        height: 12px;
      }
      
      .canvas-scroll-container::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 6px;
      }
      
      .canvas-scroll-container::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 6px;
        transition: background 0.2s;
      }
      
      .canvas-scroll-container::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
      
      .dynamic-canvas.resizing {
        transition: width 0.3s ease-out, height 0.3s ease-out;
      }
      
      @media (max-width: 768px) {
        .dynamic-canvas {
          min-width: 300px;
          min-height: 400px;
        }
        
        .canvas-scroll-container {
          padding: 10px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Handle canvas resize events
   * @param {Array} entries - ResizeObserver entries
   */
  handleCanvasResize(entries) {
    entries.forEach(entry => {
      const { width, height } = entry.contentRect;
      console.log(`Canvas resized to: ${width}x${height}`);
      
      // Update internal tracking
      this.currentBounds.maxX = Math.max(this.currentBounds.maxX, width);
      this.currentBounds.maxY = Math.max(this.currentBounds.maxY, height);
    });
  }

  /**
   * Get current canvas dimensions and bounds
   * @returns {Object} Canvas state information
   */
  getCanvasState() {
    return {
      dimensions: {
        width: this.canvas.offsetWidth,
        height: this.canvas.offsetHeight
      },
      bounds: { ...this.currentBounds },
      config: { ...this.config },
      nodeCount: this.nodeObservers.size,
      isResizing: this.isResizing,
      lastResizeTime: this.lastResizeTime
    };
  }

  /**
   * Update canvas configuration
   * @param {Object} newConfig - Configuration updates
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Apply new constraints immediately
    if (newConfig.minWidth || newConfig.minHeight) {
      const currentWidth = this.canvas.offsetWidth;
      const currentHeight = this.canvas.offsetHeight;
      
      const newWidth = Math.max(currentWidth, this.config.minWidth);
      const newHeight = Math.max(currentHeight, this.config.minHeight);
      
      if (newWidth !== currentWidth || newHeight !== currentHeight) {
        this.setCanvasSize(newWidth, newHeight);
      }
    }
    
    console.log('Dynamic canvas configuration updated:', newConfig);
  }

  /**
   * Force canvas resize based on current node positions
   */
  forceResize() {
    this.recalculateBounds();
    this.performCanvasResize();
  }

  /**
   * Reset canvas to minimum size
   */
  resetToMinimumSize() {
    this.setCanvasSize(this.config.minWidth, this.config.minHeight);
    this.recalculateBounds();
  }

  /**
   * Cleanup dynamic canvas manager
   */
  destroy() {
    // Clear timers
    clearTimeout(this.resizeTimer);
    
    // Disconnect observers
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    // Clean up node observers
    this.nodeObservers.forEach(({ observer, positionTracker, element }) => {
      observer.disconnect();
      element.removeEventListener('dragstart', positionTracker);
      element.removeEventListener('drag', positionTracker);
      element.removeEventListener('dragend', positionTracker);
    });
    
    this.nodeObservers.clear();
    
    console.log('DynamicCanvasManager destroyed');
  }
}
