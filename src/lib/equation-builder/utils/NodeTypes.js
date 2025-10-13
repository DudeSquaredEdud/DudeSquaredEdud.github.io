/**
 * Node Type Definitions and Configurations
 * 
 * This module defines all node types, their properties, and configurations
 * for the equation builder system.
 */

export const NODE_TYPES = {
  // Mathematical Operators
  OPERATOR: {
    ADD: {
      symbol: '+',
      name: 'Addition',
      inputCount: 2,
      outputCount: 1,
      category: 'operator',
      description: 'Adds two numbers together',
      // Advanced Configuration - Research-based enhancement
      configurable: true,
      minInputs: 2,
      maxInputs: 8,
      commutative: true,
      associative: true,
      equationPattern: 'reduce', // Special handling for n-ary operations
      mathematicalNote: 'Commutative and associative - supports n inputs'
    },
    SUBTRACT: {
      symbol: '−',
      name: 'Subtraction', 
      inputCount: 2,
      outputCount: 1,
      category: 'operator',
      description: 'Subtracts the second number from the first',
      // Mathematical constraint - non-commutative
      configurable: false,
      minInputs: 2,
      maxInputs: 2,
      commutative: false,
      associative: false,
      equationPattern: 'binary', // Fixed binary operation
      mathematicalNote: 'Non-associative - must remain binary operation'
    },
    MULTIPLY: {
      symbol: '×',
      name: 'Multiplication',
      inputCount: 2,
      outputCount: 1,
      category: 'operator',
      description: 'Multiplies two numbers together',
      // Advanced Configuration - Research-based enhancement
      configurable: true,
      minInputs: 2,
      maxInputs: 8,
      commutative: true,
      associative: true,
      equationPattern: 'reduce', // Special handling for n-ary operations
      mathematicalNote: 'Commutative and associative - supports n inputs'
    },
    DIVIDE: {
      symbol: '÷',
      name: 'Division',
      inputCount: 2,
      outputCount: 1,
      category: 'operator',
      description: 'Divides the first number by the second',
      // Mathematical constraint - non-commutative
      configurable: false,
      minInputs: 2,
      maxInputs: 2,
      commutative: false,
      associative: false,
      equationPattern: 'binary', // Fixed binary operation
      mathematicalNote: 'Non-associative - must remain binary operation'
    },
    POWER: {
      symbol: '^',
      name: 'Exponentiation',
      inputCount: 2,
      outputCount: 1,
      category: 'operator',
      description: 'Raises the first number to the power of the second',
      // Mathematical constraint - right-associative only
      configurable: false,
      minInputs: 2,
      maxInputs: 2,
      commutative: false,
      associative: false,
      equationPattern: 'binary', // Fixed binary operation
      mathematicalNote: 'Right-associative by convention - must remain binary'
    }
  },

  // Mathematical Functions
  FUNCTION: {
    SIN: {
      symbol: 'sin',
      name: 'Sine',
      inputCount: 1,
      outputCount: 1,
      category: 'function',
      description: 'Calculates the sine of an angle'
    },
    COS: {
      symbol: 'cos',
      name: 'Cosine',
      inputCount: 1,
      outputCount: 1,
      category: 'function',
      description: 'Calculates the cosine of an angle'
    },
    TAN: {
      symbol: 'tan',
      name: 'Tangent',
      inputCount: 1,
      outputCount: 1,
      category: 'function',
      description: 'Calculates the tangent of an angle'
    },
    SQRT: {
      symbol: '√',
      name: 'Square Root',
      inputCount: 1,
      outputCount: 1,
      category: 'function',
      description: 'Calculates the square root of a number'
    },
    LOG: {
      symbol: 'log',
      name: 'Logarithm',
      inputCount: 1,
      outputCount: 1,
      category: 'function',
      description: 'Calculates the natural logarithm'
    }
  },

  // Constants and Variables
  CONSTANT: {
    NUMBER: {
      symbol: '1',
      name: 'Number Constant',
      inputCount: 0,
      outputCount: 1,
      category: 'constant',
      description: 'A numerical constant value',
      defaultValue: '1'
    },
    PI: {
      symbol: 'π',
      name: 'Pi',
      inputCount: 0,
      outputCount: 1,
      category: 'constant',
      description: 'The mathematical constant pi (3.14159...)',
      defaultValue: 'π'
    },
    E: {
      symbol: 'e',
      name: 'Euler\'s Number',
      inputCount: 0,
      outputCount: 1,
      category: 'constant',
      description: 'Euler\'s number (2.71828...)',
      defaultValue: 'e'
    }
  },

  VARIABLE: {
    X: {
      symbol: 'x',
      name: 'Variable X',
      inputCount: 0,
      outputCount: 1,
      category: 'variable',
      description: 'Mathematical variable x',
      defaultValue: 'x'
    },
    Y: {
      symbol: 'y',
      name: 'Variable Y',
      inputCount: 0,
      outputCount: 1,
      category: 'variable', 
      description: 'Mathematical variable y',
      defaultValue: 'y'
    },
    GENERIC: {
      symbol: 'var',
      name: 'Generic Variable',
      inputCount: 0,
      outputCount: 1,
      category: 'variable',
      description: 'A customizable variable',
      defaultValue: 'x'
    }
  },

  // Special Nodes
  OUTPUT: {
    symbol: '=',
    name: 'Output',
    inputCount: 1,
    outputCount: 0,
    category: 'output',
    description: 'Displays the final equation result'
  }
};

/**
 * Color schemes for different node categories
 */
export const NODE_COLORS = {
  operator: {
    background: '#e0e7ff',
    border: '#3b82f6',
    text: '#1e40af'
  },
  function: {
    background: '#d1fae5',
    border: '#10b981',
    text: '#047857'
  },
  constant: {
    background: '#fef3c7',
    border: '#f59e0b',
    text: '#d97706'
  },
  variable: {
    background: '#fee2e2',
    border: '#ef4444',
    text: '#dc2626'
  },
  output: {
    background: '#e9d5ff',
    border: '#8b5cf6',
    text: '#7c3aed'
  }
};

/**
 * Available color options for user customization
 */
export const AVAILABLE_COLORS = [
  { name: 'Blue', bg: '#e0e7ff', border: '#3b82f6' },
  { name: 'Green', bg: '#d1fae5', border: '#10b981' },
  { name: 'Red', bg: '#fee2e2', border: '#ef4444' },
  { name: 'Yellow', bg: '#fef3c7', border: '#f59e0b' },
  { name: 'Purple', bg: '#e9d5ff', border: '#8b5cf6' },
  { name: 'Pink', bg: '#fce7f3', border: '#ec4899' }
];

/**
 * Common mathematical constants
 */
export const MATH_CONSTANTS = {
  π: 'π',
  pi: 'π',
  e: 'e',
  euler: 'e'
};

/**
 * Common variable names with descriptions
 */
export const COMMON_VARIABLES = [
  { symbol: 'x', description: 'Independent variable' },
  { symbol: 'y', description: 'Dependent variable' },
  { symbol: 'z', description: 'Third variable' },
  { symbol: 't', description: 'Time variable' },
  { symbol: 'n', description: 'Count/index variable' },
  { symbol: 'θ', description: 'Angle variable (theta)' },
  { symbol: 'α', description: 'Angle variable (alpha)' },
  { symbol: 'β', description: 'Angle variable (beta)' }
];

/**
 * Get node configuration by type and subtype
 */
export function getNodeConfig(category, type = null) {
  if (!category || typeof category !== 'string') {
    return undefined;
  }
  
  if (type) {
    return NODE_TYPES[category.toUpperCase()]?.[type.toUpperCase()];
  }
  return NODE_TYPES[category.toUpperCase()];
}

/**
 * Get default color for a node category
 */
export function getNodeColor(category) {
  if (!category || typeof category !== 'string') {
    return NODE_COLORS.operator;
  }
  return NODE_COLORS[category.toLowerCase()] || NODE_COLORS.operator;
}

/**
 * Enhanced Node Configuration Utilities - Research-Based Implementation
 */

/**
 * Check if a node type supports dynamic input configuration
 * Based on mathematical operator research and commutativity analysis
 */
export function isConfigurableNode(nodeType) {
  const typeMapping = {
    'add': true,      // Commutative and associative
    'multiply': true, // Commutative and associative  
    'subtract': false, // Non-commutative - must remain binary
    'divide': false,   // Non-commutative - must remain binary
    'power': false,    // Right-associative only - must remain binary
    'sin': false,      // Functions are fixed input
    'cos': false,
    'tan': false,
    'sqrt': false,
    'log': false,
    'constant': false,
    'variable': false,
    'output': false
  };
  
  return typeMapping[nodeType] || false;
}

/**
 * Get input count constraints for a node type
 * Returns {min, max, default} based on mathematical properties
 */
export function getInputConstraints(nodeType) {
  const constraints = {
    'add': { min: 2, max: 8, default: 2 },
    'multiply': { min: 2, max: 8, default: 2 },
    'subtract': { min: 2, max: 2, default: 2 },
    'divide': { min: 2, max: 2, default: 2 },
    'power': { min: 2, max: 2, default: 2 },
    'sin': { min: 1, max: 1, default: 1 },
    'cos': { min: 1, max: 1, default: 1 },
    'tan': { min: 1, max: 1, default: 1 },
    'sqrt': { min: 1, max: 1, default: 1 },
    'log': { min: 1, max: 1, default: 1 },
    'constant': { min: 0, max: 0, default: 0 },
    'variable': { min: 0, max: 0, default: 0 },
    'output': { min: 1, max: 1, default: 1 }
  };
  
  return constraints[nodeType] || { min: 0, max: 0, default: 0 };
}

/**
 * Get mathematical properties of a node type for equation generation
 */
export function getMathematicalProperties(nodeType) {
  const properties = {
    'add': { 
      commutative: true, 
      associative: true, 
      identity: 0,
      operation: 'sum',
      symbol: '+' 
    },
    'multiply': { 
      commutative: true, 
      associative: true, 
      identity: 1,
      operation: 'product',
      symbol: '×' 
    },
    'subtract': { 
      commutative: false, 
      associative: false, 
      operation: 'difference',
      symbol: '−' 
    },
    'divide': { 
      commutative: false, 
      associative: false, 
      operation: 'quotient',
      symbol: '÷' 
    },
    'power': { 
      commutative: false, 
      associative: false, 
      operation: 'exponentiation',
      symbol: '^' 
    }
  };
  
  return properties[nodeType] || null;
}

/**
 * Determine node type from content
 */
export function getNodeTypeFromContent(content) {
  // Check if it's a mathematical constant
  if (MATH_CONSTANTS[content]) {
    return 'constant';
  }
  
  // Check if it's a number
  if (!isNaN(parseFloat(content)) && isFinite(content)) {
    return 'constant';
  }
  
  // Check if it's an operator
  const operators = ['+', '−', '×', '÷', '^'];
  if (operators.includes(content)) {
    return 'operator';
  }
  
  // Check if it's a function
  const functions = ['sin', 'cos', 'tan', '√', 'log'];
  if (functions.includes(content)) {
    return 'function';
  }
  
  // Check if it's output
  if (content === '=') {
    return 'output';
  }
  
  // Default to variable
  return 'variable';
}

/**
 * Validate variable name
 */
export function isValidVariableName(name) {
  return /^[a-zA-Zα-ωΑ-Ωθ][a-zA-Z0-9α-ωΑ-Ωθ]*$/.test(name);
}

/**
 * Validate constant value
 */
export function isValidConstant(value) {
  // Check if it's a known mathematical constant
  if (MATH_CONSTANTS[value]) {
    return true;
  }
  
  // Check if it's a valid number
  return !isNaN(parseFloat(value)) && isFinite(value);
}
