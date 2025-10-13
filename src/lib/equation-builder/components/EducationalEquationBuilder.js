/**
 * EducationalEquationBuilder - Integration component for step-by-step learning
 * 
 * This component integrates:
 * - SequencePlayer UI
 * - SolvingSequenceEngine logic
 * - Educational equation database
 * - Existing equation builder functionality
 * 
 * Provides complete educational workflow for students and teachers
 */

import { SolvingSequenceEngine } from '../utils/SolvingSequenceEngine.js';
import { SequencePlayer } from './SequencePlayer.js';

export class EducationalEquationBuilder {
  constructor(containerElement, notificationSystem) {
    this.container = containerElement;
    this.notificationSystem = notificationSystem;
    
    // Core components
    this.sequenceEngine = null;
    this.sequencePlayer = null;
    
    // Integration state
    this.isEducationalMode = false;
    this.originalBuilderContainer = null;
    
    this.initialize();
  }

  /**
   * Initialize the educational equation builder
   */
  async initialize() {
    try {
      // Create sequence engine
      this.sequenceEngine = new SolvingSequenceEngine(this.notificationSystem);
      
      // Create educational mode container
      this.createEducationalModeUI();
      
      // Initialize sequence player
      const playerContainer = this.container.querySelector('#sequence-player-container');
      this.sequencePlayer = new SequencePlayer(
        playerContainer, 
        this.sequenceEngine, 
        this.notificationSystem
      );
      
      // Setup mode switching
      this.setupModeToggle();
      
      this.notificationSystem?.show('Educational equation builder ready!', 'success');
      
    } catch (error) {
      this.notificationSystem?.show(`Failed to initialize educational mode: ${error.message}`, 'error');
    }
  }

  /**
   * Create the educational mode UI structure
   */
  createEducationalModeUI() {
    // Store reference to original builder if it exists
    const existingContent = this.container.innerHTML;
    if (existingContent.trim()) {
      this.originalBuilderContainer = document.createElement('div');
      this.originalBuilderContainer.innerHTML = existingContent;
      this.originalBuilderContainer.style.display = 'none';
    }

    // Create educational mode container
    const educationalContainer = document.createElement('div');
    educationalContainer.id = 'educational-mode';
    educationalContainer.innerHTML = `
      <div class="mode-header">
        <div class="mode-title">
          <h1>🎓 Educational Equation Builder</h1>
          <p>Learn step-by-step equation solving with interactive guidance</p>
        </div>
        
        <div class="mode-controls">
          <button id="toggle-builder-mode" class="btn-secondary">
            <i class="icon">🔧</i> Builder Mode
          </button>
          <button id="toggle-educational-mode" class="btn-primary active">
            <i class="icon">🎓</i> Learning Mode
          </button>
        </div>
      </div>
      
      <div id="sequence-player-container">
        <!-- SequencePlayer will be initialized here -->
      </div>
      
      <div class="educational-features">
        <div class="feature-card">
          <h3>📚 Comprehensive Library</h3>
          <p>Access 25+ carefully crafted equations covering linear, quadratic, systems, and advanced topics.</p>
        </div>
        
        <div class="feature-card">
          <h3>🎯 Step-by-Step Learning</h3>
          <p>Follow detailed solving sequences with explanations for each mathematical operation.</p>
        </div>
        
        <div class="feature-card">
          <h3>💡 Smart Hints</h3>
          <p>Get contextual hints and educational tips to understand the reasoning behind each step.</p>
        </div>
        
        <div class="feature-card">
          <h3>📊 Progress Tracking</h3>
          <p>Monitor your learning progress with detailed statistics and completion tracking.</p>
        </div>
      </div>
    `;

    // Clear container and add educational mode
    this.container.innerHTML = '';
    this.container.appendChild(educationalContainer);
    
    // Add original builder if it existed
    if (this.originalBuilderContainer) {
      this.container.appendChild(this.originalBuilderContainer);
    }

    this.applyEducationalStyles();
  }

  /**
   * Setup mode toggle functionality
   */
  setupModeToggle() {
    const toggleBuilder = this.container.querySelector('#toggle-builder-mode');
    const toggleEducational = this.container.querySelector('#toggle-educational-mode');

    toggleBuilder?.addEventListener('click', () => {
      this.switchToBuilderMode();
    });

    toggleEducational?.addEventListener('click', () => {
      this.switchToEducationalMode();
    });
  }

  /**
   * Switch to builder mode (original equation builder)
   */
  switchToBuilderMode() {
    const educationalMode = this.container.querySelector('#educational-mode');
    const toggleBuilder = this.container.querySelector('#toggle-builder-mode');
    const toggleEducational = this.container.querySelector('#toggle-educational-mode');

    if (educationalMode) {
      educationalMode.style.display = 'none';
    }

    if (this.originalBuilderContainer) {
      this.originalBuilderContainer.style.display = 'block';
    }

    // Update button states
    toggleBuilder?.classList.add('active');
    toggleEducational?.classList.remove('active');

    this.isEducationalMode = false;
    this.notificationSystem?.show('Switched to Builder Mode', 'info');
  }

  /**
   * Switch to educational mode (step-by-step learning)
   */
  switchToEducationalMode() {
    const educationalMode = this.container.querySelector('#educational-mode');
    const toggleBuilder = this.container.querySelector('#toggle-builder-mode');
    const toggleEducational = this.container.querySelector('#toggle-educational-mode');

    if (educationalMode) {
      educationalMode.style.display = 'block';
    }

    if (this.originalBuilderContainer) {
      this.originalBuilderContainer.style.display = 'none';
    }

    // Update button states
    toggleBuilder?.classList.remove('active');
    toggleEducational?.classList.add('active');

    this.isEducationalMode = true;
    this.notificationSystem?.show('Switched to Educational Mode', 'info');
  }

  /**
   * Load a specific equation for educational purposes
   * @param {string} equationId - ID of equation to load
   */
  async loadEducationalEquation(equationId) {
    try {
      const { getEquationById } = await import('../data/EducationalEquations.js');
      const equation = getEquationById(equationId);
      
      if (!equation) {
        throw new Error(`Equation with ID ${equationId} not found`);
      }

      // Ensure we're in educational mode
      if (!this.isEducationalMode) {
        this.switchToEducationalMode();
      }

      // Load the equation sequence
      this.sequencePlayer.loadEquationSequence(equation);
      
      return true;
    } catch (error) {
      this.notificationSystem?.show(`Failed to load equation: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Get educational statistics and progress
   */
  getEducationalStats() {
    if (!this.sequenceEngine) {
      return null;
    }

    return {
      currentSequence: this.sequenceEngine.getSequenceStats(),
      mode: this.isEducationalMode ? 'educational' : 'builder',
      featuresUsed: {
        sequencePlayer: !!this.sequencePlayer,
        hintsUsed: this.sequenceEngine.studentProgress.hintsUsed,
        timeSpent: this.sequenceEngine.studentProgress.timeSpent
      }
    };
  }

  /**
   * Create a custom equation sequence (for teachers)
   * @param {Object} equationData - Custom equation with steps
   */
  createCustomSequence(equationData) {
    try {
      // Validate equation data structure
      if (!equationData.steps || !Array.isArray(equationData.steps)) {
        throw new Error('Invalid equation data: steps array required');
      }

      // Ensure we're in educational mode
      if (!this.isEducationalMode) {
        this.switchToEducationalMode();
      }

      // Load the custom sequence
      this.sequencePlayer.loadEquationSequence(equationData);
      
      this.notificationSystem?.show('Custom equation sequence loaded', 'success');
      return true;
    } catch (error) {
      this.notificationSystem?.show(`Failed to load custom sequence: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Export current sequence progress (for teachers/analytics)
   */
  exportSequenceProgress() {
    const stats = this.getEducationalStats();
    if (!stats) {
      return null;
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      mode: stats.mode,
      sequence: stats.currentSequence,
      features: stats.featuresUsed,
      userAgent: navigator.userAgent,
      sessionId: Date.now().toString(36)
    };

    // Create downloadable JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `equation-progress-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.notificationSystem?.show('Progress exported successfully', 'success');
    return exportData;
  }

  /**
   * Apply educational mode styles
   */
  applyEducationalStyles() {
    if (document.querySelector('#educational-mode-styles')) {
      return; // Already applied
    }

    const styles = document.createElement('style');
    styles.id = 'educational-mode-styles';
    styles.textContent = `
      #educational-mode {
        min-height: 100vh;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      }

      .mode-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 40px;
        background: white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        margin-bottom: 30px;
      }

      .mode-title h1 {
        margin: 0 0 8px 0;
        color: #333;
        font-size: 2.2em;
      }

      .mode-title p {
        margin: 0;
        color: #666;
        font-size: 1.1em;
      }

      .mode-controls {
        display: flex;
        gap: 10px;
      }

      .mode-controls button {
        padding: 10px 20px;
        border: 2px solid #ddd;
        border-radius: 6px;
        background: white;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.2s ease;
      }

      .mode-controls button.active {
        background: #4CAF50;
        color: white;
        border-color: #4CAF50;
      }

      .mode-controls button:hover:not(.active) {
        border-color: #999;
        background: #f5f5f5;
      }

      .educational-features {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        max-width: 1000px;
        margin: 40px auto 0;
        padding: 0 20px;
      }

      .feature-card {
        background: white;
        padding: 25px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        transition: transform 0.2s ease;
      }

      .feature-card:hover {
        transform: translateY(-5px);
      }

      .feature-card h3 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 1.3em;
      }

      .feature-card p {
        margin: 0;
        color: #666;
        line-height: 1.6;
      }

      .icon {
        margin-right: 8px;
      }

      /* Override sequence player styles for educational mode */
      #educational-mode .sequence-player {
        background: transparent;
      }

      #educational-mode .sequence-header {
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      }

      #educational-mode .equation-display-container {
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      }

      #educational-mode .sequence-controls {
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      }

      #educational-mode .explanation-panel {
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Stop any active sequences
    if (this.sequenceEngine) {
      this.sequenceEngine.destroy();
    }

    // Clear containers
    if (this.container) {
      this.container.innerHTML = '';
    }

    // Remove event listeners (they'll be cleaned up with DOM removal)
    this.sequenceEngine = null;
    this.sequencePlayer = null;
  }
}

// Export for easy integration
export default EducationalEquationBuilder;
