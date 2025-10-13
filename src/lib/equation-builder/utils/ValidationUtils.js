/**
 * Validation Utilities for Equation Builder
 * 
 * This module provides validation functions for different types of inputs
 * and user interactions in the equation builder.
 */

import { MATH_CONSTANTS, isValidVariableName, isValidConstant } from './NodeTypes.js';

/**
 * Validation result structure
 */
export class ValidationResult {
  constructor(isValid, value = null, error = null, sanitizedValue = null) {
    this.isValid = isValid;
    this.value = value;
    this.error = error;
    this.sanitizedValue = sanitizedValue || value;
  }
}

/**
 * Validate and sanitize constant input
 */
export function validateConstant(input, constantType = 'number') {
  if (!input || typeof input !== 'string') {
    return new ValidationResult(false, input, 'Input is required');
  }

  const trimmed = input.trim();
  
  switch (constantType) {
    case 'number':
      const num = parseFloat(trimmed);
      if (isNaN(num) || !isFinite(num)) {
        return new ValidationResult(false, input, 'Please enter a valid number');
      }
      return new ValidationResult(true, input, null, num.toString());
      
    case 'pi':
      return new ValidationResult(true, 'π', null, 'π');
      
    case 'e':
      return new ValidationResult(true, 'e', null, 'e');
      
    case 'custom':
      // Allow custom mathematical constants or expressions
      if (MATH_CONSTANTS[trimmed]) {
        return new ValidationResult(true, input, null, MATH_CONSTANTS[trimmed]);
      }
      
      // Check if it's a valid number
      const customNum = parseFloat(trimmed);
      if (!isNaN(customNum) && isFinite(customNum)) {
        return new ValidationResult(true, input, null, customNum.toString());
      }
      
      // Allow custom constant names (letters and numbers)
      if (/^[a-zA-Zα-ωΑ-Ωθ][a-zA-Z0-9α-ωΑ-Ωθ_]*$/.test(trimmed)) {
        return new ValidationResult(true, input, null, trimmed);
      }
      
      return new ValidationResult(false, input, 'Custom constant must be a number or valid identifier');
      
    default:
      return new ValidationResult(false, input, 'Unknown constant type');
  }
}

/**
 * Validate and sanitize variable name
 */
export function validateVariable(input) {
  if (!input || typeof input !== 'string') {
    return new ValidationResult(false, input, 'Variable name is required');
  }

  const trimmed = input.trim();
  
  if (trimmed.length === 0) {
    return new ValidationResult(false, input, 'Variable name cannot be empty');
  }

  if (trimmed.length > 20) {
    return new ValidationResult(false, input, 'Variable name is too long (max 20 characters)');
  }

  if (!isValidVariableName(trimmed)) {
    return new ValidationResult(
      false, 
      input, 
      'Variable names should start with a letter and contain only letters, numbers, or Greek letters'
    );
  }

  return new ValidationResult(true, input, null, trimmed);
}

/**
 * Validate node connection
 */
export function validateConnection(fromNodeId, toNodeId, fromPortIndex, toPortIndex, nodes, connections) {
  // Check if nodes exist
  const fromNode = nodes.get(fromNodeId);
  const toNode = nodes.get(toNodeId);
  
  if (!fromNode) {
    return new ValidationResult(false, null, 'Source node not found');
  }
  
  if (!toNode) {
    return new ValidationResult(false, null, 'Target node not found');
  }

  // Prevent self-connection
  if (fromNodeId === toNodeId) {
    return new ValidationResult(false, null, 'Cannot connect node to itself');
  }

  // Check for existing connection to the same input port
  const existingConnection = connections.find(conn => 
    conn.to === toNodeId && conn.toPortIndex === toPortIndex
  );
  
  if (existingConnection) {
    return new ValidationResult(false, null, 'Input port already has a connection');
  }

  // Check for circular dependencies (basic check)
  if (wouldCreateCircularDependency(fromNodeId, toNodeId, connections)) {
    return new ValidationResult(false, null, 'Connection would create a circular dependency');
  }

  return new ValidationResult(true, { fromNodeId, toNodeId, fromPortIndex, toPortIndex });
}

/**
 * Check if a connection would create a circular dependency
 */
function wouldCreateCircularDependency(fromNodeId, toNodeId, connections) {
  // Simple check: see if toNode eventually connects back to fromNode
  const visited = new Set();
  
  function hasPath(currentId, targetId) {
    if (currentId === targetId) return true;
    if (visited.has(currentId)) return false;
    
    visited.add(currentId);
    
    // Find all nodes that currentId connects to
    const outgoingConnections = connections.filter(conn => conn.from === currentId);
    
    for (const conn of outgoingConnections) {
      if (hasPath(conn.to, targetId)) {
        return true;
      }
    }
    
    return false;
  }
  
  return hasPath(toNodeId, fromNodeId);
}

/**
 * Validate equation generation input
 */
export function validateEquationGeneration(nodeId, nodes, connections) {
  const node = nodes.get(nodeId);
  
  if (!node) {
    return new ValidationResult(false, null, 'Node not found');
  }

  if (node.nodeType !== 'output') {
    return new ValidationResult(false, null, 'Only output nodes can generate equations');
  }

  // Check if the output node has any input connections
  const inputConnections = connections.filter(conn => conn.to === nodeId);
  
  if (inputConnections.length === 0) {
    return new ValidationResult(false, null, 'Output node has no input connections');
  }

  return new ValidationResult(true, nodeId);
}

/**
 * Validate color selection
 */
export function validateColor(backgroundColor, borderColor) {
  // Basic hex color validation
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  
  if (!hexPattern.test(backgroundColor)) {
    return new ValidationResult(false, backgroundColor, 'Invalid background color format');
  }
  
  if (!hexPattern.test(borderColor)) {
    return new ValidationResult(false, borderColor, 'Invalid border color format');
  }
  
  return new ValidationResult(true, { backgroundColor, borderColor });
}

/**
 * Sanitize user input for display
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  // Remove potentially dangerous characters
  return input
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove HTML special characters
    .substring(0, 100); // Limit length
}

/**
 * Validate node position
 */
export function validateNodePosition(x, y, canvasBounds = null) {
  if (typeof x !== 'number' || typeof y !== 'number') {
    return new ValidationResult(false, { x, y }, 'Position coordinates must be numbers');
  }
  
  if (!isFinite(x) || !isFinite(y)) {
    return new ValidationResult(false, { x, y }, 'Position coordinates must be finite numbers');
  }
  
  if (canvasBounds) {
    const margin = 50; // Minimum margin from canvas edges
    
    if (x < margin || y < margin) {
      return new ValidationResult(false, { x, y }, 'Node too close to canvas edge');
    }
    
    if (x > canvasBounds.width - margin || y > canvasBounds.height - margin) {
      return new ValidationResult(false, { x, y }, 'Node outside canvas bounds');
    }
  }
  
  return new ValidationResult(true, { x, y });
}

/**
 * Batch validation for multiple inputs
 */
export function validateBatch(validations) {
  const results = [];
  let allValid = true;
  
  for (const validation of validations) {
    const result = validation();
    results.push(result);
    if (!result.isValid) {
      allValid = false;
    }
  }
  
  return {
    allValid,
    results,
    errors: results.filter(r => !r.isValid).map(r => r.error)
  };
}
