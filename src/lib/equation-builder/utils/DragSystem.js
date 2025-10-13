/**
 * DragSystem - Universal drag and drop system for interactive elements
 * 
 * Provides comprehensive drag functionality with:
 * - Boundary constraints to keep elements within containers
 * - Visual feedback during drag operations
 * - Connection redrawing integration for connected elements
 * - Event-driven architecture with callbacks
 * - Touch and mouse support
 * 
 * Part of the modular equation builder architecture
 */
export class DragSystem {
  constructor(canvas, connectionSystem, options = {}) {
    // Core dependencies
    this.canvas = canvas;
    this.connectionSystem = connectionSystem;
    
    // Configuration options
    this.options = {
      constrainToCanvas: true,
      showVisualFeedback: true,
      updateConnections: true,
      dragOpacity: 0.8,
      dragZIndex: 1000,
      ...options
    };
    
    // Active drag state
    this.activeDrags = new Map();
    
    // Global event listeners for drag operations
    this.initializeGlobalEventListeners();
    
    console.log('DragSystem initialized with advanced drag capabilities');
  }
  
  /**
   * Initialize global mouse event listeners for drag operations
   */
  initializeGlobalEventListeners() {
    // Global mouse move handler for all active drags
    document.addEventListener('mousemove', (e) => {
      this.handleGlobalMouseMove(e);
    });
    
    // Global mouse up handler to end drag operations
    document.addEventListener('mouseup', (e) => {
      this.handleGlobalMouseUp(e);
    });
    
    // Prevent text selection during drag operations
    document.addEventListener('selectstart', (e) => {
      if (this.activeDrags.size > 0) {
        e.preventDefault();
      }
    });
    
    // Handle touch events for mobile support
    document.addEventListener('touchmove', (e) => {
      this.handleGlobalTouchMove(e);
    }, { passive: false });
    
    document.addEventListener('touchend', (e) => {
      this.handleGlobalTouchEnd(e);
    });
  }
  
  /**
   * Make an element draggable with advanced options
   * @param {HTMLElement} element - The element to make draggable
   * @param {Object} elementOptions - Element-specific drag options
   */
  makeDraggable(element, elementOptions = {}) {
    const config = {
      constrainToCanvas: this.options.constrainToCanvas,
      showVisualFeedback: this.options.showVisualFeedback,
      updateConnections: this.options.updateConnections,
      onDragStart: null,
      onDragMove: null,
      onDragEnd: null,
      ...elementOptions
    };
    
    // Store configuration on element
    element._dragConfig = config;
    
    // Add mouse down listener for drag initiation
    element.addEventListener('mousedown', (e) => {
      this.startDrag(element, e);
    });
    
    // Add touch start listener for mobile support
    element.addEventListener('touchstart', (e) => {
      this.startDrag(element, e.touches[0]);
    });
    
    // Mark element as draggable
    element.classList.add('draggable-element');
  }
  
  /**
   * Start a drag operation
   * @param {HTMLElement} element - The element being dragged
   * @param {MouseEvent|Touch} event - The initiating event
   */
  startDrag(element, event) {
    const dragId = this.generateDragId();
    
    const dragState = {
      element,
      dragId,
      isDragging: true,
      startX: event.clientX,
      startY: event.clientY,
      initialX: parseInt(element.style.left) || 0,
      initialY: parseInt(element.style.top) || 0,
      config: element._dragConfig || {}
    };
    
    // Store active drag state
    this.activeDrags.set(dragId, dragState);
    
    // Apply visual feedback
    if (dragState.config.showVisualFeedback) {
      element.style.zIndex = this.options.dragZIndex.toString();
      element.style.opacity = this.options.dragOpacity.toString();
      element.classList.add('dragging');
    }
    
    // Execute drag start callback
    if (dragState.config.onDragStart) {
      dragState.config.onDragStart(element, event);
    }
    
    // Prevent default behavior
    event.preventDefault();
  }
  
  /**
   * Handle global mouse move for all active drags
   * @param {MouseEvent} event - The mouse move event
   */
  handleGlobalMouseMove(event) {
    this.activeDrags.forEach((dragState) => {
      this.updateDragPosition(dragState, event);
    });
  }
  
  /**
   * Handle global touch move for all active drags
   * @param {TouchEvent} event - The touch move event
   */
  handleGlobalTouchMove(event) {
    if (this.activeDrags.size > 0) {
      event.preventDefault(); // Prevent scrolling
      this.activeDrags.forEach((dragState) => {
        this.updateDragPosition(dragState, event.touches[0]);
      });
    }
  }
  
  /**
   * Update drag position for a specific drag state
   * @param {Object} dragState - The drag state object
   * @param {MouseEvent|Touch} event - The movement event
   */
  updateDragPosition(dragState, event) {
    if (!dragState.isDragging) return;
    
    const { element, startX, startY, initialX, initialY, config } = dragState;
    
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    
    let newX = initialX + dx;
    let newY = initialY + dy;
    
    // Apply canvas constraints if enabled
    if (config.constrainToCanvas && this.canvas) {
      newX = Math.max(0, Math.min(newX, this.canvas.offsetWidth - element.offsetWidth));
      newY = Math.max(0, Math.min(newY, this.canvas.offsetHeight - element.offsetHeight));
    }
    
    // Update element position
    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
    
    // Update connections if enabled
    if (config.updateConnections && this.connectionSystem) {
      this.connectionSystem.renderConnections();
    }
    
    // Execute drag move callback
    if (config.onDragMove) {
      config.onDragMove(element, event, { x: newX, y: newY });
    }
  }
  
  /**
   * Handle global mouse up to end drag operations
   * @param {MouseEvent} event - The mouse up event
   */
  handleGlobalMouseUp(event) {
    this.activeDrags.forEach((dragState, dragId) => {
      this.endDrag(dragId, event);
    });
  }
  
  /**
   * Handle global touch end to end drag operations
   * @param {TouchEvent} event - The touch end event
   */
  handleGlobalTouchEnd(event) {
    this.activeDrags.forEach((dragState, dragId) => {
      this.endDrag(dragId, event);
    });
  }
  
  /**
   * End a specific drag operation
   * @param {string} dragId - The drag ID to end
   * @param {Event} event - The ending event
   */
  endDrag(dragId, event) {
    const dragState = this.activeDrags.get(dragId);
    if (!dragState || !dragState.isDragging) return;
    
    const { element, config } = dragState;
    
    // Remove visual feedback
    if (config.showVisualFeedback) {
      element.style.zIndex = 'auto';
      element.style.opacity = '1';
      element.classList.remove('dragging');
    }
    
    // Execute drag end callback
    if (config.onDragEnd) {
      const finalPosition = {
        x: parseInt(element.style.left) || 0,
        y: parseInt(element.style.top) || 0
      };
      config.onDragEnd(element, event, finalPosition);
    }
    
    // Clean up drag state
    dragState.isDragging = false;
    this.activeDrags.delete(dragId);
  }
  
  /**
   * Force end all active drag operations
   */
  endAllDrags() {
    const dragIds = Array.from(this.activeDrags.keys());
    dragIds.forEach(dragId => {
      this.endDrag(dragId, null);
    });
  }
  
  /**
   * Check if any elements are currently being dragged
   * @returns {boolean} True if any drag is active
   */
  isDragging() {
    return this.activeDrags.size > 0;
  }
  
  /**
   * Get all currently dragging elements
   * @returns {Array} Array of elements being dragged
   */
  getDraggingElements() {
    return Array.from(this.activeDrags.values()).map(state => state.element);
  }
  
  /**
   * Remove drag capability from an element
   * @param {HTMLElement} element - The element to make non-draggable
   */
  makeNonDraggable(element) {
    // End any active drag for this element
    const activeDrag = Array.from(this.activeDrags.values())
      .find(state => state.element === element);
    if (activeDrag) {
      this.endDrag(activeDrag.dragId, null);
    }
    
    // Remove drag configuration
    delete element._dragConfig;
    element.classList.remove('draggable-element');
    
    // Note: We don't remove event listeners as they're hard to track
    // In a production system, you'd want to store and remove them
  }
  
  /**
   * Update canvas reference (useful when canvas changes)
   * @param {HTMLElement} newCanvas - The new canvas element
   */
  updateCanvas(newCanvas) {
    this.canvas = newCanvas;
  }
  
  /**
   * Update connection system reference
   * @param {Object} newConnectionSystem - The new connection system
   */
  updateConnectionSystem(newConnectionSystem) {
    this.connectionSystem = newConnectionSystem;
  }
  
  /**
   * Generate a unique drag ID
   * @returns {string} Unique drag identifier
   */
  generateDragId() {
    return `drag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get drag statistics
   * @returns {Object} Statistics about drag operations
   */
  getDragStats() {
    const draggableElements = document.querySelectorAll('.draggable-element').length;
    
    return {
      activeDrags: this.activeDrags.size,
      draggableElements,
      totalDragOperations: this.activeDrags.size,
      canvasConstraints: this.options.constrainToCanvas,
      connectionUpdates: this.options.updateConnections
    };
  }
  
  /**
   * Export drag system configuration
   * @returns {Object} Current drag system configuration
   */
  exportConfig() {
    return {
      options: { ...this.options },
      activeDragCount: this.activeDrags.size,
      draggableElementCount: document.querySelectorAll('.draggable-element').length
    };
  }
  
  /**
   * Clean up drag system (useful for component unmounting)
   */
  destroy() {
    // End all active drags
    this.endAllDrags();
    
    // Remove global event listeners
    // Note: In a production system, you'd want to store references to remove them
    console.log('DragSystem destroyed - active drags ended');
  }
}
