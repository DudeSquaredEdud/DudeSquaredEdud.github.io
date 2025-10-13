/**
 * Educational Equation Database
 * Comprehensive collection of equations for teaching problem-solving sequences
 */

export const EDUCATIONAL_EQUATIONS = {
  // LINEAR EQUATIONS - Foundation Level
  linear_basic: [
    {
      id: 'lin_001',
      name: 'Simple Addition',
      equation: 'x + 3 = 7',
      difficulty: 'beginner',
      topic: 'linear_equations',
      steps: [
        { step: 1, equation: 'x + 3 = 7', action: 'subtract_both_sides', value: 3, explanation: 'Subtract 3 from both sides to isolate x' },
        { step: 2, equation: 'x = 7 - 3', action: 'simplify', explanation: 'Simplify the right side' },
        { step: 3, equation: 'x = 4', action: 'solution', explanation: 'Solution found: x = 4' }
      ]
    },
    {
      id: 'lin_002', 
      name: 'Simple Subtraction',
      equation: 'x - 5 = 12',
      difficulty: 'beginner',
      topic: 'linear_equations',
      steps: [
        { step: 1, equation: 'x - 5 = 12', action: 'add_both_sides', value: 5, explanation: 'Add 5 to both sides to isolate x' },
        { step: 2, equation: 'x = 12 + 5', action: 'simplify', explanation: 'Simplify the right side' },
        { step: 3, equation: 'x = 17', action: 'solution', explanation: 'Solution found: x = 17' }
      ]
    },
    {
      id: 'lin_003',
      name: 'Simple Multiplication',
      equation: '3x = 15',
      difficulty: 'beginner', 
      topic: 'linear_equations',
      steps: [
        { step: 1, equation: '3x = 15', action: 'divide_both_sides', value: 3, explanation: 'Divide both sides by 3 to isolate x' },
        { step: 2, equation: 'x = 15/3', action: 'simplify', explanation: 'Simplify the fraction' },
        { step: 3, equation: 'x = 5', action: 'solution', explanation: 'Solution found: x = 5' }
      ]
    },
    {
      id: 'lin_004',
      name: 'Simple Division',
      equation: 'x/4 = 6',
      difficulty: 'beginner',
      topic: 'linear_equations', 
      steps: [
        { step: 1, equation: 'x/4 = 6', action: 'multiply_both_sides', value: 4, explanation: 'Multiply both sides by 4 to isolate x' },
        { step: 2, equation: 'x = 6 × 4', action: 'simplify', explanation: 'Simplify the right side' },
        { step: 3, equation: 'x = 24', action: 'solution', explanation: 'Solution found: x = 24' }
      ]
    },
    {
      id: 'lin_005',
      name: 'Two-Step Equation',
      equation: '2x + 5 = 13',
      difficulty: 'intermediate',
      topic: 'linear_equations',
      steps: [
        { step: 1, equation: '2x + 5 = 13', action: 'subtract_both_sides', value: 5, explanation: 'Subtract 5 from both sides' },
        { step: 2, equation: '2x = 13 - 5', action: 'simplify', explanation: 'Simplify the right side' },
        { step: 3, equation: '2x = 8', action: 'divide_both_sides', value: 2, explanation: 'Divide both sides by 2' },
        { step: 4, equation: 'x = 8/2', action: 'simplify', explanation: 'Simplify the fraction' },
        { step: 5, equation: 'x = 4', action: 'solution', explanation: 'Solution found: x = 4' }
      ]
    },
    {
      id: 'lin_006',
      name: 'Variables on Both Sides',
      equation: '3x + 2 = x + 8',
      difficulty: 'intermediate',
      topic: 'linear_equations',
      steps: [
        { step: 1, equation: '3x + 2 = x + 8', action: 'subtract_both_sides', value: 'x', explanation: 'Subtract x from both sides to collect variables' },
        { step: 2, equation: '3x - x + 2 = 8', action: 'simplify', explanation: 'Combine like terms on the left' },
        { step: 3, equation: '2x + 2 = 8', action: 'subtract_both_sides', value: 2, explanation: 'Subtract 2 from both sides' },
        { step: 4, equation: '2x = 8 - 2', action: 'simplify', explanation: 'Simplify the right side' },
        { step: 5, equation: '2x = 6', action: 'divide_both_sides', value: 2, explanation: 'Divide both sides by 2' },
        { step: 6, equation: 'x = 3', action: 'solution', explanation: 'Solution found: x = 3' }
      ]
    }
  ],

  // LINEAR EQUATIONS - Advanced Level
  linear_advanced: [
    {
      id: 'lin_007',
      name: 'Fractions and Decimals',
      equation: '(x/2) + 3.5 = 8',
      difficulty: 'advanced',
      topic: 'linear_equations',
      steps: [
        { step: 1, equation: '(x/2) + 3.5 = 8', action: 'subtract_both_sides', value: 3.5, explanation: 'Subtract 3.5 from both sides' },
        { step: 2, equation: 'x/2 = 8 - 3.5', action: 'simplify', explanation: 'Simplify the right side' },
        { step: 3, equation: 'x/2 = 4.5', action: 'multiply_both_sides', value: 2, explanation: 'Multiply both sides by 2' },
        { step: 4, equation: 'x = 4.5 × 2', action: 'simplify', explanation: 'Simplify the right side' },
        { step: 5, equation: 'x = 9', action: 'solution', explanation: 'Solution found: x = 9' }
      ]
    },
    {
      id: 'lin_008',
      name: 'Distribution Required',
      equation: '2(x + 3) = 14',
      difficulty: 'advanced',
      topic: 'linear_equations',
      steps: [
        { step: 1, equation: '2(x + 3) = 14', action: 'distribute', explanation: 'Apply distributive property: 2(x + 3) = 2x + 6' },
        { step: 2, equation: '2x + 6 = 14', action: 'subtract_both_sides', value: 6, explanation: 'Subtract 6 from both sides' },
        { step: 3, equation: '2x = 14 - 6', action: 'simplify', explanation: 'Simplify the right side' },
        { step: 4, equation: '2x = 8', action: 'divide_both_sides', value: 2, explanation: 'Divide both sides by 2' },
        { step: 5, equation: 'x = 4', action: 'solution', explanation: 'Solution found: x = 4' }
      ]
    }
  ],

  // QUADRATIC EQUATIONS
  quadratic: [
    {
      id: 'quad_001',
      name: 'Perfect Square',
      equation: 'x² = 16',
      difficulty: 'intermediate',
      topic: 'quadratic_equations',
      steps: [
        { step: 1, equation: 'x² = 16', action: 'square_root_both_sides', explanation: 'Take the square root of both sides' },
        { step: 2, equation: 'x = ±√16', action: 'simplify', explanation: 'Remember both positive and negative roots' },
        { step: 3, equation: 'x = ±4', action: 'solution', explanation: 'Solutions: x = 4 or x = -4' }
      ]
    },
    {
      id: 'quad_002',
      name: 'Factoring Simple',
      equation: 'x² + 5x + 6 = 0',
      difficulty: 'intermediate',
      topic: 'quadratic_equations',
      steps: [
        { step: 1, equation: 'x² + 5x + 6 = 0', action: 'factor', explanation: 'Find two numbers that multiply to 6 and add to 5: 2 and 3' },
        { step: 2, equation: '(x + 2)(x + 3) = 0', action: 'zero_product_property', explanation: 'If the product equals zero, one factor must be zero' },
        { step: 3, equation: 'x + 2 = 0  or  x + 3 = 0', action: 'solve_each', explanation: 'Solve each equation separately' },
        { step: 4, equation: 'x = -2  or  x = -3', action: 'solution', explanation: 'Solutions: x = -2 or x = -3' }
      ]
    },
    {
      id: 'quad_003',
      name: 'Quadratic Formula',
      equation: 'x² + 3x - 4 = 0',
      difficulty: 'advanced',
      topic: 'quadratic_equations',
      steps: [
        { step: 1, equation: 'x² + 3x - 4 = 0', action: 'identify_coefficients', explanation: 'Identify: a = 1, b = 3, c = -4' },
        { step: 2, equation: 'x = (-b ± √(b² - 4ac)) / 2a', action: 'quadratic_formula', explanation: 'Apply the quadratic formula' },
        { step: 3, equation: 'x = (-3 ± √(3² - 4(1)(-4))) / 2(1)', action: 'substitute', explanation: 'Substitute the values' },
        { step: 4, equation: 'x = (-3 ± √(9 + 16)) / 2', action: 'simplify_discriminant', explanation: 'Simplify under the square root' },
        { step: 5, equation: 'x = (-3 ± √25) / 2', action: 'simplify', explanation: 'Continue simplifying' },
        { step: 6, equation: 'x = (-3 ± 5) / 2', action: 'final_calculation', explanation: 'Calculate both solutions' },
        { step: 7, equation: 'x = 1  or  x = -4', action: 'solution', explanation: 'Solutions: x = 1 or x = -4' }
      ]
    }
  ],

  // SYSTEMS OF EQUATIONS
  systems: [
    {
      id: 'sys_001',
      name: 'Substitution Method',
      equation: 'x + y = 5\n2x - y = 1',
      difficulty: 'intermediate',
      topic: 'systems_of_equations',
      steps: [
        { step: 1, equation: 'x + y = 5\n2x - y = 1', action: 'solve_for_variable', explanation: 'Solve the first equation for y: y = 5 - x' },
        { step: 2, equation: 'y = 5 - x\n2x - y = 1', action: 'substitute', explanation: 'Substitute y = 5 - x into the second equation' },
        { step: 3, equation: '2x - (5 - x) = 1', action: 'simplify', explanation: 'Distribute the negative sign' },
        { step: 4, equation: '2x - 5 + x = 1', action: 'combine_like_terms', explanation: 'Combine like terms' },
        { step: 5, equation: '3x - 5 = 1', action: 'solve_for_x', explanation: 'Add 5 to both sides' },
        { step: 6, equation: '3x = 6', action: 'divide', explanation: 'Divide by 3' },
        { step: 7, equation: 'x = 2', action: 'substitute_back', explanation: 'Substitute x = 2 back: y = 5 - 2 = 3' },
        { step: 8, equation: 'x = 2, y = 3', action: 'solution', explanation: 'Solution: (2, 3)' }
      ]
    }
  ],

  // EXPONENTIAL AND LOGARITHMIC
  exponential: [
    {
      id: 'exp_001',
      name: 'Simple Exponential',
      equation: '2^x = 8',
      difficulty: 'intermediate',
      topic: 'exponential_equations',
      steps: [
        { step: 1, equation: '2^x = 8', action: 'rewrite_base', explanation: 'Rewrite 8 as a power of 2: 8 = 2³' },
        { step: 2, equation: '2^x = 2³', action: 'equate_exponents', explanation: 'If bases are equal, exponents must be equal' },
        { step: 3, equation: 'x = 3', action: 'solution', explanation: 'Solution: x = 3' }
      ]
    },
    {
      id: 'log_001',
      name: 'Simple Logarithm',
      equation: 'log₂(x) = 3',
      difficulty: 'intermediate',
      topic: 'logarithmic_equations',
      steps: [
        { step: 1, equation: 'log₂(x) = 3', action: 'convert_to_exponential', explanation: 'Convert to exponential form: 2³ = x' },
        { step: 2, equation: '2³ = x', action: 'calculate', explanation: 'Calculate 2³' },
        { step: 3, equation: 'x = 8', action: 'solution', explanation: 'Solution: x = 8' }
      ]
    }
  ]
};

/**
 * Get equations by difficulty level
 */
export function getEquationsByDifficulty(difficulty) {
  const allEquations = [];
  Object.values(EDUCATIONAL_EQUATIONS).forEach(category => {
    allEquations.push(...category.filter(eq => eq.difficulty === difficulty));
  });
  return allEquations;
}

/**
 * Get equations by topic
 */
export function getEquationsByTopic(topic) {
  const allEquations = [];
  Object.values(EDUCATIONAL_EQUATIONS).forEach(category => {
    allEquations.push(...category.filter(eq => eq.topic === topic));
  });
  return allEquations;
}

/**
 * Get all equations
 */
export function getAllEquations() {
  const allEquations = [];
  Object.values(EDUCATIONAL_EQUATIONS).forEach(category => {
    allEquations.push(...category);
  });
  return allEquations;
}

/**
 * Get equation by ID
 */
export function getEquationById(id) {
  const allEquations = getAllEquations();
  return allEquations.find(eq => eq.id === id);
}
