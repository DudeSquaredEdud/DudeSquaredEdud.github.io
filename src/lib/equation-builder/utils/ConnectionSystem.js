/**
 * ConnectionSystem - Advanced Research-Driven Component
 * 
 * Handles all connection management including creation, deletion, validation,
 * SVG rendering, and interactive connection building. Extracted from monolithic
 * equation-builder.astro following comprehensive analysis of connection responsibilities.
 * 
 * Design Principles:
 * - Single Responsibility: Focused solely on node connections
 * - Dependency Injection: Clean interfaces for NodeManager and validation
 * - Visual Rendering: Comprehensive SVG connection management
 * - Interaction Handling: Complete drag-and-drop connection system
 */

export class ConnectionSystem {
  constructor(canvas, connectionLayer, nodeManager, validationUtils, notificationSystem) {
    // Dependencies injected for clean decoupling
    this.canvas = canvas;
    this.connectionLayer = connectionLayer;
    this.nodeManager = nodeManager;
    this.validationUtils = validationUtils;
    this.notificationSystem = notificationSystem;
    
    // Connection management state
    this.connections = [];
    this.connectionStart = null;
    
    // Bind event handlers for proper context
    this.handleConnectionPreview = this.handleConnectionPreview.bind(this);
    this.endConnection = this.endConnection.bind(this);
    
    this.initializeConnectionLayer();
  }

  /**
   * Initialize SVG connection layer with arrow markers
   * Research-driven implementation based on SVG best practices
   */
  initializeConnectionLayer() {
    // Create arrow marker for connection endpoints
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');
    
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrow.setAttribute('points', '0 0, 10 3.5, 0 7');
    arrow.setAttribute('fill', '#3b82f6');
    
    marker.appendChild(arrow);
    defs.appendChild(marker);
    this.connectionLayer.appendChild(defs);
  }

  /**
   * CONNECTION MANAGEMENT
   */

  /**
   * Create a new connection between two nodes
   * Research shows importance of preventing duplicate connections on same input port
   */
  createConnection(fromNodeId, toNodeId, fromPortIndex = 0, toPortIndex = 0) {
    // Validate connection parameters
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) {
      this.notificationSystem.show('Invalid connection parameters!', 'error');
      return false;
    }

    // Check if connection already exists on this specific input port
    const existingConnection = this.connections.find(conn => 
      conn.to === toNodeId && conn.toPortIndex === toPortIndex
    );
    
    if (existingConnection) {
      // Replace existing connection on this input port
      this.connections = this.connections.filter(conn => 
        !(conn.to === toNodeId && conn.toPortIndex === toPortIndex)
      );
    }
    
    // Create new connection object
    const connection = {
      id: `conn-${Date.now()}`,
      from: fromNodeId,
      to: toNodeId,
      fromPortIndex,
      toPortIndex,
      created: new Date()
    };
    
    // Validate connection logic using ValidationUtils
    const validation = this.validateConnection(connection);
    if (!validation.isValid) {
      this.notificationSystem.show(`Connection invalid: ${validation.errors.join(', ')}`, 'error');
      return false;
    }
    
    // Add connection to collection
    this.connections.push(connection);
    this.renderConnections();
    this.updateOutputNodes();
    
    this.notificationSystem.show('Connection created!', 'success');
    return true;
  }

  /**
   * Delete a specific connection by ID
   */
  deleteConnection(connectionId) {
    const initialLength = this.connections.length;
    this.connections = this.connections.filter(conn => conn.id !== connectionId);
    
    if (this.connections.length < initialLength) {
      this.renderConnections();
      this.updateOutputNodes();
      this.notificationSystem.show('Connection deleted!', 'success');
      return true;
    }
    
    return false;
  }

  /**
   * Delete all connections involving a specific node
   */
  deleteConnectionsForNode(nodeId) {
    const initialLength = this.connections.length;
    this.connections = this.connections.filter(conn => 
      conn.from !== nodeId && conn.to !== nodeId
    );
    
    const deletedCount = initialLength - this.connections.length;
    if (deletedCount > 0) {
      this.renderConnections();
      this.updateOutputNodes();
      this.notificationSystem.show(`${deletedCount} connection(s) removed!`, 'info');
    }
    
    return deletedCount;
  }

  /**
   * Get all connections
   */
  getAllConnections() {
    return [...this.connections]; // Return copy to prevent external modification
  }

  /**
   * Get connections for a specific node
   */
  getConnectionsForNode(nodeId) {
    return this.connections.filter(conn => 
      conn.from === nodeId || conn.to === nodeId
    );
  }

  /**
   * Get input connections for a node
   */
  getInputConnections(nodeId) {
    return this.connections.filter(conn => conn.to === nodeId);
  }

  /**
   * Get output connections for a node
   */
  getOutputConnections(nodeId) {
    return this.connections.filter(conn => conn.from === nodeId);
  }

  /**
   * Clear all connections
   */
  clearAllConnections() {
    this.connections = [];
    this.renderConnections();
    this.notificationSystem.show('All connections cleared!', 'info');
  }

  /**
   * CONNECTION VALIDATION
   */

  validateConnection(connection) {
    const errors = [];
    
    // Check if nodes exist
    const fromNode = this.nodeManager.getNode(connection.from);
    const toNode = this.nodeManager.getNode(connection.to);
    
    if (!fromNode) errors.push('Source node does not exist');
    if (!toNode) errors.push('Target node does not exist');
    
    if (errors.length > 0) {
      return { isValid: false, errors };
    }
    
    // Check for circular connections
    if (this.wouldCreateCircle(connection)) {
      errors.push('Connection would create circular dependency');
    }
    
    // Validate connection using ValidationUtils with error handling
    try {
      const utilValidation = this.validationUtils.validateConnection(
        connection.from, connection.to, connection.fromPortIndex, connection.toPortIndex,
        this.nodeManager.nodes, this.connections
      );
      
      if (!utilValidation.isValid) {
        errors.push(...utilValidation.errors);
      }
    } catch (err) {
      errors.push(`Validation error: ${err.message}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if connection would create circular dependency
   * Research-based circular dependency detection
   */
  wouldCreateCircle(newConnection) {
    // Use depth-first search to detect cycles
    const visited = new Set();
    const recursionStack = new Set();
    
    const hasCycle = (nodeId) => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      // Check all connections from this node (including the proposed one)
      const outgoingConnections = this.connections
        .filter(conn => conn.from === nodeId)
        .concat(newConnection.from === nodeId ? [newConnection] : []);
      
      for (const conn of outgoingConnections) {
        if (hasCycle(conn.to)) return true;
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    return hasCycle(newConnection.to);
  }

  /**
   * Check if a specific port has an active connection
   * Used for dynamic input port management
   */
  hasConnectionToPort(nodeId, portType, portIndex) {
    if (portType === 'input') {
      return this.connections.some(conn => 
        conn.to === nodeId && conn.toPortIndex === portIndex
      );
    } else if (portType === 'output') {
      return this.connections.some(conn => 
        conn.from === nodeId && conn.fromPortIndex === portIndex
      );
    }
    return false;
  }

  /**
   * Validate all connections after dynamic port changes
   * Ensures connection integrity after node reconfiguration
   */
  validateAllConnections() {
    const invalidConnections = [];
    
    this.connections.forEach((connection, index) => {
      const validation = this.validateConnection(connection);
      if (!validation.isValid) {
        invalidConnections.push(index);
      }
    });
    
    // Remove invalid connections
    invalidConnections.reverse().forEach(index => {
      const connection = this.connections[index];
      this.deleteConnection(connection.id);
      this.notificationSystem.show(
        'Connection removed due to port reconfiguration', 
        'warning'
      );
    });
    
    // Re-render after cleanup
    this.renderConnections();
  }

  /**
   * VISUAL RENDERING SYSTEM
   */

  /**
   * Render all connections as SVG lines
   * Research-driven SVG rendering with proper positioning
   */
  renderConnections() {
    // Clear existing connection lines
    this.connectionLayer.querySelectorAll('.connection-line').forEach(line => line.remove());
    
    // Draw all connections
    this.connections.forEach(connection => {
      const line = this.createConnectionLine(connection);
      if (line) {
        this.connectionLayer.appendChild(line);
      }
    });
  }

  /**
   * Create SVG line element for a connection
   */
  createConnectionLine(connection) {
    const fromNode = document.getElementById(connection.from);
    const toNode = document.getElementById(connection.to);
    
    if (!fromNode || !toNode) {
      console.warn(`Connection ${connection.id}: Missing node elements`);
      return null;
    }
    
    const fromPort = fromNode.querySelector('.output-port');
    const inputPorts = toNode.querySelectorAll('.input-port');
    const toPort = inputPorts[connection.toPortIndex] || inputPorts[0];
    
    if (!fromPort || !toPort) {
      console.warn(`Connection ${connection.id}: Missing port elements`);
      return null;
    }
    
    const startPos = this.getPortPosition(fromPort);
    const endPos = this.getPortPosition(toPort);
    
    const connectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    connectionLine.classList.add('connection-line');
    connectionLine.setAttribute('data-connection-id', connection.id);
    connectionLine.setAttribute('x1', startPos.x.toString());
    connectionLine.setAttribute('y1', startPos.y.toString());
    connectionLine.setAttribute('x2', endPos.x.toString());
    connectionLine.setAttribute('y2', endPos.y.toString());
    connectionLine.setAttribute('stroke', '#3b82f6');
    connectionLine.setAttribute('stroke-width', '3');
    connectionLine.setAttribute('marker-end', 'url(#arrowhead)');
    
    // Add interaction for connection deletion
    connectionLine.style.cursor = 'pointer';
    connectionLine.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (confirm('Delete this connection?')) {
        this.deleteConnection(connection.id);
      }
    });
    
    return connectionLine;
  }

  /**
   * Get precise port position for connection rendering
   */
  getPortPosition(port) {
    const portRect = port.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    
    return {
      x: portRect.left + portRect.width / 2 - canvasRect.left,
      y: portRect.top + portRect.height / 2 - canvasRect.top
    };
  }

  /**
   * INTERACTIVE CONNECTION BUILDING
   */

  /**
   * Setup port event handlers for interactive connection creation
   */
  setupPortEvents(port, nodeId, portType) {
    // Mouse down starts connection (only from output ports)
    port.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (portType === 'output') {
        this.startConnection(port, nodeId, portType);
      }
    });
    
    // Visual feedback on hover
    port.addEventListener('mouseenter', () => {
      port.style.transform = 'translateY(-50%) scale(1.2)';
      port.style.opacity = '0.8';
    });
    
    port.addEventListener('mouseleave', () => {
      port.style.transform = 'translateY(-50%) scale(1)';
      port.style.opacity = '1';
    });
  }

  /**
   * Start interactive connection creation
   */
  startConnection(port, nodeId, portType) {
    if (portType === 'input') {
      this.notificationSystem.show('Connections start from output ports (right side)', 'info');
      return;
    }
    
    this.connectionStart = { port, nodeId, portType };
    
    // Add global event listeners for connection preview
    document.addEventListener('mousemove', this.handleConnectionPreview);
    document.addEventListener('mouseup', this.endConnection);
    
    // Visual feedback for connection start
    port.style.boxShadow = '0 0 10px #f59e0b';
    port.style.transform = 'translateY(-50%) scale(1.3)';
    
    this.notificationSystem.show('Drag to an input port to create connection', 'info');
  }

  /**
   * Handle connection preview while dragging
   */
  handleConnectionPreview(e) {
    if (!this.connectionStart) return;
    
    const canvasRect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    
    const startPos = this.getPortPosition(this.connectionStart.port);
    
    // Clear previous preview
    const existingPreview = this.connectionLayer.querySelector('.connection-preview');
    if (existingPreview) {
      existingPreview.remove();
    }
    
    // Create preview line
    const previewLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    previewLine.classList.add('connection-preview');
    previewLine.setAttribute('x1', startPos.x.toString());
    previewLine.setAttribute('y1', startPos.y.toString());
    previewLine.setAttribute('x2', mouseX.toString());
    previewLine.setAttribute('y2', mouseY.toString());
    previewLine.setAttribute('stroke', '#f59e0b');
    previewLine.setAttribute('stroke-width', '2');
    previewLine.setAttribute('stroke-dasharray', '5,5');
    previewLine.setAttribute('opacity', '0.7');
    
    this.connectionLayer.appendChild(previewLine);
  }

  /**
   * End connection creation
   */
  endConnection(e) {
    // Remove global event listeners
    document.removeEventListener('mousemove', this.handleConnectionPreview);
    document.removeEventListener('mouseup', this.endConnection);
    
    // Clear preview line
    const existingPreview = this.connectionLayer.querySelector('.connection-preview');
    if (existingPreview) {
      existingPreview.remove();
    }
    
    // Remove visual feedback
    if (this.connectionStart) {
      this.connectionStart.port.style.boxShadow = '';
      this.connectionStart.port.style.transform = 'translateY(-50%) scale(1)';
    }
    
    // Check if we ended on a valid input port
    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    if (targetElement && targetElement.classList.contains('input-port')) {
      const targetNode = targetElement.closest('.canvas-node');
      if (targetNode && targetNode.id !== this.connectionStart.nodeId) {
        const targetPortIndex = parseInt(targetElement.dataset.portIndex || '0');
        this.createConnection(
          this.connectionStart.nodeId, 
          targetNode.id, 
          0, // Output port index (always 0 for now)
          targetPortIndex
        );
      }
    }
    
    this.connectionStart = null;
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Update connection positions after node movement
   * Called when nodes are dragged to maintain visual connections
   */
  updateConnectionPositions() {
    this.renderConnections();
  }

  /**
   * Get connection statistics for debugging/monitoring
   */
  getConnectionStats() {
    return {
      totalConnections: this.connections.length,
      nodeConnections: this.countNodeConnections(),
      avgConnectionsPerNode: this.calculateAverageConnections()
    };
  }

  countNodeConnections() {
    const nodeCounts = new Map();
    
    this.connections.forEach(conn => {
      nodeCounts.set(conn.from, (nodeCounts.get(conn.from) || 0) + 1);
      nodeCounts.set(conn.to, (nodeCounts.get(conn.to) || 0) + 1);
    });
    
    return Object.fromEntries(nodeCounts);
  }

  calculateAverageConnections() {
    if (this.nodeManager.nodes.size === 0) return 0;
    return (this.connections.length * 2) / this.nodeManager.nodes.size;
  }

  /**
   * Export connections data for saving/loading
   */
  exportConnections() {
    return {
      connections: this.connections.map(conn => ({
        id: conn.id,
        from: conn.from,
        to: conn.to,
        fromPortIndex: conn.fromPortIndex,
        toPortIndex: conn.toPortIndex
      })),
      metadata: {
        exportDate: new Date(),
        connectionCount: this.connections.length
      }
    };
  }

  /**
   * Import connections data
   */
  importConnections(connectionData) {
    try {
      this.connections = connectionData.connections || [];
      this.renderConnections();
      this.notificationSystem.show(
        `${this.connections.length} connections imported!`, 
        'success'
      );
      return true;
    } catch (error) {
      this.notificationSystem.show('Failed to import connections!', 'error');
      return false;
    }
  }
  
  /**
   * Update OUTPUT node visual content to reflect current equations
   * Called automatically when connections change
   */
  updateOutputNodes() {
    if (this.nodeManager && this.nodeManager.updateAllOutputNodes) {
      this.nodeManager.updateAllOutputNodes();
    }
    
    // Also update the bottom equation display on every connection change
    if (this.nodeManager && this.nodeManager.updateEquationOutput) {
      this.nodeManager.updateEquationOutput();
    }
  }
}
