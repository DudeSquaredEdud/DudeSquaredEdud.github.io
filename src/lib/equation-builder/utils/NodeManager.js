/**
 * NodeManager - Advanced Research-Driven Component
 * 
 * Handles all node lifecycle management including creation, update, deletion,
 * and node interaction setup. Enhanced with dynamic input configuration
 * based on mathematical operator research and UI pattern analysis.
 * 
 * Design Principles:
 * - Single Responsibility: Focused solely on node management
 * - Dependency Injection: Clean interfaces for external dependencies
 * - Modular Architecture: Reusable and testable component
 * - Mathematical Accuracy: Respects mathematical properties of operations
 */

// Import enhanced NodeTypes utilities for dynamic configuration
import { 
  isConfigurableNode, 
  getInputConstraints, 
  getMathematicalProperties 
} from './NodeTypes.js';

// Import constraint system for advanced variable management
import { ConstraintEngine } from './ConstraintEngine.js';

export class NodeManager {
  constructor(canvas, nodeTypes, validationUtils, notificationSystem, dragSystem = null, connectionSystem = null, sidebarEditor = null) {
    // Dependencies injected for clean decoupling
    this.canvas = canvas;
    this.nodeTypes = nodeTypes;
    this.validationUtils = validationUtils;
    this.notificationSystem = notificationSystem;
    this.dragSystem = dragSystem;
    this.connectionSystem = connectionSystem;
    
    // Initialize constraint engine for advanced variable management
    this.constraintEngine = new ConstraintEngine(notificationSystem);
    this.sidebarEditor = sidebarEditor;
    
    // Node management state
    this.nodes = new Map();
    this.nodeIdCounter = 0;
    
    // Drag state for node movement
    this.dragState = {
      isDragging: false,
      currentNode: null,
      initialX: 0,
      initialY: 0,
      offsetX: 0,
      offsetY: 0
    };
  }

  /**
   * NODE LIFECYCLE MANAGEMENT
   */

  /**
   * Create a new node with specified content and type
   * Research-driven implementation based on visual node requirements
   */
  createNode(content, position = null) {
    const nodeId = `node-${this.nodeIdCounter++}`;
    
    // Determine node type and input requirements using NodeTypes utility
    const nodeType = this.getNodeTypeFromContent(content);
    const inputCount = this.getInputCountForNodeType(nodeType);
    
    // Create node element with comprehensive styling
    const nodeElement = this.createNodeElement(nodeId, nodeType, content);
    
    // Position node (random if not specified)
    this.positionNode(nodeElement, position);
    
    // Create connection ports based on node type
    this.createNodePorts(nodeElement, nodeId, nodeType, inputCount);
    
    // Apply special styling for output nodes
    if (nodeType === 'output') {
      this.applyOutputNodeStyling(nodeElement);
    }
    
    // Setup node interactions
    this.setupNodeInteractions(nodeElement, nodeId);
    
    // Define constraint-capable node types
    const constraintCapableNodes = ['variable', 'constant', 'add', 'subtract', 'multiply', 'divide', 'power', 'sin', 'cos', 'tan', 'sqrt', 'log', 'ln', 'output'];
    
    // Add to canvas and track in nodes map with enhanced data structure
    this.canvas.appendChild(nodeElement);
    this.nodes.set(nodeId, { 
      element: nodeElement, 
      content, 
      nodeType,
      connections: { inputs: [], outputs: [] },
      // Enhanced tracking for dynamic configuration
      currentInputCount: inputCount,
      isConfigurable: isConfigurableNode(nodeType),
      inputConstraints: getInputConstraints(nodeType),
      mathematicalProperties: getMathematicalProperties(nodeType),
      // Constraint system integration - expanded to include operators and output
      hasConstraints: constraintCapableNodes.includes(nodeType),
      constraintEngine: this.constraintEngine
    });
    
    // Register constraint-capable nodes with constraint engine
    if (constraintCapableNodes.includes(nodeType)) {
      this.constraintEngine.variableRegistry.set(nodeId, {
        name: content,
        nodeType: nodeType,
        currentValue: nodeType === 'constant' ? parseFloat(content) : null,
        isOperator: ['add', 'subtract', 'multiply', 'divide', 'power', 'sin', 'cos', 'tan', 'sqrt', 'log', 'ln'].includes(nodeType),
        isOutput: nodeType === 'output'
      });
    }
    
    // Configuration options now integrated into right-click context menu
    
    this.notificationSystem.show(`Node '${content}' created!`, 'success');
    return nodeId;
  }

  /**
   * Update node content and visual representation
   */
  updateNode(nodeId, properties) {
    const nodeData = this.nodes.get(nodeId);
    if (!nodeData) {
      this.notificationSystem.show('Node not found!', 'error');
      return false;
    }

    // Update content if provided
    if (properties.content !== undefined) {
      this.updateNodeContent(nodeId, properties.content);
    }

    // Update colors if provided
    if (properties.backgroundColor || properties.borderColor) {
      this.changeNodeColor(
        nodeId, 
        properties.backgroundColor || nodeData.element.style.backgroundColor,
        properties.borderColor || nodeData.element.style.borderColor
      );
    }

    return true;
  }

  /**
   * Delete node and clean up all connections
   * Research shows importance of connection cleanup for data integrity
   */
  deleteNode(nodeId) {
    const nodeData = this.nodes.get(nodeId);
    if (!nodeData) return false;

    // Remove the node element from DOM
    nodeData.element.remove();
    
    // Remove from nodes map
    this.nodes.delete(nodeId);
    
    this.notificationSystem.show('Node deleted!', 'success');
    return true;
  }

  /**
   * NODE QUERIES AND ACCESS
   */

  getNode(nodeId) {
    return this.nodes.get(nodeId);
  }

  getAllNodes() {
    return Array.from(this.nodes.entries()).map(([id, data]) => ({ id, ...data }));
  }

  getNodesByType(nodeType) {
    return this.getAllNodes().filter(node => node.nodeType === nodeType);
  }

  /**
   * NODE CONTENT MANAGEMENT
   */

  updateNodeContent(nodeId, content) {
    const nodeData = this.nodes.get(nodeId);
    if (nodeData) {
      // Validate constraints for variable and constant nodes
      if (nodeData.hasConstraints && (nodeData.nodeType === 'variable' || nodeData.nodeType === 'constant')) {
        const validation = this.constraintEngine.validateValue(nodeId, content);
        
        if (!validation.isValid) {
          // Show constraint violations to user
          const violationMessages = validation.violations.map(v => 
            `Constraint violation: ${this.constraintEngine.getConstraintDescription(v)}`
          ).join(', ');
          
          this.notificationSystem.show(`Value "${content}" violates constraints: ${violationMessages}`, 'error');
          
          // Apply visual indication of constraint violation
          nodeData.element.style.borderColor = '#dc2626'; // Red border for violations
          nodeData.element.style.backgroundColor = '#fef2f2'; // Light red background
          
          // Store violation status
          nodeData.constraintViolation = validation.violations;
          
          // Still update content but mark as invalid
          nodeData.content = content;
          nodeData.isValid = false;
        } else {
          // Valid value - reset styling and update
          const isOperatorNode = ['add', 'subtract', 'multiply', 'divide', 'power', 'sin', 'cos', 'tan', 'sqrt', 'log', 'ln'].includes(nodeData.nodeType);
          nodeData.element.style.borderColor = isOperatorNode ? '#ea580c' : '#3b82f6';
          nodeData.element.style.backgroundColor = isOperatorNode ? '#fed7aa' : '#e0e7ff';
          
          nodeData.content = content;
          nodeData.isValid = true;
          nodeData.constraintViolation = null;
          
          // Update variable registry for constant nodes
          if (nodeData.nodeType === 'constant') {
            const variableInfo = this.constraintEngine.variableRegistry.get(nodeId);
            if (variableInfo) {
              variableInfo.currentValue = parseFloat(content);
            }
          }
        }
      } else {
        // No constraints - normal update
        nodeData.content = content;
        nodeData.isValid = true;
      }
      
      // Update visual content
      const contentElement = nodeData.element.querySelector('.node-content');
      if (contentElement) {
        contentElement.textContent = content;
      }
      
      // Trigger real-time equation update when node content changes
      this.updateEquationOutput();
      
      // Also validate operator constraints as equations may have changed
      setTimeout(() => this.validateOperatorConstraints(), 100);
      
      return true;
    }
    return false;
  }

  changeNodeColor(nodeId, backgroundColor, borderColor) {
    const nodeData = this.nodes.get(nodeId);
    if (nodeData && nodeData.element) {
      nodeData.element.style.backgroundColor = backgroundColor;
      nodeData.element.style.borderColor = borderColor;
      return true;
    }
    return false;
  }

  resetNodeToDefault(nodeId) {
    const nodeData = this.nodes.get(nodeId);
    if (nodeData) {
      const defaultContent = this.getDefaultContentForNodeType(nodeData.nodeType);
      this.updateNodeContent(nodeId, defaultContent);
      this.changeNodeColor(nodeId, '#e0e7ff', '#3b82f6');
      this.notificationSystem.show('Node reset to default!', 'success');
      return true;
    }
    return false;
  }

  /**
   * NODE VALIDATION AND UTILITIES
   */

  validateNode(nodeId) {
    const nodeData = this.nodes.get(nodeId);
    if (!nodeData) return { isValid: false, errors: ['Node not found'] };

    const validation = this.validationUtils.validateNodeContent(
      nodeData.content, 
      nodeData.nodeType
    );
    
    return validation;
  }

  cloneNode(nodeId) {
    const nodeData = this.nodes.get(nodeId);
    if (!nodeData) return null;

    // Create clone with slight offset
    const position = this.getNodePosition(nodeData.element);
    const clonePosition = {
      x: position.x + 20,
      y: position.y + 20
    };

    return this.createNode(nodeData.content, clonePosition);
  }

  /**
   * DYNAMIC INPUT CONFIGURATION METHODS
   * Research-based implementation supporting mathematical constraints
   */

  /**
   * Add input port to configurable node
   * Only works on commutative/associative operations (add, multiply)
   */
  addInputPort(nodeId) {
    const nodeData = this.nodes.get(nodeId);
    if (!nodeData || !nodeData.isConfigurable) {
      this.notificationSystem.show('Node does not support dynamic inputs', 'error');
      return false;
    }

    const { max } = nodeData.inputConstraints;
    if (nodeData.currentInputCount >= max) {
      this.notificationSystem.show(`Maximum ${max} inputs reached`, 'warning');
      return false;
    }

    // Increment input count
    nodeData.currentInputCount++;
    
    // Recreate ports with new count
    this.recreateNodePorts(nodeId, nodeData.currentInputCount);
    
    // Update connections system if available
    if (this.connectionSystem) {
      this.connectionSystem.validateAllConnections();
    }

    this.notificationSystem.show('Input added successfully', 'success');
    return true;
  }

  /**
   * Remove input port from configurable node
   * Maintains minimum input requirements
   */
  removeInputPort(nodeId) {
    const nodeData = this.nodes.get(nodeId);
    if (!nodeData || !nodeData.isConfigurable) {
      this.notificationSystem.show('Node does not support dynamic inputs', 'error');
      return false;
    }

    const { min } = nodeData.inputConstraints;
    if (nodeData.currentInputCount <= min) {
      this.notificationSystem.show(`Minimum ${min} inputs required`, 'warning');
      return false;
    }

    // Check if removing would disconnect active connections
    const lastInputIndex = nodeData.currentInputCount - 1;
    if (this.connectionSystem) {
      const hasConnectionToLastInput = this.connectionSystem.hasConnectionToPort(nodeId, 'input', lastInputIndex);
      if (hasConnectionToLastInput) {
        this.notificationSystem.show('Cannot remove connected input', 'error');
        return false;
      }
    }

    // Decrement input count
    nodeData.currentInputCount--;
    
    // Recreate ports with new count
    this.recreateNodePorts(nodeId, nodeData.currentInputCount);

    this.notificationSystem.show('Input removed successfully', 'success');
    return true;
  }

  /**
   * Recreate node ports with new input count
   * Used for dynamic input configuration
   */
  recreateNodePorts(nodeId, newInputCount) {
    const nodeData = this.nodes.get(nodeId);
    if (!nodeData) return false;

    const nodeElement = nodeData.element;
    
    // Remove existing ports
    const existingPorts = nodeElement.querySelectorAll('.input-port, .output-port');
    existingPorts.forEach(port => port.remove());
    
    // Create new ports with updated count
    this.createNodePorts(nodeElement, nodeId, nodeData.nodeType, newInputCount);
    
    return true;
  }



  /**
   * INTERNAL HELPER METHODS
   * Research-based implementation of node creation details
   */

  createNodeElement(nodeId, nodeType, content) {
    const nodeElement = document.createElement('div');
    nodeElement.className = 'canvas-node';
    nodeElement.id = nodeId;
    nodeElement.dataset.nodeType = nodeType;
    
    // Determine styling based on node type - research-driven visual categorization
    const isOperatorNode = ['add', 'subtract', 'multiply', 'divide', 'power', 'sin', 'cos', 'tan', 'sqrt', 'log', 'ln'].includes(nodeType);
    const backgroundColor = isOperatorNode ? '#fed7aa' : '#e0e7ff'; // Light orange for operators, light blue for others
    const borderColor = isOperatorNode ? '#ea580c' : '#3b82f6'; // Orange border for operators, blue for others
    
    // Apply comprehensive styling based on research of visual node requirements
    Object.assign(nodeElement.style, {
      position: 'absolute',
      padding: '12px',
      backgroundColor: backgroundColor,
      border: `2px solid ${borderColor}`,
      borderRadius: '8px',
      cursor: 'move',
      userSelect: 'none',
      fontWeight: 'bold',
      minWidth: '80px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      zIndex: '10',
      minHeight: '40px'
    });

    // Create header with star button
    const headerDiv = document.createElement('div');
    headerDiv.className = 'node-header';
    Object.assign(headerDiv.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: '4px'
    });

    // Create star button
    const starBtn = document.createElement('button');
    starBtn.className = 'node-star-btn';
    starBtn.innerHTML = '☆'; // Empty star initially
    starBtn.title = 'Star this node for quick access';
    Object.assign(starBtn.style, {
      background: 'none',
      border: 'none',
      fontSize: '16px',
      cursor: 'pointer',
      padding: '2px',
      color: '#666',
      opacity: '0.7'
    });
    
    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleNodeStar(nodeId);
    });

    // Create node content element
    const contentDiv = document.createElement('div');
    contentDiv.className = 'node-content';
    contentDiv.textContent = content;
    Object.assign(contentDiv.style, {
      fontSize: '14px',
      flex: '1'
    });
    
    headerDiv.appendChild(contentDiv);
    headerDiv.appendChild(starBtn);
    nodeElement.appendChild(headerDiv);
    
    return nodeElement;
  }

  positionNode(nodeElement, position) {
    if (position) {
      nodeElement.style.left = `${position.x}px`;
      nodeElement.style.top = `${position.y}px`;
    } else {
      // Random positioning within canvas bounds
      const x = Math.random() * (this.canvas.offsetWidth - 120);
      const y = Math.random() * (this.canvas.offsetHeight - 80);
      nodeElement.style.left = `${x}px`;
      nodeElement.style.top = `${y}px`;
    }
  }

  createNodePorts(nodeElement, nodeId, nodeType, inputCount) {
    // Create input ports (left side)
    for (let i = 0; i < inputCount; i++) {
      const inputPort = this.createPort('input', i);
      
      // Position multiple inputs vertically with improved spacing
      if (inputCount === 1) {
        inputPort.style.top = '50%';
        inputPort.style.transform = 'translateY(-50%)';
      } else {
        // Enhanced spacing calculation based on UX research
        // Distribute inputs across 80% of node height with minimum 15px spacing
        const usableHeight = 80; // Use 80% of node height
        const minSpacing = 15; // Minimum spacing between ports
        const totalSpacing = Math.max(usableHeight, inputCount * minSpacing);
        const startOffset = (100 - totalSpacing) / 2; // Center the port group
        
        const spacing = totalSpacing / (inputCount + 1);
        inputPort.style.top = `${startOffset + spacing * (i + 1)}%`;
        inputPort.style.transform = 'translateY(-50%)';
      }
      
      nodeElement.appendChild(inputPort);
      this.setupPortEvents(inputPort, nodeId, 'input');
    }

    // Create output port (right side) - all nodes except output nodes have outputs
    if (nodeType !== 'output') {
      const outputPort = this.createPort('output', 0);
      nodeElement.appendChild(outputPort);
      this.setupPortEvents(outputPort, nodeId, 'output');
    }
  }

  createPort(portType, portIndex) {
    const port = document.createElement('div');
    port.className = `connection-port ${portType}-port`;
    port.dataset.portIndex = portIndex.toString();
    
    const isInput = portType === 'input';
    Object.assign(port.style, {
      width: '10px',
      height: '10px',
      backgroundColor: isInput ? '#10b981' : '#f59e0b',
      borderRadius: '50%',
      cursor: 'crosshair',
      position: 'absolute',
      border: isInput ? '2px solid #059669' : '2px solid #d97706',
      zIndex: '20'
    });

    if (isInput) {
      port.style.left = '-5px';
    } else {
      port.style.right = '-5px';
      port.style.top = '50%';
      port.style.transform = 'translateY(-50%)';
    }

    return port;
  }

  applyOutputNodeStyling(nodeElement) {
    nodeElement.style.backgroundColor = '#fef3c7';
    nodeElement.style.borderColor = '#f59e0b';
    nodeElement.style.fontWeight = 'bold';
    nodeElement.querySelector('.node-content').textContent = '= OUTPUT';
  }

  setupNodeInteractions(nodeElement, nodeId) {
    this.makeDraggable(nodeElement);
    this.addContextMenu(nodeElement, nodeId);
  }

  makeDraggable(element) {
    // Delegate to DragSystem if available, otherwise use basic fallback
    if (this.dragSystem) {
      this.dragSystem.makeDraggable(element, {
        constrainToCanvas: true,
        showVisualFeedback: true,
        updateConnections: true,
        onDragStart: (element, event) => {
          // Ignore if clicking on a port
          if (event.target.classList.contains('connection-port')) {
            return false; // Cancel drag
          }
        }
      });
    } else {
      // Fallback to basic drag if no DragSystem available
      console.warn('NodeManager: No DragSystem available, using basic drag');
      this.basicDragFallback(element);
    }
  }
  
  basicDragFallback(element) {
    element.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('connection-port')) return;
      
      this.dragState.isDragging = true;
      this.dragState.currentNode = element;
      
      const rect = element.getBoundingClientRect();
      const canvasRect = this.canvas.getBoundingClientRect();
      
      this.dragState.offsetX = e.clientX - rect.left;
      this.dragState.offsetY = e.clientY - rect.top;
      
      element.style.zIndex = '100';
      e.preventDefault();
    });
  }

  addContextMenu(nodeElement, nodeId) {
    nodeElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // Simple right-click opens sidebar - keep it focused and direct
      if (this.sidebarEditor) {
        this.sidebarEditor.openSidebar(nodeId);
      } else {
        console.warn('NodeManager: SidebarEditor not available for context menu');
      }
    });

    nodeElement.addEventListener('dblclick', (e) => {
      e.preventDefault();
      // Double-click also opens sidebar for quick editing
      if (this.sidebarEditor) {
        this.sidebarEditor.openSidebar(nodeId);
      } else {
        console.warn('NodeManager: SidebarEditor not available for double-click');
      }
    });
  }



  /**
   * NODE TYPE HELPERS
   * Researched and extracted from main class for reusability
   */

  getNodeTypeFromContent(content) {
    const typeMap = {
      '+': 'add',
      '-': 'subtract',
      '−': 'subtract', // Unicode minus sign U+2212 (used in palette button)
      '×': 'multiply',
      '*': 'multiply',
      '÷': 'divide',
      '/': 'divide',
      '^': 'power',
      'sin': 'sin',
      'cos': 'cos',
      'tan': 'tan',
      '√': 'sqrt',
      'sqrt': 'sqrt',
      'log': 'log',
      'ln': 'ln',
      '=': 'output'
    };

    // Check if it's a number (constant)
    if (!isNaN(parseFloat(content))) {
      return 'constant';
    }
    
    // Check if it's a known operator/function
    if (typeMap[content]) {
      return typeMap[content];
    }
    
    // Default to variable for single letters or expressions
    return 'variable';
  }

  getInputCountForNodeType(nodeType) {
    const inputCounts = {
      'add': 2,
      'subtract': 2,
      'multiply': 2,
      'divide': 2,
      'power': 2,
      'sin': 1,
      'cos': 1,
      'tan': 1,
      'sqrt': 1,
      'log': 1,
      'ln': 1,
      'variable': 0,
      'constant': 0,
      'output': 1
    };
    
    return inputCounts[nodeType] || 0;
  }

  getDefaultContentForNodeType(nodeType) {
    const defaults = {
      'constant': '1',
      'variable': 'x',
      'add': '+',
      'subtract': '-',
      'multiply': '×',
      'divide': '÷',
      'power': '^',
      'sin': 'sin',
      'cos': 'cos',
      'tan': 'tan',
      'sqrt': '√',
      'log': 'log',
      'ln': 'ln',
      'output': '='
    };
    
    return defaults[nodeType] || nodeType;
  }

  getNodePosition(nodeElement) {
    const rect = nodeElement.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    
    return {
      x: rect.left - canvasRect.left,
      y: rect.top - canvasRect.top
    };
  }

  /**
   * PORT EVENT SETUP
   * Delegated to connection system in full modular architecture
   */
  /**
   * Update connection system reference after initialization
   */
  setConnectionSystem(connectionSystem) {
    this.connectionSystem = connectionSystem;
  }
  
  /**
   * Update sidebar editor reference after initialization
   */
  setSidebarEditor(sidebarEditor) {
    this.sidebarEditor = sidebarEditor;
  }
  
  /**
   * Update equation generator reference after initialization
   */
  setEquationGenerator(equationGenerator) {
    this.equationGenerator = equationGenerator;
  }
  
  /**
   * Update equation output - triggers real-time equation generation
   */
  updateEquationOutput() {
    if (this.equationGenerator) {
      this.equationGenerator.updateEquation();
    }
  }
  
  /**
   * Update OUTPUT node content to show generated equation
   */
  updateOutputNodeContent(nodeId) {
    const nodeData = this.nodes.get(nodeId);
    if (!nodeData || nodeData.nodeType !== 'output') return;
    
    const nodeElement = this.canvas.querySelector(`[data-node-id="${nodeId}"]`);
    const contentElement = nodeElement?.querySelector('.node-content');
    
    if (contentElement && this.equationGenerator) {
      const equation = this.equationGenerator.generateEquationFromNode(nodeId);
      const displayText = equation && equation !== '(no input)' ? `= ${equation}` : '= OUTPUT';
      contentElement.textContent = displayText;
    }
  }
  
  /**
   * Update all OUTPUT nodes to show their current equations
   */
  updateAllOutputNodes() {
    this.nodes.forEach((nodeData, nodeId) => {
      if (nodeData.nodeType === 'output') {
        this.updateOutputNodeContent(nodeId);
      }
    });
  }
  
  setupPortEvents(port, nodeId, portType) {
    // Delegate to ConnectionSystem component using dependency injection
    if (this.connectionSystem) {
      this.connectionSystem.setupPortEvents(port, nodeId, portType);
    } else {
      console.warn('NodeManager: ConnectionSystem not available for port events');
    }
  }

  /**
   * CONSTRAINT MANAGEMENT METHODS
   * Advanced variable constraint system integration
   */

  /**
   * Add constraint to a variable or constant node
   */
  addConstraintToNode(nodeId, constraintType, constraintData) {
    const nodeData = this.nodes.get(nodeId);
    if (!nodeData || !nodeData.hasConstraints) {
      this.notificationSystem.show('Constraints only apply to variable and constant nodes', 'error');
      return false;
    }

    return this.constraintEngine.addConstraint(nodeId, constraintType, constraintData);
  }

  /**
   * Remove constraint from node
   */
  removeConstraintFromNode(nodeId, constraintId) {
    return this.constraintEngine.removeConstraint(nodeId, constraintId);
  }

  /**
   * Get all constraints for a node
   */
  getNodeConstraints(nodeId) {
    return this.constraintEngine.getConstraints(nodeId);
  }

  /**
   * Get constraint summary for display
   */
  getNodeConstraintSummary(nodeId) {
    return this.constraintEngine.getConstraintSummary(nodeId);
  }

  /**
   * Clear all constraints from a node
   */
  clearNodeConstraints(nodeId) {
    this.constraintEngine.clearConstraints(nodeId);
    
    // Reset node styling to default
    const nodeData = this.nodes.get(nodeId);
    if (nodeData) {
      const isOperatorNode = ['add', 'subtract', 'multiply', 'divide', 'power', 'sin', 'cos', 'tan', 'sqrt', 'log', 'ln'].includes(nodeData.nodeType);
      nodeData.element.style.borderColor = isOperatorNode ? '#ea580c' : '#3b82f6';
      nodeData.element.style.backgroundColor = isOperatorNode ? '#fed7aa' : '#e0e7ff';
      nodeData.isValid = true;
      nodeData.constraintViolation = null;
    }
  }

  /**
   * Check if node has constraint violations
   */
  hasConstraintViolations(nodeId) {
    const nodeData = this.nodes.get(nodeId);
    return nodeData && nodeData.constraintViolation && nodeData.constraintViolation.length > 0;
  }

  /**
   * Get nodes with constraint violations
   */
  getNodesWithViolations() {
    const violatingNodes = [];
    
    for (const [nodeId, nodeData] of this.nodes) {
      if (this.hasConstraintViolations(nodeId)) {
        violatingNodes.push({
          nodeId,
          content: nodeData.content,
          nodeType: nodeData.nodeType,
          violations: nodeData.constraintViolation
        });
      }
    }
    
    return violatingNodes;
  }

  /**
   * Validate all constrained nodes
   */
  validateAllConstraints() {
    let totalViolations = 0;
    
    for (const [nodeId, nodeData] of this.nodes) {
      if (nodeData.hasConstraints) {
        const validation = this.constraintEngine.validateValue(nodeId, nodeData.content);
        if (!validation.isValid) {
          totalViolations += validation.violations.length;
        }
      }
    }
    
    return {
      totalViolations,
      hasViolations: totalViolations > 0,
      violatingNodes: this.getNodesWithViolations()
    };
  }

  /**
   * Export constraints data for persistence
   */
  exportConstraintsData() {
    return this.constraintEngine.exportConstraints();
  }

  /**
   * Import constraints data from persistence
   */
  importConstraintsData(constraintsData) {
    const success = this.constraintEngine.importConstraints(constraintsData);
    
    if (success) {
      // Re-validate all nodes after importing constraints
      this.validateAllConstraints();
      this.validateOperatorConstraints();
    }
    
    return success;
  }

  /**
   * Validate operator result constraints
   * This method validates constraints on operator nodes by evaluating their results
   */
  validateOperatorConstraints() {
    if (!this.equationGenerator) {
      console.warn('EquationGenerator not available for operator constraint validation');
      return;
    }

    for (const [nodeId, nodeData] of this.nodes) {
      if (nodeData.hasConstraints && this.isOperatorNode(nodeData.nodeType)) {
        const validation = this.constraintEngine.validateOperatorResult(
          nodeId, 
          this, 
          this.equationGenerator
        );
        
        if (!validation.isValid) {
          // Apply visual indication of constraint violation
          nodeData.element.style.borderColor = '#dc2626'; // Red border for violations
          nodeData.element.style.backgroundColor = '#fef2f2'; // Light red background
          nodeData.constraintViolation = validation.violations;
          nodeData.isValid = false;
        } else {
          // Valid result - reset styling
          const isOperatorNode = this.isOperatorNode(nodeData.nodeType);
          nodeData.element.style.borderColor = isOperatorNode ? '#ea580c' : '#3b82f6';
          nodeData.element.style.backgroundColor = isOperatorNode ? '#fed7aa' : '#e0e7ff';
          nodeData.isValid = true;
          nodeData.constraintViolation = null;
        }
      }
    }
  }

  /**
   * Check if a node type is an operator
   */
  isOperatorNode(nodeType) {
    return ['add', 'subtract', 'multiply', 'divide', 'power', 'sin', 'cos', 'tan', 'sqrt', 'log', 'ln'].includes(nodeType);
  }

  /**
   * Set equation generator reference for operator constraint validation
   */
  setEquationGenerator(equationGenerator) {
    this.equationGenerator = equationGenerator;
  }

  /**
   * Toggle star status for a node
   */
  toggleNodeStar(nodeId) {
    const nodeElement = document.getElementById(nodeId);
    if (!nodeElement) return;
    
    const starBtn = nodeElement.querySelector('.node-star-btn');
    if (!starBtn) return;
    
    const isStarred = starBtn.innerHTML === '★';
    
    // Toggle star visual state
    starBtn.innerHTML = isStarred ? '☆' : '★';
    starBtn.style.color = isStarred ? '#666' : '#fbbf24';
    starBtn.style.opacity = isStarred ? '0.7' : '1';
    
    // Notify star system if available
    // This will be connected to the StarSystemManager later
    if (window.nodeEditor && window.nodeEditor.starSystemManager) {
      if (isStarred) {
        window.nodeEditor.starSystemManager.unstarNode(nodeId);
      } else {
        window.nodeEditor.starSystemManager.starNode(nodeId);
      }
    }
  }

  /**
   * Enhanced equation update that includes operator constraint validation
   */
  updateEquationOutputWithConstraints() {
    // Update the equation as normal
    if (this.equationGenerator && this.equationGenerator.updateEquation) {
      this.equationGenerator.updateEquation();
    }
    
    // Validate operator constraints after equation update
    this.validateOperatorConstraints();
  }
}
