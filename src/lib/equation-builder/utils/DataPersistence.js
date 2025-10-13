/**
 * DataPersistence - Comprehensive node map save/load system
 * 
 * Handles localStorage persistence, import/export functionality,
 * LocalDB (IndexedDB) integration, and multiple save slots for equation builder node maps.
 * 
 * Part of the modular equation builder architecture
 */

import { LocalDBManager } from './LocalDBManager.js';

export class DataPersistence {
  constructor(nodeManager, connectionSystem, notificationSystem) {
    this.nodeManager = nodeManager;
    this.connectionSystem = connectionSystem;
    this.notificationSystem = notificationSystem;
    
    // Storage configuration
    this.storagePrefix = 'equation-builder';
    this.currentSlotKey = `${this.storagePrefix}-current-slot`;
    this.autoSaveInterval = 5000; // 5 seconds
    this.maxSaveSlots = 10;
    
    // Auto-save management
    this.autoSaveTimer = null;
    this.hasUnsavedChanges = false;
    
    // LocalDB integration
    this.localDB = new LocalDBManager(notificationSystem);
    this.dbInitialized = false;
    
    // Initialize database connection
    this.initializeDatabase();
    
    console.log('DataPersistence initialized with LocalDB and comprehensive save/load capabilities');
  }
  
  /**
   * SAVE SYSTEM
   */
  
  /**
   * Get complete serializable state of current node map
   * @returns {Object} Complete node map state
   */
  getNodeMapState() {
    const state = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      metadata: {
        nodeCount: this.nodeManager.nodes.size,
        connectionCount: this.connectionSystem.connections.length,
        generatedBy: 'equation-builder-advanced'
      },
      nodes: [],
      connections: [],
      canvasState: {
        transformX: 0,
        transformY: 0,
        // Will be enhanced when canvas panning state is available
      }
    };
    
    // Serialize all nodes
    this.nodeManager.nodes.forEach((nodeData, nodeId) => {
      const nodeElement = nodeData.element;
      const rect = nodeElement.getBoundingClientRect();
      const canvasRect = this.nodeManager.canvas.getBoundingClientRect();
      
      state.nodes.push({
        id: nodeId,
        type: nodeData.nodeType,
        content: nodeData.content,
        position: {
          x: nodeElement.offsetLeft,
          y: nodeElement.offsetTop,
          // Relative position within canvas
          relativeX: (rect.left - canvasRect.left) / canvasRect.width,
          relativeY: (rect.top - canvasRect.top) / canvasRect.height
        },
        style: {
          backgroundColor: nodeElement.style.backgroundColor || '',
          borderColor: nodeElement.style.borderColor || '',
          // Store any custom styling
        },
        // Enhanced constraint data persistence
        constraints: nodeData.hasConstraints ? this.nodeManager.getNodeConstraints(nodeId) : [],
        hasConstraints: nodeData.hasConstraints || false,
        isValid: nodeData.isValid !== undefined ? nodeData.isValid : true,
        constraintViolation: nodeData.constraintViolation || null
      });
    });
    
    // Serialize all connections
    this.connectionSystem.connections.forEach(connection => {
      state.connections.push({
        id: connection.id,
        from: connection.from,
        to: connection.to,
        fromPortIndex: connection.fromPortIndex,
        toPortIndex: connection.toPortIndex,
        created: connection.created
      });
    });
    
    // Add comprehensive constraint system data
    state.constraintSystem = this.nodeManager.exportConstraintsData();
    
    return state;
  }
  
  /**
   * Save current node map to localStorage
   * @param {string} slotName - Name of save slot (optional)
   * @returns {boolean} Success status
   */
  saveToLocalStorage(slotName = null) {
    try {
      const state = this.getNodeMapState();
      const slotKey = slotName ? `${this.storagePrefix}-slot-${slotName}` : this.getCurrentSlotKey();
      
      // Add slot metadata
      state.metadata.slotName = slotName || 'autosave';
      state.metadata.saveType = slotName ? 'manual' : 'auto';
      
      // Store the data
      localStorage.setItem(slotKey, JSON.stringify(state));
      
      // Update current slot reference
      if (slotName) {
        localStorage.setItem(this.currentSlotKey, slotName);
      }
      
      // Update save slots index
      this.updateSaveSlotsIndex(slotName || 'autosave', state.metadata);
      
      this.hasUnsavedChanges = false;
      this.notificationSystem.show(`Node map saved${slotName ? ` to slot: ${slotName}` : ' (auto)'}`, 'success');
      
      return true;
    } catch (error) {
      console.error('Save to localStorage failed:', error);
      this.notificationSystem.show('Save failed: ' + error.message, 'error');
      return false;
    }
  }
  
  /**
   * AUTO-SAVE SYSTEM
   */
  
  /**
   * Mark that changes have been made and need saving
   */
  markChanges() {
    this.hasUnsavedChanges = true;
    this.scheduleAutoSave();
  }
  
  /**
   * Schedule auto-save with debouncing
   */
  scheduleAutoSave() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setTimeout(() => {
      if (this.hasUnsavedChanges) {
        this.saveToLocalStorage(); // Auto-save to current slot
      }
    }, this.autoSaveInterval);
  }
  
  /**
   * LOAD SYSTEM
   */
  
  /**
   * Load node map from localStorage
   * @param {string} slotName - Name of save slot (optional)
   * @returns {boolean} Success status
   */
  loadFromLocalStorage(slotName = null) {
    try {
      const slotKey = slotName ? `${this.storagePrefix}-slot-${slotName}` : this.getCurrentSlotKey();
      const savedData = localStorage.getItem(slotKey);
      
      if (!savedData) {
        this.notificationSystem.show(`No saved data found${slotName ? ` in slot: ${slotName}` : ''}`, 'warning');
        return false;
      }
      
      const state = JSON.parse(savedData);
      return this.loadNodeMapState(state, slotName);
      
    } catch (error) {
      console.error('Load from localStorage failed:', error);
      this.notificationSystem.show('Load failed: ' + error.message, 'error');
      return false;
    }
  }
  
  /**
   * Load node map state into the editor
   * @param {Object} state - Node map state object
   * @param {string} slotName - Source slot name (for messaging)
   * @returns {boolean} Success status
   */
  loadNodeMapState(state, slotName = null) {
    try {
      // Validate state structure
      if (!state.nodes || !state.connections) {
        throw new Error('Invalid save data structure');
      }
      
      // Clear current node map
      this.clearCurrentNodeMap();
      
      // Restore nodes
      state.nodes.forEach(nodeData => {
        const nodeId = this.nodeManager.createNode(nodeData.content, {
          x: nodeData.position.x,
          y: nodeData.position.y
        });
        
        // Apply saved styling
        if (nodeId && nodeData.style) {
          const nodeElement = document.getElementById(nodeId);
          if (nodeElement) {
            if (nodeData.style.backgroundColor) {
              nodeElement.style.backgroundColor = nodeData.style.backgroundColor;
            }
            if (nodeData.style.borderColor) {
              nodeElement.style.borderColor = nodeData.style.borderColor;
            }
          }
        }
        
        // Restore constraints for this node if available
        if (nodeData.constraints && nodeData.constraints.length > 0 && nodeData.hasConstraints) {
          // Import constraints for this specific node
          nodeData.constraints.forEach(constraint => {
            this.nodeManager.addConstraintToNode(nodeId, constraint.type, constraint.data);
          });
        }
      });
      
      // Restore global constraint system data if available
      if (state.constraintSystem) {
        this.nodeManager.importConstraintsData(state.constraintSystem);
      }
      
      // Restore connections (after small delay to ensure nodes are ready)
      setTimeout(() => {
        state.connections.forEach(connData => {
          this.connectionSystem.createConnection(
            connData.from,
            connData.to,
            connData.fromPortIndex,
            connData.toPortIndex
          );
        });
        
        // Update equations after all connections restored
        if (this.nodeManager.updateEquationOutput) {
          this.nodeManager.updateEquationOutput();
        }
      }, 100);
      
      // Update current slot reference
      if (slotName) {
        localStorage.setItem(this.currentSlotKey, slotName);
      }
      
      this.hasUnsavedChanges = false;
      this.notificationSystem.show(`Node map loaded${slotName ? ` from slot: ${slotName}` : ''}`, 'success');
      
      return true;
    } catch (error) {
      console.error('Load node map state failed:', error);
      this.notificationSystem.show('Load failed: ' + error.message, 'error');
      return false;
    }
  }
  
  /**
   * SAVE SLOT MANAGEMENT
   */
  
  /**
   * Get list of all save slots
   * @returns {Array} Array of save slot metadata
   */
  getSaveSlots() {
    try {
      const slotsData = localStorage.getItem(`${this.storagePrefix}-slots-index`);
      return slotsData ? JSON.parse(slotsData) : [];
    } catch (error) {
      console.error('Get save slots failed:', error);
      return [];
    }
  }
  
  /**
   * Update save slots index
   * @param {string} slotName - Slot name
   * @param {Object} metadata - Slot metadata
   */
  updateSaveSlotsIndex(slotName, metadata) {
    try {
      let slots = this.getSaveSlots();
      
      // Remove existing entry for this slot
      slots = slots.filter(slot => slot.name !== slotName);
      
      // Add new entry
      slots.push({
        name: slotName,
        timestamp: metadata.timestamp,
        nodeCount: metadata.nodeCount,
        connectionCount: metadata.connectionCount,
        saveType: metadata.saveType
      });
      
      // Sort by timestamp (newest first) and limit to max slots
      slots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      slots = slots.slice(0, this.maxSaveSlots);
      
      localStorage.setItem(`${this.storagePrefix}-slots-index`, JSON.stringify(slots));
    } catch (error) {
      console.error('Update save slots index failed:', error);
    }
  }
  
  /**
   * Delete a save slot
   * @param {string} slotName - Slot name to delete
   * @returns {boolean} Success status
   */
  deleteSaveSlot(slotName) {
    try {
      const slotKey = `${this.storagePrefix}-slot-${slotName}`;
      localStorage.removeItem(slotKey);
      
      // Update slots index
      let slots = this.getSaveSlots();
      slots = slots.filter(slot => slot.name !== slotName);
      localStorage.setItem(`${this.storagePrefix}-slots-index`, JSON.stringify(slots));
      
      this.notificationSystem.show(`Save slot '${slotName}' deleted`, 'success');
      return true;
    } catch (error) {
      console.error('Delete save slot failed:', error);
      this.notificationSystem.show('Delete failed: ' + error.message, 'error');
      return false;
    }
  }
  
  /**
   * IMPORT/EXPORT SYSTEM
   */
  
  /**
   * Export current node map as JSON file
   * @param {string} filename - Export filename (optional)
   */
  exportToFile(filename = null) {
    try {
      const state = this.getNodeMapState();
      const jsonData = JSON.stringify(state, null, 2);
      
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `equation-builder-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.notificationSystem.show('Node map exported successfully', 'success');
    } catch (error) {
      console.error('Export to file failed:', error);
      this.notificationSystem.show('Export failed: ' + error.message, 'error');
    }
  }
  
  /**
   * Import node map from JSON file
   * @param {File} file - File object to import
   * @returns {Promise<boolean>} Success status
   */
  importFromFile(file) {
    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const state = JSON.parse(e.target.result);
            const success = this.loadNodeMapState(state, `imported from ${file.name}`);
            resolve(success);
          } catch (error) {
            console.error('Import file parsing failed:', error);
            this.notificationSystem.show('Import failed: Invalid file format', 'error');
            resolve(false);
          }
        };
        
        reader.onerror = () => {
          this.notificationSystem.show('Import failed: Could not read file', 'error');
          resolve(false);
        };
        
        reader.readAsText(file);
      } catch (error) {
        console.error('Import from file failed:', error);
        this.notificationSystem.show('Import failed: ' + error.message, 'error');
        resolve(false);
      }
    });
  }
  
  /**
   * UTILITY METHODS
   */
  
  /**
   * Get current save slot key
   * @returns {string} Current slot storage key
   */
  getCurrentSlotKey() {
    const currentSlot = localStorage.getItem(this.currentSlotKey) || 'autosave';
    return `${this.storagePrefix}-slot-${currentSlot}`;
  }
  
  /**
   * Clear current node map
   */
  clearCurrentNodeMap() {
    // Clear all nodes
    this.nodeManager.nodes.forEach((nodeData, nodeId) => {
      if (nodeData.element && nodeData.element.parentNode) {
        nodeData.element.parentNode.removeChild(nodeData.element);
      }
    });
    this.nodeManager.nodes.clear();
    
    // Clear all connections
    this.connectionSystem.connections = [];
    this.connectionSystem.renderConnections();
    
    // Reset node counter if available
    if (this.nodeManager.nodeIdCounter !== undefined) {
      this.nodeManager.nodeIdCounter = 1;
    }
  }
  
  /**
   * Get storage usage information
   * @returns {Object} Storage usage stats
   */
  getStorageInfo() {
    try {
      let totalSize = 0;
      let slotCount = 0;
      
      for (let key in localStorage) {
        if (key.startsWith(this.storagePrefix)) {
          totalSize += localStorage[key].length;
          if (key.includes('-slot-')) {
            slotCount++;
          }
        }
      }
      
      return {
        totalSize,
        slotCount,
        maxSlots: this.maxSaveSlots,
        hasUnsavedChanges: this.hasUnsavedChanges
      };
    } catch (error) {
      console.error('Get storage info failed:', error);
      return { totalSize: 0, slotCount: 0, maxSlots: this.maxSaveSlots, hasUnsavedChanges: false };
    }
  }

  /**
   * LOCALDB INTEGRATION METHODS
   */

  /**
   * Initialize LocalDB connection
   */
  async initializeDatabase() {
    try {
      this.dbInitialized = await this.localDB.initialize();
      if (this.dbInitialized) {
        console.log('LocalDB integration successfully initialized');
        // Perform maintenance check periodically
        setTimeout(() => this.localDB.performMaintenance(), 10000);
      } else {
        console.log('Using localStorage fallback for data persistence');
      }
    } catch (error) {
      console.error('Database initialization failed:', error);
      this.dbInitialized = false;
    }
  }

  /**
   * Save current equation to LocalDB with enhanced metadata
   * @param {string} name - Human-readable name for the equation
   * @returns {Promise<string>} Equation ID if successful
   */
  async saveToDatabase(name = null) {
    try {
      if (!this.dbInitialized) {
        throw new Error('Database not initialized, using localStorage fallback');
      }

      const equationData = this.getNodeMapState();
      
      // Add constraint system data if available
      if (this.nodeManager.constraintEngine) {
        equationData.constraintSystem = {
          constraints: this.nodeManager.getAllConstraints(),
          validationResults: this.nodeManager.getConstraintValidationResults(),
          version: this.nodeManager.constraintEngine.version || '1.0.0'
        };
      }

      const equationId = await this.localDB.saveEquation(equationData, name);
      
      // Reset unsaved changes flag
      this.hasUnsavedChanges = false;
      
      return equationId;
      
    } catch (error) {
      console.error('Save to database failed:', error);
      // Fallback to localStorage
      return this.saveNodeMap();
    }
  }

  /**
   * Load equation from LocalDB
   * @param {string} equationId - ID of equation to load
   * @returns {Promise<boolean>} Success status
   */
  async loadFromDatabase(equationId) {
    try {
      if (!this.dbInitialized) {
        throw new Error('Database not initialized');
      }

      const equationData = await this.localDB.loadEquation(equationId);
      
      // Use existing loadNodeMapState method
      return this.loadNodeMapState(equationData);
      
    } catch (error) {
      console.error('Load from database failed:', error);
      this.notificationSystem?.show('Failed to load equation from database', 'error');
      return false;
    }
  }

  /**
   * Get list of all saved equations from LocalDB
   * @param {Object} options - Query options for filtering and sorting
   * @returns {Promise<Array>} Array of equation metadata
   */
  async getDatabaseEquationList(options = {}) {
    try {
      if (!this.dbInitialized) {
        return [];
      }

      return await this.localDB.getEquationList(options);
      
    } catch (error) {
      console.error('Get database equation list failed:', error);
      return [];
    }
  }

  /**
   * Delete equation from LocalDB
   * @param {string} equationId - ID of equation to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteFromDatabase(equationId) {
    try {
      if (!this.dbInitialized) {
        return false;
      }

      return await this.localDB.deleteEquation(equationId);
      
    } catch (error) {
      console.error('Delete from database failed:', error);
      return false;
    }
  }

  /**
   * Search equations by constraint properties
   * @param {Object} constraintQuery - Constraint search parameters
   * @returns {Promise<Array>} Array of matching equations
   */
  async searchEquationsByConstraints(constraintQuery) {
    try {
      if (!this.dbInitialized) {
        return [];
      }

      return await this.localDB.searchByConstraints(constraintQuery);
      
    } catch (error) {
      console.error('Search equations by constraints failed:', error);
      return [];
    }
  }

  /**
   * Export all equation data from LocalDB
   * @returns {Promise<Object>} Complete database export
   */
  async exportDatabaseData() {
    try {
      if (!this.dbInitialized) {
        throw new Error('Database not initialized');
      }

      return await this.localDB.exportAllData();
      
    } catch (error) {
      console.error('Export database data failed:', error);
      throw error;
    }
  }

  /**
   * Import equation data into LocalDB
   * @param {Object} importData - Data to import
   * @returns {Promise<boolean>} Success status
   */
  async importDatabaseData(importData) {
    try {
      if (!this.dbInitialized) {
        return false;
      }

      return await this.localDB.importAllData(importData);
      
    } catch (error) {
      console.error('Import database data failed:', error);
      return false;
    }
  }

  /**
   * Get database usage statistics
   * @returns {Promise<Object>} Database statistics
   */
  async getDatabaseStats() {
    try {
      if (!this.dbInitialized) {
        return { 
          available: false, 
          message: 'Database not initialized' 
        };
      }

      const equations = await this.getDatabaseEquationList();
      const constraintCount = await this.localDB.getConstraintCount();
      const sizeEstimate = await this.localDB.estimateDatabaseSize();

      return {
        available: true,
        equationCount: equations.length,
        constraintCount,
        storage: sizeEstimate,
        hasConstraints: equations.filter(eq => eq.hasConstraints).length,
        averageNodeCount: equations.length > 0 
          ? Math.round(equations.reduce((sum, eq) => sum + (eq.metadata?.nodeCount || 0), 0) / equations.length)
          : 0
      };
      
    } catch (error) {
      console.error('Get database stats failed:', error);
      return { available: false, error: error.message };
    }
  }

  /**
   * Auto-save to database if enabled
   * @private
   */
  async autoSaveToDatabase() {
    if (!this.dbInitialized || !this.hasUnsavedChanges) {
      return;
    }

    try {
      const autoSaveName = `AutoSave ${new Date().toLocaleString()}`;
      await this.saveToDatabase(autoSaveName);
      console.log('Auto-saved to database successfully');
    } catch (error) {
      console.error('Auto-save to database failed:', error);
      // Fallback to localStorage auto-save
      this.autoSave();
    }
  }

  /**
   * Enhanced save with database preference
   * @param {string} name - Optional name for the save
   * @param {boolean} useDatabase - Prefer database over localStorage
   * @returns {Promise<string>} Save ID/key
   */
  async saveEquation(name = null, useDatabase = true) {
    if (useDatabase && this.dbInitialized) {
      return await this.saveToDatabase(name);
    } else {
      return this.saveNodeMap();
    }
  }

  /**
   * Enhanced load with database preference
   * @param {string} id - Equation ID or localStorage key
   * @param {boolean} fromDatabase - Load from database vs localStorage
   * @returns {Promise<boolean>} Success status
   */
  async loadEquation(id, fromDatabase = true) {
    if (fromDatabase && this.dbInitialized) {
      return await this.loadFromDatabase(id);
    } else {
      return this.loadNodeMap(id);
    }
  }
}
