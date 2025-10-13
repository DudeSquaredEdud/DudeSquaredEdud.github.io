/**
 * SequencePlayer - Interactive UI for step-by-step equation solving
 * 
 * This component provides:
 * - Visual step-by-step equation display
 * - Interactive navigation controls
 * - Progress tracking and hints
 * - Educational explanations panel
 * - Auto-play functionality
 * 
 * Integrates with SolvingSequenceEngine for educational value
 */

export class SequencePlayer {
  constructor(containerElement, sequenceEngine, notificationSystem) {
    this.container = containerElement;
    this.sequenceEngine = sequenceEngine;
    this.notificationSystem = notificationSystem;
    
    // UI state
    this.isInitialized = false;
    this.currentEquationDisplay = null;
    
    this.createSequencePlayerUI();
    this.bindEvents();
    this.setupSequenceEngineListeners();
  }

  /**
   * Create the complete sequence player interface
   */
  createSequencePlayerUI() {
    this.container.innerHTML = `
      <div class="sequence-player">
        <div class="sequence-header">
          <div class="sequence-info">
            <h3 id="sequence-title">Select an equation to begin</h3>
            <div class="sequence-meta">
              <span id="difficulty-badge" class="badge">-</span>
              <span id="topic-badge" class="badge">-</span>
            </div>
          </div>
          
          <div class="sequence-progress">
            <div class="progress-bar">
              <div id="progress-fill" class="progress-fill" style="width: 0%"></div>
            </div>
            <span id="progress-text">Step 0 of 0</span>
          </div>
        </div>

        <div class="equation-display-container">
          <div id="equation-display" class="equation-display">
            <div class="equation-placeholder">
              Select an equation from the library to start learning!
            </div>
          </div>
        </div>

        <div class="sequence-controls">
          <div class="control-group navigation">
            <button id="first-step" class="btn-control" title="Go to first step" disabled>
              <i class="icon">⏮️</i>
            </button>
            <button id="prev-step" class="btn-control" title="Previous step" disabled>
              <i class="icon">◀️</i>
            </button>
            <button id="play-pause" class="btn-control btn-primary" title="Auto-play sequence" disabled>
              <i class="icon">▶️</i>
            </button>
            <button id="next-step" class="btn-control" title="Next step" disabled>
              <i class="icon">▶️</i>
            </button>
            <button id="last-step" class="btn-control" title="Go to last step" disabled>
              <i class="icon">⏭️</i>
            </button>
          </div>
          
          <div class="control-group actions">
            <button id="reset-sequence" class="btn-secondary" disabled>
              <i class="icon">🔄</i> Reset
            </button>
            <button id="get-hint" class="btn-secondary" disabled>
              <i class="icon">💡</i> Hint
            </button>
            <button id="show-stats" class="btn-secondary" disabled>
              <i class="icon">📊</i> Stats
            </button>
          </div>
        </div>

        <div class="explanation-panel">
          <div class="explanation-header">
            <h4>Step Explanation</h4>
            <button id="toggle-explanation" class="btn-icon">📖</button>
          </div>
          <div class="explanation-content">
            <div id="step-explanation">
              Choose an equation and navigate through the steps to see detailed explanations here.
            </div>
            <div id="educational-tip" class="educational-tip">
              💡 Educational tips will appear here to help you understand each step.
            </div>
          </div>
        </div>

        <div class="equation-library-toggle">
          <button id="toggle-library" class="btn-primary">
            <i class="icon">📚</i> Equation Library
          </button>
        </div>
      </div>
    `;

    this.createEquationLibraryPanel();
    this.applySequencePlayerStyles();
    this.isInitialized = true;
  }

  /**
   * Create the equation library selection panel
   */
  createEquationLibraryPanel() {
    const libraryPanel = document.createElement('div');
    libraryPanel.className = 'equation-library-panel';
    libraryPanel.innerHTML = `
      <div class="library-header">
        <h3>📚 Equation Library</h3>
        <button id="close-library" class="btn-icon">×</button>
      </div>
      
      <div class="library-filters">
        <div class="filter-group">
          <label>Topic:</label>
          <select id="topic-filter">
            <option value="">All Topics</option>
            <option value="linear_equations">Linear Equations</option>
            <option value="quadratic_equations">Quadratic Equations</option>
            <option value="systems_of_equations">Systems of Equations</option>
            <option value="exponential_equations">Exponential Equations</option>
            <option value="logarithmic_equations">Logarithmic Equations</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Difficulty:</label>
          <select id="difficulty-filter">
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        
        <button id="apply-filters" class="btn-primary">Filter</button>
      </div>
      
      <div id="equation-list" class="equation-list">
        <!-- Equations will be populated here -->
      </div>
    `;

    this.container.appendChild(libraryPanel);
  }

  /**
   * Bind all event listeners
   */
  bindEvents() {
    const container = this.container;

    // Navigation controls
    container.querySelector('#first-step').addEventListener('click', () => {
      this.sequenceEngine.goToStep(0);
    });

    container.querySelector('#prev-step').addEventListener('click', () => {
      this.sequenceEngine.previousStep();
    });

    container.querySelector('#next-step').addEventListener('click', () => {
      this.sequenceEngine.nextStep();
    });

    container.querySelector('#last-step').addEventListener('click', () => {
      if (this.sequenceEngine.currentSequence) {
        this.sequenceEngine.goToStep(this.sequenceEngine.currentSequence.totalSteps - 1);
      }
    });

    // Play/pause control
    container.querySelector('#play-pause').addEventListener('click', () => {
      this.toggleAutoPlay();
    });

    // Action controls  
    container.querySelector('#reset-sequence').addEventListener('click', () => {
      this.sequenceEngine.resetSequence();
    });

    container.querySelector('#get-hint').addEventListener('click', () => {
      this.sequenceEngine.getHint();
    });

    container.querySelector('#show-stats').addEventListener('click', () => {
      this.showSequenceStats();
    });

    // Library controls
    container.querySelector('#toggle-library').addEventListener('click', () => {
      this.toggleLibraryPanel();
    });

    container.querySelector('#close-library').addEventListener('click', () => {
      this.toggleLibraryPanel(false);
    });

    container.querySelector('#apply-filters').addEventListener('click', () => {
      this.applyLibraryFilters();
    });

    // Explanation panel toggle
    container.querySelector('#toggle-explanation').addEventListener('click', () => {
      this.toggleExplanationPanel();
    });
  }

  /**
   * Setup listeners for sequence engine events
   */
  setupSequenceEngineListeners() {
    // Listen for step changes
    document.addEventListener('sequenceStepChanged', (event) => {
      this.updateStepDisplay(event.detail);
    });

    // Listen for progress updates
    document.addEventListener('sequenceProgressUpdated', (event) => {
      this.updateProgressDisplay(event.detail);
    });

    // Listen for sequence completion
    document.addEventListener('sequenceCompleted', (event) => {
      this.onSequenceCompleted(event.detail);
    });
  }

  /**
   * Load and display equations in the library
   */
  async loadEquationLibrary(equations = null) {
    if (!equations) {
      // Import equations dynamically
      const { getAllEquations } = await import('../data/EducationalEquations.js');
      equations = getAllEquations();
    }

    const equationList = this.container.querySelector('#equation-list');
    equationList.innerHTML = '';

    equations.forEach(equation => {
      const equationItem = document.createElement('div');
      equationItem.className = 'equation-item';
      equationItem.innerHTML = `
        <div class="equation-header">
          <h4>${equation.name}</h4>
          <div class="equation-badges">
            <span class="badge difficulty-${equation.difficulty}">${equation.difficulty}</span>
            <span class="badge topic">${equation.topic.replace('_', ' ')}</span>
          </div>
        </div>
        <div class="equation-preview">${equation.equation}</div>
        <div class="equation-meta">
          <span>${equation.steps.length} steps</span>
          <button class="btn-small load-equation" data-equation-id="${equation.id}">
            Load Sequence
          </button>
        </div>
      `;

      // Bind load button
      equationItem.querySelector('.load-equation').addEventListener('click', () => {
        this.loadEquationSequence(equation);
      });

      equationList.appendChild(equationItem);
    });
  }

  /**
   * Load an equation sequence into the player
   */
  loadEquationSequence(equationData) {
    if (this.sequenceEngine.loadSequence(equationData)) {
      this.updateSequenceInfo(equationData);
      this.enableControls(true);
      this.toggleLibraryPanel(false); // Close library
      
      // Start at step 0
      this.sequenceEngine.goToStep(0);
    }
  }

  /**
   * Update sequence information display
   */
  updateSequenceInfo(equationData) {
    const titleElement = this.container.querySelector('#sequence-title');
    const difficultyBadge = this.container.querySelector('#difficulty-badge');
    const topicBadge = this.container.querySelector('#topic-badge');

    titleElement.textContent = equationData.name;
    difficultyBadge.textContent = equationData.difficulty;
    difficultyBadge.className = `badge difficulty-${equationData.difficulty}`;
    topicBadge.textContent = equationData.topic.replace('_', ' ');
  }

  /**
   * Update step display based on current step
   */
  updateStepDisplay(stepDetail) {
    const equationDisplay = this.container.querySelector('#equation-display');
    const stepExplanation = this.container.querySelector('#step-explanation');
    const educationalTip = this.container.querySelector('#educational-tip');
    const progressText = this.container.querySelector('#progress-text');
    const progressFill = this.container.querySelector('#progress-fill');

    // Update equation display
    equationDisplay.innerHTML = `
      <div class="current-equation">
        <div class="step-number">Step ${stepDetail.stepData.progress.current}</div>
        <div class="equation-content">${stepDetail.stepData.stepData.equation}</div>
      </div>
    `;

    // Update explanation
    stepExplanation.innerHTML = `
      <strong>Action:</strong> ${stepDetail.explanation.explanation}<br>
      ${stepDetail.explanation.value ? `<strong>Value:</strong> ${stepDetail.explanation.value}` : ''}
    `;

    educationalTip.innerHTML = `💡 ${stepDetail.explanation.educationalTip}`;

    // Update progress
    progressText.textContent = `Step ${stepDetail.stepData.progress.current} of ${stepDetail.stepData.progress.total}`;
    progressFill.style.width = `${stepDetail.stepData.progress.percentage}%`;

    // Update navigation button states
    this.updateNavigationButtons(stepDetail.stepData);
  }

  /**
   * Update navigation button states
   */
  updateNavigationButtons(stepData) {
    const firstBtn = this.container.querySelector('#first-step');
    const prevBtn = this.container.querySelector('#prev-step');
    const nextBtn = this.container.querySelector('#next-step');
    const lastBtn = this.container.querySelector('#last-step');

    firstBtn.disabled = stepData.isFirst;
    prevBtn.disabled = stepData.isFirst;
    nextBtn.disabled = stepData.isLast;
    lastBtn.disabled = stepData.isLast;
  }

  /**
   * Toggle auto-play functionality
   */
  toggleAutoPlay() {
    const playPauseBtn = this.container.querySelector('#play-pause');
    const icon = playPauseBtn.querySelector('.icon');

    if (this.sequenceEngine.isPlaying) {
      this.sequenceEngine.stopAutoPlay();
      icon.textContent = '▶️';
      playPauseBtn.title = 'Auto-play sequence';
    } else {
      this.sequenceEngine.startAutoPlay();
      icon.textContent = '⏸️';
      playPauseBtn.title = 'Pause auto-play';
    }
  }

  /**
   * Enable or disable controls
   */
  enableControls(enabled) {
    const controls = this.container.querySelectorAll('.btn-control, #reset-sequence, #get-hint, #show-stats');
    controls.forEach(control => {
      control.disabled = !enabled;
    });
  }

  /**
   * Toggle library panel visibility
   */
  toggleLibraryPanel(show = null) {
    const libraryPanel = this.container.querySelector('.equation-library-panel');
    const isVisible = libraryPanel.classList.contains('visible');
    
    if (show === null) {
      show = !isVisible;
    }

    if (show) {
      libraryPanel.classList.add('visible');
      this.loadEquationLibrary(); // Load equations when opening
    } else {
      libraryPanel.classList.remove('visible');
    }
  }

  /**
   * Apply library filters
   */
  async applyLibraryFilters() {
    const topicFilter = this.container.querySelector('#topic-filter').value;
    const difficultyFilter = this.container.querySelector('#difficulty-filter').value;

    const { getAllEquations, getEquationsByTopic, getEquationsByDifficulty } = await import('../data/EducationalEquations.js');
    
    let filteredEquations = getAllEquations();

    if (topicFilter) {
      filteredEquations = getEquationsByTopic(topicFilter);
    }

    if (difficultyFilter) {
      filteredEquations = filteredEquations.filter(eq => eq.difficulty === difficultyFilter);
    }

    this.loadEquationLibrary(filteredEquations);
  }

  /**
   * Toggle explanation panel
   */
  toggleExplanationPanel() {
    const explanationPanel = this.container.querySelector('.explanation-panel');
    explanationPanel.classList.toggle('collapsed');
  }

  /**
   * Show sequence statistics
   */
  showSequenceStats() {
    const stats = this.sequenceEngine.getSequenceStats();
    if (!stats) {
      this.notificationSystem?.show('No sequence loaded', 'error');
      return;
    }

    const timeSpent = Math.round(stats.progress.timeSpent / 1000);
    const statsMessage = `
      Sequence: ${stats.sequenceInfo.name}
      Progress: ${stats.currentStep}/${stats.sequenceInfo.totalSteps} (${stats.completionPercentage}%)
      Time Spent: ${timeSpent} seconds
      Hints Used: ${stats.progress.hintsUsed}
      Difficulty: ${stats.sequenceInfo.difficulty}
    `;

    this.notificationSystem?.show(statsMessage, 'info');
  }

  /**
   * Handle sequence completion
   */
  onSequenceCompleted(completionData) {
    // Show completion celebration
    const equationDisplay = this.container.querySelector('#equation-display');
    equationDisplay.innerHTML = `
      <div class="completion-celebration">
        <div class="celebration-icon">🎉</div>
        <h3>Congratulations!</h3>
        <p>You completed "${completionData.sequenceName}"</p>
        <div class="completion-stats">
          <div>Time: ${Math.round(completionData.totalTime / 1000)}s</div>
          <div>Hints: ${completionData.hintsUsed}</div>
          <div>Difficulty: ${completionData.difficulty}</div>
        </div>
        <button id="try-another" class="btn-primary">Try Another Equation</button>
      </div>
    `;

    // Bind try another button
    this.container.querySelector('#try-another').addEventListener('click', () => {
      this.toggleLibraryPanel(true);
    });
  }

  /**
   * Apply styles for the sequence player
   */
  applySequencePlayerStyles() {
    if (document.querySelector('#sequence-player-styles')) {
      return; // Already applied
    }

    const styles = document.createElement('style');
    styles.id = 'sequence-player-styles';
    styles.textContent = `
      .sequence-player {
        max-width: 1000px;
        margin: 0 auto;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      .sequence-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 15px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 8px;
      }

      .sequence-info h3 {
        margin: 0 0 8px 0;
        font-size: 1.4em;
      }

      .sequence-meta {
        display: flex;
        gap: 8px;
      }

      .badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8em;
        font-weight: bold;
        text-transform: capitalize;
      }

      .badge.difficulty-beginner { background: #4CAF50; }
      .badge.difficulty-intermediate { background: #FF9800; }
      .badge.difficulty-advanced { background: #F44336; }
      .badge.topic { background: rgba(255,255,255,0.2); }

      .progress-bar {
        width: 200px;
        height: 8px;
        background: rgba(255,255,255,0.3);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 5px;
      }

      .progress-fill {
        height: 100%;
        background: #4CAF50;
        transition: width 0.3s ease;
      }

      .equation-display-container {
        background: white;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        padding: 30px;
        margin-bottom: 20px;
        min-height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .current-equation {
        text-align: center;
      }

      .step-number {
        font-size: 0.9em;
        color: #666;
        margin-bottom: 10px;
      }

      .equation-content {
        font-size: 2em;
        font-weight: bold;
        color: #333;
        font-family: 'Courier New', monospace;
        white-space: pre-line;
      }

      .equation-placeholder {
        text-align: center;
        color: #999;
        font-style: italic;
      }

      .sequence-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 15px;
        background: #f5f5f5;
        border-radius: 8px;
      }

      .control-group {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .btn-control {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 50%;
        background: #2196F3;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .btn-control:hover:not(:disabled) {
        background: #1976D2;
        transform: scale(1.1);
      }

      .btn-control:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
      }

      .btn-control.btn-primary {
        background: #4CAF50;
      }

      .btn-control.btn-primary:hover:not(:disabled) {
        background: #388E3C;
      }

      .btn-secondary {
        padding: 8px 16px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-secondary:hover:not(:disabled) {
        background: #f0f0f0;
        border-color: #999;
      }

      .btn-secondary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .explanation-panel {
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        margin-bottom: 20px;
        overflow: hidden;
      }

      .explanation-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background: #f8f9fa;
        border-bottom: 1px solid #ddd;
      }

      .explanation-header h4 {
        margin: 0;
        color: #333;
      }

      .explanation-content {
        padding: 15px;
      }

      .educational-tip {
        margin-top: 15px;
        padding: 10px;
        background: #e3f2fd;
        border-left: 4px solid #2196F3;
        border-radius: 4px;
        font-style: italic;
      }

      .equation-library-panel {
        position: fixed;
        top: 0;
        right: -400px;
        width: 400px;
        height: 100vh;
        background: white;
        box-shadow: -2px 0 10px rgba(0,0,0,0.1);
        transition: right 0.3s ease;
        z-index: 1000;
        overflow-y: auto;
      }

      .equation-library-panel.visible {
        right: 0;
      }

      .library-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        background: #3f51b5;
        color: white;
      }

      .library-filters {
        padding: 20px;
        border-bottom: 1px solid #eee;
      }

      .filter-group {
        margin-bottom: 15px;
      }

      .filter-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
      }

      .filter-group select {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }

      .equation-list {
        padding: 0 20px 20px;
      }

      .equation-item {
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
        transition: box-shadow 0.2s ease;
      }

      .equation-item:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .equation-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 10px;
      }

      .equation-header h4 {
        margin: 0;
        color: #333;
      }

      .equation-badges {
        display: flex;
        gap: 5px;
      }

      .equation-preview {
        font-family: 'Courier New', monospace;
        font-size: 1.1em;
        margin: 10px 0;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 4px;
        white-space: pre-line;
      }

      .equation-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #666;
        font-size: 0.9em;
      }

      .btn-small {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        background: #4CAF50;
        color: white;
        cursor: pointer;
        font-size: 0.8em;
      }

      .btn-small:hover {
        background: #388E3C;
      }

      .completion-celebration {
        text-align: center;
        padding: 40px;
      }

      .celebration-icon {
        font-size: 4em;
        margin-bottom: 20px;
      }

      .completion-celebration h3 {
        color: #4CAF50;
        margin-bottom: 15px;
      }

      .completion-stats {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin: 20px 0;
        color: #666;
      }

      .btn-primary {
        padding: 12px 24px;
        border: none;
        border-radius: 4px;
        background: #2196F3;
        color: white;
        cursor: pointer;
        font-size: 1em;
        margin-top: 20px;
      }

      .btn-primary:hover {
        background: #1976D2;
      }

      .btn-icon {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.2em;
      }
    `;

    document.head.appendChild(styles);
  }
}
