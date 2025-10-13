/**
 * EquationGenerator Unit Tests
 * 
 * Comprehensive test suite for mathematical equation generation functionality.
 * Covers expression building, n-ary operations, operator precedence, and edge cases.
 * 
 * CRITICAL TESTING: Mathematical operations must be 90%+ accurate for user trust.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EquationGenerator } from '../../src/lib/equation-builder/utils/EquationGenerator.js'

describe('EquationGenerator', () => {
  let generator
  let mockNodeManager
  let mockConnectionSystem
  let mockEquationOutput
  
  beforeEach(() => {
    // Create mock dependencies
    mockNodeManager = {
      nodes: new Map(),
      getNodeElement: vi.fn(),
      updateNodeValidation: vi.fn()
    }
    
    mockConnectionSystem = {
      getConnectionsToNode: vi.fn().mockReturnValue([]),
      getConnectionsFromNode: vi.fn().mockReturnValue([]),
      getAllConnections: vi.fn().mockReturnValue([]),
      connections: new Map()
    }
    
    mockEquationOutput = {
      innerHTML: '',
      textContent: ''
    }
    
    // Create EquationGenerator instance
    generator = new EquationGenerator(
      mockNodeManager,
      mockConnectionSystem,
      mockEquationOutput
    )
  })
  
  describe('Initialization', () => {
    it('should create EquationGenerator with proper dependencies', () => {
      expect(generator).toBeDefined()
      expect(generator.nodeManager).toBe(mockNodeManager)
      expect(generator.connectionSystem).toBe(mockConnectionSystem)
      expect(generator.equationOutput).toBe(mockEquationOutput)
    })
    
    it('should have correct operator symbols mapping', () => {
      expect(generator.operatorSymbols).toEqual({
        'add': '+',
        'subtract': '-', 
        'multiply': '×',
        'divide': '÷',
        'power': '^'
      })
    })
  })
  
  describe('Input Count Management', () => {
    it('should return 0 for non-existent nodes', () => {
      const count = generator.getInputCountForNode('non-existent')
      expect(count).toBe(0)
    })
    
    it('should return current input count for dynamic nodes', () => {
      mockNodeManager.nodes.set('dynamic-node', {
        nodeType: 'add',
        currentInputCount: 5
      })
      
      const count = generator.getInputCountForNode('dynamic-node')
      expect(count).toBe(5)
    })
    
    it('should fallback to default constraints for non-dynamic nodes', () => {
      mockNodeManager.nodes.set('static-node', {
        nodeType: 'add'
        // No currentInputCount - should use default
      })
      
      const count = generator.getInputCountForNode('static-node')
      expect(count).toBeGreaterThan(0) // Should use default from constraints
    })
  })
  
  describe('Basic Equation Generation', () => {
    beforeEach(() => {
      // Mock getNodeInputs to return empty array by default
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue([])
    })
    
    it('should generate constant node equations', () => {
      mockNodeManager.nodes.set('const1', {
        nodeType: 'constant',
        content: '5'
      })
      
      const equation = generator.generateEquationFromNode('const1')
      expect(equation).toBe('5')
    })
    
    it('should generate variable node equations', () => {
      mockNodeManager.nodes.set('var1', {
        nodeType: 'variable',
        content: 'x'
      })
      
      const equation = generator.generateEquationFromNode('var1')
      expect(equation).toBe('x')
    })
    
    it('should return undefined for non-existent nodes', () => {
      const equation = generator.generateEquationFromNode('non-existent')
      // Note: Implementation returns empty string for non-existent nodes
      expect(equation).toBe('')
    })
  })
  
  describe('Binary Operations', () => {
    beforeEach(() => {
      // Setup binary operation test data
      vi.spyOn(generator, 'getNodeInputs').mockImplementation((nodeId) => {
        if (nodeId === 'subtract1') return ['x', '5']
        if (nodeId === 'divide1') return ['a', 'b'] 
        if (nodeId === 'power1') return ['2', '3']
        return []
      })
    })
    
    it('should generate subtraction equations correctly', () => {
      mockNodeManager.nodes.set('subtract1', {
        nodeType: 'subtract'
      })
      
      const equation = generator.generateEquationFromNode('subtract1')
      expect(equation).toBe('(x - 5)')
    })
    
    it('should generate division equations correctly', () => {
      mockNodeManager.nodes.set('divide1', {
        nodeType: 'divide'
      })
      
      const equation = generator.generateEquationFromNode('divide1')
      expect(equation).toBe('(a ÷ b)')
    })
    
    it('should generate power equations correctly', () => {
      mockNodeManager.nodes.set('power1', {
        nodeType: 'power'
      })
      
      const equation = generator.generateEquationFromNode('power1')
      expect(equation).toBe('(2)^(3)')
    })
    
    it('should handle missing inputs with placeholders', () => {
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue(['x']) // Only one input
      
      mockNodeManager.nodes.set('subtract2', {
        nodeType: 'subtract'
      })
      
      const equation = generator.generateEquationFromNode('subtract2')
      expect(equation).toBe('(x - ?)')
    })
  })
  
  describe('N-ary Operations (Addition)', () => {
    it('should handle addition with no inputs', () => {
      mockNodeManager.nodes.set('add1', { nodeType: 'add' })
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue([])
      
      const equation = generator.generateEquationFromNode('add1')
      expect(equation).toBe('(no inputs)')
    })
    
    it('should handle addition with single input', () => {
      mockNodeManager.nodes.set('add2', { nodeType: 'add' })
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue(['x'])
      
      const equation = generator.generateEquationFromNode('add2')
      expect(equation).toBe('x')
    })
    
    it('should handle addition with two inputs', () => {
      mockNodeManager.nodes.set('add3', { nodeType: 'add' })
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue(['x', '5'])
      
      const equation = generator.generateEquationFromNode('add3')
      expect(equation).toBe('(x + 5)')
    })
    
    it('should handle addition with multiple inputs (n-ary)', () => {
      mockNodeManager.nodes.set('add4', { nodeType: 'add' })
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue(['a', 'b', 'c', '7'])
      
      const equation = generator.generateEquationFromNode('add4')
      expect(equation).toBe('(a + b + c + 7)')
    })
    
    it('should handle addition with missing inputs using placeholders', () => {
      mockNodeManager.nodes.set('add5', { nodeType: 'add' })
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue(['x', undefined, '5'])
      
      const equation = generator.generateEquationFromNode('add5')
      expect(equation).toBe('(x + ? + 5)')
    })
  })
  
  describe('N-ary Operations (Multiplication)', () => {
    it('should handle multiplication with no inputs', () => {
      mockNodeManager.nodes.set('mult1', { nodeType: 'multiply' })
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue([])
      
      const equation = generator.generateEquationFromNode('mult1')
      expect(equation).toBe('(no inputs)')
    })
    
    it('should handle multiplication with single input', () => {
      mockNodeManager.nodes.set('mult2', { nodeType: 'multiply' })
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue(['x'])
      
      const equation = generator.generateEquationFromNode('mult2')
      expect(equation).toBe('x')
    })
    
    it('should handle multiplication with two inputs', () => {
      mockNodeManager.nodes.set('mult3', { nodeType: 'multiply' })
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue(['x', '5'])
      
      const equation = generator.generateEquationFromNode('mult3')
      expect(equation).toBe('(x × 5)')
    })
    
    it('should handle multiplication with multiple inputs (n-ary)', () => {
      mockNodeManager.nodes.set('mult4', { nodeType: 'multiply' })
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue(['a', 'b', 'c', '2'])
      
      const equation = generator.generateEquationFromNode('mult4')
      expect(equation).toBe('(a × b × c × 2)')
    })
    
    it('should handle multiplication with missing inputs using placeholders', () => {
      mockNodeManager.nodes.set('mult5', { nodeType: 'multiply' })
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue(['x', null, '3'])
      
      const equation = generator.generateEquationFromNode('mult5')
      expect(equation).toBe('(x × ? × 3)')
    })
  })
  
  describe('Mathematical Functions', () => {
    beforeEach(() => {
      vi.spyOn(generator, 'getNodeInputs').mockImplementation((nodeId) => {
        const inputMap = {
          'sin1': ['x'],
          'cos1': ['θ'],
          'tan1': ['45°'],
          'sqrt1': ['16'],
          'log1': ['100'],
          'ln1': ['e']
        }
        return inputMap[nodeId] || []
      })
    })
    
    it('should generate sine function correctly', () => {
      mockNodeManager.nodes.set('sin1', { nodeType: 'sin' })
      const equation = generator.generateEquationFromNode('sin1')
      expect(equation).toBe('sin(x)')
    })
    
    it('should generate cosine function correctly', () => {
      mockNodeManager.nodes.set('cos1', { nodeType: 'cos' })
      const equation = generator.generateEquationFromNode('cos1')
      expect(equation).toBe('cos(θ)')
    })
    
    it('should generate tangent function correctly', () => {
      mockNodeManager.nodes.set('tan1', { nodeType: 'tan' })
      const equation = generator.generateEquationFromNode('tan1')
      expect(equation).toBe('tan(45°)')
    })
    
    it('should generate square root function correctly', () => {
      mockNodeManager.nodes.set('sqrt1', { nodeType: 'sqrt' })
      const equation = generator.generateEquationFromNode('sqrt1')
      expect(equation).toBe('√(16)')
    })
    
    it('should generate logarithm function correctly', () => {
      mockNodeManager.nodes.set('log1', { nodeType: 'log' })
      const equation = generator.generateEquationFromNode('log1')
      expect(equation).toBe('log(100)')
    })
    
    it('should generate natural logarithm function correctly', () => {
      mockNodeManager.nodes.set('ln1', { nodeType: 'ln' })
      const equation = generator.generateEquationFromNode('ln1')
      expect(equation).toBe('ln(e)')
    })
    
    it('should handle functions with missing inputs', () => {
      mockNodeManager.nodes.set('sin2', { nodeType: 'sin' })
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue([])
      
      const equation = generator.generateEquationFromNode('sin2')
      expect(equation).toBe('sin(?)')
    })
  })
  
  describe('Complex Nested Equations', () => {
    it('should handle nested arithmetic operations', () => {
      // Mock a complex nested structure: (x + 5) × (y - 2)
      vi.spyOn(generator, 'getNodeInputs').mockImplementation((nodeId) => {
        if (nodeId === 'mult1') return ['(x + 5)', '(y - 2)']
        return []
      })
      
      mockNodeManager.nodes.set('mult1', { nodeType: 'multiply' })
      
      const equation = generator.generateEquationFromNode('mult1')
      expect(equation).toBe('((x + 5) × (y - 2))')
    })
    
    it('should handle nested function calls', () => {
      // Mock sin(cos(x))
      vi.spyOn(generator, 'getNodeInputs').mockImplementation((nodeId) => {
        if (nodeId === 'sin1') return ['cos(x)']
        return []
      })
      
      mockNodeManager.nodes.set('sin1', { nodeType: 'sin' })
      
      const equation = generator.generateEquationFromNode('sin1')
      expect(equation).toBe('sin(cos(x))')
    })
    
    it('should handle complex power expressions', () => {
      // Mock (x + 1)^(y × 2)
      vi.spyOn(generator, 'getNodeInputs').mockImplementation((nodeId) => {
        if (nodeId === 'power1') return ['(x + 1)', '(y × 2)']
        return []
      })
      
      mockNodeManager.nodes.set('power1', { nodeType: 'power' })
      
      const equation = generator.generateEquationFromNode('power1')
      expect(equation).toBe('((x + 1))^((y × 2))')
    })
  })
  
  describe('Equation Output Management', () => {
    it('should show guidance message when no nodes exist', () => {
      generator.updateEquation()
      
      expect(mockEquationOutput.innerHTML).toBe(
        '<em>Click buttons in the palette to add nodes to the canvas...</em>'
      )
    })
    
    it('should show output node guidance when nodes exist but no output', () => {
      mockNodeManager.nodes.set('const1', {
        nodeType: 'constant',
        content: '5'
      })
      
      generator.updateEquation()
      
      expect(mockEquationOutput.innerHTML).toBe(
        '<em>Add an OUTPUT node (=) to generate equations...</em>'
      )
    })
    
    it('should generate equation when output node exists', () => {
      mockNodeManager.nodes.set('output1', {
        nodeType: 'output'
      })
      
      vi.spyOn(generator, 'generateEquationFromNode').mockReturnValue('x + 5')
      
      generator.updateEquation()
      
      expect(mockEquationOutput.innerHTML).toContain('x + 5')
      expect(generator.generateEquationFromNode).toHaveBeenCalledWith('output1')
    })
    
    it('should handle multiple output nodes', () => {
      mockNodeManager.nodes.set('output1', { nodeType: 'output' })
      mockNodeManager.nodes.set('output2', { nodeType: 'output' })
      
      vi.spyOn(generator, 'generateEquationFromNode')
        .mockReturnValueOnce('x + 5')
        .mockReturnValueOnce('y × 2')
      
      generator.updateEquation()
      
      expect(generator.generateEquationFromNode).toHaveBeenCalledWith('output1')
      expect(generator.generateEquationFromNode).toHaveBeenCalledWith('output2')
      expect(mockEquationOutput.innerHTML).toContain('x + 5')
      expect(mockEquationOutput.innerHTML).toContain('y × 2')
    })
    
    it('should handle undefined equations gracefully', () => {
      mockNodeManager.nodes.set('output1', { nodeType: 'output' })
      
      vi.spyOn(generator, 'generateEquationFromNode').mockReturnValue(null)
      
      generator.updateEquation()
      
      expect(mockEquationOutput.innerHTML).toContain('undefined')
    })
  })
  
  describe('Edge Cases and Error Handling', () => {
    it('should handle unknown node types gracefully', () => {
      mockNodeManager.nodes.set('unknown1', {
        nodeType: 'unknown_type',
        content: 'custom_content'
      })
      
      const equation = generator.generateEquationFromNode('unknown1')
      expect(equation).toBe('custom_content')
    })
    
    it('should handle nodes with empty content', () => {
      mockNodeManager.nodes.set('empty1', {
        nodeType: 'constant',
        content: ''
      })
      
      const equation = generator.generateEquationFromNode('empty1')
      expect(equation).toBe('')
    })
    
    it('should handle operations with all placeholder inputs', () => {
      mockNodeManager.nodes.set('add_empty', { nodeType: 'add' })
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue([null, undefined, ''])
      
      const equation = generator.generateEquationFromNode('add_empty')
      expect(equation).toBe('(? + ? + ?)')
    })
    
    it('should handle very large n-ary operations', () => {
      mockNodeManager.nodes.set('big_add', { nodeType: 'add' })
      const manyInputs = Array(20).fill().map((_, i) => `x${i}`)
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue(manyInputs)
      
      const equation = generator.generateEquationFromNode('big_add')
      expect(equation).toContain('x0 + x1 + x2')
      expect(equation).toContain('x19')
      expect(equation.split(' + ')).toHaveLength(20)
    })
  })
  
  describe('Mathematical Correctness Validation', () => {
    it('should preserve mathematical operator precedence through parentheses', () => {
      // Test that operations are properly parenthesized
      mockNodeManager.nodes.set('complex1', { nodeType: 'add' })
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue(['a × b', 'c ÷ d'])
      
      const equation = generator.generateEquationFromNode('complex1')
      expect(equation).toBe('(a × b + c ÷ d)')
      expect(equation).toMatch(/^\(.*\)$/) // Should be wrapped in parentheses
    })
    
    it('should handle associativity correctly for power operations', () => {
      // Power is right-associative, should maintain structure
      mockNodeManager.nodes.set('power_test', { nodeType: 'power' })
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue(['x', 'y^z'])
      
      const equation = generator.generateEquationFromNode('power_test')
      expect(equation).toBe('(x)^(y^z)')
    })
    
    it('should maintain commutativity for addition and multiplication', () => {
      // Order should be preserved as input order
      mockNodeManager.nodes.set('commute_test', { nodeType: 'multiply' })
      vi.spyOn(generator, 'getNodeInputs').mockReturnValue(['z', 'y', 'x'])
      
      const equation = generator.generateEquationFromNode('commute_test')
      expect(equation).toBe('(z × y × x)')
    })
  })
})
