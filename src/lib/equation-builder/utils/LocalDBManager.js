/**
 * LocalDBManager - Advanced IndexedDB Integration for Equation Builder
 * 
 * Provides enhanced data persistence using IndexedDB with support for:
 * - Complex constraint data storage
 * - Advanced querying and indexing
 * - Large dataset handling
 * - Asynchronous operations
 * - Migration from localStorage
 * 
 * Research-driven implementation based on modern browser database patterns
 */

import { createComponentLogger } from '../../utils/Logger.js';

export class LocalDBManager {
  constructor(notificationSystem) {
    this.notificationSystem = notificationSystem;
    this.logger = createComponentLogger('LocalDBManager', notificationSystem);
    this.dbName = 'EquationBuilderDB';
    this.dbVersion = 1;
    this.db = null;
    
    // Database schema definition
    this.schema = {
      equations: {
        keyPath: 'id',
        indexes: {
          'timestamp': { keyPath: 'timestamp', unique: false },
          'name': { keyPath: 'name', unique: false },
          'hasConstraints': { keyPath: 'hasConstraints', unique: false },
          'nodeCount': { keyPath: 'metadata.nodeCount', unique: false },
          'created': { keyPath: 'created', unique: false }
        }
      },
      constraints: {
        keyPath: ['equationId', 'nodeId', 'constraintId'],
        indexes: {
          'equationId': { keyPath: 'equationId', unique: false },
          'nodeId': { keyPath: 'nodeId', unique: false },
          'constraintType': { keyPath: 'type', unique: false },
          'createdAt': { keyPath: 'createdAt', unique: false }
        }
      },
      settings: {
        keyPath: 'key',
        indexes: {}
      },
      metadata: {
        keyPath: 'id',
        indexes: {
          'type': { keyPath: 'type', unique: false },
          'lastModified': { keyPath: 'lastModified', unique: false }
        }
      }
    };
    
    this.logger.info('LocalDBManager initialized with IndexedDB support');
  }

  /**
   * Initialize IndexedDB connection
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      if (!window.indexedDB) {
        this.logger.warn('IndexedDB not supported, falling back to localStorage');
        return false;
      }

      this.db = await this.openDatabase();
      this.logger.info('LocalDBManager successfully connected to IndexedDB');
      
      // Migrate data from localStorage if needed
      await this.migrateFromLocalStorage();
      
      return true;
    } catch (error) {
      this.logger.error('LocalDBManager initialization failed:', error);
      this.notificationSystem?.show('Database initialization failed, using basic storage', 'warning');
      return false;
    }
  }

  /**
   * Open IndexedDB database with schema setup
   * @returns {Promise<IDBDatabase>}
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        
        console.log(`Upgrading database from version ${oldVersion} to ${this.dbVersion}`);
        
        // Create object stores based on schema
        Object.entries(this.schema).forEach(([storeName, storeConfig]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { 
              keyPath: storeConfig.keyPath,
              autoIncrement: Array.isArray(storeConfig.keyPath) ? false : true
            });
            
            // Create indexes
            Object.entries(storeConfig.indexes).forEach(([indexName, indexConfig]) => {
              store.createIndex(indexName, indexConfig.keyPath, { 
                unique: indexConfig.unique || false 
              });
            });
            
            console.log(`Created object store: ${storeName}`);
          }
        });
      };
    });
  }

  /**
   * Save equation data to IndexedDB
   * @param {Object} equationData - Complete equation data with constraints
   * @param {string} name - Human-readable name for the equation
   * @returns {Promise<string>} Equation ID
   */
  async saveEquation(equationData, name = null) {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const equationId = `eq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();
      
      // Enhanced equation record
      const equationRecord = {
        id: equationId,
        name: name || `Equation ${new Date().toLocaleDateString()}`,
        timestamp,
        created: timestamp,
        lastModified: timestamp,
        data: equationData,
        hasConstraints: this.hasConstraintsInData(equationData),
        metadata: {
          nodeCount: equationData.nodes?.length || 0,
          connectionCount: equationData.connections?.length || 0,
          constraintCount: this.countConstraints(equationData),
          version: equationData.version || '1.0.0'
        }
      };

      // Save main equation record
      const transaction = this.db.transaction(['equations', 'constraints'], 'readwrite');
      const equationStore = transaction.objectStore('equations');
      const constraintStore = transaction.objectStore('constraints');
      
      await this.promisifyRequest(equationStore.put(equationRecord));
      
      // Save individual constraints for advanced querying
      if (equationData.constraintSystem) {
        await this.saveConstraintRecords(constraintStore, equationId, equationData.constraintSystem);
      }
      
      await this.promisifyTransaction(transaction);
      
      this.notificationSystem?.show(`Equation saved to database: ${equationRecord.name}`, 'success');
      return equationId;
      
    } catch (error) {
      console.error('Save equation failed:', error);
      this.notificationSystem?.show('Failed to save equation to database', 'error');
      throw error;
    }
  }

  /**
   * Load equation data from IndexedDB
   * @param {string} equationId - Equation ID to load
   * @returns {Promise<Object>} Equation data
   */
  async loadEquation(equationId) {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction(['equations'], 'readonly');
      const store = transaction.objectStore('equations');
      const request = store.get(equationId);
      
      const result = await this.promisifyRequest(request);
      
      if (!result) {
        throw new Error(`Equation not found: ${equationId}`);
      }
      
      // Update last accessed timestamp
      result.lastAccessed = new Date().toISOString();
      const updateTransaction = this.db.transaction(['equations'], 'readwrite');
      const updateStore = updateTransaction.objectStore('equations');
      await this.promisifyRequest(updateStore.put(result));
      
      this.notificationSystem?.show(`Equation loaded: ${result.name}`, 'success');
      return result.data;
      
    } catch (error) {
      console.error('Load equation failed:', error);
      this.notificationSystem?.show('Failed to load equation from database', 'error');
      throw error;
    }
  }

  /**
   * Get list of all saved equations with metadata
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of equation metadata
   */
  async getEquationList(options = {}) {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction(['equations'], 'readonly');
      const store = transaction.objectStore('equations');
      
      let request;
      if (options.sortBy === 'name') {
        request = store.index('name').getAll();
      } else if (options.sortBy === 'created') {
        request = store.index('created').getAll();
      } else {
        request = store.index('timestamp').getAll();
      }
      
      const results = await this.promisifyRequest(request);
      
      // Filter results based on options
      let filteredResults = results;
      
      if (options.hasConstraints === true) {
        filteredResults = filteredResults.filter(eq => eq.hasConstraints);
      } else if (options.hasConstraints === false) {
        filteredResults = filteredResults.filter(eq => !eq.hasConstraints);
      }
      
      if (options.minNodes) {
        filteredResults = filteredResults.filter(eq => 
          eq.metadata.nodeCount >= options.minNodes
        );
      }
      
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        filteredResults = filteredResults.filter(eq =>
          eq.name.toLowerCase().includes(searchLower)
        );
      }
      
      // Sort results
      if (options.sortOrder === 'desc') {
        filteredResults.reverse();
      }
      
      // Limit results
      if (options.limit) {
        filteredResults = filteredResults.slice(0, options.limit);
      }
      
      return filteredResults.map(eq => ({
        id: eq.id,
        name: eq.name,
        created: eq.created,
        lastModified: eq.lastModified,
        lastAccessed: eq.lastAccessed,
        hasConstraints: eq.hasConstraints,
        metadata: eq.metadata
      }));
      
    } catch (error) {
      console.error('Get equation list failed:', error);
      return [];
    }
  }

  /**
   * Delete equation from database
   * @param {string} equationId - Equation ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteEquation(equationId) {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction(['equations', 'constraints'], 'readwrite');
      const equationStore = transaction.objectStore('equations');
      const constraintStore = transaction.objectStore('constraints');
      
      // Delete main equation record
      await this.promisifyRequest(equationStore.delete(equationId));
      
      // Delete associated constraint records
      const constraintIndex = constraintStore.index('equationId');
      const constraintRequest = constraintIndex.getAllKeys(equationId);
      const constraintKeys = await this.promisifyRequest(constraintRequest);
      
      for (const key of constraintKeys) {
        await this.promisifyRequest(constraintStore.delete(key));
      }
      
      await this.promisifyTransaction(transaction);
      
      this.notificationSystem?.show('Equation deleted from database', 'success');
      return true;
      
    } catch (error) {
      console.error('Delete equation failed:', error);
      this.notificationSystem?.show('Failed to delete equation', 'error');
      return false;
    }
  }

  /**
   * Search equations by constraints
   * @param {Object} constraintQuery - Constraint search parameters
   * @returns {Promise<Array>} Array of matching equations
   */
  async searchByConstraints(constraintQuery) {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction(['constraints', 'equations'], 'readonly');
      const constraintStore = transaction.objectStore('constraints');
      const equationStore = transaction.objectStore('equations');
      
      let constraintResults;
      
      if (constraintQuery.type) {
        const typeIndex = constraintStore.index('constraintType');
        constraintResults = await this.promisifyRequest(typeIndex.getAll(constraintQuery.type));
      } else {
        constraintResults = await this.promisifyRequest(constraintStore.getAll());
      }
      
      // Get unique equation IDs
      const equationIds = [...new Set(constraintResults.map(c => c.equationId))];
      
      // Load equation metadata
      const equations = [];
      for (const id of equationIds) {
        const equation = await this.promisifyRequest(equationStore.get(id));
        if (equation) {
          equations.push({
            id: equation.id,
            name: equation.name,
            created: equation.created,
            hasConstraints: equation.hasConstraints,
            metadata: equation.metadata
          });
        }
      }
      
      return equations;
      
    } catch (error) {
      console.error('Search by constraints failed:', error);
      return [];
    }
  }

  /**
   * Export all data from database
   * @returns {Promise<Object>} Complete database export
   */
  async exportAllData() {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction(['equations', 'constraints', 'settings'], 'readonly');
      
      const equations = await this.promisifyRequest(
        transaction.objectStore('equations').getAll()
      );
      
      const constraints = await this.promisifyRequest(
        transaction.objectStore('constraints').getAll()
      );
      
      const settings = await this.promisifyRequest(
        transaction.objectStore('settings').getAll()
      );
      
      return {
        version: this.dbVersion,
        exportDate: new Date().toISOString(),
        data: {
          equations,
          constraints,
          settings
        },
        metadata: {
          equationCount: equations.length,
          constraintCount: constraints.length,
          settingCount: settings.length
        }
      };
      
    } catch (error) {
      console.error('Export all data failed:', error);
      throw error;
    }
  }

  /**
   * Import data into database
   * @param {Object} importData - Data to import
   * @returns {Promise<boolean>} Success status
   */
  async importAllData(importData) {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      if (!importData.data) {
        throw new Error('Invalid import data format');
      }

      const transaction = this.db.transaction(['equations', 'constraints', 'settings'], 'readwrite');
      
      // Import equations
      if (importData.data.equations) {
        const equationStore = transaction.objectStore('equations');
        for (const equation of importData.data.equations) {
          await this.promisifyRequest(equationStore.put(equation));
        }
      }
      
      // Import constraints
      if (importData.data.constraints) {
        const constraintStore = transaction.objectStore('constraints');
        for (const constraint of importData.data.constraints) {
          await this.promisifyRequest(constraintStore.put(constraint));
        }
      }
      
      // Import settings
      if (importData.data.settings) {
        const settingsStore = transaction.objectStore('settings');
        for (const setting of importData.data.settings) {
          await this.promisifyRequest(settingsStore.put(setting));
        }
      }
      
      await this.promisifyTransaction(transaction);
      
      this.notificationSystem?.show(
        `Imported ${importData.metadata?.equationCount || 0} equations with constraints`, 
        'success'
      );
      
      return true;
      
    } catch (error) {
      console.error('Import all data failed:', error);
      this.notificationSystem?.show('Failed to import data', 'error');
      return false;
    }
  }

  /**
   * Migration from localStorage to IndexedDB
   */
  async migrateFromLocalStorage() {
    try {
      const storagePrefix = 'equation-builder';
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(storagePrefix)
      );
      
      if (keys.length === 0) {
        console.log('No localStorage data to migrate');
        return;
      }
      
      console.log(`Found ${keys.length} localStorage items to migrate`);
      
      for (const key of keys) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data && data.nodes) {
            // This looks like equation data
            const name = `Migrated: ${key.replace(storagePrefix + '-', '')}`;
            await this.saveEquation(data, name);
          }
        } catch (e) {
          console.warn(`Failed to migrate ${key}:`, e);
        }
      }
      
      this.notificationSystem?.show(
        `Migrated ${keys.length} items from localStorage to database`, 
        'success'
      );
      
    } catch (error) {
      console.error('Migration from localStorage failed:', error);
    }
  }

  /**
   * Helper Methods
   */

  hasConstraintsInData(data) {
    if (data.constraintSystem && data.constraintSystem.constraints) {
      return Object.keys(data.constraintSystem.constraints).length > 0;
    }
    return data.nodes?.some(node => node.constraints?.length > 0) || false;
  }

  countConstraints(data) {
    let count = 0;
    if (data.constraintSystem?.constraints) {
      Object.values(data.constraintSystem.constraints).forEach(nodeConstraints => {
        count += nodeConstraints.length;
      });
    }
    return count;
  }

  async saveConstraintRecords(constraintStore, equationId, constraintSystem) {
    if (!constraintSystem.constraints) return;
    
    for (const [nodeId, constraints] of Object.entries(constraintSystem.constraints)) {
      for (const constraint of constraints) {
        const constraintRecord = {
          equationId,
          nodeId,
          constraintId: constraint.id,
          type: constraint.type,
          data: constraint.data,
          createdAt: constraint.createdAt,
          active: constraint.active
        };
        
        await this.promisifyRequest(constraintStore.put(constraintRecord));
      }
    }
  }

  promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  promisifyTransaction(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Database maintenance and optimization
   */
  async performMaintenance() {
    try {
      console.log('Performing database maintenance...');
      
      // Clean up old equations if needed
      const equations = await this.getEquationList({ sortBy: 'created' });
      const maxEquations = 1000; // Configurable limit
      
      if (equations.length > maxEquations) {
        const toDelete = equations.slice(maxEquations);
        for (const eq of toDelete) {
          await this.deleteEquation(eq.id);
        }
        console.log(`Cleaned up ${toDelete.length} old equations`);
      }
      
      // Update database statistics
      await this.updateDatabaseStats();
      
    } catch (error) {
      console.error('Database maintenance failed:', error);
    }
  }

  async updateDatabaseStats() {
    const stats = {
      lastMaintenance: new Date().toISOString(),
      equationCount: (await this.getEquationList()).length,
      constraintCount: await this.getConstraintCount(),
      databaseSize: await this.estimateDatabaseSize()
    };
    
    const transaction = this.db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    await this.promisifyRequest(store.put({ key: 'database_stats', value: stats }));
  }

  async getConstraintCount() {
    if (!this.db) return 0;
    
    try {
      const transaction = this.db.transaction(['constraints'], 'readonly');
      const store = transaction.objectStore('constraints');
      const request = store.count();
      return await this.promisifyRequest(request);
    } catch (error) {
      return 0;
    }
  }

  async estimateDatabaseSize() {
    if (!navigator.storage?.estimate) return 'unknown';
    
    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage,
        quota: estimate.quota,
        usedMB: Math.round(estimate.usage / 1024 / 1024 * 100) / 100,
        quotaMB: Math.round(estimate.quota / 1024 / 1024)
      };
    } catch (error) {
      return 'unavailable';
    }
  }
}
