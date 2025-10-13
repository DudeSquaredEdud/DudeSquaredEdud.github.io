/**
 * SolvingSequenceEngine - Core system for step-by-step equation solving
 * 
 * This engine provides:
 * - Step-by-step equation solving sequences
 * - Interactive step navigation (forward/backward)
 * - Visual highlighting of equation changes
 * - Educational explanations for each step
 * - Multiple solution path support
 * 
 * Educational focus: Help students understand the logical progression
 * of equation solving through guided, interactive sequences.
 */

export class SolvingSequenceEngine {
  constructor(notificationSystem) {
    this.notificationSystem = notificationSystem;
    
    // Current sequence state
    this.currentSequence = null;
    this.currentStepIndex = 0;
    this.isPlaying = false;
    this.playSpeed = 2000; // ms between auto-steps
    
    // Visual highlighting system
    this.highlightElements = new Set();
    this.previousEquation = '';
    
    // Step validation and tracking
    this.completedSteps = new Set();
    this.studentProgress = {
      totalSteps: 0,
      completedSteps: 0,
      timeSpent: 0,
      hintsUsed: 0
    };
    
    console.log('SolvingSequenceEngine initialized for educational step-by-step learning');
  }

  /**
   * Load a solving sequence from equation data
   * @param {Object} equationData - Equation with steps from EducationalEquations
   */
  loadSequence(equationData) {
    if (!equationData || !equationData.steps) {
      this.notificationSystem?.show('Invalid equation data - no solving steps found', 'error');
      return false;
    }

    this.currentSequence = {
      id: equationData.id,
      name: equationData.name,
      originalEquation: equationData.equation,
      difficulty: equationData.difficulty,
      topic: equationData.topic,
      steps: equationData.steps,
      totalSteps: equationData.steps.length
    };

    // Reset progress tracking
    this.currentStepIndex = 0;
    this.completedSteps.clear();
    this.studentProgress = {
      totalSteps: equationData.steps.length,
      completedSteps: 0,
      timeSpent: 0,
      hintsUsed: 0,
      startTime: Date.now()
    };

    this.notificationSystem?.show(`Loaded sequence: ${equationData.name}`, 'success');
    return true;
  }

  /**
   * Navigate to a specific step in the sequence
   * @param {number} stepIndex - Target step index (0-based)
   */
  goToStep(stepIndex) {
    if (!this.currentSequence) {
      this.notificationSystem?.show('No sequence loaded', 'error');
      return false;
    }

    if (stepIndex < 0 || stepIndex >= this.currentSequence.totalSteps) {
      this.notificationSystem?.show('Invalid step index', 'error');
      return false;
    }

    const previousStep = this.currentStepIndex;
    this.currentStepIndex = stepIndex;

    // Update progress if moving forward
    if (stepIndex > previousStep) {
      for (let i = previousStep; i < stepIndex; i++) {
        this.completedSteps.add(i);
      }
      this.updateProgress();
    }

    // Trigger visual update
    this.updateVisualDisplay();
    
    return true;
  }

  /**
   * Move to the next step in the sequence
   */
  nextStep() {
    if (!this.currentSequence) {
      this.notificationSystem?.show('No sequence loaded', 'error');
      return false;
    }

    if (this.currentStepIndex >= this.currentSequence.totalSteps - 1) {
      this.notificationSystem?.show('Sequence complete!', 'success');
      this.onSequenceComplete();
      return false;
    }

    return this.goToStep(this.currentStepIndex + 1);
  }

  /**
   * Move to the previous step in the sequence
   */
  previousStep() {
    if (!this.currentSequence) {
      this.notificationSystem?.show('No sequence loaded', 'error');
      return false;
    }

    if (this.currentStepIndex <= 0) {
      this.notificationSystem?.show('Already at the first step', 'warning');
      return false;
    }

    return this.goToStep(this.currentStepIndex - 1);
  }

  /**
   * Start auto-playing the sequence
   */
  startAutoPlay() {
    if (!this.currentSequence || this.isPlaying) {
      return false;
    }

    this.isPlaying = true;
    this.autoPlayTimer = setInterval(() => {
      if (!this.nextStep()) {
        this.stopAutoPlay();
      }
    }, this.playSpeed);

    this.notificationSystem?.show('Auto-play started', 'info');
    return true;
  }

  /**
   * Stop auto-playing the sequence
   */
  stopAutoPlay() {
    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
    this.isPlaying = false;
    this.notificationSystem?.show('Auto-play stopped', 'info');
  }

  /**
   * Get the current step data
   */
  getCurrentStep() {
    if (!this.currentSequence) {
      return null;
    }

    return {
      stepIndex: this.currentStepIndex,
      stepData: this.currentSequence.steps[this.currentStepIndex],
      isFirst: this.currentStepIndex === 0,
      isLast: this.currentStepIndex === this.currentSequence.totalSteps - 1,
      progress: {
        current: this.currentStepIndex + 1,
        total: this.currentSequence.totalSteps,
        percentage: Math.round(((this.currentStepIndex + 1) / this.currentSequence.totalSteps) * 100)
      }
    };
  }

  /**
   * Get step explanation with educational context
   */
  getStepExplanation(stepIndex = null) {
    const index = stepIndex !== null ? stepIndex : this.currentStepIndex;
    
    if (!this.currentSequence || index < 0 || index >= this.currentSequence.totalSteps) {
      return null;
    }

    const step = this.currentSequence.steps[index];
    
    return {
      stepNumber: index + 1,
      action: step.action,
      explanation: step.explanation,
      equation: step.equation,
      value: step.value || null,
      educationalTip: this.getEducationalTip(step.action)
    };
  }

  /**
   * Get educational tips based on the action type
   */
  getEducationalTip(action) {
    const tips = {
      'add_both_sides': 'Remember: Whatever you do to one side of an equation, you must do to the other side to keep it balanced.',
      'subtract_both_sides': 'Subtraction is the opposite of addition. We subtract to undo addition.',
      'multiply_both_sides': 'Multiplication is the opposite of division. We multiply to undo division.',
      'divide_both_sides': 'Division is the opposite of multiplication. We divide to undo multiplication.',
      'distribute': 'The distributive property: a(b + c) = ab + ac',
      'factor': 'Factoring is the reverse of distributing. Look for common factors or patterns.',
      'square_root_both_sides': 'Remember that square roots have both positive and negative solutions.',
      'combine_like_terms': 'Like terms have the same variable with the same exponent.',
      'simplify': 'Always simplify your expressions to make them easier to work with.',
      'solution': 'Great job! Always check your solution by substituting back into the original equation.'
    };

    return tips[action] || 'Each step moves us closer to isolating the variable.';
  }

  /**
   * Update visual display based on current step
   */
  updateVisualDisplay() {
    const currentStep = this.getCurrentStep();
    if (!currentStep) return;

    // Clear previous highlights
    this.clearHighlights();

    // Emit event for UI components to update
    document.dispatchEvent(new CustomEvent('sequenceStepChanged', {
      detail: {
        stepData: currentStep,
        explanation: this.getStepExplanation(),
        sequence: this.currentSequence
      }
    }));
  }

  /**
   * Update student progress tracking
   */
  updateProgress() {
    this.studentProgress.completedSteps = this.completedSteps.size;
    this.studentProgress.timeSpent = Date.now() - this.studentProgress.startTime;

    // Emit progress update event
    document.dispatchEvent(new CustomEvent('sequenceProgressUpdated', {
      detail: {
        progress: this.studentProgress,
        completionPercentage: Math.round((this.studentProgress.completedSteps / this.studentProgress.totalSteps) * 100)
      }
    }));
  }

  /**
   * Handle sequence completion
   */
  onSequenceComplete() {
    this.updateProgress();
    
    const completionData = {
      sequenceId: this.currentSequence.id,
      sequenceName: this.currentSequence.name,
      difficulty: this.currentSequence.difficulty,
      topic: this.currentSequence.topic,
      totalTime: this.studentProgress.timeSpent,
      hintsUsed: this.studentProgress.hintsUsed,
      completedAt: new Date().toISOString()
    };

    // Emit completion event
    document.dispatchEvent(new CustomEvent('sequenceCompleted', {
      detail: completionData
    }));

    this.notificationSystem?.show(`Congratulations! You completed "${this.currentSequence.name}"`, 'success');
  }

  /**
   * Provide a hint for the current step
   */
  getHint() {
    const explanation = this.getStepExplanation();
    if (!explanation) {
      return null;
    }

    this.studentProgress.hintsUsed++;
    
    const hint = {
      stepNumber: explanation.stepNumber,
      hint: explanation.educationalTip,
      actionHint: this.getActionHint(explanation.action, explanation.value)
    };

    this.notificationSystem?.show(`Hint: ${hint.hint}`, 'info');
    return hint;
  }

  /**
   * Get specific action hints
   */
  getActionHint(action, value) {
    const actionHints = {
      'add_both_sides': `Try adding ${value} to both sides of the equation.`,
      'subtract_both_sides': `Try subtracting ${value} from both sides of the equation.`,
      'multiply_both_sides': `Try multiplying both sides by ${value}.`,
      'divide_both_sides': `Try dividing both sides by ${value}.`,
      'distribute': 'Apply the distributive property to expand the expression.',
      'factor': 'Look for common factors or special patterns like difference of squares.',
      'simplify': 'Combine like terms and perform the arithmetic operations.',
      'substitute': 'Replace the variable with the expression from another equation.'
    };

    return actionHints[action] || 'Think about what operation will help isolate the variable.';
  }

  /**
   * Clear visual highlights
   */
  clearHighlights() {
    this.highlightElements.forEach(element => {
      element.classList.remove('sequence-highlight', 'sequence-changed');
    });
    this.highlightElements.clear();
  }

  /**
   * Reset the sequence to the beginning
   */
  resetSequence() {
    if (!this.currentSequence) {
      return false;
    }

    this.stopAutoPlay();
    this.currentStepIndex = 0;
    this.completedSteps.clear();
    this.studentProgress.completedSteps = 0;
    this.studentProgress.hintsUsed = 0;
    this.studentProgress.startTime = Date.now();
    
    this.updateVisualDisplay();
    this.notificationSystem?.show('Sequence reset to beginning', 'info');
    
    return true;
  }

  /**
   * Get sequence statistics for educational insights
   */
  getSequenceStats() {
    if (!this.currentSequence) {
      return null;
    }

    return {
      sequenceInfo: {
        id: this.currentSequence.id,
        name: this.currentSequence.name,
        difficulty: this.currentSequence.difficulty,
        topic: this.currentSequence.topic,
        totalSteps: this.currentSequence.totalSteps
      },
      progress: this.studentProgress,
      currentStep: this.currentStepIndex + 1,
      completionPercentage: Math.round(((this.currentStepIndex + 1) / this.currentSequence.totalSteps) * 100),
      isComplete: this.currentStepIndex === this.currentSequence.totalSteps - 1
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopAutoPlay();
    this.clearHighlights();
    this.currentSequence = null;
    this.currentStepIndex = 0;
    this.completedSteps.clear();
  }
}
