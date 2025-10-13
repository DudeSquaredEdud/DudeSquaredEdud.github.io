/**
 * StarSystemManager - Advanced Input Node Management System
 * 
 * Provides comprehensive starred node management with:
 * - Left sidebar for starred input nodes
 * - Quick editing and batch operations
 * - Visual organization with grouping and filtering
 * - Real-time value updates and validation
 * - Professional workflow optimization
 * 
 * Research-driven implementation for efficient equation input management
 */

export class StarSystemManager {
  constructor(nodeManager, notificationSystem) {
    this.nodeManager = nodeManager;
    this.notificationSystem = notificationSystem;
    
    // Star system state
    this.starredNodes = new Map(); // nodeId -> star data
    this.isVisible = true;
    this.currentFilter = 'all'; // all, variables, constants, invalid
    this.currentSort = 'name'; // name, type, date, value
    
    // UI components
    this.sidebar = null;
    this.nodeList = null;
    this.quickEditPanel = null;
    
    // Batch editing state
    this.selectedNodes = new Set();
    this.batchEditMode = false;
    
    // Performance optimization
    this.updateThrottle = 200; // ms
    this.updateTimer = null;
    
    this.initialize();
    console.log('StarSystemManager initialized with advanced input management');
  }

  /**
   * Initialize the star system
   */
  initialize() {
    this.createStarSystemUI();
    this.bindEvents();
    this.loadStarredNodes();
    
    // Auto-hide/show based on screen size
    this.handleResponsiveLayout();
    
    console.log('Star system UI created and initialized');
  }

  /**
   * Create the complete star system interface
   */
  createStarSystemUI() {
    // Main sidebar container
    this.sidebar = document.createElement('div');
    this.sidebar.className = 'star-system-sidebar';
    this.sidebar.innerHTML = `
      <div class="star-system-header">
        <div class="header-title">
          <i class="icon">⭐</i>
          <span>Starred Inputs</span>
        </div>
        <div class="header-controls">
          <button class="btn-icon toggle-sidebar" title="Toggle Sidebar">
            <i class="icon">◀</i>
          </button>
          <button class="btn-icon batch-mode" title="Batch Edit Mode">
            <i class="icon">☰</i>
          </button>
        </div>
      </div>
      
      <div class="star-system-toolbar">
        <div class="filter-section">
          <label>Filter:</label>
          <select class="filter-select">
            <option value="all">All Nodes</option>
            <option value="variables">Variables</option>
            <option value="constants">Constants</option>
            <option value="invalid">Invalid</option>
          </select>
        </div>
        
        <div class="sort-section">
          <label>Sort:</label>
          <select class="sort-select">
            <option value="name">Name</option>
            <option value="type">Type</option>
            <option value="date">Date Added</option>
            <option value="value">Value</option>
          </select>
          <button class="btn-icon sort-order" title="Toggle Sort Order">⬇️</button>
        </div>
      </div>
      
      <div class="star-system-content">
        <div class="starred-nodes-list" id="starred-nodes-list">
          <!-- Starred nodes will be populated here -->
        </div>
        
        <div class="empty-state" id="empty-state">
          <div class="empty-icon">⭐</div>
          <p>No starred inputs yet</p>
          <small>Click the star icon on any variable or constant node to add it here for quick editing</small>
        </div>
      </div>
      
      <div class="star-system-footer">
        <div class="batch-controls" id="batch-controls" style="display: none;">
          <button class="btn-batch btn-primary" id="batch-edit-values">
            <i class="icon">✏️</i> Edit Values
          </button>
          <button class="btn-batch btn-secondary" id="batch-set-constraints">
            <i class="icon">🔒</i> Set Constraints
          </button>
          <button class="btn-batch btn-danger" id="batch-unstar">
            <i class="icon">⭐</i> Unstar Selected
          </button>
        </div>
        
        <div class="star-count-info" id="star-count-info">
          0 starred inputs
        </div>
      </div>
    `;

    // Quick edit panel (overlay)
    this.quickEditPanel = document.createElement('div');
    this.quickEditPanel.className = 'quick-edit-panel';
    this.quickEditPanel.innerHTML = `
      <div class="quick-edit-content">
        <div class="quick-edit-header">
          <h3 id="quick-edit-title">Quick Edit</h3>
          <button class="close-quick-edit">×</button>
        </div>
        
        <div class="quick-edit-form" id="quick-edit-form">
          <!-- Form content will be dynamically generated -->
        </div>
        
        <div class="quick-edit-actions">
          <button class="btn-primary" id="apply-quick-edit">Apply Changes</button>
          <button class="btn-secondary" id="cancel-quick-edit">Cancel</button>
        </div>
      </div>
    `;

    // Add to document
    document.body.appendChild(this.sidebar);
    document.body.appendChild(this.quickEditPanel);
    
    // Cache important elements
    this.nodeList = this.sidebar.querySelector('#starred-nodes-list');
    this.emptyState = this.sidebar.querySelector('#empty-state');
    this.starCountInfo = this.sidebar.querySelector('#star-count-info');
    this.batchControls = this.sidebar.querySelector('#batch-controls');
    
    // Apply styles
    this.addStarSystemStyles();
  }

  /**
   * Bind all event listeners
   */
  bindEvents() {
    const sidebar = this.sidebar;
    
    // Sidebar toggle
    sidebar.querySelector('.toggle-sidebar').addEventListener('click', () => {
      this.toggleSidebar();
    });
    
    // Batch mode toggle
    sidebar.querySelector('.batch-mode').addEventListener('click', () => {
      this.toggleBatchMode();
    });
    
    // Filter and sort controls
    sidebar.querySelector('.filter-select').addEventListener('change', (e) => {
      this.currentFilter = e.target.value;
      this.updateNodeList();
    });
    
    sidebar.querySelector('.sort-select').addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.updateNodeList();
    });
    
    sidebar.querySelector('.sort-order').addEventListener('click', (e) => {
      const isDesc = e.target.textContent === '⬇️';
      e.target.textContent = isDesc ? '⬆️' : '⬇️';
      this.sortDescending = !isDesc;
      this.updateNodeList();
    });
    
    // Batch operations
    sidebar.querySelector('#batch-edit-values').addEventListener('click', () => {
      this.batchEditValues();
    });
    
    sidebar.querySelector('#batch-set-constraints').addEventListener('click', () => {
      this.batchSetConstraints();
    });
    
    sidebar.querySelector('#batch-unstar').addEventListener('click', () => {
      this.batchUnstarNodes();
    });
    
    // Quick edit panel events
    this.quickEditPanel.querySelector('.close-quick-edit').addEventListener('click', () => {
      this.hideQuickEdit();
    });
    
    this.quickEditPanel.querySelector('#apply-quick-edit').addEventListener('click', () => {
      this.applyQuickEdit();
    });
    
    this.quickEditPanel.querySelector('#cancel-quick-edit').addEventListener('click', () => {
      this.hideQuickEdit();
    });
    
    // Click outside to close quick edit
    this.quickEditPanel.addEventListener('click', (e) => {
      if (e.target === this.quickEditPanel) {
        this.hideQuickEdit();
      }
    });
    
    // Listen for node manager events
    this.setupNodeManagerIntegration();
  }

  /**
   * Integrate with node manager events
   */
  setupNodeManagerIntegration() {
    // Listen for node updates
    if (this.nodeManager.addEventListener) {
      this.nodeManager.addEventListener('nodeUpdated', (event) => {
        this.handleNodeUpdate(event.detail);
      });
      
      this.nodeManager.addEventListener('nodeDeleted', (event) => {
        this.handleNodeDeletion(event.detail.nodeId);
      });
      
      this.nodeManager.addEventListener('nodeValidationChanged', (event) => {
        this.handleValidationChange(event.detail);
      });
    }
    
    // Fallback: periodically check for updates
    setInterval(() => {
      this.syncWithNodeManager();
    }, 5000);
  }

  /**
   * Star a node (add to starred list)
   * @param {string} nodeId - Node ID to star
   * @param {Object} nodeData - Node data
   */
  starNode(nodeId, nodeData = null) {
    if (this.starredNodes.has(nodeId)) {
      return; // Already starred
    }
    
    // Get current node data if not provided
    if (!nodeData) {
      const nodeElement = document.getElementById(nodeId);
      if (!nodeElement) {
        console.warn(`Cannot star node ${nodeId}: element not found`);
        return;
      }
      
      nodeData = this.extractNodeData(nodeElement);
    }
    
    // Validate node type (only variables and constants can be starred)
    if (!['variable', 'constant'].includes(nodeData.type)) {
      this.notificationSystem?.show('Only variable and constant nodes can be starred', 'warning');
      return;
    }
    
    // Add to starred nodes
    const starData = {
      id: nodeId,
      name: nodeData.name || nodeId,
      type: nodeData.type,
      value: nodeData.value,
      constraints: nodeData.constraints || [],
      isValid: nodeData.isValid !== false,
      starredAt: new Date().toISOString(),
      lastEdited: null
    };
    
    this.starredNodes.set(nodeId, starData);
    
    // Update visual star indicator on node
    this.updateNodeStarIndicator(nodeId, true);
    
    // Update UI
    this.scheduleUpdate();
    
    this.notificationSystem?.show(`${nodeData.name || nodeId} starred for quick editing`, 'success');
    
    console.log(`Node starred: ${nodeId}`);
  }

  /**
   * Unstar a node (remove from starred list)
   * @param {string} nodeId - Node ID to unstar
   */
  unstarNode(nodeId) {
    if (!this.starredNodes.has(nodeId)) {
      return; // Not starred
    }
    
    this.starredNodes.delete(nodeId);
    
    // Update visual star indicator on node
    this.updateNodeStarIndicator(nodeId, false);
    
    // Remove from selection if in batch mode
    this.selectedNodes.delete(nodeId);
    
    // Update UI
    this.scheduleUpdate();
    
    console.log(`Node unstarred: ${nodeId}`);
  }

  /**
   * Toggle star status of a node
   * @param {string} nodeId - Node ID to toggle
   */
  toggleNodeStar(nodeId) {
    if (this.starredNodes.has(nodeId)) {
      this.unstarNode(nodeId);
    } else {
      this.starNode(nodeId);
    }
  }

  /**
   * Update starred node list display
   */
  updateNodeList() {
    const filteredNodes = this.getFilteredAndSortedNodes();
    
    if (filteredNodes.length === 0) {
      this.nodeList.style.display = 'none';
      this.emptyState.style.display = 'block';
      this.updateStarCountInfo(0);
      return;
    }
    
    this.nodeList.style.display = 'block';
    this.emptyState.style.display = 'none';
    
    // Render node list
    this.nodeList.innerHTML = filteredNodes.map(node => this.renderStarredNodeItem(node)).join('');
    
    // Bind item events
    this.bindNodeItemEvents();
    
    // Update count
    this.updateStarCountInfo(filteredNodes.length);
  }

  /**
   * Get filtered and sorted nodes
   * @returns {Array} Filtered and sorted node array
   */
  getFilteredAndSortedNodes() {
    let nodes = Array.from(this.starredNodes.values());
    
    // Apply filter
    switch (this.currentFilter) {
      case 'variables':
        nodes = nodes.filter(node => node.type === 'variable');
        break;
      case 'constants':
        nodes = nodes.filter(node => node.type === 'constant');
        break;
      case 'invalid':
        nodes = nodes.filter(node => !node.isValid);
        break;
      // 'all' requires no filtering
    }
    
    // Apply sort
    nodes.sort((a, b) => {
      let comparison = 0;
      
      switch (this.currentSort) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'date':
          comparison = new Date(a.starredAt) - new Date(b.starredAt);
          break;
        case 'value':
          const aVal = parseFloat(a.value) || 0;
          const bVal = parseFloat(b.value) || 0;
          comparison = aVal - bVal;
          break;
      }
      
      return this.sortDescending ? -comparison : comparison;
    });
    
    return nodes;
  }

  /**
   * Render a starred node item
   * @param {Object} node - Node data
   * @returns {string} HTML string
   */
  renderStarredNodeItem(node) {
    const isSelected = this.selectedNodes.has(node.id);
    const hasConstraints = node.constraints && node.constraints.length > 0;
    
    return `
      <div class="starred-node-item ${!node.isValid ? 'invalid' : ''} ${isSelected ? 'selected' : ''}" 
           data-node-id="${node.id}">
        ${this.batchEditMode ? `
          <div class="node-checkbox">
            <input type="checkbox" class="node-select" ${isSelected ? 'checked' : ''}>
          </div>
        ` : ''}
        
        <div class="node-info">
          <div class="node-name-row">
            <span class="node-name">${this.escapeHtml(node.name)}</span>
            <span class="node-type-badge ${node.type}">${node.type}</span>
            ${hasConstraints ? '<span class="constraint-indicator">🔒</span>' : ''}
            ${!node.isValid ? '<span class="invalid-indicator">⚠️</span>' : ''}
          </div>
          
          <div class="node-value-row">
            <input type="text" 
                   class="node-value-input" 
                   value="${this.escapeHtml(node.value || '')}"
                   placeholder="Enter value...">
          </div>
          
          <div class="node-meta-row">
            <small>Starred: ${new Date(node.starredAt).toLocaleDateString()}</small>
            ${node.lastEdited ? 
              `<small>Edited: ${new Date(node.lastEdited).toLocaleDateString()}</small>` : ''
            }
          </div>
        </div>
        
        <div class="node-actions">
          <button class="btn-icon quick-edit-btn" title="Quick Edit">
            <i class="icon">✏️</i>
          </button>
          <button class="btn-icon focus-node-btn" title="Focus on Canvas">
            <i class="icon">🎯</i>
          </button>
          <button class="btn-icon unstar-btn" title="Remove Star">
            <i class="icon">⭐</i>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Bind events for node list items
   */
  bindNodeItemEvents() {
    this.nodeList.querySelectorAll('.starred-node-item').forEach(item => {
      const nodeId = item.dataset.nodeId;
      
      // Checkbox selection (batch mode)
      const checkbox = item.querySelector('.node-select');
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          if (e.target.checked) {
            this.selectedNodes.add(nodeId);
          } else {
            this.selectedNodes.delete(nodeId);
          }
          item.classList.toggle('selected', e.target.checked);
        });
      }
      
      // Value input changes
      const valueInput = item.querySelector('.node-value-input');
      valueInput.addEventListener('change', (e) => {
        this.updateNodeValue(nodeId, e.target.value);
      });
      
      valueInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.updateNodeValue(nodeId, e.target.value);
          e.target.blur();
        }
      });
      
      // Quick edit button
      item.querySelector('.quick-edit-btn').addEventListener('click', () => {
        this.showQuickEdit(nodeId);
      });
      
      // Focus node button
      item.querySelector('.focus-node-btn').addEventListener('click', () => {
        this.focusNodeOnCanvas(nodeId);
      });
      
      // Unstar button
      item.querySelector('.unstar-btn').addEventListener('click', () => {
        this.unstarNode(nodeId);
      });
    });
  }

  /**
   * Update node value
   * @param {string} nodeId - Node ID
   * @param {string} newValue - New value
   */
  updateNodeValue(nodeId, newValue) {
    // Update in node manager
    if (this.nodeManager.updateNodeContent) {
      this.nodeManager.updateNodeContent(nodeId, { value: newValue });
    }
    
    // Update in starred nodes
    if (this.starredNodes.has(nodeId)) {
      const starData = this.starredNodes.get(nodeId);
      starData.value = newValue;
      starData.lastEdited = new Date().toISOString();
      
      // Validate new value
      this.validateStarredNode(nodeId);
    }
    
    this.notificationSystem?.show(`Updated ${nodeId} value`, 'success');
  }

  /**
   * Show quick edit panel for a node
   * @param {string} nodeId - Node ID to edit
   */
  showQuickEdit(nodeId) {
    const nodeData = this.starredNodes.get(nodeId);
    if (!nodeData) return;
    
    const titleElement = this.quickEditPanel.querySelector('#quick-edit-title');
    const formElement = this.quickEditPanel.querySelector('#quick-edit-form');
    
    titleElement.textContent = `Quick Edit: ${nodeData.name}`;
    
    // Generate form based on node type
    formElement.innerHTML = this.generateQuickEditForm(nodeData);
    
    // Show panel
    this.quickEditPanel.style.display = 'flex';
    this.currentQuickEditNode = nodeId;
    
    // Focus first input
    setTimeout(() => {
      const firstInput = formElement.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  /**
   * Generate quick edit form HTML
   * @param {Object} nodeData - Node data
   * @returns {string} HTML form
   */
  generateQuickEditForm(nodeData) {
    return `
      <div class="form-group">
        <label>Node Name:</label>
        <input type="text" id="edit-name" value="${this.escapeHtml(nodeData.name)}" class="form-input">
      </div>
      
      <div class="form-group">
        <label>Value:</label>
        <input type="text" id="edit-value" value="${this.escapeHtml(nodeData.value || '')}" class="form-input">
      </div>
      
      <div class="form-group">
        <label>Type:</label>
        <select id="edit-type" class="form-select">
          <option value="variable" ${nodeData.type === 'variable' ? 'selected' : ''}>Variable</option>
          <option value="constant" ${nodeData.type === 'constant' ? 'selected' : ''}>Constant</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>
          <input type="checkbox" id="edit-starred" ${this.starredNodes.has(nodeData.id) ? 'checked' : ''}>
          Keep starred
        </label>
      </div>
      
      ${nodeData.constraints?.length > 0 ? `
        <div class="form-group">
          <label>Constraints (${nodeData.constraints.length}):</label>
          <div class="constraints-preview">
            ${nodeData.constraints.map(c => `<span class="constraint-tag">${c.type}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }

  /**
   * Focus on a node in the canvas
   * @param {string} nodeId - Node ID to focus
   */
  focusNodeOnCanvas(nodeId) {
    const nodeElement = document.getElementById(nodeId);
    if (nodeElement) {
      // Scroll into view
      nodeElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
      
      // Highlight temporarily
      nodeElement.style.transform = 'scale(1.1)';
      nodeElement.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.6)';
      
      setTimeout(() => {
        nodeElement.style.transform = '';
        nodeElement.style.boxShadow = '';
      }, 1000);
    }
  }

  /**
   * Schedule UI update with throttling
   */
  scheduleUpdate() {
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => {
      this.updateNodeList();
    }, this.updateThrottle);
  }

  /**
   * Update star count information
   * @param {number} count - Number of starred nodes
   */
  updateStarCountInfo(count) {
    this.starCountInfo.textContent = `${count} starred input${count !== 1 ? 's' : ''}`;
  }

  /**
   * Add CSS styles for the star system
   */
  addStarSystemStyles() {
    if (document.querySelector('#star-system-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'star-system-styles';
    style.textContent = `
      .star-system-sidebar {
        position: fixed;
        left: 0;
        top: 0;
        width: 320px;
        height: 100vh;
        background: white;
        border-right: 2px solid #e5e5e5;
        display: flex;
        flex-direction: column;
        z-index: 1000;
        box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
        transform: translateX(0);
        transition: transform 0.3s ease;
      }
      
      .star-system-sidebar.collapsed {
        transform: translateX(-280px);
      }
      
      .star-system-header {
        padding: 15px 20px;
        background: linear-gradient(135deg, #ffa500 0%, #ff8c00 100%);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .header-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
      }
      
      .header-controls {
        display: flex;
        gap: 5px;
      }
      
      .btn-icon {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 6px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
        transition: background 0.2s;
      }
      
      .btn-icon:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .star-system-toolbar {
        padding: 12px 15px;
        border-bottom: 1px solid #e5e5e5;
        background: #f8f9fa;
        font-size: 0.85em;
      }
      
      .filter-section, .sort-section {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      
      .filter-section:last-child, .sort-section:last-child {
        margin-bottom: 0;
      }
      
      .filter-select, .sort-select {
        flex: 1;
        padding: 4px 6px;
        border: 1px solid #ddd;
        border-radius: 3px;
        font-size: 0.85em;
      }
      
      .star-system-content {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
      }
      
      .starred-nodes-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .starred-node-item {
        background: white;
        border: 1px solid #e5e5e5;
        border-radius: 6px;
        padding: 12px;
        display: flex;
        gap: 10px;
        align-items: flex-start;
        transition: all 0.2s;
        position: relative;
      }
      
      .starred-node-item:hover {
        border-color: #ffa500;
        box-shadow: 0 2px 8px rgba(255, 165, 0, 0.1);
      }
      
      .starred-node-item.selected {
        background: #fff8e1;
        border-color: #ffa500;
      }
      
      .starred-node-item.invalid {
        border-left: 4px solid #dc3545;
      }
      
      .node-checkbox {
        margin-top: 2px;
      }
      
      .node-info {
        flex: 1;
        min-width: 0;
      }
      
      .node-name-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
        flex-wrap: wrap;
      }
      
      .node-name {
        font-weight: 600;
        color: #333;
        font-size: 0.9em;
      }
      
      .node-type-badge {
        background: #6c757d;
        color: white;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 0.7em;
        text-transform: uppercase;
      }
      
      .node-type-badge.variable {
        background: #28a745;
      }
      
      .node-type-badge.constant {
        background: #007bff;
      }
      
      .constraint-indicator, .invalid-indicator {
        font-size: 0.8em;
      }
      
      .node-value-row {
        margin-bottom: 6px;
      }
      
      .node-value-input {
        width: 100%;
        padding: 4px 8px;
        border: 1px solid #ddd;
        border-radius: 3px;
        font-size: 0.85em;
        font-family: monospace;
      }
      
      .node-value-input:focus {
        border-color: #ffa500;
        outline: none;
        box-shadow: 0 0 0 2px rgba(255, 165, 0, 0.2);
      }
      
      .node-meta-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .node-meta-row small {
        color: #666;
        font-size: 0.75em;
      }
      
      .node-actions {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex-shrink: 0;
      }
      
      .node-actions .btn-icon {
        background: #f8f9fa;
        color: #666;
        font-size: 0.8em;
        padding: 4px 6px;
      }
      
      .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #666;
      }
      
      .empty-icon {
        font-size: 3em;
        margin-bottom: 15px;
        opacity: 0.5;
      }
      
      .star-system-footer {
        padding: 12px 15px;
        border-top: 1px solid #e5e5e5;
        background: #f8f9fa;
      }
      
      .batch-controls {
        display: flex;
        gap: 6px;
        margin-bottom: 8px;
        flex-wrap: wrap;
      }
      
      .btn-batch {
        padding: 4px 8px;
        border: none;
        border-radius: 3px;
        font-size: 0.75em;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
      }
      
      .btn-primary {
        background: #007bff;
        color: white;
      }
      
      .btn-secondary {
        background: #6c757d;
        color: white;
      }
      
      .btn-danger {
        background: #dc3545;
        color: white;
      }
      
      .star-count-info {
        font-size: 0.8em;
        color: #666;
        text-align: center;
      }
      
      .quick-edit-panel {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        backdrop-filter: blur(4px);
      }
      
      .quick-edit-content {
        background: white;
        border-radius: 8px;
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }
      
      .quick-edit-header {
        padding: 20px;
        border-bottom: 1px solid #e5e5e5;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #ffa500;
        color: white;
        border-radius: 8px 8px 0 0;
      }
      
      .quick-edit-header h3 {
        margin: 0;
        font-size: 1.2em;
      }
      
      .close-quick-edit {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        font-size: 20px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .quick-edit-form {
        padding: 20px;
        flex: 1;
      }
      
      .form-group {
        margin-bottom: 15px;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 600;
        color: #333;
      }
      
      .form-input, .form-select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 0.9em;
      }
      
      .form-input:focus, .form-select:focus {
        border-color: #ffa500;
        outline: none;
        box-shadow: 0 0 0 2px rgba(255, 165, 0, 0.2);
      }
      
      .constraints-preview {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      
      .constraint-tag {
        background: #e9ecef;
        color: #495057;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 0.75em;
      }
      
      .quick-edit-actions {
        padding: 15px 20px;
        border-top: 1px solid #e5e5e5;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      
      .quick-edit-actions button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
      }
      
      /* Responsive design */
      @media (max-width: 768px) {
        .star-system-sidebar {
          width: 280px;
        }
        
        .star-system-sidebar.collapsed {
          transform: translateX(-240px);
        }
        
        .starred-node-item {
          flex-direction: column;
          align-items: stretch;
        }
        
        .node-actions {
          flex-direction: row;
          justify-content: space-around;
        }
      }
      
      /* Node star indicators (on canvas nodes) */
      .node.starred::before {
        content: '⭐';
        position: absolute;
        top: -5px;
        right: -5px;
        font-size: 0.8em;
        z-index: 10;
      }
      
      .node .star-toggle {
        position: absolute;
        top: 5px;
        right: 5px;
        background: rgba(255, 255, 255, 0.9);
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        cursor: pointer;
        font-size: 0.8em;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s;
      }
      
      .node:hover .star-toggle {
        opacity: 1;
      }
      
      .node .star-toggle.starred {
        opacity: 1;
        color: #ffa500;
      }
    `;
    
    document.head.appendChild(style);
  }

  // Additional utility methods...

  /**
   * Extract node data from DOM element
   * @param {HTMLElement} nodeElement - Node element
   * @returns {Object} Node data
   */
  extractNodeData(nodeElement) {
    // Implementation would extract data from the node element
    // This is a simplified version
    return {
      id: nodeElement.id,
      name: nodeElement.querySelector('.node-name')?.textContent || nodeElement.id,
      type: nodeElement.classList.contains('variable-node') ? 'variable' : 'constant',
      value: nodeElement.querySelector('.node-value')?.textContent || '',
      constraints: [],
      isValid: !nodeElement.classList.contains('invalid')
    };
  }

  /**
   * Update visual star indicator on node
   * @param {string} nodeId - Node ID
   * @param {boolean} isStarred - Whether node is starred
   */
  updateNodeStarIndicator(nodeId, isStarred) {
    const nodeElement = document.getElementById(nodeId);
    if (nodeElement) {
      nodeElement.classList.toggle('starred', isStarred);
      
      // Update existing star button created by NodeManager
      const starButton = nodeElement.querySelector('.star-btn');
      if (starButton) {
        starButton.innerHTML = isStarred ? '⭐' : '☆';
        starButton.classList.toggle('starred', isStarred);
        starButton.title = isStarred ? 'Unstar this node' : 'Star this node';
      }
    }
  }

  /**
   * Sync with node manager to check for updates
   */
  syncWithNodeManager() {
    // Check for nodes that are no longer valid
    const nodesToRemove = [];
    
    for (const [nodeId, starData] of this.starredNodes) {
      const nodeElement = document.getElementById(nodeId);
      if (!nodeElement) {
        // Node was deleted, remove from starred list
        nodesToRemove.push(nodeId);
        continue;
      }
      
      // Update node data if it has changed
      const currentData = this.extractNodeData(nodeElement);
      if (currentData.value !== starData.value || currentData.isValid !== starData.isValid) {
        starData.value = currentData.value;
        starData.isValid = currentData.isValid;
        starData.lastEdited = new Date().toISOString();
      }
    }
    
    // Remove invalid nodes
    nodesToRemove.forEach(nodeId => {
      this.unstarNode(nodeId);
    });
    
    // Update UI if there were changes
    if (nodesToRemove.length > 0) {
      this.scheduleUpdate();
    }
  }

  /**
   * Handle node updates from node manager
   * @param {Object} eventData - Update event data
   */
  handleNodeUpdate(eventData) {
    const { nodeId, nodeData } = eventData;
    
    if (this.starredNodes.has(nodeId)) {
      const starData = this.starredNodes.get(nodeId);
      starData.value = nodeData.value;
      starData.isValid = nodeData.isValid !== false;
      starData.constraints = nodeData.constraints || [];
      starData.lastEdited = new Date().toISOString();
      
      this.scheduleUpdate();
    }
  }

  /**
   * Handle node deletion from node manager
   * @param {string} nodeId - ID of deleted node
   */
  handleNodeDeletion(nodeId) {
    if (this.starredNodes.has(nodeId)) {
      this.unstarNode(nodeId);
    }
  }

  /**
   * Handle validation changes from node manager
   * @param {Object} eventData - Validation change data
   */
  handleValidationChange(eventData) {
    const { nodeId, isValid } = eventData;
    
    if (this.starredNodes.has(nodeId)) {
      const starData = this.starredNodes.get(nodeId);
      starData.isValid = isValid;
      
      this.scheduleUpdate();
    }
  }

  /**
   * Validate a starred node
   * @param {string} nodeId - Node ID to validate
   */
  validateStarredNode(nodeId) {
    const starData = this.starredNodes.get(nodeId);
    if (!starData) return;
    
    // Use node manager's validation if available
    if (this.nodeManager.validateNodeValue) {
      const validationResult = this.nodeManager.validateNodeValue(nodeId, starData.value);
      starData.isValid = validationResult.isValid;
    } else {
      // Basic validation fallback
      starData.isValid = starData.value && starData.value.trim() !== '';
    }
    
    // Update visual indicator
    this.updateNodeStarIndicator(nodeId, true);
    this.scheduleUpdate();
  }

  /**
   * Load starred nodes from storage
   */
  loadStarredNodes() {
    try {
      const stored = localStorage.getItem('equation-builder-starred-nodes');
      if (stored) {
        const starredData = JSON.parse(stored);
        
        // Validate that starred nodes still exist
        for (const [nodeId, starData] of Object.entries(starredData)) {
          const nodeElement = document.getElementById(nodeId);
          if (nodeElement) {
            this.starredNodes.set(nodeId, starData);
            this.updateNodeStarIndicator(nodeId, true);
          }
        }
        
        this.scheduleUpdate();
      }
    } catch (error) {
      console.error('Failed to load starred nodes:', error);
    }
  }

  /**
   * Save starred nodes to storage
   */
  saveStarredNodes() {
    try {
      const starredData = Object.fromEntries(this.starredNodes);
      localStorage.setItem('equation-builder-starred-nodes', JSON.stringify(starredData));
    } catch (error) {
      console.error('Failed to save starred nodes:', error);
    }
  }

  /**
   * Hide quick edit panel
   */
  hideQuickEdit() {
    this.quickEditPanel.style.display = 'none';
    this.currentQuickEditNode = null;
  }

  /**
   * Apply quick edit changes
   */
  applyQuickEdit() {
    if (!this.currentQuickEditNode) return;
    
    const form = this.quickEditPanel.querySelector('#quick-edit-form');
    const name = form.querySelector('#edit-name')?.value;
    const value = form.querySelector('#edit-value')?.value;
    const type = form.querySelector('#edit-type')?.value;
    const keepStarred = form.querySelector('#edit-starred')?.checked;
    
    // Update node through node manager
    if (this.nodeManager.updateNodeContent) {
      this.nodeManager.updateNodeContent(this.currentQuickEditNode, {
        name,
        value,
        type
      });
    }
    
    // Update starred data
    if (this.starredNodes.has(this.currentQuickEditNode)) {
      const starData = this.starredNodes.get(this.currentQuickEditNode);
      starData.name = name;
      starData.value = value;
      starData.type = type;
      starData.lastEdited = new Date().toISOString();
    }
    
    // Remove from starred if unchecked
    if (!keepStarred) {
      this.unstarNode(this.currentQuickEditNode);
    }
    
    this.hideQuickEdit();
    this.scheduleUpdate();
    this.saveStarredNodes();
    
    this.notificationSystem?.show('Node updated successfully', 'success');
  }

  /**
   * Toggle sidebar visibility
   */
  toggleSidebar() {
    this.isVisible = !this.isVisible;
    this.sidebar.classList.toggle('collapsed', !this.isVisible);
    
    // Update toggle button icon
    const toggleBtn = this.sidebar.querySelector('.toggle-sidebar i');
    if (toggleBtn) {
      toggleBtn.textContent = this.isVisible ? '◀' : '▶';
    }
  }

  /**
   * Toggle batch edit mode
   */
  toggleBatchMode() {
    this.batchEditMode = !this.batchEditMode;
    this.selectedNodes.clear();
    
    // Update UI
    this.batchControls.style.display = this.batchEditMode ? 'flex' : 'none';
    this.updateNodeList();
    this.updateSelectionInfo();
    
    // Update button appearance
    const batchBtn = this.sidebar.querySelector('.batch-mode');
    if (batchBtn) {
      batchBtn.style.background = this.batchEditMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)';
    }
  }

  /**
   * Batch edit values for selected nodes
   */
  batchEditValues() {
    if (this.selectedNodes.size === 0) {
      this.notificationSystem?.show('No nodes selected for batch edit', 'warning');
      return;
    }
    
    const newValue = prompt('Enter new value for selected nodes:');
    if (newValue !== null) {
      for (const nodeId of this.selectedNodes) {
        this.updateNodeValue(nodeId, newValue);
      }
      this.notificationSystem?.show(`Updated ${this.selectedNodes.size} nodes`, 'success');
    }
  }

  /**
   * Batch set constraints for selected nodes
   */
  batchSetConstraints() {
    if (this.selectedNodes.size === 0) {
      this.notificationSystem?.show('No nodes selected for batch constraint setting', 'warning');
      return;
    }
    
    // This would open a constraint setting dialog
    // For now, just show a placeholder message
    this.notificationSystem?.show('Batch constraint setting - feature coming soon', 'info');
  }

  /**
   * Batch unstar selected nodes
   */
  batchUnstarNodes() {
    if (this.selectedNodes.size === 0) {
      this.notificationSystem?.show('No nodes selected to unstar', 'warning');
      return;
    }
    
    if (confirm(`Remove ${this.selectedNodes.size} nodes from starred list?`)) {
      const nodeIds = Array.from(this.selectedNodes);
      nodeIds.forEach(nodeId => this.unstarNode(nodeId));
      this.selectedNodes.clear();
      this.updateSelectionInfo();
      this.notificationSystem?.show(`Removed ${nodeIds.length} nodes from starred list`, 'success');
    }
  }

  /**
   * Handle responsive layout
   */
  handleResponsiveLayout() {
    const checkSize = () => {
      if (window.innerWidth < 768 && this.isVisible) {
        // Auto-collapse on mobile
        this.sidebar.classList.add('mobile-overlay');
      } else {
        this.sidebar.classList.remove('mobile-overlay');
      }
    };
    
    checkSize();
    window.addEventListener('resize', checkSize);
  }

  /**
   * Render search results
   * @param {Array} results - Search results
   * @param {string} description - Search description
   */
  renderSearchResults(results, description) {
    const searchResults = this.container?.querySelector('#search-results');
    if (!searchResults) return;
    
    if (results.length === 0) {
      searchResults.innerHTML = `
        <div class="empty-state">
          <p>No results found for: ${description}</p>
        </div>
      `;
      return;
    }
    
    searchResults.innerHTML = `
      <div class="search-results-header">
        <h4>${description}</h4>
        <small>${results.length} result${results.length > 1 ? 's' : ''} found</small>
      </div>
      <div class="search-results-list">
        ${results.map(node => this.renderStarredNodeItem(node)).join('')}
      </div>
    `;
    
    this.bindNodeItemEvents();
  }

  /**
   * Utility method to escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
