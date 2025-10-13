/**
 * LocalDBManager Unit Tests
 * 
 * Comprehensive test suite for the IndexedDB integration functionality
 * Covers database initialization, CRUD operations, constraint handling, and error scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LocalDBManager } from '../../src/lib/equation-builder/utils/LocalDBManager.js'

describe('LocalDBManager', () => {
  let manager
  let mockNotificationSystem
  
  beforeEach(async () => {
    // Create mock notification system
    mockNotificationSystem = {
      show: vi.fn(),
      hide: vi.fn(),
      clear: vi.fn()
    }
    
    // Create LocalDBManager instance
    manager = new LocalDBManager(mockNotificationSystem)
  })
  
  afterEach(async () => {
    // Clean up database after each test
    if (manager && manager.db) {
      manager.db.close()
    }
    
    // Clear any existing databases
    if (global.indexedDB && global.indexedDB.deleteDatabase) {
      await new Promise((resolve) => {
        const deleteReq = global.indexedDB.deleteDatabase('EquationBuilderDB')
        deleteReq.onsuccess = () => resolve()
        deleteReq.onerror = () => resolve()
      })
    }
  })
  
  describe('Initialization', () => {
    it('should create LocalDBManager with proper configuration', () => {
      expect(manager).toBeDefined()
      expect(manager.dbName).toBe('EquationBuilderDB')
      expect(manager.dbVersion).toBe(1)
      expect(manager.notificationSystem).toBe(mockNotificationSystem)
    })
    
    it('should have correct database schema defined', () => {
      expect(manager.schema).toBeDefined()
      expect(manager.schema.equations).toBeDefined()
      expect(manager.schema.constraints).toBeDefined()
      expect(manager.schema.settings).toBeDefined()
      expect(manager.schema.metadata).toBeDefined()
    })
    
    it('should define proper indexes for equations store', () => {
      const equationsSchema = manager.schema.equations
      expect(equationsSchema.keyPath).toBe('id')
      expect(equationsSchema.indexes.timestamp).toBeDefined()
      expect(equationsSchema.indexes.name).toBeDefined()
      expect(equationsSchema.indexes.hasConstraints).toBeDefined()
      expect(equationsSchema.indexes.nodeCount).toBeDefined()
    })
    
    it('should define proper compound key for constraints store', () => {
      const constraintsSchema = manager.schema.constraints
      expect(constraintsSchema.keyPath).toEqual(['equationId', 'nodeId', 'constraintId'])
      expect(constraintsSchema.indexes.equationId).toBeDefined()
      expect(constraintsSchema.indexes.constraintType).toBeDefined()
    })
  })
  
  describe('Database Connection', () => {
    it('should initialize database successfully', async () => {
      const result = await manager.initialize()
      expect(result).toBe(true)
      expect(manager.db).toBeDefined()
      expect(manager.db.name).toBe('EquationBuilderDB')
    })
    
    it('should handle database initialization errors gracefully', async () => {
      // Mock IndexedDB to throw an error
      const originalIndexedDB = global.indexedDB
      global.indexedDB = null
      
      const result = await manager.initialize()
      expect(result).toBe(false)
      expect(mockNotificationSystem.show).toHaveBeenCalledWith(
        expect.stringContaining('Database initialization failed'),
        'error'
      )
      
      // Restore IndexedDB
      global.indexedDB = originalIndexedDB
    })
    
    it('should create object stores with proper configuration', async () => {
      await manager.initialize()
      
      // Check that stores exist
      expect(manager.db.objectStoreNames.contains('equations')).toBe(true)
      expect(manager.db.objectStoreNames.contains('constraints')).toBe(true)
      expect(manager.db.objectStoreNames.contains('settings')).toBe(true)
      expect(manager.db.objectStoreNames.contains('metadata')).toBe(true)
    })
  })
  
  describe('Equation Operations', () => {
    beforeEach(async () => {
      await manager.initialize()
    })
    
    it('should save equation successfully', async () => {
      const testEquation = {
        id: 'test-equation-1',
        name: 'Test Equation',
        nodes: [
          { id: 'node1', type: 'constant', value: 5 },
          { id: 'node2', type: 'variable', name: 'x' }
        ],
        connections: [],
        metadata: { nodeCount: 2 },
        created: new Date().toISOString(),
        hasConstraints: false
      }
      
      const result = await manager.saveEquation(testEquation)
      expect(result).toBe('test-equation-1')
      expect(mockNotificationSystem.show).toHaveBeenCalledWith(
        'Equation saved successfully',
        'success'
      )
    })
    
    it('should load equation by ID', async () => {
      // First save an equation
      const testEquation = {
        id: 'test-equation-2',
        name: 'Load Test Equation',
        nodes: [],
        connections: [],
        metadata: { nodeCount: 0 },
        created: new Date().toISOString(),
        hasConstraints: false
      }
      
      await manager.saveEquation(testEquation)
      
      // Then load it
      const loadedEquation = await manager.loadEquation('test-equation-2')
      expect(loadedEquation).toBeDefined()
      expect(loadedEquation.id).toBe('test-equation-2')
      expect(loadedEquation.name).toBe('Load Test Equation')
    })
    
    it('should return null for non-existent equation', async () => {
      const result = await manager.loadEquation('non-existent-id')
      expect(result).toBeNull()
    })
    
    it('should list saved equations', async () => {
      // Save multiple equations
      const equations = [
        {
          id: 'eq1',
          name: 'Equation 1',
          nodes: [],
          connections: [],
          metadata: { nodeCount: 0 },
          created: new Date().toISOString(),
          hasConstraints: false
        },
        {
          id: 'eq2', 
          name: 'Equation 2',
          nodes: [],
          connections: [],
          metadata: { nodeCount: 1 },
          created: new Date().toISOString(),
          hasConstraints: true
        }
      ]
      
      for (const eq of equations) {
        await manager.saveEquation(eq)
      }
      
      const savedEquations = await manager.getSavedEquations()
      expect(savedEquations).toHaveLength(2)
      expect(savedEquations.find(eq => eq.id === 'eq1')).toBeDefined()
      expect(savedEquations.find(eq => eq.id === 'eq2')).toBeDefined()
    })
    
    it('should delete equation successfully', async () => {
      // Save an equation first
      const testEquation = {
        id: 'delete-test',
        name: 'Delete Test',
        nodes: [],
        connections: [],
        metadata: { nodeCount: 0 },
        created: new Date().toISOString(),
        hasConstraints: false
      }
      
      await manager.saveEquation(testEquation)
      
      // Verify it exists
      let loadedEquation = await manager.loadEquation('delete-test')
      expect(loadedEquation).toBeDefined()
      
      // Delete it
      const result = await manager.deleteEquation('delete-test')
      expect(result).toBe(true)
      
      // Verify it's gone
      loadedEquation = await manager.loadEquation('delete-test')
      expect(loadedEquation).toBeNull()
    })
  })
  
  describe('Constraint Operations', () => {
    beforeEach(async () => {
      await manager.initialize()
    })
    
    it('should save constraint successfully', async () => {
      const testConstraint = {
        equationId: 'eq1',
        nodeId: 'node1',
        constraintId: 'constraint1',
        type: 'range',
        value: { min: 0, max: 100 },
        createdAt: new Date().toISOString()
      }
      
      const result = await manager.saveConstraint(testConstraint)
      expect(result).toBe(true)
    })
    
    it('should load constraints for equation', async () => {
      // Save multiple constraints
      const constraints = [
        {
          equationId: 'eq1',
          nodeId: 'node1',
          constraintId: 'c1',
          type: 'range',
          value: { min: 0, max: 10 },
          createdAt: new Date().toISOString()
        },
        {
          equationId: 'eq1',
          nodeId: 'node2', 
          constraintId: 'c2',
          type: 'fixed',
          value: 5,
          createdAt: new Date().toISOString()
        }
      ]
      
      for (const constraint of constraints) {
        await manager.saveConstraint(constraint)
      }
      
      const loadedConstraints = await manager.getConstraintsForEquation('eq1')
      expect(loadedConstraints).toHaveLength(2)
      expect(loadedConstraints.find(c => c.constraintId === 'c1')).toBeDefined()
      expect(loadedConstraints.find(c => c.constraintId === 'c2')).toBeDefined()
    })
  })
  
  describe('Error Handling', () => {
    it('should handle database operation errors gracefully', async () => {
      // Initialize first
      await manager.initialize()
      
      // Close the database to simulate connection error
      manager.db.close()
      
      // Try to save equation - should handle error
      const testEquation = {
        id: 'error-test',
        name: 'Error Test',
        nodes: [],
        connections: [],
        metadata: { nodeCount: 0 },
        created: new Date().toISOString(),
        hasConstraints: false
      }
      
      const result = await manager.saveEquation(testEquation)
      expect(result).toBeNull()
      expect(mockNotificationSystem.show).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save equation'),
        'error'
      )
    })
    
    it('should validate equation data before saving', async () => {
      await manager.initialize()
      
      // Try to save invalid equation (missing required fields)
      const invalidEquation = {
        name: 'Invalid Equation'
        // Missing required fields like id, nodes, etc.
      }
      
      const result = await manager.saveEquation(invalidEquation)
      expect(result).toBeNull()
    })
  })
  
  describe('Migration and Compatibility', () => {
    it('should handle localStorage migration if available', async () => {
      // Mock localStorage with existing data
      const mockEquations = {
        'old-eq-1': {
          id: 'old-eq-1',
          name: 'Old Equation',
          nodes: [],
          connections: []
        }
      }
      
      global.localStorage.getItem.mockReturnValue(JSON.stringify(mockEquations))
      
      await manager.initialize()
      
      // Check if migration was attempted
      expect(global.localStorage.getItem).toHaveBeenCalledWith('equations')
    })
  })
})
