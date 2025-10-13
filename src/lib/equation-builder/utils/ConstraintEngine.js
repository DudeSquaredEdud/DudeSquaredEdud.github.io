/**
 * Constraint Engine - Advanced Variable Constraint System
 * 
 * Research-driven implementation of mathematical constraint validation
 * and management system for variable nodes in equation builder.
 * 
 * Based on constraint satisfaction problem (CSP) theory and 
 * mathematical domain restriction patterns.
 */

export class ConstraintEngine {
  constructor(notificationSystem) {
    this.notificationSystem = notificationSystem;
    
    // Constraint storage: Map<variableId, constraints[]>
    this.variableConstraints = new Map();
    
    // Global variable registry for cross-variable constraints
    this.variableRegistry = new Map();
    
    // Constraint type definitions - research-based categorization
    this.constraintTypes = {
      // Value Constraints
      NOT_EQUAL: 'not_equal',
      RANGE: 'range',
      DOMAIN: 'domain',
      SIGN: 'sign',
      
      // Mathematical Property Constraints  
      PRIME: 'prime',
      PERFECT_SQUARE: 'perfect_square',
      EVEN_ODD: 'even_odd',
      FIBONACCI: 'fibonacci',
      DIVISIBLE: 'divisible',
      
      // Relational Constraints
      GREATER_THAN: 'greater_than',
      LESS_THAN: 'less_than',
      EQUAL_TO: 'equal_to'
    };
    
    // Mathematical domain definitions
    this.domains = {
      REAL: 'ℝ',          // Real numbers
      INTEGER: 'ℤ',        // Integers
      NATURAL: 'ℕ',        // Natural numbers (positive integers)
      RATIONAL: 'ℚ',       // Rational numbers
      POSITIVE_REAL: 'ℝ⁺', // Positive real numbers
      NEGATIVE_REAL: 'ℝ⁻'  // Negative real numbers
    };
  }

  /**
   * Add constraint to a variable
   * Research-driven constraint validation and storage
   */
  addConstraint(variableId, constraintType, constraintData) {
    if (!this.variableConstraints.has(variableId)) {
      this.variableConstraints.set(variableId, []);
    }
    
    const constraint = {
      id: `constraint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: constraintType,
      data: constraintData,
      createdAt: new Date().toISOString(),
      active: true
    };
    
    // Validate constraint before adding
    if (this.validateConstraintDefinition(constraint)) {
      this.variableConstraints.get(variableId).push(constraint);
      
      // Check for immediate conflicts with existing constraints
      const conflicts = this.detectConstraintConflicts(variableId);
      if (conflicts.length > 0) {
        this.notificationSystem.show(`Warning: Constraint conflicts detected for variable`, 'warning');
        return { success: false, conflicts };
      }
      
      this.notificationSystem.show(`Constraint added successfully`, 'success');
      return { success: true, constraintId: constraint.id };
    } else {
      this.notificationSystem.show(`Invalid constraint definition`, 'error');
      return { success: false, error: 'Invalid constraint' };
    }
  }

  /**
   * Remove constraint from variable
   */
  removeConstraint(variableId, constraintId) {
    if (this.variableConstraints.has(variableId)) {
      const constraints = this.variableConstraints.get(variableId);
      const index = constraints.findIndex(c => c.id === constraintId);
      if (index !== -1) {
        constraints.splice(index, 1);
        this.notificationSystem.show(`Constraint removed`, 'success');
        return true;
      }
    }
    return false;
  }

  /**
   * Validate if a value satisfies all constraints for a variable
   * Core mathematical validation engine
   */
  validateValue(variableId, value) {
    const constraints = this.variableConstraints.get(variableId) || [];
    const violations = [];
    
    for (const constraint of constraints) {
      if (!constraint.active) continue;
      
      const isValid = this.validateSingleConstraint(value, constraint);
      if (!isValid) {
        violations.push({
          constraintId: constraint.id,
          constraintType: constraint.type,
          constraintData: constraint.data,
          violatedValue: value
        });
      }
    }
    
    return {
      isValid: violations.length === 0,
      violations
    };
  }

  /**
   * Validate single constraint against a value
   * Mathematical constraint validation logic
   */
  validateSingleConstraint(value, constraint) {
    const numValue = parseFloat(value);
    
    switch (constraint.type) {
      case this.constraintTypes.NOT_EQUAL:
        return numValue !== constraint.data.value;
        
      case this.constraintTypes.RANGE:
        const { min, max, minInclusive = true, maxInclusive = true } = constraint.data;
        const minValid = minInclusive ? numValue >= min : numValue > min;
        const maxValid = maxInclusive ? numValue <= max : numValue < max;
        return minValid && maxValid;
        
      case this.constraintTypes.DOMAIN:
        return this.validateDomain(numValue, constraint.data.domain);
        
      case this.constraintTypes.SIGN:
        if (constraint.data.sign === 'positive') return numValue > 0;
        if (constraint.data.sign === 'negative') return numValue < 0;
        if (constraint.data.sign === 'non_zero') return numValue !== 0;
        return true;
        
      case this.constraintTypes.PRIME:
        return this.isPrime(numValue);
        
      case this.constraintTypes.PERFECT_SQUARE:
        return this.isPerfectSquare(numValue);
        
      case this.constraintTypes.EVEN_ODD:
        const isEven = numValue % 2 === 0;
        return constraint.data.parity === 'even' ? isEven : !isEven;
        
      case this.constraintTypes.FIBONACCI:
        return this.isFibonacci(numValue);
        
      case this.constraintTypes.DIVISIBLE:
        return numValue % constraint.data.divisor === 0;
        
      case this.constraintTypes.GREATER_THAN:
        return numValue > constraint.data.value;
        
      case this.constraintTypes.LESS_THAN:
        return numValue < constraint.data.value;
        
      case this.constraintTypes.EQUAL_TO:
        return numValue === constraint.data.value;
        
      default:
        return true; // Unknown constraint types pass by default
    }
  }

  /**
   * Mathematical utility functions for constraint validation
   */
  
  validateDomain(value, domain) {
    switch (domain) {
      case this.domains.INTEGER:
        return Number.isInteger(value);
      case this.domains.NATURAL:
        return Number.isInteger(value) && value > 0;
      case this.domains.POSITIVE_REAL:
        return value > 0;
      case this.domains.NEGATIVE_REAL:
        return value < 0;
      case this.domains.RATIONAL:
        // Simplified rational check - in practice would need more sophisticated validation
        return Number.isFinite(value);
      case this.domains.REAL:
      default:
        return Number.isFinite(value);
    }
  }

  isPrime(n) {
    if (n <= 1 || !Number.isInteger(n)) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  }

  isPerfectSquare(n) {
    if (n < 0 || !Number.isInteger(n)) return false;
    const sqrt = Math.sqrt(n);
    return Number.isInteger(sqrt);
  }

  isFibonacci(n) {
    if (n < 0 || !Number.isInteger(n)) return false;
    
    // A number is Fibonacci if one of (5*n^2 + 4) or (5*n^2 - 4) is a perfect square
    const test1 = 5 * n * n + 4;
    const test2 = 5 * n * n - 4;
    
    return this.isPerfectSquare(test1) || this.isPerfectSquare(test2);
  }

  /**
   * Detect conflicts between constraints on the same variable
   */
  detectConstraintConflicts(variableId) {
    const constraints = this.variableConstraints.get(variableId) || [];
    const conflicts = [];
    
    // Check for logical impossibilities
    for (let i = 0; i < constraints.length; i++) {
      for (let j = i + 1; j < constraints.length; j++) {
        const conflict = this.checkConstraintPairConflict(constraints[i], constraints[j]);
        if (conflict) {
          conflicts.push({
            constraint1: constraints[i].id,
            constraint2: constraints[j].id,
            conflictType: conflict
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Check if two constraints conflict with each other
   */
  checkConstraintPairConflict(constraint1, constraint2) {
    // Example conflict detection - can be expanded
    if (constraint1.type === this.constraintTypes.EQUAL_TO && 
        constraint2.type === this.constraintTypes.NOT_EQUAL &&
        constraint1.data.value === constraint2.data.value) {
      return 'equal_not_equal_conflict';
    }
    
    if (constraint1.type === this.constraintTypes.RANGE && 
        constraint2.type === this.constraintTypes.RANGE) {
      const range1 = constraint1.data;
      const range2 = constraint2.data;
      
      // Check if ranges don't overlap
      if ((range1.max < range2.min) || (range2.max < range1.min)) {
        return 'non_overlapping_ranges';
      }
    }
    
    return null; // No conflict detected
  }

  /**
   * Validate constraint definition before adding
   */
  validateConstraintDefinition(constraint) {
    if (!constraint.type || !this.constraintTypes[constraint.type.toUpperCase()]) {
      return false;
    }
    
    // Type-specific validation
    switch (constraint.type) {
      case this.constraintTypes.RANGE:
        return constraint.data && 
               typeof constraint.data.min === 'number' && 
               typeof constraint.data.max === 'number' &&
               constraint.data.min <= constraint.data.max;
               
      case this.constraintTypes.NOT_EQUAL:
      case this.constraintTypes.GREATER_THAN:
      case this.constraintTypes.LESS_THAN:
      case this.constraintTypes.EQUAL_TO:
        return constraint.data && typeof constraint.data.value === 'number';
        
      case this.constraintTypes.DOMAIN:
        return constraint.data && 
               Object.values(this.domains).includes(constraint.data.domain);
               
      default:
        return true;
    }
  }

  /**
   * Get all constraints for a variable
   */
  getConstraints(variableId) {
    return this.variableConstraints.get(variableId) || [];
  }

  /**
   * Get constraint summary for display
   */
  getConstraintSummary(variableId) {
    const constraints = this.getConstraints(variableId);
    
    return constraints.map(constraint => ({
      id: constraint.id,
      type: constraint.type,
      description: this.getConstraintDescription(constraint),
      active: constraint.active
    }));
  }

  /**
   * Generate human-readable constraint description
   */
  getConstraintDescription(constraint) {
    switch (constraint.type) {
      case this.constraintTypes.NOT_EQUAL:
        return `≠ ${constraint.data.value}`;
        
      case this.constraintTypes.RANGE:
        const { min, max, minInclusive = true, maxInclusive = true } = constraint.data;
        const minSymbol = minInclusive ? '[' : '(';
        const maxSymbol = maxInclusive ? ']' : ')';
        return `∈ ${minSymbol}${min}, ${max}${maxSymbol}`;
        
      case this.constraintTypes.DOMAIN:
        return `∈ ${constraint.data.domain}`;
        
      case this.constraintTypes.SIGN:
        return constraint.data.sign === 'positive' ? '> 0' :
               constraint.data.sign === 'negative' ? '< 0' : '≠ 0';
               
      case this.constraintTypes.PRIME:
        return 'must be prime';
        
      case this.constraintTypes.PERFECT_SQUARE:
        return 'must be perfect square';
        
      case this.constraintTypes.EVEN_ODD:
        return constraint.data.parity === 'even' ? 'must be even' : 'must be odd';
        
      case this.constraintTypes.FIBONACCI:
        return 'must be Fibonacci number';
        
      case this.constraintTypes.DIVISIBLE:
        return `divisible by ${constraint.data.divisor}`;
        
      case this.constraintTypes.GREATER_THAN:
        return `> ${constraint.data.value}`;
        
      case this.constraintTypes.LESS_THAN:
        return `< ${constraint.data.value}`;
        
      case this.constraintTypes.EQUAL_TO:
        return `= ${constraint.data.value}`;
        
      default:
        return 'Unknown constraint';
    }
  }

  /**
   * Clear all constraints for a variable
   */
  clearConstraints(variableId) {
    this.variableConstraints.delete(variableId);
    this.notificationSystem.show(`All constraints cleared for variable`, 'success');
  }

  /**
   * Export constraints for persistence
   */
  exportConstraints() {
    const constraintsData = {};
    
    for (const [variableId, constraints] of this.variableConstraints) {
      constraintsData[variableId] = constraints;
    }
    
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      constraints: constraintsData,
      variableRegistry: Object.fromEntries(this.variableRegistry)
    };
  }

  /**
   * Evaluate operator result for constraint validation
   * This method computes the result of an operator node for constraint checking
   */
  evaluateOperatorResult(nodeId, nodeManager, equationGenerator) {
    try {
      // Get the operator node data
      const nodeData = nodeManager.getNode(nodeId);
      if (!nodeData) return null;
      
      // Get input values from connected nodes
      const inputs = nodeManager.getNodeInputs(nodeId);
      if (!inputs || inputs.length === 0) return null;
      
      // Convert input values to numbers
      const numericInputs = inputs.map(input => {
        if (typeof input === 'number') return input;
        const parsed = parseFloat(input);
        return isNaN(parsed) ? null : parsed;
      }).filter(val => val !== null);
      
      if (numericInputs.length === 0) return null;
      
      // Calculate result based on operator type
      switch (nodeData.nodeType) {
        case 'add':
          return numericInputs.reduce((sum, val) => sum + val, 0);
          
        case 'subtract':
          return numericInputs.length >= 2 ? numericInputs[0] - numericInputs[1] : null;
          
        case 'multiply':
          return numericInputs.reduce((product, val) => product * val, 1);
          
        case 'divide':
          return numericInputs.length >= 2 && numericInputs[1] !== 0 ? 
                 numericInputs[0] / numericInputs[1] : null;
                 
        case 'power':
          return numericInputs.length >= 2 ? 
                 Math.pow(numericInputs[0], numericInputs[1]) : null;
                 
        case 'sin':
          return numericInputs.length >= 1 ? Math.sin(numericInputs[0]) : null;
          
        case 'cos':
          return numericInputs.length >= 1 ? Math.cos(numericInputs[0]) : null;
          
        case 'tan':
          return numericInputs.length >= 1 ? Math.tan(numericInputs[0]) : null;
          
        case 'sqrt':
          return numericInputs.length >= 1 && numericInputs[0] >= 0 ? 
                 Math.sqrt(numericInputs[0]) : null;
                 
        case 'log':
          return numericInputs.length >= 1 && numericInputs[0] > 0 ? 
                 Math.log10(numericInputs[0]) : null;
                 
        case 'ln':
          return numericInputs.length >= 1 && numericInputs[0] > 0 ? 
                 Math.log(numericInputs[0]) : null;
                 
        case 'output':
          // For output nodes, try to get the equation result
          try {
            const equation = equationGenerator?.generateEquationFromNode(nodeId);
            if (equation && equation !== 'No connections') {
              // Try to evaluate the equation if it's a simple numeric expression
              const result = this.evaluateSimpleExpression(equation);
              return result;
            }
          } catch (e) {
            console.warn('Could not evaluate output equation:', e);
          }
          return null;
          
        default:
          return null;
      }
    } catch (error) {
      console.warn('Error evaluating operator result:', error);
      return null;
    }
  }

  /**
   * Simple expression evaluator for basic mathematical expressions
   * Used for output node constraint validation
   */
  evaluateSimpleExpression(expression) {
    try {
      // Remove spaces and validate the expression contains only safe characters
      const cleanExpr = expression.replace(/\s/g, '');
      
      // Only allow numbers, basic operators, parentheses, and mathematical functions
      if (!/^[0-9+\-*/().×÷^πe\s]+$/.test(cleanExpr)) {
        return null;
      }
      
      // Replace mathematical symbols with JavaScript equivalents
      let jsExpr = cleanExpr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, Math.PI.toString())
        .replace(/e/g, Math.E.toString());
      
      // Handle power operator (basic cases)
      jsExpr = jsExpr.replace(/(\d+)\^(\d+)/g, 'Math.pow($1, $2)');
      
      // Safely evaluate the expression using Function constructor
      // This is safer than eval() as it doesn't have access to local scope
      const result = new Function('return ' + jsExpr)();
      
      return typeof result === 'number' && isFinite(result) ? result : null;
    } catch (error) {
      console.warn('Could not evaluate expression:', expression, error);
      return null;
    }
  }

  /**
   * Validate operator result against constraints
   * Extended validation for computed operator results
   */
  validateOperatorResult(nodeId, nodeManager, equationGenerator) {
    const constraints = this.getConstraints(nodeId);
    if (constraints.length === 0) {
      return { isValid: true, violations: [] };
    }
    
    const result = this.evaluateOperatorResult(nodeId, nodeManager, equationGenerator);
    if (result === null) {
      // Cannot evaluate result - consider it valid but note the limitation
      return { 
        isValid: true, 
        violations: [],
        note: 'Cannot evaluate operator result - constraints not checked'
      };
    }
    
    return this.validateValue(nodeId, result);
  }

  /**
   * Import constraints from saved data
   */
  importConstraints(constraintsData) {
    if (!constraintsData || !constraintsData.constraints) {
      return false;
    }
    
    try {
      this.variableConstraints.clear();
      
      for (const [variableId, constraints] of Object.entries(constraintsData.constraints)) {
        this.variableConstraints.set(variableId, constraints);
      }
      
      if (constraintsData.variableRegistry) {
        this.variableRegistry = new Map(Object.entries(constraintsData.variableRegistry));
      }
      
      this.notificationSystem.show(`Constraints imported successfully`, 'success');
      return true;
    } catch (error) {
      this.notificationSystem.show(`Failed to import constraints: ${error.message}`, 'error');
      return false;
    }
  }
}

/**
 * Constraint helper functions for easy constraint creation
 */
export const ConstraintHelpers = {
  // Value constraint creators
  notEqual(value) {
    return { type: 'not_equal', data: { value } };
  },
  
  range(min, max, minInclusive = true, maxInclusive = true) {
    return { type: 'range', data: { min, max, minInclusive, maxInclusive } };
  },
  
  domain(domainType) {
    return { type: 'domain', data: { domain: domainType } };
  },
  
  positive() {
    return { type: 'sign', data: { sign: 'positive' } };
  },
  
  negative() {
    return { type: 'sign', data: { sign: 'negative' } };
  },
  
  nonZero() {
    return { type: 'sign', data: { sign: 'non_zero' } };
  },
  
  // Mathematical property constraints
  prime() {
    return { type: 'prime', data: {} };
  },
  
  perfectSquare() {
    return { type: 'perfect_square', data: {} };
  },
  
  even() {
    return { type: 'even_odd', data: { parity: 'even' } };
  },
  
  odd() {
    return { type: 'even_odd', data: { parity: 'odd' } };
  },
  
  fibonacci() {
    return { type: 'fibonacci', data: {} };
  },
  
  divisibleBy(divisor) {
    return { type: 'divisible', data: { divisor } };
  },
  
  // Relational constraints
  greaterThan(value) {
    return { type: 'greater_than', data: { value } };
  },
  
  lessThan(value) {
    return { type: 'less_than', data: { value } };
  },
  
  equalTo(value) {
    return { type: 'equal_to', data: { value } };
  }
};
