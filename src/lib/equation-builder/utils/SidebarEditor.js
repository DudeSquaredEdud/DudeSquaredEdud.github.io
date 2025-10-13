/**
 * SidebarEditor - Modular Sidebar Interface System
 * Handles all sidebar UI generation, form creation, and interaction management
 */

import { NODE_TYPES } from './NodeTypes.js';
import { validateConstant, validateVariable, ValidationResult } from './ValidationUtils.js';

export class SidebarEditor {
  constructor(elements, nodeManager, notificationSystem) {
    // DOM elements
    this.sidebar = elements.sidebar;
    this.sidebarTitle = elements.sidebarTitle;
    this.sidebarContent = elements.sidebarContent;
    this.closeSidebarBtn = elements.closeSidebarBtn;
    
    // Dependencies
    this.nodeManager = nodeManager;
    this.notificationSystem = notificationSystem;
    
    // State
    this.currentEditingNode = null;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Close sidebar button
    this.closeSidebarBtn.addEventListener('click', () => {
      this.closeSidebar();
    });
    
    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
      if (this.sidebar.classList.contains('open') && 
          !this.sidebar.contains(e.target) && 
          !e.target.closest('.canvas-node')) {
        this.closeSidebar();
      }
    });
  }

  openSidebar(nodeId) {
    this.currentEditingNode = nodeId;
    const nodeData = this.nodeManager.getNode(nodeId);
    if (!nodeData) return;
    
    this.sidebarTitle.textContent = `Edit ${nodeData.nodeType.charAt(0).toUpperCase() + nodeData.nodeType.slice(1)} Node`;
    this.populateSidebarContent(nodeId);
    this.sidebar.classList.add('open');
  }
  
  closeSidebar() {
    this.sidebar.classList.remove('open');
    this.currentEditingNode = null;
  }

  populateSidebarContent(nodeId) {
    const nodeData = this.nodeManager.getNode(nodeId);
    if (!nodeData) return;
    
    let content = '';
    
    switch (nodeData.nodeType) {
      case 'constant':
        content = this.createConstantEditor(nodeId, nodeData);
        break;
      case 'variable':
        content = this.createVariableEditor(nodeId, nodeData);
        break;
      case 'output':
        content = this.createOutputNodeInfo(nodeId, nodeData);
        break;
      default:
        content = this.createOperatorEditor(nodeId, nodeData);
        break;
    }
    
    this.sidebarContent.innerHTML = content;
    this.bindSidebarEvents(nodeId);
  }

  createConstantEditor(nodeId, nodeData) {
    const isNumber = !isNaN(parseFloat(nodeData.content));
    const constraintSummary = this.nodeManager.getNodeConstraintSummary(nodeId);
    const hasViolations = this.nodeManager.hasConstraintViolations(nodeId);
    
    return `
      <div class="form-group">
        <label>Constant Type:</label>
        <select id="constantType" onchange="window.sidebarEditor.updateConstantType('${nodeId}')">
          <option value="number" ${isNumber ? 'selected' : ''}>Number</option>
          <option value="pi" ${nodeData.content === 'π' ? 'selected' : ''}>Pi (π)</option>
          <option value="e" ${nodeData.content === 'e' ? 'selected' : ''}>Euler's number (e)</option>
          <option value="custom" ${!isNumber && nodeData.content !== 'π' && nodeData.content !== 'e' ? 'selected' : ''}>Custom</option>
        </select>
      </div>
      
      <div class="form-group" id="numberGroup" style="display: ${isNumber ? 'block' : 'none'}">
        <label>Value:</label>
        <input type="number" id="numberValue" value="${isNumber ? nodeData.content : '1'}" step="any">
      </div>
      
      <div class="form-group" id="customGroup" style="display: ${!isNumber && nodeData.content !== 'π' && nodeData.content !== 'e' ? 'block' : 'none'}">
        <label>Custom Constant:</label>
        <input type="text" id="customValue" value="${!isNumber && nodeData.content !== 'π' && nodeData.content !== 'e' ? nodeData.content : ''}">
      </div>
      
      ${this.createConstraintSection(nodeId, constraintSummary, hasViolations)}
      
      <button class="sidebar-btn" onclick="window.sidebarEditor.applyConstantChanges('${nodeId}')">Apply Changes</button>
      <button class="sidebar-btn secondary" onclick="window.sidebarEditor.resetNodeToDefault('${nodeId}')">Reset to Default</button>
      ${this.createColorPicker(nodeId)}
      <button class="sidebar-btn danger" onclick="window.sidebarEditor.deleteNodeFromSidebar('${nodeId}')">Delete Node</button>
    `;
  }

  createVariableEditor(nodeId, nodeData) {
    const constraintSummary = this.nodeManager.getNodeConstraintSummary(nodeId);
    const hasViolations = this.nodeManager.hasConstraintViolations(nodeId);
    
    return `
      <div class="form-group">
        <label>Variable Name:</label>
        <input type="text" id="variableName" value="${nodeData.content}" placeholder="x">
        <small style="color: #666; font-size: 0.8rem;">Common: x, y, z, t, n, θ (theta)</small>
      </div>
      
      <div class="form-group">
        <label>Quick Select:</label>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
          ${['x', 'y', 'z', 't', 'n', 'θ', 'α', 'β'].map(v => 
            `<button class="sidebar-btn secondary" style="flex: 0 0 auto; padding: 0.25rem 0.5rem;" onclick="document.getElementById('variableName').value='${v}'">${v}</button>`
          ).join('')}
        </div>
      </div>
      
      ${this.createConstraintSection(nodeId, constraintSummary, hasViolations)}
      
      <button class="sidebar-btn" onclick="window.sidebarEditor.applyVariableChanges('${nodeId}')">Apply Changes</button>
      ${this.createColorPicker(nodeId)}
      <button class="sidebar-btn danger" onclick="window.sidebarEditor.deleteNodeFromSidebar('${nodeId}')">Delete Node</button>
    `;
  }

  createOutputNodeInfo(nodeId, nodeData) {
    const equation = this.nodeManager.generateEquationFromNode(nodeId);
    const constraintSummary = this.nodeManager.getNodeConstraintSummary(nodeId);
    const hasViolations = this.nodeManager.hasConstraintViolations(nodeId);
    
    return `
      <div style="text-align: center; padding: 1rem; background: #fef3c7; border-radius: 6px; margin-bottom: 1rem;">
        <h4 style="margin: 0 0 0.5rem 0; color: #d97706;">🎯 Output Node</h4>
        <p style="margin: 0; font-size: 0.9rem; color: #92400e;">This node generates the final equation from connected inputs.</p>
      </div>
      
      <div class="form-group">
        <label>Generated Equation:</label>
        <div style="padding: 0.75rem; background: #f3f4f6; border-radius: 4px; font-family: monospace; border: 1px solid #d1d5db;">
          ${equation || '(no input connected)'}
        </div>
      </div>
      
      ${this.createOperatorConstraintSection(nodeId, constraintSummary, hasViolations)}
      
      ${this.createColorPicker(nodeId)}
      <button class="sidebar-btn danger" onclick="window.sidebarEditor.deleteNodeFromSidebar('${nodeId}')">Delete Node</button>
    `;
  }

  createOperatorEditor(nodeId, nodeData) {
    const nodeTypeInfo = NODE_TYPES[nodeData.nodeType] || {};
    const constraintSummary = this.nodeManager.getNodeConstraintSummary(nodeId);
    const hasViolations = this.nodeManager.hasConstraintViolations(nodeId);
    
    // Get configuration options for dynamic input nodes
    let configurationSection = '';
    if (nodeData.isConfigurable) {
      const { min, max } = nodeData.inputConstraints;
      const currentCount = nodeData.currentInputCount;
      
      configurationSection = `
        <div class="form-group" style="background: #f0f9ff; padding: 1rem; border-radius: 6px; border-left: 4px solid #0ea5e9;">
          <label style="color: #0c4a6e; font-weight: bold;">⚙️ Input Configuration</label>
          <div style="margin: 0.5rem 0; color: #0c4a6e;">
            Current inputs: <strong>${currentCount}</strong> (Min: ${min}, Max: ${max})
          </div>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
            <button 
              class="sidebar-btn ${currentCount >= max ? 'disabled' : ''}" 
              ${currentCount >= max ? 'disabled' : ''}
              onclick="window.sidebarEditor.addInputPortFromSidebar('${nodeId}')">
              ➕ Add Input
            </button>
            <button 
              class="sidebar-btn secondary ${currentCount <= min ? 'disabled' : ''}" 
              ${currentCount <= min ? 'disabled' : ''}
              onclick="window.sidebarEditor.removeInputPortFromSidebar('${nodeId}')">
              ➖ Remove Input
            </button>
          </div>
          <div style="font-size: 0.8rem; color: #64748b; margin-top: 0.5rem; font-style: italic;">
            ${nodeData.mathematicalProperties?.mathematicalNote || 'Supports multiple inputs due to mathematical properties'}
          </div>
        </div>
      `;
    }
    
    return `
      <div style="text-align: center; padding: 1rem; background: #e0e7ff; border-radius: 6px; margin-bottom: 1rem;">
        <h4 style="margin: 0 0 0.5rem 0; color: #4f46e5;">⚙️ ${nodeData.nodeType.charAt(0).toUpperCase() + nodeData.nodeType.slice(1)} Node</h4>
        <p style="margin: 0; font-size: 0.9rem; color: #6366f1;">${nodeTypeInfo.description || 'Mathematical operator or function'}</p>
      </div>
      
      <div class="form-group">
        <label>Node Type:</label>
        <div style="padding: 0.5rem; background: #f3f4f6; border-radius: 4px; font-weight: bold;">
          ${nodeData.content} (${nodeData.nodeType})
        </div>
      </div>
      
      ${configurationSection}
      
      ${this.createOperatorConstraintSection(nodeId, constraintSummary, hasViolations)}
      
      ${this.createColorPicker(nodeId)}
      <button class="sidebar-btn danger" onclick="window.sidebarEditor.deleteNodeFromSidebar('${nodeId}')">Delete Node</button>
    `;
  }

  createColorPicker(nodeId) {
    return `
      <div class="form-group">
        <label>Node Colors:</label>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
            <label style="font-size: 0.8rem;">Background</label>
            <input type="color" id="nodeBackgroundColor" value="#3b82f6" style="width: 40px; height: 30px; border: none; border-radius: 4px; cursor: pointer;">
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
            <label style="font-size: 0.8rem;">Border</label>
            <input type="color" id="nodeBorderColor" value="#1d4ed8" style="width: 40px; height: 30px; border: none; border-radius: 4px; cursor: pointer;">
          </div>
        </div>
        <button class="sidebar-btn secondary" onclick="window.sidebarEditor.changeNodeColorFromSidebar('${nodeId}', document.getElementById('nodeBackgroundColor').value, document.getElementById('nodeBorderColor').value)">Apply Colors</button>
      </div>
    `;
  }

  bindSidebarEvents(nodeId) {
    // Real-time validation and updates for form inputs
    const inputs = this.sidebarContent.querySelectorAll('input');
    inputs.forEach(input => {
      if (input.type === 'text') {
        input.addEventListener('input', (e) => {
          this.validateInput(e.target, nodeId);
        });
      } else if (input.type === 'number') {
        input.addEventListener('input', (e) => {
          this.validateNumericInput(e.target, nodeId);
        });
      }
      
      // Handle Enter key for quick apply
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.applyChanges(nodeId);
        }
      });
    });
  }

  validateInput(input, nodeId) {
    const nodeData = this.nodeManager.getNode(nodeId);
    if (!nodeData) return;

    if (nodeData.nodeType === 'variable') {
      const validation = validateVariable(input.value);
      this.showInputValidation(input, validation);
    } else if (nodeData.nodeType === 'constant') {
      const validation = validateConstant(input.value);
      this.showInputValidation(input, validation);
    }
  }

  validateNumericInput(input, nodeId) {
    const value = parseFloat(input.value);
    const isValid = !isNaN(value) && isFinite(value);
    
    if (isValid) {
      input.style.borderColor = '#10b981';
      input.style.backgroundColor = '#f0fdf4';
    } else {
      input.style.borderColor = '#ef4444';
      input.style.backgroundColor = '#fef2f2';
    }
  }

  showInputValidation(input, validation) {
    if (validation.isValid) {
      input.style.borderColor = '#10b981';
      input.style.backgroundColor = '#f0fdf4';
    } else {
      input.style.borderColor = '#ef4444';
      input.style.backgroundColor = '#fef2f2';
      
      // Show error message briefly
      if (validation.errors.length > 0) {
        this.notificationSystem.show(validation.errors[0], 'error');
      }
    }
  }

  // Action methods that interface with NodeManager
  updateConstantType(nodeId) {
    const typeSelect = document.getElementById('constantType');
    const numberGroup = document.getElementById('numberGroup');
    const customGroup = document.getElementById('customGroup');
    
    if (typeSelect && numberGroup && customGroup) {
      switch (typeSelect.value) {
        case 'number':
          numberGroup.style.display = 'block';
          customGroup.style.display = 'none';
          break;
        case 'custom':
          numberGroup.style.display = 'none';
          customGroup.style.display = 'block';
          break;
        default:
          numberGroup.style.display = 'none';
          customGroup.style.display = 'none';
          break;
      }
    }
  }

  applyConstantChanges(nodeId) {
    const nodeData = this.nodeManager.getNode(nodeId);
    if (!nodeData) return;
    
    const typeSelect = document.getElementById('constantType');
    const numberInput = document.getElementById('numberValue');
    const customInput = document.getElementById('customValue');
    
    if (typeSelect) {
      switch (typeSelect.value) {
        case 'number':
          if (numberInput && numberInput.value !== '') {
            this.nodeManager.updateNodeContent(nodeId, numberInput.value);
          }
          break;
        case 'pi':
          this.nodeManager.updateNodeContent(nodeId, 'π');
          break;
        case 'e':
          this.nodeManager.updateNodeContent(nodeId, 'e');
          break;
        case 'custom':
          if (customInput && customInput.value !== '') {
            this.nodeManager.updateNodeContent(nodeId, customInput.value);
          }
          break;
      }
    }
    
    this.notificationSystem.show('Constant updated successfully!', 'success');
    this.nodeManager.updateEquationOutput();
  }

  applyVariableChanges(nodeId) {
    const nameInput = document.getElementById('variableName');
    if (nameInput && nameInput.value !== '') {
      const validation = validateVariable(nameInput.value);
      if (validation.isValid) {
        this.nodeManager.updateNodeContent(nodeId, nameInput.value);
        this.notificationSystem.show('Variable updated successfully!', 'success');
        this.nodeManager.updateEquationOutput();
      } else {
        this.notificationSystem.showValidationErrors(validation);
      }
    }
  }

  applyChanges(nodeId) {
    const nodeData = this.nodeManager.getNode(nodeId);
    if (!nodeData) return;

    switch (nodeData.nodeType) {
      case 'constant':
        this.applyConstantChanges(nodeId);
        break;
      case 'variable':
        this.applyVariableChanges(nodeId);
        break;
    }
  }

  changeNodeColorFromSidebar(nodeId, backgroundColor, borderColor) {
    this.nodeManager.changeNodeColor(nodeId, backgroundColor, borderColor);
    this.notificationSystem.show('Node colors updated!', 'success');
  }

  resetNodeToDefault(nodeId) {
    this.nodeManager.resetNodeToDefault(nodeId);
    this.populateSidebarContent(nodeId); // Refresh the sidebar
    this.notificationSystem.show('Node reset to default!', 'info');
  }

  deleteNodeFromSidebar(nodeId) {
    if (confirm('Are you sure you want to delete this node?')) {
      this.nodeManager.deleteNode(nodeId);
      this.closeSidebar();
      this.notificationSystem.show('Node deleted!', 'info');
    }
  }

  /**
   * Dynamic Input Configuration Methods
   * Integrated into sidebar for easy access and clean UX
   */
  addInputPortFromSidebar(nodeId) {
    const success = this.nodeManager.addInputPort(nodeId);
    if (success) {
      // Refresh the sidebar to show updated input count
      this.populateSidebarContent(nodeId);
    }
  }

  removeInputPortFromSidebar(nodeId) {
    const success = this.nodeManager.removeInputPort(nodeId);
    if (success) {
      // Refresh the sidebar to show updated input count
      this.populateSidebarContent(nodeId);
    }
  }

  /**
   * CONSTRAINT MANAGEMENT METHODS
   * Advanced variable constraint system UI integration
   */

  createConstraintSection(nodeId, constraintSummary, hasViolations) {
    const violationStyle = hasViolations ? 'border-left: 3px solid #dc2626; background: #fef2f2;' : '';
    
    return `
      <div class="constraint-section" style="margin: 1rem 0; padding: 1rem; border: 1px solid #d1d5db; border-radius: 6px; ${violationStyle}">
        <h4 style="margin: 0 0 0.5rem 0; color: #374151; display: flex; align-items: center;">
          🔗 Constraints 
          ${hasViolations ? '<span style="color: #dc2626; font-size: 0.8rem; margin-left: 0.5rem;">⚠️ Violations</span>' : ''}
        </h4>
        
        <div id="constraintList-${nodeId}" style="margin-bottom: 0.5rem;">
          ${constraintSummary.length > 0 ? 
            constraintSummary.map(constraint => `
              <div class="constraint-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid #f3f4f6;">
                <span style="font-size: 0.9rem; color: #6b7280;">${constraint.description}</span>
                <button class="sidebar-btn secondary" style="padding: 0.125rem 0.25rem; font-size: 0.7rem;" 
                        onclick="window.sidebarEditor.removeConstraint('${nodeId}', '${constraint.id}')">×</button>
              </div>
            `).join('') 
            : '<p style="color: #9ca3af; font-size: 0.9rem; margin: 0;">No constraints applied</p>'
          }
        </div>
        
        <div class="constraint-controls">
          <select id="constraintType-${nodeId}" style="width: 100%; margin-bottom: 0.5rem; padding: 0.25rem; font-size: 0.9rem;">
            <option value="">Select constraint type...</option>
            <optgroup label="Value Constraints">
              <option value="not_equal">Not Equal (≠)</option>
              <option value="range">Range</option>
              <option value="domain">Domain</option>
              <option value="sign">Sign</option>
            </optgroup>
            <optgroup label="Mathematical Properties">
              <option value="prime">Prime Number</option>
              <option value="perfect_square">Perfect Square</option>
              <option value="even_odd">Even/Odd</option>
              <option value="fibonacci">Fibonacci</option>
              <option value="divisible">Divisible By</option>
            </optgroup>
            <optgroup label="Relational">
              <option value="greater_than">Greater Than</option>
              <option value="less_than">Less Than</option>
              <option value="equal_to">Equal To</option>
            </optgroup>
          </select>
          
          <div id="constraintParams-${nodeId}" style="margin-bottom: 0.5rem;">
            <!-- Dynamic constraint parameters will be inserted here -->
          </div>
          
          <div style="display: flex; gap: 0.5rem;">
            <button class="sidebar-btn secondary" style="flex: 1; font-size: 0.9rem;" 
                    onclick="window.sidebarEditor.addConstraint('${nodeId}')">Add Constraint</button>
            <button class="sidebar-btn danger" style="flex: 1; font-size: 0.9rem;" 
                    onclick="window.sidebarEditor.clearAllConstraints('${nodeId}')">Clear All</button>
          </div>
        </div>
      </div>
    `;
  }

  createOperatorConstraintSection(nodeId, constraintSummary, hasViolations) {
    const violationStyle = hasViolations ? 'border-left: 3px solid #dc2626; background: #fef2f2;' : '';
    
    return `
      <div class="constraint-section" style="margin: 1rem 0; padding: 1rem; border: 1px solid #d1d5db; border-radius: 6px; ${violationStyle}">
        <h4 style="margin: 0 0 0.5rem 0; color: #374151; display: flex; align-items: center;">
          🔗 Result Constraints 
          ${hasViolations ? '<span style="color: #dc2626; font-size: 0.8rem; margin-left: 0.5rem;">⚠️ Violations</span>' : ''}
        </h4>
        
        <div style="background: #f9fafb; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.9rem; color: #6b7280;">
          <strong>📊 Operator Constraints:</strong><br>
          • Constrain the computed result of this operation<br>
          • Violations detected when equation is evaluated<br>
          • Useful for ensuring results meet specific requirements
        </div>
        
        <div id="constraintList-${nodeId}" style="margin-bottom: 0.5rem;">
          ${constraintSummary.length > 0 ? 
            constraintSummary.map(constraint => `
              <div class="constraint-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid #f3f4f6;">
                <span style="font-size: 0.9rem; color: #6b7280;">Result ${constraint.description}</span>
                <button class="sidebar-btn secondary" style="padding: 0.125rem 0.25rem; font-size: 0.7rem;" 
                        onclick="window.sidebarEditor.removeConstraint('${nodeId}', '${constraint.id}')">×</button>
              </div>
            `).join('') 
            : '<p style="color: #9ca3af; font-size: 0.9rem; margin: 0;">No result constraints applied</p>'
          }
        </div>
        
        <div class="constraint-controls">
          <select id="constraintType-${nodeId}" style="width: 100%; margin-bottom: 0.5rem; padding: 0.25rem; font-size: 0.9rem;">
            <option value="">Select result constraint...</option>
            <optgroup label="Result Value Constraints">
              <option value="not_equal">Result ≠ Value</option>
              <option value="range">Result in Range</option>
              <option value="sign">Result Sign</option>
            </optgroup>
            <optgroup label="Result Mathematical Properties">
              <option value="prime">Result is Prime</option>
              <option value="perfect_square">Result is Perfect Square</option>
              <option value="even_odd">Result is Even/Odd</option>
              <option value="fibonacci">Result is Fibonacci</option>
              <option value="divisible">Result Divisible By</option>
            </optgroup>
            <optgroup label="Result Comparisons">
              <option value="greater_than">Result > Value</option>
              <option value="less_than">Result < Value</option>
              <option value="equal_to">Result = Value</option>
            </optgroup>
          </select>
          
          <div id="constraintParams-${nodeId}" style="margin-bottom: 0.5rem;">
            <!-- Dynamic constraint parameters will be inserted here -->
          </div>
          
          <div style="display: flex; gap: 0.5rem;">
            <button class="sidebar-btn secondary" style="flex: 1; font-size: 0.9rem;" 
                    onclick="window.sidebarEditor.addConstraint('${nodeId}')">Add Result Constraint</button>
            <button class="sidebar-btn danger" style="flex: 1; font-size: 0.9rem;" 
                    onclick="window.sidebarEditor.clearAllConstraints('${nodeId}')">Clear All</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Add constraint to node
   */
  addConstraint(nodeId) {
    const constraintSelect = document.getElementById(`constraintType-${nodeId}`);
    const constraintType = constraintSelect.value;
    
    if (!constraintType) {
      this.notificationSystem.show('Please select a constraint type', 'error');
      return;
    }
    
    const constraintData = this.getConstraintParameters(nodeId, constraintType);
    if (!constraintData) return;
    
    const result = this.nodeManager.addConstraintToNode(nodeId, constraintType, constraintData);
    if (result.success) {
      // Refresh the sidebar to show updated constraints
      this.populateSidebarContent(nodeId);
    }
  }

  /**
   * Remove specific constraint
   */
  removeConstraint(nodeId, constraintId) {
    this.nodeManager.removeConstraintFromNode(nodeId, constraintId);
    this.populateSidebarContent(nodeId);
  }

  /**
   * Clear all constraints from node
   */
  clearAllConstraints(nodeId) {
    if (confirm('Are you sure you want to remove all constraints from this node?')) {
      this.nodeManager.clearNodeConstraints(nodeId);
      this.populateSidebarContent(nodeId);
    }
  }

  /**
   * Get constraint parameters based on constraint type
   */
  getConstraintParameters(nodeId, constraintType) {
    switch (constraintType) {
      case 'not_equal':
        const notEqualValue = prompt('Enter value that variable should NOT equal:');
        if (notEqualValue === null) return null;
        const numValue = parseFloat(notEqualValue);
        if (isNaN(numValue)) {
          this.notificationSystem.show('Please enter a valid number', 'error');
          return null;
        }
        return { value: numValue };

      case 'range':
        const minValue = prompt('Enter minimum value (inclusive):');
        if (minValue === null) return null;
        const maxValue = prompt('Enter maximum value (inclusive):');
        if (maxValue === null) return null;
        
        const min = parseFloat(minValue);
        const max = parseFloat(maxValue);
        
        if (isNaN(min) || isNaN(max)) {
          this.notificationSystem.show('Please enter valid numbers', 'error');
          return null;
        }
        if (min >= max) {
          this.notificationSystem.show('Minimum must be less than maximum', 'error');
          return null;
        }
        
        return { min, max, minInclusive: true, maxInclusive: true };

      case 'domain':
        const domainOptions = ['ℝ (Real)', 'ℤ (Integer)', 'ℕ (Natural)', 'ℚ (Rational)', 'ℝ⁺ (Positive Real)', 'ℝ⁻ (Negative Real)'];
        const domainChoice = prompt(`Select domain:\n0: ℝ (Real)\n1: ℤ (Integer)\n2: ℕ (Natural)\n3: ℚ (Rational)\n4: ℝ⁺ (Positive Real)\n5: ℝ⁻ (Negative Real)\n\nEnter number (0-5):`);
        
        if (domainChoice === null) return null;
        const domainIndex = parseInt(domainChoice);
        
        if (isNaN(domainIndex) || domainIndex < 0 || domainIndex > 5) {
          this.notificationSystem.show('Please enter a valid domain choice (0-5)', 'error');
          return null;
        }
        
        const domains = ['ℝ', 'ℤ', 'ℕ', 'ℚ', 'ℝ⁺', 'ℝ⁻'];
        return { domain: domains[domainIndex] };

      case 'sign':
        const signChoice = prompt('Select sign constraint:\n0: Positive (> 0)\n1: Negative (< 0)\n2: Non-zero (≠ 0)\n\nEnter number (0-2):');
        if (signChoice === null) return null;
        const signIndex = parseInt(signChoice);
        
        if (isNaN(signIndex) || signIndex < 0 || signIndex > 2) {
          this.notificationSystem.show('Please enter a valid sign choice (0-2)', 'error');
          return null;
        }
        
        const signs = ['positive', 'negative', 'non_zero'];
        return { sign: signs[signIndex] };

      case 'even_odd':
        const parityChoice = prompt('Select parity:\n0: Even\n1: Odd\n\nEnter number (0-1):');
        if (parityChoice === null) return null;
        const parityIndex = parseInt(parityChoice);
        
        if (isNaN(parityIndex) || parityIndex < 0 || parityIndex > 1) {
          this.notificationSystem.show('Please enter a valid parity choice (0-1)', 'error');
          return null;
        }
        
        return { parity: parityIndex === 0 ? 'even' : 'odd' };

      case 'divisible':
        const divisor = prompt('Enter divisor (variable must be divisible by this number):');
        if (divisor === null) return null;
        const divisorNum = parseFloat(divisor);
        
        if (isNaN(divisorNum) || divisorNum === 0) {
          this.notificationSystem.show('Please enter a valid non-zero number', 'error');
          return null;
        }
        
        return { divisor: divisorNum };

      case 'greater_than':
      case 'less_than':
      case 'equal_to':
        const comparisonValue = prompt(`Enter value for ${constraintType.replace('_', ' ')} constraint:`);
        if (comparisonValue === null) return null;
        const compNum = parseFloat(comparisonValue);
        
        if (isNaN(compNum)) {
          this.notificationSystem.show('Please enter a valid number', 'error');
          return null;
        }
        
        return { value: compNum };

      case 'prime':
      case 'perfect_square':
      case 'fibonacci':
        // These constraints don't need parameters
        return {};

      default:
        this.notificationSystem.show('Unknown constraint type', 'error');
        return null;
    }
  }
}
