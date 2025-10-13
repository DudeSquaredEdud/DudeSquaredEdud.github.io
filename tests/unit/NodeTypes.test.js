/**
 * NodeTypes.js Comprehensive Test Suite
 * 
 * This test suite validates all node type definitions, utility functions,
 * and mathematical properties that form the foundation of the equation builder.
 * 
 * Coverage focus:
 * - Node type configurations and properties
 * - Dynamic input constraint logic
 * - Mathematical property definitions
 * - Node configuration utilities
 * - Validation functions
 * - Edge cases and error conditions
 */

import { describe, test, expect } from 'vitest';
import {
  NODE_TYPES,
  NODE_COLORS,
  AVAILABLE_COLORS,
  MATH_CONSTANTS,
  COMMON_VARIABLES,
  getNodeConfig,
  getNodeColor,
  isConfigurableNode,
  getInputConstraints,
  getMathematicalProperties,
  getNodeTypeFromContent,
  isValidVariableName,
  isValidConstant
} from '../../src/lib/equation-builder/utils/NodeTypes.js';

describe('NodeTypes - Core Data Structures', () => {
  
  describe('NODE_TYPES structure validation', () => {
    test('should have all main categories', () => {
      expect(NODE_TYPES).toHaveProperty('OPERATOR');
      expect(NODE_TYPES).toHaveProperty('FUNCTION');
      expect(NODE_TYPES).toHaveProperty('CONSTANT');
      expect(NODE_TYPES).toHaveProperty('VARIABLE');
      expect(NODE_TYPES).toHaveProperty('OUTPUT');
    });

    test('should have complete operator definitions', () => {
      const operators = NODE_TYPES.OPERATOR;
      
      // Validate all 5 operators exist
      expect(operators).toHaveProperty('ADD');
      expect(operators).toHaveProperty('SUBTRACT');
      expect(operators).toHaveProperty('MULTIPLY');
      expect(operators).toHaveProperty('DIVIDE');
      expect(operators).toHaveProperty('POWER');
      
      // Each operator should have required properties
      Object.values(operators).forEach(op => {
        expect(op).toHaveProperty('symbol');
        expect(op).toHaveProperty('name');
        expect(op).toHaveProperty('inputCount');
        expect(op).toHaveProperty('outputCount');
        expect(op).toHaveProperty('category');
        expect(op).toHaveProperty('description');
        expect(op.category).toBe('operator');
        expect(op.outputCount).toBe(1);
      });
    });

    test('should have mathematical operator properties correctly configured', () => {
      const { ADD, MULTIPLY, SUBTRACT, DIVIDE, POWER } = NODE_TYPES.OPERATOR;
      
      // Commutative and associative operations (n-ary capable)
      expect(ADD.configurable).toBe(true);
      expect(ADD.commutative).toBe(true);
      expect(ADD.associative).toBe(true);
      expect(ADD.maxInputs).toBe(8);
      expect(ADD.equationPattern).toBe('reduce');
      
      expect(MULTIPLY.configurable).toBe(true);
      expect(MULTIPLY.commutative).toBe(true);
      expect(MULTIPLY.associative).toBe(true);
      expect(MULTIPLY.maxInputs).toBe(8);
      expect(MULTIPLY.equationPattern).toBe('reduce');
      
      // Non-commutative operations (binary only)
      expect(SUBTRACT.configurable).toBe(false);
      expect(SUBTRACT.commutative).toBe(false);
      expect(SUBTRACT.associative).toBe(false);
      expect(SUBTRACT.maxInputs).toBe(2);
      expect(SUBTRACT.equationPattern).toBe('binary');
      
      expect(DIVIDE.configurable).toBe(false);
      expect(DIVIDE.commutative).toBe(false);
      expect(DIVIDE.associative).toBe(false);
      expect(DIVIDE.maxInputs).toBe(2);
      expect(DIVIDE.equationPattern).toBe('binary');
      
      expect(POWER.configurable).toBe(false);
      expect(POWER.commutative).toBe(false);
      expect(POWER.associative).toBe(false);
      expect(POWER.maxInputs).toBe(2);
      expect(POWER.equationPattern).toBe('binary');
    });

    test('should have complete function definitions', () => {
      const functions = NODE_TYPES.FUNCTION;
      
      expect(functions).toHaveProperty('SIN');
      expect(functions).toHaveProperty('COS');
      expect(functions).toHaveProperty('TAN');
      expect(functions).toHaveProperty('SQRT');
      expect(functions).toHaveProperty('LOG');
      
      // All functions should be single-input, single-output
      Object.values(functions).forEach(func => {
        expect(func.inputCount).toBe(1);
        expect(func.outputCount).toBe(1);
        expect(func.category).toBe('function');
      });
    });

    test('should have complete constant definitions', () => {
      const constants = NODE_TYPES.CONSTANT;
      
      expect(constants).toHaveProperty('NUMBER');
      expect(constants).toHaveProperty('PI');
      expect(constants).toHaveProperty('E');
      
      // All constants should have no inputs, one output
      Object.values(constants).forEach(constant => {
        expect(constant.inputCount).toBe(0);
        expect(constant.outputCount).toBe(1);
        expect(constant.category).toBe('constant');
        expect(constant).toHaveProperty('defaultValue');
      });
    });

    test('should have complete variable definitions', () => {
      const variables = NODE_TYPES.VARIABLE;
      
      expect(variables).toHaveProperty('X');
      expect(variables).toHaveProperty('Y');
      expect(variables).toHaveProperty('GENERIC');
      
      // All variables should have no inputs, one output
      Object.values(variables).forEach(variable => {
        expect(variable.inputCount).toBe(0);
        expect(variable.outputCount).toBe(1);
        expect(variable.category).toBe('variable');
        expect(variable).toHaveProperty('defaultValue');
      });
    });

    test('should have output node definition', () => {
      const output = NODE_TYPES.OUTPUT;
      
      expect(output.symbol).toBe('=');
      expect(output.name).toBe('Output');
      expect(output.inputCount).toBe(1);
      expect(output.outputCount).toBe(0);
      expect(output.category).toBe('output');
    });
  });

  describe('NODE_COLORS validation', () => {
    test('should have colors for all categories', () => {
      expect(NODE_COLORS).toHaveProperty('operator');
      expect(NODE_COLORS).toHaveProperty('function');
      expect(NODE_COLORS).toHaveProperty('constant');
      expect(NODE_COLORS).toHaveProperty('variable');
      expect(NODE_COLORS).toHaveProperty('output');
    });

    test('should have complete color definitions', () => {
      Object.values(NODE_COLORS).forEach(colorScheme => {
        expect(colorScheme).toHaveProperty('background');
        expect(colorScheme).toHaveProperty('border');
        expect(colorScheme).toHaveProperty('text');
        
        // Should be valid hex colors
        expect(colorScheme.background).toMatch(/^#[0-9a-f]{6}$/i);
        expect(colorScheme.border).toMatch(/^#[0-9a-f]{6}$/i);
        expect(colorScheme.text).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('Constants and variables data', () => {
    test('should have math constants properly defined', () => {
      expect(MATH_CONSTANTS).toHaveProperty('π');
      expect(MATH_CONSTANTS).toHaveProperty('pi');
      expect(MATH_CONSTANTS).toHaveProperty('e');
      expect(MATH_CONSTANTS).toHaveProperty('euler');
      
      expect(MATH_CONSTANTS.π).toBe('π');
      expect(MATH_CONSTANTS.pi).toBe('π');
      expect(MATH_CONSTANTS.e).toBe('e');
      expect(MATH_CONSTANTS.euler).toBe('e');
    });

    test('should have common variables list', () => {
      expect(Array.isArray(COMMON_VARIABLES)).toBe(true);
      expect(COMMON_VARIABLES.length).toBeGreaterThan(0);
      
      COMMON_VARIABLES.forEach(variable => {
        expect(variable).toHaveProperty('symbol');
        expect(variable).toHaveProperty('description');
        expect(typeof variable.symbol).toBe('string');
        expect(typeof variable.description).toBe('string');
      });
    });

    test('should have available colors for customization', () => {
      expect(Array.isArray(AVAILABLE_COLORS)).toBe(true);
      expect(AVAILABLE_COLORS.length).toBeGreaterThan(0);
      
      AVAILABLE_COLORS.forEach(color => {
        expect(color).toHaveProperty('name');
        expect(color).toHaveProperty('bg');
        expect(color).toHaveProperty('border');
        expect(color.bg).toMatch(/^#[0-9a-f]{6}$/i);
        expect(color.border).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });
});

describe('NodeTypes - Utility Functions', () => {
  
  describe('getNodeConfig function', () => {
    test('should return complete category when type not specified', () => {
      const operators = getNodeConfig('operator');
      expect(operators).toEqual(NODE_TYPES.OPERATOR);
      
      const functions = getNodeConfig('function');
      expect(functions).toEqual(NODE_TYPES.FUNCTION);
    });

    test('should return specific node config when both category and type specified', () => {
      const addConfig = getNodeConfig('operator', 'add');
      expect(addConfig).toEqual(NODE_TYPES.OPERATOR.ADD);
      
      const sinConfig = getNodeConfig('function', 'sin');
      expect(sinConfig).toEqual(NODE_TYPES.FUNCTION.SIN);
    });

    test('should handle case-insensitive input', () => {
      const addConfig1 = getNodeConfig('OPERATOR', 'ADD');
      const addConfig2 = getNodeConfig('operator', 'add');
      const addConfig3 = getNodeConfig('Operator', 'Add');
      
      expect(addConfig1).toEqual(addConfig2);
      expect(addConfig2).toEqual(addConfig3);
    });

    test('should return undefined for invalid categories or types', () => {
      expect(getNodeConfig('invalid')).toBeUndefined();
      expect(getNodeConfig('operator', 'invalid')).toBeUndefined();
      expect(getNodeConfig('invalid', 'add')).toBeUndefined();
    });
  });

  describe('getNodeColor function', () => {
    test('should return correct colors for valid categories', () => {
      expect(getNodeColor('operator')).toEqual(NODE_COLORS.operator);
      expect(getNodeColor('function')).toEqual(NODE_COLORS.function);
      expect(getNodeColor('constant')).toEqual(NODE_COLORS.constant);
      expect(getNodeColor('variable')).toEqual(NODE_COLORS.variable);
      expect(getNodeColor('output')).toEqual(NODE_COLORS.output);
    });

    test('should handle case variations', () => {
      expect(getNodeColor('OPERATOR')).toEqual(NODE_COLORS.operator);
      expect(getNodeColor('Operator')).toEqual(NODE_COLORS.operator);
    });

    test('should return default operator color for invalid categories', () => {
      expect(getNodeColor('invalid')).toEqual(NODE_COLORS.operator);
      expect(getNodeColor('')).toEqual(NODE_COLORS.operator);
      expect(getNodeColor(null)).toEqual(NODE_COLORS.operator);
    });
  });
});

describe('NodeTypes - Mathematical Configuration Functions', () => {
  
  describe('isConfigurableNode function', () => {
    test('should return true for commutative and associative operators', () => {
      expect(isConfigurableNode('add')).toBe(true);
      expect(isConfigurableNode('multiply')).toBe(true);
    });

    test('should return false for non-commutative operators', () => {
      expect(isConfigurableNode('subtract')).toBe(false);
      expect(isConfigurableNode('divide')).toBe(false);
      expect(isConfigurableNode('power')).toBe(false);
    });

    test('should return false for functions', () => {
      expect(isConfigurableNode('sin')).toBe(false);
      expect(isConfigurableNode('cos')).toBe(false);
      expect(isConfigurableNode('tan')).toBe(false);
      expect(isConfigurableNode('sqrt')).toBe(false);
      expect(isConfigurableNode('log')).toBe(false);
    });

    test('should return false for constants, variables, and output', () => {
      expect(isConfigurableNode('constant')).toBe(false);
      expect(isConfigurableNode('variable')).toBe(false);
      expect(isConfigurableNode('output')).toBe(false);
    });

    test('should return false for unknown node types', () => {
      expect(isConfigurableNode('unknown')).toBe(false);
      expect(isConfigurableNode('')).toBe(false);
      expect(isConfigurableNode(null)).toBe(false);
    });
  });

  describe('getInputConstraints function', () => {
    test('should return correct constraints for n-ary operations', () => {
      const addConstraints = getInputConstraints('add');
      expect(addConstraints).toEqual({ min: 2, max: 8, default: 2 });
      
      const multiplyConstraints = getInputConstraints('multiply');
      expect(multiplyConstraints).toEqual({ min: 2, max: 8, default: 2 });
    });

    test('should return binary constraints for non-commutative operations', () => {
      const subtractConstraints = getInputConstraints('subtract');
      expect(subtractConstraints).toEqual({ min: 2, max: 2, default: 2 });
      
      const divideConstraints = getInputConstraints('divide');
      expect(divideConstraints).toEqual({ min: 2, max: 2, default: 2 });
      
      const powerConstraints = getInputConstraints('power');
      expect(powerConstraints).toEqual({ min: 2, max: 2, default: 2 });
    });

    test('should return single input constraints for functions', () => {
      ['sin', 'cos', 'tan', 'sqrt', 'log'].forEach(func => {
        const constraints = getInputConstraints(func);
        expect(constraints).toEqual({ min: 1, max: 1, default: 1 });
      });
    });

    test('should return no input constraints for constants and variables', () => {
      ['constant', 'variable'].forEach(type => {
        const constraints = getInputConstraints(type);
        expect(constraints).toEqual({ min: 0, max: 0, default: 0 });
      });
    });

    test('should return single input constraint for output', () => {
      const constraints = getInputConstraints('output');
      expect(constraints).toEqual({ min: 1, max: 1, default: 1 });
    });

    test('should return default (no inputs) for unknown types', () => {
      const constraints = getInputConstraints('unknown');
      expect(constraints).toEqual({ min: 0, max: 0, default: 0 });
    });
  });

  describe('getMathematicalProperties function', () => {
    test('should return correct properties for addition', () => {
      const addProps = getMathematicalProperties('add');
      expect(addProps).toEqual({
        commutative: true,
        associative: true,
        identity: 0,
        operation: 'sum',
        symbol: '+'
      });
    });

    test('should return correct properties for multiplication', () => {
      const multiplyProps = getMathematicalProperties('multiply');
      expect(multiplyProps).toEqual({
        commutative: true,
        associative: true,
        identity: 1,
        operation: 'product',
        symbol: '×'
      });
    });

    test('should return correct properties for non-commutative operations', () => {
      const subtractProps = getMathematicalProperties('subtract');
      expect(subtractProps).toEqual({
        commutative: false,
        associative: false,
        operation: 'difference',
        symbol: '−'
      });
      
      const divideProps = getMathematicalProperties('divide');
      expect(divideProps).toEqual({
        commutative: false,
        associative: false,
        operation: 'quotient',
        symbol: '÷'
      });
      
      const powerProps = getMathematicalProperties('power');
      expect(powerProps).toEqual({
        commutative: false,
        associative: false,
        operation: 'exponentiation',
        symbol: '^'
      });
    });

    test('should return null for functions and other types', () => {
      expect(getMathematicalProperties('sin')).toBeNull();
      expect(getMathematicalProperties('constant')).toBeNull();
      expect(getMathematicalProperties('variable')).toBeNull();
      expect(getMathematicalProperties('output')).toBeNull();
      expect(getMathematicalProperties('unknown')).toBeNull();
    });
  });
});

describe('NodeTypes - Content Analysis Functions', () => {
  
  describe('getNodeTypeFromContent function', () => {
    test('should detect mathematical constants', () => {
      expect(getNodeTypeFromContent('π')).toBe('constant');
      expect(getNodeTypeFromContent('pi')).toBe('constant');
      expect(getNodeTypeFromContent('e')).toBe('constant');
      expect(getNodeTypeFromContent('euler')).toBe('constant');
    });

    test('should detect numeric constants', () => {
      expect(getNodeTypeFromContent('42')).toBe('constant');
      expect(getNodeTypeFromContent('3.14159')).toBe('constant');
      expect(getNodeTypeFromContent('-5')).toBe('constant');
      expect(getNodeTypeFromContent('0')).toBe('constant');
      expect(getNodeTypeFromContent('1.5e10')).toBe('constant');
    });

    test('should detect operators', () => {
      expect(getNodeTypeFromContent('+')).toBe('operator');
      expect(getNodeTypeFromContent('−')).toBe('operator');
      expect(getNodeTypeFromContent('×')).toBe('operator');
      expect(getNodeTypeFromContent('÷')).toBe('operator');
      expect(getNodeTypeFromContent('^')).toBe('operator');
    });

    test('should detect functions', () => {
      expect(getNodeTypeFromContent('sin')).toBe('function');
      expect(getNodeTypeFromContent('cos')).toBe('function');
      expect(getNodeTypeFromContent('tan')).toBe('function');
      expect(getNodeTypeFromContent('√')).toBe('function');
      expect(getNodeTypeFromContent('log')).toBe('function');
    });

    test('should detect output node', () => {
      expect(getNodeTypeFromContent('=')).toBe('output');
    });

    test('should default to variable for other content', () => {
      expect(getNodeTypeFromContent('x')).toBe('variable');
      expect(getNodeTypeFromContent('y')).toBe('variable');
      expect(getNodeTypeFromContent('theta')).toBe('variable');
      expect(getNodeTypeFromContent('alpha')).toBe('variable');
      expect(getNodeTypeFromContent('unknown')).toBe('variable');
    });
  });

  describe('isValidVariableName function', () => {
    test('should accept valid single-character variables', () => {
      expect(isValidVariableName('x')).toBe(true);
      expect(isValidVariableName('y')).toBe(true);
      expect(isValidVariableName('z')).toBe(true);
      expect(isValidVariableName('t')).toBe(true);
    });

    test('should accept valid multi-character variables', () => {
      expect(isValidVariableName('var1')).toBe(true);
      expect(isValidVariableName('alpha')).toBe(true);
      expect(isValidVariableName('beta')).toBe(true);
      expect(isValidVariableName('theta')).toBe(true);
    });

    test('should accept Greek letters', () => {
      expect(isValidVariableName('α')).toBe(true);
      expect(isValidVariableName('β')).toBe(true);
      expect(isValidVariableName('θ')).toBe(true);
      expect(isValidVariableName('Ω')).toBe(true);
    });

    test('should reject invalid names', () => {
      expect(isValidVariableName('1x')).toBe(false); // Can't start with number
      expect(isValidVariableName('x-y')).toBe(false); // Can't contain hyphen
      expect(isValidVariableName('x+y')).toBe(false); // Can't contain operator
      expect(isValidVariableName('')).toBe(false); // Empty string
      expect(isValidVariableName('123')).toBe(false); // Pure number
    });
  });

  describe('isValidConstant function', () => {
    test('should accept known mathematical constants', () => {
      expect(isValidConstant('π')).toBe(true);
      expect(isValidConstant('pi')).toBe(true);
      expect(isValidConstant('e')).toBe(true);
      expect(isValidConstant('euler')).toBe(true);
    });

    test('should accept valid numbers', () => {
      expect(isValidConstant('42')).toBe(true);
      expect(isValidConstant('3.14159')).toBe(true);
      expect(isValidConstant('-5')).toBe(true);
      expect(isValidConstant('0')).toBe(true);
      expect(isValidConstant('1.5e10')).toBe(true);
      expect(isValidConstant('-2.5e-3')).toBe(true);
    });

    test('should reject invalid constants', () => {
      expect(isValidConstant('abc')).toBe(false);
      expect(isValidConstant('x')).toBe(false);
      expect(isValidConstant('')).toBe(false);
      expect(isValidConstant('Infinity')).toBe(false);
      expect(isValidConstant('NaN')).toBe(false);
    });
  });
});

describe('NodeTypes - Edge Cases and Error Handling', () => {
  
  test('should handle null and undefined inputs gracefully', () => {
    expect(getNodeConfig(null)).toBeUndefined();
    expect(getNodeConfig(undefined)).toBeUndefined();
    expect(getNodeColor(null)).toEqual(NODE_COLORS.operator);
    expect(isConfigurableNode(null)).toBe(false);
    expect(getInputConstraints(null)).toEqual({ min: 0, max: 0, default: 0 });
    expect(getMathematicalProperties(null)).toBeNull();
    expect(getNodeTypeFromContent(null)).toBe('variable');
  });

  test('should handle empty strings appropriately', () => {
    expect(getNodeConfig('')).toBeUndefined();
    expect(getNodeColor('')).toEqual(NODE_COLORS.operator);
    expect(isConfigurableNode('')).toBe(false);
    expect(getInputConstraints('')).toEqual({ min: 0, max: 0, default: 0 });
    expect(getMathematicalProperties('')).toBeNull();
    expect(getNodeTypeFromContent('')).toBe('variable');
  });

  test('should maintain consistency between configuration and utility functions', () => {
    // Test that isConfigurableNode matches the configurable property in NODE_TYPES
    expect(isConfigurableNode('add')).toBe(NODE_TYPES.OPERATOR.ADD.configurable);
    expect(isConfigurableNode('multiply')).toBe(NODE_TYPES.OPERATOR.MULTIPLY.configurable);
    expect(isConfigurableNode('subtract')).toBe(NODE_TYPES.OPERATOR.SUBTRACT.configurable);
    expect(isConfigurableNode('divide')).toBe(NODE_TYPES.OPERATOR.DIVIDE.configurable);
    expect(isConfigurableNode('power')).toBe(NODE_TYPES.OPERATOR.POWER.configurable);
  });

  test('should maintain mathematical property consistency', () => {
    const addProps = getMathematicalProperties('add');
    const addConfig = NODE_TYPES.OPERATOR.ADD;
    
    expect(addProps.commutative).toBe(addConfig.commutative);
    expect(addProps.associative).toBe(addConfig.associative);
    expect(addProps.symbol).toBe(addConfig.symbol);
  });
});
