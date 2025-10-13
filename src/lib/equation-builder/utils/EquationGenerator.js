/**
 * EquationGenerator - Advanced mathematical expression generation component
 * 
 * Enhanced to support dynamic input configurations and n-ary operations
 * based on mathematical operator research and configurable node system.
 * 
 * Handles all mathematical equation generation from node graphs, including:
 * - Recursive expression building from connected nodes
 * - N-ary operations for commutative operators (addition, multiplication)
 * - Mathematical operator formatting and precedence
 * - Output node processing and equation display
 * - Input validation and error handling
 * 
 * Part of the modular equation builder architecture
 */

// Import enhanced NodeTypes utilities for dynamic operations
import { 
  getMathematicalProperties, 
  getInputConstraints,
  isConfigurableNode 
} from './NodeTypes.js';
export class EquationGenerator {
  constructor(nodeManager, connectionSystem, equationOutputElement) {
    // Core dependencies
    this.nodeManager = nodeManager;
    this.connectionSystem = connectionSystem;
    this.equationOutput = equationOutputElement;
    
    // Enhanced mathematical operator support - now dynamic based on node configuration
    // Note: Input counts now determined by actual node configuration rather than static mapping
    
    // Mathematical operator display mapping
    this.operatorSymbols = {
      'add': '+',
      'subtract': '-',
      'multiply': '×',
      'divide': '÷',
      'power': '^'
    };
    
    console.log('EquationGenerator initialized with advanced mathematical processing capabilities');
  }
  
  /**
   * Get the current input count for a specific node instance
   * Enhanced to support dynamic input configuration
   * @param {string} nodeId - The specific node ID
   * @returns {number} Number of inputs currently configured
   */
  getInputCountForNode(nodeId) {
    const nodeData = this.nodeManager.nodes.get(nodeId);
    if (!nodeData) return 0;
    
    // Use actual configured input count for dynamic nodes
    if (nodeData.currentInputCount !== undefined) {
      return nodeData.currentInputCount;
    }
    
    // Fallback to default constraints for non-dynamic nodes
    const constraints = getInputConstraints(nodeData.nodeType);
    return constraints.default;
  }

  /**
   * Get the required input count for a node type (used for validation)
   * @param {string} nodeType - The type of node
   * @returns {number} Default number of inputs required
   */
  getInputCountForNodeType(nodeType) {
    const constraints = getInputConstraints(nodeType);
    return constraints.default;
  }
  
  /**
   * Update the equation output display
   * Finds all output nodes and generates their equations
   */
  updateEquation() {
    // Find output nodes to generate equations from
    const outputNodes = [];
    this.nodeManager.nodes.forEach((nodeObj, nodeId) => {
      if (nodeObj.nodeType === 'output') {
        outputNodes.push(nodeId);
      }
    });
    
    if (outputNodes.length === 0) {
      if (this.nodeManager.nodes.size === 0) {
        this.equationOutput.innerHTML = '<em>Click buttons in the palette to add nodes to the canvas...</em>';
      } else {
        this.equationOutput.innerHTML = '<em>Add an OUTPUT node (=) to generate equations...</em>';
      }
      return;
    }
    
    // Generate equations for each output node
    const equations = outputNodes.map(outputNodeId => {
      const equation = this.generateEquationFromNode(outputNodeId);
      return equation || 'undefined';
    });
    
    if (equations.length === 1) {
      this.equationOutput.innerHTML = `<strong>Generated Equation:</strong><br/>${equations[0]}`;
    } else {
      this.equationOutput.innerHTML = `<strong>Generated Equations:</strong><br/>${equations.map((eq, i) => `${i + 1}. ${eq}`).join('<br/>')}`;
    }
    
    // Update OUTPUT node visual content to show equations
    if (this.nodeManager && this.nodeManager.updateAllOutputNodes) {
      this.nodeManager.updateAllOutputNodes();
    }
  }
  
  /**
   * Update equation output (alias for updateEquation)
   */
  updateEquationOutput() {
    this.updateEquation();
  }
  
  /**
   * Generate mathematical equation from a node and its connected graph
   * @param {string} nodeId - The node ID to start generation from
   * @returns {string} Generated mathematical expression
   */
  generateEquationFromNode(nodeId) {
    const nodeData = this.nodeManager.nodes.get(nodeId);
    if (!nodeData) return '';
    
    const nodeType = nodeData.nodeType;
    
    // For output nodes, get the input and generate its equation
    if (nodeType === 'output') {
      const inputConnection = this.connectionSystem.getAllConnections().find(conn => 
        conn.to === nodeId && conn.toPortIndex === 0
      );
      
      if (inputConnection) {
        return this.generateEquationFromNode(inputConnection.from);
      } else {
        return '(no input)';
      }
    }
    
    // For source nodes (constants, variables)
    if (nodeType === 'constant' || nodeType === 'variable') {
      return nodeData.content;
    }
    
    // For operator/function nodes, get inputs and combine them
    const inputs = this.getNodeInputs(nodeId);
    
    // Enhanced equation generation with n-ary operation support
    switch (nodeType) {
      case 'add':
        // N-ary addition: supports 2+ inputs based on mathematical research
        if (inputs.length === 0) return '(no inputs)';
        if (inputs.length === 1) return inputs[0] || '?';
        const addTerms = inputs.map(input => input || '?');
        return `(${addTerms.join(' + ')})`;
        
      case 'multiply':
        // N-ary multiplication: supports 2+ inputs based on mathematical research
        if (inputs.length === 0) return '(no inputs)';
        if (inputs.length === 1) return inputs[0] || '?';
        const multiplyTerms = inputs.map(input => input || '?');
        return `(${multiplyTerms.join(' × ')})`;
        
      case 'subtract':
        // Binary operation only - mathematically constrained
        return `(${inputs[0] || '?'} - ${inputs[1] || '?'})`;
        
      case 'divide':
        // Binary operation only - mathematically constrained
        return `(${inputs[0] || '?'} ÷ ${inputs[1] || '?'})`;
        
      case 'power':
        // Binary operation only - right-associative by convention
        return `(${inputs[0] || '?'})^(${inputs[1] || '?'})`;
        
      case 'sin':
        return `sin(${inputs[0] || '?'})`;
      case 'cos':
        return `cos(${inputs[0] || '?'})`;
      case 'tan':
        return `tan(${inputs[0] || '?'})`;
      case 'sqrt':
        return `√(${inputs[0] || '?'})`;
      case 'log':
        return `log(${inputs[0] || '?'})`;
      case 'ln':
        return `ln(${inputs[0] || '?'})`;
      default:
        return nodeData.content;
    }
  }
  
  /**
   * Get the inputs connected to a specific node
   * Enhanced to support dynamic input configurations
   * @param {string} nodeId - The node ID to get inputs for
   * @returns {Array} Array of input expressions
   */
  getNodeInputs(nodeId) {
    const nodeData = this.nodeManager.nodes.get(nodeId);
    if (!nodeData) return [];
    
    // Use dynamic input count for configurable nodes
    const inputCount = this.getInputCountForNode(nodeId);
    const inputs = new Array(inputCount).fill(null);
    
    // Find connections to this node's input ports
    this.connectionSystem.getAllConnections().forEach(conn => {
      if (conn.to === nodeId && conn.toPortIndex < inputCount) {
        inputs[conn.toPortIndex] = this.generateEquationFromNode(conn.from);
      }
    });
    
    return inputs;
  }
  
  /**
   * Generate a formatted equation with proper mathematical notation
   * @param {string} nodeId - The root node to generate from
   * @param {Object} options - Formatting options
   * @returns {string} Formatted mathematical expression
   */
  generateFormattedEquation(nodeId, options = {}) {
    const {
      useUnicode = true,
      showParentheses = true,
      precision = null
    } = options;
    
    let equation = this.generateEquationFromNode(nodeId);
    
    if (!useUnicode) {
      equation = equation
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/√/g, 'sqrt');
    }
    
    if (!showParentheses) {
      // Remove unnecessary parentheses (basic implementation)
      equation = equation.replace(/^\((.*)\)$/, '$1');
    }
    
    return equation;
  }
  
  /**
   * Validate an equation for mathematical correctness
   * @param {string} nodeId - The node to validate
   * @returns {Object} Validation result with errors
   */
  validateEquation(nodeId) {
    const errors = [];
    const warnings = [];
    
    try {
      const equation = this.generateEquationFromNode(nodeId);
      
      // Check for missing inputs
      if (equation.includes('?')) {
        errors.push('Equation contains unconnected inputs (?)');
      }
      
      // Check for circular references (would cause infinite recursion)
      const visited = new Set();
      if (this.hasCircularReference(nodeId, visited)) {
        errors.push('Equation contains circular references');
      }
      
      // Check for division by zero possibilities
      if (equation.includes('÷ 0') || equation.includes('÷ (0)')) {
        warnings.push('Equation may contain division by zero');
      }
      
    } catch (error) {
      errors.push(`Equation generation error: ${error.message}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Check for circular references in equation graph
   * @param {string} nodeId - Current node being checked
   * @param {Set} visited - Set of visited nodes
   * @returns {boolean} True if circular reference found
   */
  hasCircularReference(nodeId, visited = new Set()) {
    if (visited.has(nodeId)) {
      return true;
    }
    
    visited.add(nodeId);
    
    const inputs = this.getNodeInputConnections(nodeId);
    for (const inputNodeId of inputs) {
      if (this.hasCircularReference(inputNodeId, new Set(visited))) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get node IDs that are connected as inputs to the specified node
   * @param {string} nodeId - The node to get input connections for
   * @returns {Array} Array of input node IDs
   */
  getNodeInputConnections(nodeId) {
    const inputNodes = [];
    
    this.connectionSystem.getAllConnections().forEach(conn => {
      if (conn.to === nodeId) {
        inputNodes.push(conn.from);
      }
    });
    
    return inputNodes;
  }
  
  /**
   * Export equation data for saving/loading
   * @returns {Object} Equation generator state
   */
  exportEquationState() {
    const outputNodes = [];
    this.nodeManager.nodes.forEach((nodeObj, nodeId) => {
      if (nodeObj.nodeType === 'output') {
        outputNodes.push({
          nodeId,
          equation: this.generateEquationFromNode(nodeId),
          validation: this.validateEquation(nodeId)
        });
      }
    });
    
    return {
      outputNodes,
      totalNodes: this.nodeManager.nodes.size,
      totalConnections: this.connectionSystem.getAllConnections().length,
      generatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Get comprehensive equation statistics
   * @returns {Object} Statistics about generated equations
   */
  getEquationStats() {
    const stats = {
      totalNodes: this.nodeManager.nodes.size,
      nodeTypes: {},
      outputNodes: 0,
      validEquations: 0,
      totalConnections: this.connectionSystem.getAllConnections().length,
      complexity: 0
    };
    
    // Analyze node types
    this.nodeManager.nodes.forEach((nodeObj, nodeId) => {
      const type = nodeObj.nodeType;
      stats.nodeTypes[type] = (stats.nodeTypes[type] || 0) + 1;
      
      if (type === 'output') {
        stats.outputNodes++;
        const validation = this.validateEquation(nodeId);
        if (validation.isValid) {
          stats.validEquations++;
        }
        // Complexity based on equation length (rough measure)
        const equation = this.generateEquationFromNode(nodeId);
        stats.complexity += equation.length;
      }
    });
    
    return stats;
  }
  
  /**
   * Clear all equation output
   */
  clearEquationOutput() {
    this.equationOutput.innerHTML = '<em>Canvas cleared - add nodes to begin...</em>';
  }
  
  /**
   * Export current equation to clipboard
   * @returns {Promise} Promise resolving to export success
   */
  async exportEquationToClipboard() {
    const equation = this.equationOutput.textContent;
    if (equation && !equation.includes('Click buttons')) {
      try {
        await navigator.clipboard.writeText(equation);
        return { success: true, message: 'Equation copied to clipboard!' };
      } catch (error) {
        return { success: false, message: 'Could not copy to clipboard. Please copy the text manually.' };
      }
    } else {
      return { success: false, message: 'No equation to export. Add some nodes first!' };
    }
  }
}
