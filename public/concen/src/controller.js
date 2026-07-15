(function (global) {
  "use strict";

  const RingMapChart = global.RingMapChart;
  const { config, model, storage, utils } = RingMapChart;
  const WELCOME_KEY = "ring-map-chart-welcome-v1";
  const GITHUB_SYNC_KEY = "concen-github-sync-v1";
  const AUTHOR_PROFILE_KEY = "concen-author-profile-v1";
  const UNDO_MAX_ITEMS = 40;
  const UNDO_MAX_BYTES = 2500000;
  const RECENT_MAX_ITEMS = 6;
  const SCREENSAVER_IDLE_MS = 5 * 60 * 1000;
  const DEFAULT_BRANCH_COLORS = config.colors.slice();
  const LAYOUT_PRESETS = {
    compact: { treeLevelGap: 48, treeLeafGap: 56, ringBaseRadius: 68, ringDepthGap: 58, ringNodeGap: 4 },
    balanced: { treeLevelGap: 72, treeLeafGap: 92, ringBaseRadius: 102, ringDepthGap: 90, ringNodeGap: 20 },
    wide: { treeLevelGap: 118, treeLeafGap: 160, ringBaseRadius: 155, ringDepthGap: 145, ringNodeGap: 58 }
  };
  const THEME_COLOR_TOKEN_KEYS = [
    "bg",
    "surface",
    "surface-solid",
    "surface-raised",
    "surface-recessed",
    "glass-border",
    "hairline",
    "field",
    "field-hover",
    "control",
    "control-hover",
    "control-pressed",
    "control-ink",
    "focus",
    "focus-soft",
    "path-glow",
    "path-fill",
    "sibling-glow",
    "sibling-fill",
    "ink",
    "muted",
    "label",
    "canvas-bg",
    "canvas-grid",
    "canvas-wash",
    "ring-guide",
    "node-fill",
    "node-ink",
    "root-node-fill",
    "root-node-ink"
  ];
  const MANAGED_THEME_TOKEN_KEYS = Array.from(new Set(
    Object.values(config.themePresets)
      .flatMap((preset) => Object.keys(preset.tokens))
      .concat(config.themeTokenControls.map((control) => control.key))
      .concat(THEME_COLOR_TOKEN_KEYS)
  ));
  const MANAGED_STYLE_TOKEN_KEYS = [
    "bg",
    "surface",
    "surface-solid",
    "surface-raised",
    "surface-recessed",
    "glass-border",
    "hairline",
    "field",
    "field-hover",
    "control",
    "control-hover",
    "control-pressed",
    "control-ink",
    "focus",
    "focus-soft",
    "path-glow",
    "path-fill",
    "sibling-glow",
    "sibling-fill",
    "ink",
    "muted",
    "label",
    "canvas-bg",
    "canvas-grid",
    "canvas-wash",
    "ring-guide",
    "node-fill",
    "node-ink",
    "root-node-fill",
    "root-node-ink",
    "shadow-sm",
    "shadow-md",
    "shadow-lg",
    "node-shadow"
  ];

  function Controller(elements) {
    this.el = elements;
    this.el.welcomeModePacks = this.el.welcomeModePacks || document.getElementById("welcomeModePacks");
    this.layoutEngine = RingMapChart.createLayoutEngine();
    this.renderer = new RingMapChart.Renderer(elements.svg, this.layoutEngine);
    this.spacing = storage.normalizeSpacing(null, config.spacingDefaults);
    this.appearance = storage.normalizeAppearance(null, config.appearanceDefaults);
    this.store = model.createStore();
    this.mind = model.createMindFromTree(this.store.tree);
    this.maps = [];
    this.activeMapId = null;
    this.downMapStack = [];
    this.theme = "light";
    this.customTheme = storage.normalizeCustomTheme(null);
    this.branchColors = DEFAULT_BRANCH_COLORS.slice();
    this.workspaceId = workspaceId();
    this.workspaceUpdatedAt = new Date().toISOString();
    this.authorProfile = loadAuthorProfile();
    this.workspaceSync = storage.normalizeWorkspaceSync(null);
    this.viewMode = "radial";
    this.viewport = { width: config.layout.minViewportWidth, height: config.layout.minViewportHeight };
    this.world = { width: config.layout.minViewportWidth, height: config.layout.minViewportHeight };
    this.currentBounds = null;
    this.positions = new Map();
    this.camera = { x: 0, y: 0, scale: 1 };
    this.cameraReady = false;
    this.renderQueued = false;
    this.pendingRenderStatus = "";
    this.editingId = null;
    this.animatedNewNodeId = null;
    this.noteCloseTimer = null;
    this.noteSaveTimer = null;
    this.noteSidebarSourceId = null;
    this.isSpaceDown = false;
    this.isPointerOverCanvas = false;
    this.isPanning = false;
    this.panStart = null;
    this.nodeDrag = null;
    this.layoutAnimationPositions = null;
    this.shouldRevealFocus = true;
    this.previousRenderedFocusId = null;
    this.actionBarOpen = false;
    this.undoStack = [];
    this.redoStack = [];
    this.undoBytes = 0;
    this.redoBytes = 0;
    this.mindIndex = null;
    this.paletteItems = [];
    this.paletteIndex = 0;
    this.nodeLinkItems = [];
    this.nodeLinkIndex = 0;
    this.nodeLinkRange = null;
    this.appDialogResolve = null;
    this.appDialogCancelValue = null;
    this.saveStateTimer = null;
    this.statusMessageTimer = null;
    this.tutorialGuide = null;
    this.recentMinds = [];
    this.githubSync = loadGithubSyncConfig();
    this.activeCustomSelect = null;
    this.layoutSettingsOpen = false;
    this.notesDocumentDirty = false;
    this.notesDocumentCommitTimer = null;
    this.notesDocumentUndoPending = false;
    this.notesRichLastBlock = null;
    this.screensaverTimer = null;
    this.screensaverActive = false;
    this.boundScreensaverActivity = (event) => this.handleScreensaverActivity(event);
    this.boundScreensaverVisibilityChange = () => this.handleScreensaverVisibilityChange();
  }

  Controller.prototype.start = function () {
    this.load();
    this.bindEvents();
    this.syncControls();
    this.render();
    this.showWelcomeIfNeeded();
    this.resetScreensaverTimer();
    this.el.svg.focus();
  };

  Controller.prototype.load = function () {
    this.recentMinds = loadRecentMinds();
    const saved = storage.load();
    if (!saved) {
      this.store = model.createStore();
      this.mind = model.createMindFromTree(this.store.tree);
      this.workspaceId = workspaceId();
      this.workspaceUpdatedAt = new Date().toISOString();
      this.authorProfile = storage.normalizeAuthorProfile(this.authorProfile);
      this.workspaceSync = storage.normalizeWorkspaceSync(null);
      const map = this.createMap(model.ROOT_ID, "Chart Title");
      this.maps = [map];
      this.activeMapId = map.id;
      this.refreshViewTree();
      return;
    }
    this.mind = saved.mind;
    this.workspaceId = saved.workspaceId || workspaceId();
    this.workspaceUpdatedAt = saved.updatedAt || new Date().toISOString();
    this.authorProfile = authorProfileForWorkspace(saved.authorProfile, this.authorProfile);
    saveAuthorProfile(this.authorProfile);
    this.workspaceSync = storage.normalizeWorkspaceSync(saved.sync);
    this.maps = saved.maps;
    this.activeMapId = saved.activeMapId;
    this.appearance = storage.normalizeAppearance(saved.appearance, config.appearanceDefaults);
    this.theme = saved.theme;
    this.customTheme = storage.normalizeCustomTheme(saved.customTheme);
    this.branchColors = storage.normalizeBranchColors(saved.branchColors);
    this.loadMap(this.currentMap());
  };

  Controller.prototype.bindEvents = function () {
    this.el.titleInput.addEventListener("input", () => {
      const label = utils.cleanLabel(this.el.titleInput.value) || "Chart Title";
      const map = this.currentMap();
      if (map) {
        model.renameMindNode(this.mind, map.rootNodeId, label);
        map.title = label;
        this.refreshViewTree();
      }
      if (this.store.focusedId === model.ROOT_ID) this.el.nodeLabelInput.value = label;
      this.save();
      this.scheduleRender(true);
    });

    this.el.mapSelect.addEventListener("change", () => this.switchMap(this.el.mapSelect.value));
    this.el.parentMapButton.addEventListener("click", () => this.openParentMap());
    this.el.childMapButton.addEventListener("click", () => this.openRecentChildMap());
    this.el.newMapButton.addEventListener("click", () => this.newMap());
    this.el.deleteMapButton.addEventListener("click", () => this.deleteActiveMap());
    this.el.newMindButton.addEventListener("click", () => this.newMind());
    this.el.saveMindButton.addEventListener("click", () => {
      this.save();
      this.updateStatus("Mind saved");
    });
    this.el.commandPaletteButton.addEventListener("click", () => this.openCommandPalette());
    this.el.commandInput.addEventListener("input", () => this.renderCommandResults());
    this.el.commandInput.addEventListener("keydown", (event) => this.handleCommandKey(event));
    this.el.commandPalette.addEventListener("pointerdown", (event) => {
      if (event.target === this.el.commandPalette) this.closeCommandPalette();
    });
    if (this.el.brandLogoButton) this.el.brandLogoButton.addEventListener("click", () => this.openWelcome());
    if (this.el.shortcutSheetButton) this.el.shortcutSheetButton.addEventListener("click", () => this.openShortcutSheet());
    if (this.el.shortcutSheetCloseButton) this.el.shortcutSheetCloseButton.addEventListener("click", () => this.closeShortcutSheet());
    if (this.el.shortcutSheet) this.el.shortcutSheet.addEventListener("pointerdown", (event) => {
      if (event.target === this.el.shortcutSheet) this.closeShortcutSheet();
    });
    if (this.el.welcomeCloseButton) this.el.welcomeCloseButton.addEventListener("click", () => this.startBlankMind());
    if (this.el.welcomeCommandButton) this.el.welcomeCommandButton.addEventListener("click", () => {
      this.closeWelcome();
      this.openCommandPalette();
    });
    if (this.el.welcomeTutorialButton) this.el.welcomeTutorialButton.addEventListener("click", () => this.startTutorial());
    if (this.el.welcomeDialog) this.el.welcomeDialog.addEventListener("pointerdown", (event) => {
      if (event.target === this.el.welcomeDialog) this.closeWelcome();
    });
    if (this.el.welcomeTemplates) this.el.welcomeTemplates.addEventListener("click", (event) => {
      const button = event.target.closest && event.target.closest("button[data-template]");
      if (button) this.applyWelcomeTemplate(button.dataset.template, { closeWelcome: true });
    });
    if (this.el.welcomeStyles) this.el.welcomeStyles.addEventListener("click", (event) => {
      const button = event.target.closest && event.target.closest("button[data-style]");
      if (button) this.applyWelcomeStyle(button.dataset.style);
    });
    if (this.el.welcomeModePacks) this.el.welcomeModePacks.addEventListener("click", (event) => {
      const button = event.target.closest && event.target.closest("button[data-mode-pack]");
      if (button) this.applyModePack(button.dataset.modePack);
    });
    this.el.exportMindButton.addEventListener("click", () => this.exportMind());
    if (this.el.recoveryButton) this.el.recoveryButton.addEventListener("click", () => this.openRecovery());
    if (this.el.recoveryCloseButton) this.el.recoveryCloseButton.addEventListener("click", () => this.closeRecovery());
    if (this.el.recoveryDialog) this.el.recoveryDialog.addEventListener("pointerdown", (event) => {
      if (event.target === this.el.recoveryDialog) this.closeRecovery();
    });
    if (this.el.appDialog) this.el.appDialog.addEventListener("pointerdown", (event) => {
      if (event.target === this.el.appDialog) this.closeAppDialog(this.appDialogCancelValue);
    });
    if (this.el.recoveryExportCurrentButton) this.el.recoveryExportCurrentButton.addEventListener("click", () => this.exportCurrentRecoveryBackup());
    if (this.el.recoverySavePointButton) this.el.recoverySavePointButton.addEventListener("click", () => this.saveRecoveryPoint());
    if (this.el.recoveryClearButton) this.el.recoveryClearButton.addEventListener("click", () => this.clearRecentMinds("recovery"));
    this.el.importMindInput.addEventListener("change", () => this.importMind());
    if (this.el.githubSaveSettingsButton) this.el.githubSaveSettingsButton.addEventListener("click", () => this.saveGithubSyncSettings());
    if (this.el.githubExportSettingsButton) this.el.githubExportSettingsButton.addEventListener("click", () => this.exportGithubSyncSettings());
    if (this.el.githubImportSettingsInput) this.el.githubImportSettingsInput.addEventListener("change", () => this.importGithubSyncSettings());
    if (this.el.githubPushButton) this.el.githubPushButton.addEventListener("click", () => this.pushMindToGithub());
    if (this.el.githubPullButton) this.el.githubPullButton.addEventListener("click", () => this.pullMindFromGithub());
    if (this.el.githubDisconnectButton) this.el.githubDisconnectButton.addEventListener("click", () => this.disconnectGithubSync());
    if (this.el.saveAuthorProfileButton) this.el.saveAuthorProfileButton.addEventListener("click", () => this.saveAuthorProfileFromInput());
    if (this.el.trustRecoveryButton) this.el.trustRecoveryButton.addEventListener("click", () => this.saveRecoveryPoint());
    if (this.el.trustBackupButton) this.el.trustBackupButton.addEventListener("click", () => this.exportCurrentRecoveryBackup());
    if (this.el.trustOpenRecoveryButton) this.el.trustOpenRecoveryButton.addEventListener("click", () => this.openRecovery());
    if (this.el.trustPushButton) this.el.trustPushButton.addEventListener("click", () => this.pushMindToGithub());
    if (this.el.trustPullButton) this.el.trustPullButton.addEventListener("click", () => this.pullMindFromGithub());
    if (this.el.trustDisconnectButton) this.el.trustDisconnectButton.addEventListener("click", () => this.disconnectGithubSync());
    if (this.el.clearRecentMindsButton) this.el.clearRecentMindsButton.addEventListener("click", () => this.clearRecentMinds("recent"));
    [this.el.mindMenu, this.el.settingsMenu].forEach((menu) => {
      if (!menu) return;
      menu.addEventListener("toggle", () => {
        if (!menu.open) {
          if (![this.el.mindMenu, this.el.settingsMenu].some((other) => other && other.open)) this.reclaimCanvasFocus();
          return;
        }
        [this.el.mindMenu, this.el.settingsMenu].forEach((other) => {
          if (other && other !== menu) other.open = false;
        });
      });
    });

    if (this.el.viewModeInput) {
      this.el.viewModeInput.addEventListener("change", () => this.setViewMode(this.el.viewModeInput.checked ? "radial" : "tree"));
    }
    if (this.el.treeViewButton) this.el.treeViewButton.addEventListener("click", () => this.setViewMode("tree"));
    if (this.el.radialViewButton) this.el.radialViewButton.addEventListener("click", () => this.setViewMode("radial"));
    if (this.el.bookViewButton) this.el.bookViewButton.addEventListener("click", () => this.setViewMode("book"));
    if (this.el.documentViewButton) this.el.documentViewButton.addEventListener("click", () => this.setViewMode("document"));
    if (this.el.notesViewButton) this.el.notesViewButton.addEventListener("click", () => this.setViewMode("notes"));
    if (this.el.notesDocumentInput) {
      this.el.notesDocumentInput.addEventListener("input", () => this.handleNotesDocumentInput());
      this.el.notesDocumentInput.addEventListener("blur", () => this.commitNotesDocument());
    }
    if (this.el.notesRichEditor) {
      this.el.notesRichEditor.addEventListener("paste", (event) => this.handleNotesRichEditorPaste(event));
      this.el.notesRichEditor.addEventListener("input", () => this.handleNotesRichEditorInput());
      this.el.notesRichEditor.addEventListener("keydown", (event) => this.handleNotesRichEditorKeyDown(event));
      this.el.notesRichEditor.addEventListener("keyup", () => this.trackNotesRichBlock());
      this.el.notesRichEditor.addEventListener("pointerup", () => this.trackNotesRichBlock());
      this.el.notesRichEditor.addEventListener("focus", () => this.trackNotesRichBlock());
      this.el.notesRichEditor.addEventListener("blur", () => {
        this.normalizeNotesRichBlock(this.notesRichLastBlock);
        this.notesRichLastBlock = null;
        this.commitNotesDocument();
      });
    }
    if (this.el.layoutSettingsButton) this.el.layoutSettingsButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.toggleLayoutSettings();
    });
    if (this.el.zoomOutButton) this.el.zoomOutButton.addEventListener("click", () => this.zoomBy(0.85));
    if (this.el.zoomInButton) this.el.zoomInButton.addEventListener("click", () => this.zoomBy(1.18));
    if (this.el.fitViewButton) this.el.fitViewButton.addEventListener("click", () => this.fitCurrentView());
    if (this.el.stylePresetInput) {
      this.el.stylePresetInput.addEventListener("change", () => {
        this.appearance.stylePreset = storage.normalizeStylePreset(this.el.stylePresetInput.value);
        this.applyTheme();
        this.applyAppearance();
        this.save();
        this.updateStatus("Style changed");
      });
    }
    if (this.el.backgroundEffectInput) {
      this.el.backgroundEffectInput.addEventListener("change", () => {
        this.appearance.backgroundEffect = storage.normalizeBackgroundEffect(this.el.backgroundEffectInput.value);
        this.applyAppearance();
        this.syncStyleControls();
        this.save();
        this.updateStatus("Background changed");
      });
    }
    if (this.el.backgroundImageInput) this.el.backgroundImageInput.addEventListener("change", () => this.importBackgroundImage());
    if (this.el.startScreensaverButton) this.el.startScreensaverButton.addEventListener("click", () => this.startScreensaverNow());
    if (this.el.navigationModeInput) {
      this.el.navigationModeInput.addEventListener("change", () => {
        this.appearance.navigationMode = storage.normalizeNavigationMode(this.el.navigationModeInput.value);
        this.save();
        this.updateStatus("Navigation changed");
      });
    }
    Object.entries(this.el.appearanceInputs).forEach(([key, input]) => {
      const applyAppearanceValue = (persist) => {
        const limits = config.appearanceLimits[key];
        this.appearance[key] = utils.clampNumber(input.value, limits.min, limits.max, this.appearance[key]);
        this.syncAppearanceInputs(true);
        this.applyAppearance();
        if (persist !== false) this.save();
        this.shouldRevealFocus = true;
        this.scheduleRender(true);
      };
      input.addEventListener("change", () => applyAppearanceValue(true));
      const range = this.el.appearanceRanges && this.el.appearanceRanges[key];
      if (range) {
        range.addEventListener("input", () => {
          input.value = range.value;
          applyAppearanceValue(false);
        });
        range.addEventListener("change", () => {
          input.value = range.value;
          applyAppearanceValue(true);
        });
      }
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          input.blur();
        }
      });
    });
    Object.entries(this.el.appearanceToggles || {}).forEach(([key, input]) => {
      if (!input) return;
      input.addEventListener("change", () => {
        this.appearance[key] = Boolean(input.checked);
        this.syncAppearanceInputs(true);
        this.syncScreensaverControls();
        this.save();
        if (key === "screensaverEnabled") {
          if (!this.appearance.screensaverEnabled) this.exitScreensaver();
          this.resetScreensaverTimer();
          this.updateStatus(this.appearance.screensaverEnabled ? "Screensaver enabled" : "Screensaver disabled");
          return;
        }
        this.scheduleRender(false);
      });
    });

    this.el.themePresetInput.addEventListener("change", () => {
      this.theme = storage.normalizeTheme(this.el.themePresetInput.value);
      this.applyTheme();
      this.applyAppearance();
      this.save();
      this.syncThemeControls();
      this.updateStatus("Theme changed");
    });
    this.el.shufflePaletteButton.addEventListener("click", () => this.shuffleBranchPalette());
    this.el.resetPaletteButton.addEventListener("click", () => this.resetBranchPalette());
    this.el.exportThemeButton.addEventListener("click", () => this.exportTheme());
    this.el.importThemeInput.addEventListener("change", () => this.importTheme());

    Object.entries(this.el.spacingInputs).forEach(([key, input]) => {
      const applySpacingValue = (persist) => {
        const limits = config.spacingLimits[key];
        this.spacing[key] = utils.clampNumber(input.value, limits.min, limits.max, this.spacing[key]);
        this.syncSpacingInputs(true);
        if (persist !== false) this.save();
        this.shouldRevealFocus = true;
        this.scheduleRender(true);
      };
      input.addEventListener("change", () => applySpacingValue(true));
      const range = this.el.spacingRanges && this.el.spacingRanges[key];
      if (range) {
        range.addEventListener("input", () => {
          input.value = range.value;
          applySpacingValue(false);
        });
        range.addEventListener("change", () => {
          input.value = range.value;
          applySpacingValue(true);
        });
      }
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          input.blur();
        }
      });
    });
    (this.el.layoutPresetButtons || []).forEach((button) => {
      button.addEventListener("click", () => this.applyLayoutPreset(button.dataset.layoutPreset));
    });

    this.el.addButton.addEventListener("click", () => this.addNode());
    this.el.renameButton.addEventListener("click", () => this.renameFocused());
    this.el.openMapButton.addEventListener("click", () => this.createMapFromFocusedNode());
    this.el.reparentButton.addEventListener("click", () => this.createParentForFocusedNode());
    this.el.noteButton.addEventListener("click", () => this.toggleNoteSidebar());
    this.el.closeNoteButton.addEventListener("click", () => this.closeNoteSidebar());
    this.el.deleteButton.addEventListener("click", () => this.deleteFocused());
    this.el.resetButton.addEventListener("click", () => this.reset());
    this.el.nodeLabelInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.renameFocused();
      }
    });
    this.el.noteInput.addEventListener("input", () => {
      this.scheduleFocusedNoteSave();
    });
    this.el.nodeStatusInput.addEventListener("change", () => this.saveFocusedNote());
    this.el.nodePriorityInput.addEventListener("change", () => this.saveFocusedNote());
    if (this.el.nodeMarkerInput) this.el.nodeMarkerInput.addEventListener("change", () => this.saveFocusedNote());
    this.el.nodeTagsInput.addEventListener("change", () => this.saveFocusedNote());
    this.el.noteInput.addEventListener("keydown", (event) => {
      if (this.handleNodeLinkSuggestKey(event)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        this.closeNoteSidebar();
      }
    });
    this.el.noteSidebar.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        this.focusNoteSourceNode();
      }
    });

    this.el.nodeEditor.hidden = true;
    this.el.nodeEditor.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.finishEdit(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        this.finishEdit(false);
      }
    });
    this.el.nodeEditor.addEventListener("blur", () => this.finishEdit(true));

    document.addEventListener("pointerdown", (event) => this.handleDocumentPointerDown(event));
    this.el.svg.addEventListener("keydown", (event) => this.handleCanvasKey(event));
    this.el.svg.addEventListener("wheel", (event) => this.handleWheel(event), { passive: false });
    this.el.svg.addEventListener("pointerenter", () => {
      this.isPointerOverCanvas = true;
      if (this.isSpaceDown) this.el.svg.classList.add("space-pan-ready");
      if (!utils.isEditableTarget(document.activeElement)) this.el.svg.focus();
    });
    this.el.svg.addEventListener("pointerleave", () => {
      if (!this.isPanning) this.isPointerOverCanvas = false;
    });
    this.el.svg.addEventListener("pointerdown", (event) => this.startPan(event));

    window.addEventListener("pointermove", (event) => {
      this.moveNodeDrag(event);
      this.movePan(event);
    });
    window.addEventListener("pointerup", (event) => {
      this.endNodeDrag(event);
      this.endPan(event);
    });
    window.addEventListener("pointercancel", (event) => {
      this.cancelNodeDrag(event);
      this.endPan(event);
    });
    window.addEventListener("keydown", (event) => this.handleGlobalKeyDown(event));
    window.addEventListener("keyup", (event) => this.handleGlobalKeyUp(event));
    window.addEventListener("blur", () => this.clearPanKeys());
    window.addEventListener("resize", () => {
      this.scheduleRender(false);
      this.positionEditor();
      this.positionActionBar();
    });
    this.bindScreensaverActivity();
  };

  Controller.prototype.bindScreensaverActivity = function () {
    ["pointerdown", "pointermove", "wheel", "touchstart"].forEach((type) => {
      window.addEventListener(type, this.boundScreensaverActivity, { passive: true });
    });
    window.addEventListener("keydown", this.boundScreensaverActivity);
    document.addEventListener("visibilitychange", this.boundScreensaverVisibilityChange);
  };

  Controller.prototype.handleScreensaverActivity = function () {
    if (this.screensaverActive) this.exitScreensaver();
    this.resetScreensaverTimer();
  };

  Controller.prototype.isScreensaverEnabled = function () {
    return this.appearance && this.appearance.screensaverEnabled === true;
  };

  Controller.prototype.handleScreensaverVisibilityChange = function () {
    if (document.hidden) {
      window.clearTimeout(this.screensaverTimer);
      this.screensaverTimer = null;
      return;
    }
    this.resetScreensaverTimer();
  };

  Controller.prototype.resetScreensaverTimer = function () {
    window.clearTimeout(this.screensaverTimer);
    this.screensaverTimer = null;
    if (!this.isScreensaverEnabled() || document.hidden) return;
    this.screensaverTimer = window.setTimeout(() => this.enterScreensaver(), SCREENSAVER_IDLE_MS);
  };

  Controller.prototype.startScreensaverNow = function () {
    if (!this.isScreensaverEnabled()) {
      this.updateStatus("Enable screensaver first");
      return;
    }
    if (this.el.mindMenu) this.el.mindMenu.open = false;
    if (this.el.settingsMenu) this.el.settingsMenu.open = false;
    if (this.layoutSettingsOpen) this.closeLayoutSettings();
    this.enterScreensaver();
  };

  Controller.prototype.enterScreensaver = function () {
    if (!this.isScreensaverEnabled() || this.screensaverActive || document.hidden) return;
    this.screensaverActive = true;
    this.saveFocusedNote();
    document.documentElement.dataset.screensaver = "active";
  };

  Controller.prototype.exitScreensaver = function () {
    if (!this.screensaverActive) return;
    this.screensaverActive = false;
    delete document.documentElement.dataset.screensaver;
    if (!utils.isEditableTarget(document.activeElement)) this.el.svg.focus();
  };

  Controller.prototype.handleCanvasKey = function (event) {
    if (event.key === "ArrowLeft" && event.ctrlKey) {
      event.preventDefault();
      this.openParentMap();
    } else if (event.key === "ArrowRight" && event.ctrlKey) {
      event.preventDefault();
      this.openRecentChildMap();
    } else if (event.key === "Enter" && event.ctrlKey && event.shiftKey) {
      event.preventDefault();
      this.createParentForFocusedNode();
    } else if (event.key === "Enter" && event.ctrlKey && !event.altKey) {
      event.preventDefault();
      this.toggleNoteSidebar();
    } else if (event.key === "Enter" && event.altKey) {
      event.preventDefault();
      this.createMapFromFocusedNode();
    } else if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      this.startEdit(this.store.focusedId);
    } else if (event.key === "Enter") {
      event.preventDefault();
      this.addNode(true);
    } else if (this.keyToNavigationArrow(event)) {
      event.preventDefault();
      this.saveFocusedNote();
      const mode = usesSpatialNavigation(this.viewMode) && !event.shiftKey ? "directional" : event.shiftKey ? "outline" : this.appearance.navigationMode;
      if (model.focusRelative(this.store, this.keyToNavigationArrow(event), this.positions, mode)) {
        this.actionBarOpen = false;
        this.afterTreeChange(false, true);
      }
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      this.deleteFocused();
    }
  };

  Controller.prototype.keyToNavigationArrow = function (event) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return event.key;
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return null;
    const key = String(event.key || "").toLowerCase();
    return {
      w: "ArrowUp",
      a: "ArrowLeft",
      s: "ArrowDown",
      d: "ArrowRight",
      k: "ArrowUp",
      h: "ArrowLeft",
      j: "ArrowDown",
      l: "ArrowRight"
    }[key] || null;
  };

  Controller.prototype.handleDocumentPointerDown = function (event) {
    if (this.activeCustomSelect && !this.activeCustomSelect.root.contains(event.target)) this.closeCustomSelect();
    if (this.layoutSettingsOpen && this.el.layoutSettingsDropdown && !this.el.layoutSettingsDropdown.contains(event.target)) this.closeLayoutSettings();
    if (!this.actionBarOpen) return;
    const target = event.target;
    if (this.el.nodeActionBar && this.el.nodeActionBar.contains(target)) return;
    if (this.el.nodeEditor && this.el.nodeEditor.contains(target)) return;
    if (target.closest && target.closest(".node")) return;
    if (isCanvasPointerTarget(target, this.el.svg)) return;
    this.actionBarOpen = false;
    this.positionActionBar();
  };

  Controller.prototype.handleWheel = function (event) {
    event.preventDefault();
    if (this.editingId) this.finishEdit(true);
    if (event.ctrlKey) {
      this.zoomAt(event.clientX, event.clientY, event.deltaY);
      return;
    }
    const delta = normalizedPanDelta(event);
    this.camera.x += delta.x / this.camera.scale;
    this.camera.y += delta.y / this.camera.scale;
    this.clampCamera();
    this.updateCameraView();
  };

  Controller.prototype.handleGlobalKeyDown = function (event) {
    if (event.defaultPrevented) return;
    const editableTarget = utils.isEditableTarget(document.activeElement);
    if (event.key === "Escape" && this.el.recoveryDialog && !this.el.recoveryDialog.hidden) {
      event.preventDefault();
      this.closeRecovery();
      return;
    }
    if (event.key === "Escape" && this.el.appDialog && !this.el.appDialog.hidden) {
      event.preventDefault();
      this.closeAppDialog(this.appDialogCancelValue);
      return;
    }
    if (event.key === "Escape" && this.activeCustomSelect) {
      event.preventDefault();
      this.closeCustomSelect();
      return;
    }
    if (event.key === "Escape" && this.layoutSettingsOpen) {
      event.preventDefault();
      this.closeLayoutSettings();
      return;
    }
    if (event.key === "Escape" && this.el.shortcutSheet && !this.el.shortcutSheet.hidden) {
      event.preventDefault();
      this.closeShortcutSheet();
      return;
    }
    if (event.key === "Escape" && this.nodeDrag) {
      event.preventDefault();
      this.cancelNodeDrag();
      return;
    }
    if (event.key === "Escape" && this.el.noteSidebar && !this.el.noteSidebar.hidden) {
      event.preventDefault();
      this.closeNoteSidebar();
      return;
    }
    if ((event.key === "k" || event.key === "K") && (event.ctrlKey || event.metaKey) && !editableTarget) {
      event.preventDefault();
      if (this.isModalOpen()) return;
      this.openCommandPalette();
      return;
    }
    if ((event.key === "z" || event.key === "Z") && (event.ctrlKey || event.metaKey) && event.shiftKey && !editableTarget) {
      event.preventDefault();
      this.redo();
      return;
    }
    if ((event.key === "z" || event.key === "Z") && (event.ctrlKey || event.metaKey) && !editableTarget) {
      event.preventDefault();
      this.undo();
      return;
    }
    if ((event.key === "y" || event.key === "Y") && (event.ctrlKey || event.metaKey) && !editableTarget) {
      event.preventDefault();
      this.redo();
      return;
    }
    if (event.key === "Enter" && event.ctrlKey && !event.shiftKey && !event.altKey && !editableTarget) {
      event.preventDefault();
      this.toggleNoteSidebar();
      return;
    }
    if (event.code !== "Space" || editableTarget) return;
    event.preventDefault();
    this.isSpaceDown = true;
    if (this.isPointerOverCanvas || document.activeElement === this.el.svg) {
      this.el.svg.classList.add("space-pan-ready");
      this.el.svg.focus();
    }
  };

  Controller.prototype.handleGlobalKeyUp = function (event) {
    if (event.code !== "Space") return;
    this.isSpaceDown = false;
    this.el.svg.classList.remove("space-pan-ready");
    this.endPan(event);
  };

  Controller.prototype.clearPanKeys = function () {
    this.isSpaceDown = false;
    this.el.svg.classList.remove("space-pan-ready");
    this.endPan();
  };

  Controller.prototype.isModalOpen = function () {
    return Boolean(
      (this.el.commandPalette && !this.el.commandPalette.hidden) ||
      (this.el.welcomeDialog && !this.el.welcomeDialog.hidden) ||
      (this.el.shortcutSheet && !this.el.shortcutSheet.hidden) ||
      (this.el.recoveryDialog && !this.el.recoveryDialog.hidden) ||
      (this.el.appDialog && !this.el.appDialog.hidden)
    );
  };

  Controller.prototype.addNode = function (editAfterAdd) {
    this.saveFocusedNote();
    const found = model.findNode(this.store.tree, this.store.focusedId);
    const map = this.currentMap();
    const sourceId = found && map ? model.sourceIdForViewNode(found.node, map.rootNodeId) : null;
    if (found && sourceId && found.node.depth < config.limits.maxDepth && found.node.children.length < config.limits.maxChildren) {
      this.pushUndoSnapshot();
    }
    const childId = found && sourceId ? model.addMindChild(this.mind, sourceId, found.node.depth, found.node.children.length) : null;
    if (!childId) {
      this.updateStatus();
      return;
    }
    this.animatedNewNodeId = childId;
    this.actionBarOpen = false;
    this.refreshViewTree(childId);
    if (this.el.noteSidebar && !this.el.noteSidebar.hidden) {
      this.noteSidebarSourceId = childId;
      this.syncNoteSidebar(true);
    }
    this.afterTreeChange(true, true);
    const tutorialHandled = this.advanceTutorialGuide("created-child", { sourceId, childId });
    if (editAfterAdd && !tutorialHandled) this.startEdit(childId);
    else if (!tutorialHandled) this.el.svg.focus();
  };

  Controller.prototype.renameFocused = function () {
    const found = model.findNode(this.store.tree, this.store.focusedId);
    const map = this.currentMap();
    const sourceId = found && map ? model.sourceIdForViewNode(found.node, map.rootNodeId) : null;
    if (!sourceId) return;
    const nextLabel = utils.cleanLabel(this.el.nodeLabelInput.value);
    if (!nextLabel || this.mind.nodes[sourceId].label === nextLabel) return;
    this.pushUndoSnapshot();
    if (!model.renameMindNode(this.mind, sourceId, nextLabel)) return;
    if (found.node.id === model.ROOT_ID && map) map.title = this.mind.nodes[sourceId].label;
    this.invalidateMindIndex();
    this.refreshViewTree(this.store.focusedId);
    this.afterTreeChange(true, true);
    this.el.svg.focus();
  };

  Controller.prototype.deleteFocused = async function () {
    const found = model.findNode(this.store.tree, this.store.focusedId);
    if (!found || this.store.focusedId === model.ROOT_ID) return;
    if (found.node.children.length && !await this.confirmAction({
      title: "Delete node",
      message: "Delete this node and all child nodes?",
      confirmLabel: "Delete",
      danger: true
    })) return;
    const map = this.currentMap();
    const sourceId = map ? model.sourceIdForViewNode(found.node, map.rootNodeId) : null;
    this.pushUndoSnapshot();
    this.showDeletedNodeGhost(found.node);
    const nextSourceId = sourceId ? model.deleteMindNode(this.mind, sourceId) : null;
    if (!nextSourceId) return;
    this.maps = this.maps.filter((item) => item.rootNodeId !== sourceId);
    if (!this.currentMap()) this.activeMapId = this.maps[0].id;
    this.refreshViewTree(nextSourceId === map.rootNodeId ? model.ROOT_ID : nextSourceId);
    this.hideEditor();
    this.closeNoteSidebar(false);
    this.actionBarOpen = false;
    this.afterTreeChange(true, true);
    this.el.svg.focus();
  };

  Controller.prototype.createParentForFocusedNode = function () {
    if (this.editingId) this.finishEdit(true);
    this.actionBarOpen = false;
    const found = model.findNode(this.store.tree, this.store.focusedId);
    const map = this.currentMap();
    if (!found || !map) {
      this.updateStatus("Ctrl+Shift+Enter needs child focus");
      return;
    }
    const isMapRoot = found.node.id === model.ROOT_ID;
    const sourceId = model.sourceIdForViewNode(found.node, map.rootNodeId);
    if (isMapRoot && sourceId === this.mind.rootId) {
      this.updateStatus("Mind root has no parent");
      return;
    }
    this.pushUndoSnapshot();
    const subtreeAtMaxDepth = maxDepth(found.node) >= config.limits.maxDepth;
    if (subtreeAtMaxDepth || isMapRoot) this.ensureMapForNode(sourceId, map.id);
    const wrapperId = model.wrapMindNode(this.mind, sourceId, found.node.depth);
    if (!wrapperId) {
      this.updateStatus("Cannot create parent");
      return;
    }
    if (isMapRoot) {
      map.rootNodeId = wrapperId;
      map.title = this.mind.nodes[wrapperId].label;
      const childMap = this.maps.find((item) => item.rootNodeId === sourceId && item.id !== map.id);
      if (childMap) this.downMapStack.push(childMap.id);
      this.refreshViewTree(model.ROOT_ID);
      this.store.focusedId = model.ROOT_ID;
      map.focusedId = model.ROOT_ID;
    } else {
      this.refreshViewTree(wrapperId);
      this.store.focusedId = wrapperId;
      map.focusedId = wrapperId;
    }
    this.afterTreeChange(true, true);
    if (subtreeAtMaxDepth) this.updateStatus("Created child map; leaves hidden here");
    this.el.svg.focus();
  };

  Controller.prototype.reset = async function () {
    if (!await this.confirmAction({
      title: "Reset mind",
      message: "Reset this mind to a blank ConCen workspace?",
      confirmLabel: "Reset",
      danger: true
    })) return;
    this.pushUndoSnapshot();
    this.store = model.createStore();
    this.mind = model.createMindFromTree(this.store.tree);
    this.workspaceId = workspaceId();
    this.workspaceUpdatedAt = new Date().toISOString();
    this.workspaceSync = storage.normalizeWorkspaceSync(null);
    this.maps = [this.createMap(model.ROOT_ID, this.store.tree.label)];
    this.activeMapId = this.maps[0].id;
    this.viewMode = "radial";
    this.spacing = storage.normalizeSpacing(null, config.spacingDefaults);
    this.appearance = storage.normalizeAppearance(null, config.appearanceDefaults);
    this.theme = "light";
    this.customTheme = storage.normalizeCustomTheme(null);
    this.branchColors = DEFAULT_BRANCH_COLORS.slice();
    this.hideEditor();
    this.closeNoteSidebar(false);
    this.actionBarOpen = false;
    this.cameraReady = false;
    this.afterTreeChange(true, true);
  };

  Controller.prototype.currentMap = function () {
    return this.maps.find((map) => map.id === this.activeMapId) || null;
  };

  Controller.prototype.refreshViewTree = function (focusedId) {
    const map = this.currentMap();
    if (!map || !this.mind.nodes[map.rootNodeId]) return;
    this.invalidateMindIndex();
    this.store.tree = model.viewTree(this.mind, map.rootNodeId);
    const nextFocus = focusedId || map.focusedId || model.ROOT_ID;
    this.store.focusedId = model.findNode(this.store.tree, nextFocus) ? nextFocus : model.ROOT_ID;
    map.focusedId = this.store.focusedId;
  };

  Controller.prototype.createMap = function (rootNodeId, title) {
    const source = this.mind.nodes[rootNodeId] || this.mind.nodes[this.mind.rootId];
    return {
      id: this.nextMapId(),
      title: utils.cleanLabel(title || source.label) || "Chart Title",
      rootNodeId: source.id,
      focusedId: model.ROOT_ID,
      viewMode: this.viewMode,
      spacing: storage.normalizeSpacing(this.spacing, config.spacingDefaults)
    };
  };

  Controller.prototype.nextMapId = function () {
    let id;
    do {
      id = "map-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
    } while (this.maps.some((map) => map.id === id));
    return id;
  };

  Controller.prototype.loadMap = function (map) {
    if (!map) return;
    this.viewMode = normalizeViewMode(map.viewMode);
    this.spacing = storage.normalizeSpacing(map.spacing, config.spacingDefaults);
    this.refreshViewTree(map.focusedId);
    this.cameraReady = false;
    this.shouldRevealFocus = true;
  };

  Controller.prototype.captureActiveMap = function () {
    const map = this.currentMap();
    if (!map) return;
    map.title = this.mind.nodes[map.rootNodeId] ? this.mind.nodes[map.rootNodeId].label : map.title;
    map.focusedId = this.store.focusedId;
    map.viewMode = this.viewMode;
    map.spacing = storage.normalizeSpacing(this.spacing, config.spacingDefaults);
  };

  Controller.prototype.switchMap = function (id) {
    const next = this.maps.find((map) => map.id === id);
    if (!next || next.id === this.activeMapId) return;
    this.openMap(next);
  };

  Controller.prototype.openMap = function (next) {
    this.hideEditor();
    this.closeNoteSidebar(false);
    this.actionBarOpen = false;
    this.captureActiveMap();
    this.activeMapId = next.id;
    this.loadMap(next);
    this.save();
    this.syncControls();
    this.render();
    this.animateCanvasSwap();
    this.el.svg.focus();
  };

  Controller.prototype.newMind = function () {
    this.rememberCurrentMind();
    this.pushUndoSnapshot();
    this.store = model.createStore();
    this.mind = model.createMindFromTree(this.store.tree);
    this.workspaceId = workspaceId();
    this.workspaceUpdatedAt = new Date().toISOString();
    this.workspaceSync = storage.normalizeWorkspaceSync(null);
    this.maps = [this.createMap(model.ROOT_ID, this.store.tree.label)];
    this.activeMapId = this.maps[0].id;
    this.downMapStack = [];
    this.viewMode = "radial";
    this.spacing = storage.normalizeSpacing(null, config.spacingDefaults);
    this.appearance = storage.normalizeAppearance(null, config.appearanceDefaults);
    this.hideEditor();
    this.closeNoteSidebar(false);
    this.actionBarOpen = false;
    this.cameraReady = false;
    this.loadMap(this.currentMap());
    this.applyTheme();
    this.save();
    this.syncControls();
    this.render();
    this.animateCanvasSwap();
    this.updateStatus("New mind created; previous mind in Recent");
    this.el.svg.focus();
  };

  Controller.prototype.isStarterMind = function () {
    return Object.keys(this.mind.nodes).length <= 1 && this.currentMindNode()?.label === "Chart Title";
  };

  Controller.prototype.startBlankMind = function () {
    if (!this.isStarterMind()) this.newMind();
    if (this.el.welcomeDialog && !this.el.welcomeDialog.hidden) this.closeWelcome();
    this.updateStatus("Enter adds a child. Shift+Enter renames.");
  };

  Controller.prototype.openParentMap = function () {
    const map = this.currentMap();
    if (!map || map.rootNodeId === this.mind.rootId) {
      this.updateStatus("Already at mind root");
      return;
    }
    const parentId = model.findMindParentId(this.mind, map.rootNodeId);
    if (!parentId) {
      this.updateStatus("No parent map");
      return;
    }
    const parentMap = this.ensureMapForNode(parentId);
    if (!parentMap) return;
    this.downMapStack.push(map.id);
    this.openMap(parentMap);
  };

  Controller.prototype.openRecentChildMap = function () {
    while (this.downMapStack.length) {
      const mapId = this.downMapStack.pop();
      const map = this.maps.find((item) => item.id === mapId);
      if (map && this.mind.nodes[map.rootNodeId]) {
        this.openMap(map);
        return;
      }
    }
    this.updateStatus("No recent child map");
  };

  Controller.prototype.newMap = function () {
    this.hideEditor();
    this.actionBarOpen = false;
    this.captureActiveMap();
    this.pushUndoSnapshot();
    const rootId = model.addMindChild(this.mind, this.mind.rootId, 0, this.mind.nodes[this.mind.rootId].children.length);
    if (!rootId) {
      this.updateStatus("Root map children max reached");
      return;
    }
    const map = this.createMap(rootId, this.mind.nodes[rootId].label);
    this.maps.push(map);
    this.activeMapId = map.id;
    this.loadMap(map);
    this.save();
    this.syncControls();
    this.render();
    this.animateCanvasSwap();
    this.el.svg.focus();
  };

  Controller.prototype.deleteActiveMap = async function () {
    if (this.maps.length <= 1) {
      await this.reset();
      return;
    }
    if (!await this.confirmAction({
      title: "Delete map",
      message: "Delete the current map view? The mind nodes remain available from other maps.",
      confirmLabel: "Delete",
      danger: true
    })) return;
    this.pushUndoSnapshot();
    const index = this.maps.findIndex((map) => map.id === this.activeMapId);
    if (index < 0) return;
    this.maps.splice(index, 1);
    this.activeMapId = (this.maps[index] || this.maps[index - 1] || this.maps[0]).id;
    this.hideEditor();
    this.actionBarOpen = false;
    this.loadMap(this.currentMap());
    this.save();
    this.syncControls();
    this.render();
    this.animateCanvasSwap();
    this.el.svg.focus();
  };

  Controller.prototype.createMapFromFocusedNode = function () {
    const found = model.findNode(this.store.tree, this.store.focusedId);
    const currentMap = this.currentMap();
    if (!found || found.node.id === model.ROOT_ID || !currentMap) {
      this.updateStatus("Alt+Enter needs child focus");
      return;
    }
    const sourceId = model.sourceIdForViewNode(found.node, currentMap.rootNodeId);
    const existing = this.maps.find((map) => map.rootNodeId === sourceId);
    this.hideEditor();
    this.actionBarOpen = false;
    if (!existing) this.pushUndoSnapshot();
    this.captureActiveMap();
    const map = existing || this.createMap(sourceId, this.mind.nodes[sourceId].label);
    if (!existing) this.maps.push(map);
    this.activeMapId = map.id;
    this.loadMap(map);
    this.save();
    this.syncControls();
    this.render();
    this.animateCanvasSwap();
    this.el.svg.focus();
  };

  Controller.prototype.ensureMapForNode = function (sourceId, excludeMapId) {
    const existing = this.maps.find((map) => map.rootNodeId === sourceId && map.id !== excludeMapId);
    if (existing) return existing;
    const source = this.mind.nodes[sourceId];
    if (!source) return null;
    const map = this.createMap(sourceId, source.label);
    this.maps.push(map);
    return map;
  };

  Controller.prototype.afterTreeChange = function (save, revealFocus) {
    if (save) this.save();
    this.scheduleRender(revealFocus);
  };

  Controller.prototype.startEdit = function (id) {
    const found = model.findNode(this.store.tree, id);
    if (!found) return;
    this.closeNoteSidebar(false);
    model.setFocus(this.store, id);
    this.editingId = id;
    this.actionBarOpen = false;
    this.el.nodeEditor.value = found.node.label;
    this.el.nodeEditor.hidden = false;
    this.scheduleRender(true);
    requestAnimationFrame(() => {
      this.positionEditor();
      this.el.nodeEditor.focus();
      this.el.nodeEditor.select();
    });
  };

  Controller.prototype.finishEdit = function (save) {
    if (!this.editingId) return;
    const id = this.editingId;
    this.editingId = null;
    this.el.nodeEditor.hidden = true;
    let sourceId = null;
    let renamed = false;
    if (save) {
      const found = model.findNode(this.store.tree, id);
      const map = this.currentMap();
      sourceId = found && map ? model.sourceIdForViewNode(found.node, map.rootNodeId) : null;
      const nextLabel = utils.cleanLabel(this.el.nodeEditor.value);
      if (sourceId && nextLabel && this.mind.nodes[sourceId].label !== nextLabel) {
        this.pushUndoSnapshot();
        model.renameMindNode(this.mind, sourceId, nextLabel);
        renamed = true;
      }
      this.refreshViewTree(id);
    }
    this.afterTreeChange(save, true);
    this.advanceTutorialGuide("renamed-node", { sourceId, renamed });
    this.el.svg.focus();
  };

  Controller.prototype.hideEditor = function () {
    this.editingId = null;
    this.el.nodeEditor.hidden = true;
  };

  Controller.prototype.animateCanvasSwap = function () {
    this.el.svg.classList.remove("map-fade");
    void this.el.svg.offsetWidth;
    this.el.svg.classList.add("map-fade");
    setTimeout(() => this.el.svg.classList.remove("map-fade"), 150);
  };

  Controller.prototype.showDeletedNodeGhost = function (node) {
    const point = this.positions.get(node.id);
    if (!point) return;
    const rect = this.renderer.editorRect(node, point, this.viewBox());
    const ghost = document.createElement("div");
    ghost.className = "node-delete-ghost";
    ghost.textContent = node.label;
    ghost.style.left = rect.left + "px";
    ghost.style.top = rect.top + "px";
    ghost.style.width = rect.width + "px";
    ghost.style.height = rect.height + "px";
    this.el.svg.parentElement.append(ghost);
    setTimeout(() => ghost.remove(), 150);
  };

  Controller.prototype.render = function () {
    this.syncNotesDocumentView();
    const rect = this.el.svg.getBoundingClientRect();
    this.viewport = {
      width: Math.max(config.layout.minViewportWidth, rect.width || config.layout.minViewportWidth),
      height: Math.max(config.layout.minViewportHeight, rect.height || config.layout.minViewportHeight)
    };

    const layout = this.layoutEngine.layout(this.store.tree, this.viewport, this.viewMode, this.spacing, this.store.focusedId);
    this.world = layout.world;
    this.currentBounds = layout.bounds;
    this.positions = layout.positions;
    if (!this.cameraReady) {
      this.fitBounds(layout.bounds);
      this.cameraReady = true;
    } else {
      this.clampCamera();
      if (this.shouldRevealFocus) this.revealFocus();
    }
    const viewBox = this.viewBox();
    const animatedFocusId = this.previousRenderedFocusId && this.previousRenderedFocusId !== this.store.focusedId ? this.store.focusedId : null;
    const animatedNewId = this.animatedNewNodeId;

    if (this.viewMode === "notes") {
      this.syncNotesDocument();
    }

    this.renderer.render({
      tree: this.store.tree,
      nodes: layout.nodes,
      positions: this.positions,
      rings: layout.rings,
      focusedId: this.store.focusedId,
      animatedFocusId,
      animatedNewId,
      focusContext: focusContext(this.store.tree, this.store.focusedId),
      mapRootIds: new Set(this.maps.map((map) => map.rootNodeId)),
      showStatusMarkers: true,
      showPriorityMarkers: true,
      previousPositions: this.layoutAnimationPositions,
      viewMode: this.viewMode,
      viewBox
    }, {
      focus: (id, event) => this.focusNode(id, event),
      edit: (id) => this.startEdit(id),
      openNote: (id) => this.focusNode(id, { ctrlKey: true }),
      markdownAction: (action, event) => this.activateMarkdownAction(action, event),
      nodePointerDown: (event, id) => this.startNodeDrag(event, id)
    });

    const pendingStatus = this.pendingRenderStatus;
    this.pendingRenderStatus = "";
    this.updateStatus(pendingStatus);
    this.syncNoteSidebar();
    this.positionEditor();
    this.positionActionBar();
    this.shouldRevealFocus = false;
    this.previousRenderedFocusId = this.store.focusedId;
    this.animatedNewNodeId = null;
    this.layoutAnimationPositions = null;
  };

  Controller.prototype.focusNode = function (id, event) {
    this.saveFocusedNote();
    if (!model.setFocus(this.store, id)) return;
    this.hideEditor();
    this.syncNoteSidebar(true);
    this.actionBarOpen = true;
    this.afterTreeChange(false, true);
    if (event && (event.ctrlKey || event.metaKey)) this.openNoteSidebar();
    else this.el.svg.focus();
  };

  Controller.prototype.activateMarkdownAction = function (action) {
    if (!action || !action.kind) return;
    if (action.kind === "url") {
      const href = cleanUrl(action.href || action.target);
      if (!isHttpUrl(href)) return;
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    if (action.kind !== "node") return;
    const target = String(action.target || "").trim();
    const node = linkedNode(target, this.mind, this.getMindIndex());
    if (!node) {
      this.updateStatus("Linked node not found");
      return;
    }
    this.closeNoteSidebar(false);
    this.focusSourceId(node.id);
  };

  Controller.prototype.scheduleRender = function (revealFocus) {
    this.shouldRevealFocus = Boolean(revealFocus || this.shouldRevealFocus);
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      this.render();
    });
  };

  Controller.prototype.syncControls = function () {
    this.syncMapSelect();
    this.el.titleInput.value = this.store.tree.label;
    this.syncViewModeControls();
    this.applyTheme();
    this.applyAppearance();
    this.syncThemeControls();
    this.renderBranchPalette();
    this.syncSpacingInputs(true);
    this.syncAppearanceInputs(true);
    this.syncStyleControls();
    this.syncGithubControls();
    this.syncTrustDataControls();
    this.updateStatus();
  };

  Controller.prototype.syncMapSelect = function () {
    this.maps = this.maps.filter((map) => this.mind.nodes[map.rootNodeId]);
    if (!this.maps.length) this.maps.push(this.createMap(this.mind.rootId, this.mind.nodes[this.mind.rootId].label));
    if (!this.currentMap()) this.activeMapId = this.maps[0].id;
    this.el.mapSelect.replaceChildren();
    this.maps.forEach((map) => {
      const option = document.createElement("option");
      option.value = map.id;
      option.textContent = this.mind.nodes[map.rootNodeId]?.label || map.title || "Chart Title";
      this.el.mapSelect.append(option);
    });
    this.el.mapSelect.value = this.activeMapId;
    this.renderCustomSelect(this.el.mapSelect, this.el.mapSelectDropdown);
    this.el.deleteMapButton.disabled = this.maps.length <= 1;
  };

  Controller.prototype.syncSpacingInputs = function (force) {
    Object.entries(this.el.spacingInputs).forEach(([key, input]) => {
      if (!force && document.activeElement === input) return;
      input.value = String(this.spacing[key]);
      const range = this.el.spacingRanges && this.el.spacingRanges[key];
      if (range && (force || document.activeElement !== range)) range.value = String(this.spacing[key]);
    });
  };

  Controller.prototype.syncAppearanceInputs = function (force) {
    Object.entries(this.el.appearanceInputs).forEach(([key, input]) => {
      if (!force && document.activeElement === input) return;
      input.value = String(this.appearance[key]);
      const range = this.el.appearanceRanges && this.el.appearanceRanges[key];
      if (range && (force || document.activeElement !== range)) range.value = String(this.appearance[key]);
    });
    Object.entries(this.el.appearanceToggles || {}).forEach(([key, input]) => {
      if (!input) return;
      input.checked = this.appearance[key] === true;
    });
    this.syncScreensaverControls();
  };

  Controller.prototype.syncScreensaverControls = function () {
    if (!this.el.startScreensaverButton) return;
    const enabled = this.isScreensaverEnabled();
    this.el.startScreensaverButton.disabled = !enabled;
    this.el.startScreensaverButton.title = enabled ? "Start screensaver" : "Enable screensaver first";
  };

  Controller.prototype.syncGithubControls = function () {
    if (!this.el.githubOwnerInput) return;
    const sync = this.githubSync || {};
    const values = {
      githubOwnerInput: sync.owner || "",
      githubRepoInput: sync.repo || "",
      githubBranchInput: sync.branch || "main",
      githubPathInput: sync.path || defaultGithubPath(this.mind),
      githubTokenInput: sync.token || ""
    };
    Object.entries(values).forEach(([key, value]) => {
      const input = this.el[key];
      if (input && document.activeElement !== input) input.value = value;
    });
  };

  Controller.prototype.syncTrustDataControls = function () {
    if (this.el.authorDisplayNameInput && document.activeElement !== this.el.authorDisplayNameInput) {
      this.el.authorDisplayNameInput.value = this.authorProfile.displayName || "";
    }
    if (!this.el.trustDataSummary) return;
    const nodeCount = this.mind && this.mind.nodes ? Object.keys(this.mind.nodes).length : 0;
    const mapCount = Array.isArray(this.maps) ? this.maps.length : 0;
    const sync = this.githubSync || {};
    const target = sync.owner && sync.repo && sync.path ? `${sync.owner}/${sync.repo}:${sync.path}` : "No GitHub target";
    const lastSync = this.workspaceSync.lastPushedAt || this.workspaceSync.lastPulledAt || "";
    this.el.trustDataSummary.replaceChildren();
    [
      `Schema v2`,
      `${nodeCount} nodes · ${mapCount} maps`,
      `Updated ${shortDate(this.workspaceUpdatedAt)}`,
      `Author ${this.authorProfile.displayName || "not set"}`,
      target,
      lastSync ? `Last sync ${shortDate(lastSync)}` : "No completed sync"
    ].forEach((line) => {
      const item = document.createElement("span");
      item.textContent = line;
      this.el.trustDataSummary.append(item);
    });
  };

  Controller.prototype.saveAuthorProfileFromInput = function () {
    const displayName = utils.cleanLabel(this.el.authorDisplayNameInput && this.el.authorDisplayNameInput.value);
    this.authorProfile = storage.normalizeAuthorProfile(Object.assign({}, this.authorProfile, { displayName }));
    saveAuthorProfile(this.authorProfile);
    this.save();
    this.syncTrustDataControls();
    this.updateStatus(displayName ? "Author saved" : "Author cleared");
  };

  Controller.prototype.reclaimCanvasFocus = function (options) {
    if (!this.el.svg) return;
    const force = Boolean(options && options.force);
    if (!force && utils.isEditableTarget(document.activeElement)) return;
    requestAnimationFrame(() => {
      if (!this.el.svg) return;
      if (!force && utils.isEditableTarget(document.activeElement)) return;
      try {
        this.el.svg.focus({ preventScroll: true });
      } catch (error) {
        this.el.svg.focus();
      }
    });
  };

  Controller.prototype.updateStatus = function (message) {
    const found = model.findNode(this.store.tree, this.store.focusedId);
    if (!found) return;
    const node = found.node;
    const depthNames = ["title", "primary", "secondary", "leaf"];
    const canAdd = node.depth < config.limits.maxDepth && node.children.length < config.limits.maxChildren;
    if (document.activeElement !== this.el.titleInput) this.el.titleInput.value = this.store.tree.label;
    if (document.activeElement !== this.el.nodeLabelInput) this.el.nodeLabelInput.value = node.label;
    this.syncViewModeControls();
    this.syncThemeControls();
    this.syncSpacingInputs(false);
    this.syncAppearanceInputs(false);
    this.syncStyleControls();
    this.el.addButton.disabled = !canAdd;
    this.el.deleteButton.disabled = node.id === model.ROOT_ID;
    this.el.openMapButton.disabled = node.id === model.ROOT_ID;
    this.el.reparentButton.disabled = node.id === model.ROOT_ID && this.currentMap()?.rootNodeId === this.mind.rootId;
    this.el.noteButton.disabled = false;
    this.syncMapSelect();
    this.updatePathTrail();
    const focusedStatus = `${depthNames[node.depth]} focus | ${node.children.length}/12 children${canAdd ? "" : " | max reached"}`;
    if (message) {
      clearTimeout(this.statusMessageTimer);
      this.el.statusText.textContent = message;
      this.el.statusText.classList.add("is-toast");
      this.statusMessageTimer = setTimeout(() => {
        this.statusMessageTimer = null;
        this.updateStatus();
      }, 2000);
      return;
    }
    if (this.statusMessageTimer) return;
    this.el.statusText.classList.remove("is-toast");
    this.el.statusText.textContent = focusedStatus;
  };

  Controller.prototype.syncViewModeControls = function () {
    const mode = normalizeViewMode(this.viewMode);
    const isTree = mode === "tree";
    const isRadial = mode === "radial";
    if (this.el.viewModeInput) this.el.viewModeInput.checked = isRadial;
    if (this.el.treeViewButton) this.el.treeViewButton.setAttribute("aria-pressed", String(isTree));
    if (this.el.radialViewButton) this.el.radialViewButton.setAttribute("aria-pressed", String(isRadial));
    if (this.el.bookViewButton) this.el.bookViewButton.setAttribute("aria-pressed", String(mode === "book"));
    if (this.el.documentViewButton) this.el.documentViewButton.setAttribute("aria-pressed", String(mode === "document"));
    if (this.el.notesViewButton) this.el.notesViewButton.setAttribute("aria-pressed", String(mode === "notes"));
    this.syncLayoutSettingsControls();
  };

  Controller.prototype.syncLayoutSettingsControls = function () {
    const mode = normalizeViewMode(this.viewMode);
    const modeConfig = config.layoutModeControls[mode] || config.layoutModeControls.radial;
    const labels = modeConfig.controls || {};
    const visibleKeys = new Set(Object.keys(labels));
    if (this.el.layoutSettingsButton) this.el.layoutSettingsButton.textContent = `${modeConfig.label} tuning`;
    if (this.el.layoutSettingsSummary) this.el.layoutSettingsSummary.textContent = `${modeConfig.label} settings`;
    Object.entries(this.el.spacingInputs).forEach(([key, input]) => {
      const field = input.closest(".range-field");
      if (!field) return;
      const show = visibleKeys.has(key);
      field.hidden = !show;
      const label = labels[key];
      const labelEl = field.querySelector("span");
      if (show && label && labelEl) {
        labelEl.textContent = label;
        const range = this.el.spacingRanges && this.el.spacingRanges[key];
        if (range) range.setAttribute("aria-label", label);
        input.setAttribute("aria-label", `${label} value`);
      }
    });
  };

  Controller.prototype.toggleLayoutSettings = function () {
    if (this.layoutSettingsOpen) this.closeLayoutSettings();
    else this.openLayoutSettings();
  };

  Controller.prototype.openLayoutSettings = function () {
    if (!this.el.layoutSettingsButton || !this.el.layoutSettingsPanel) return;
    this.closeCustomSelect();
    this.syncLayoutSettingsControls();
    this.layoutSettingsOpen = true;
    this.el.layoutSettingsDropdown.classList.add("is-open");
    this.el.layoutSettingsButton.setAttribute("aria-expanded", "true");
    this.el.layoutSettingsPanel.hidden = false;
  };

  Controller.prototype.closeLayoutSettings = function () {
    if (!this.el.layoutSettingsButton || !this.el.layoutSettingsPanel) return;
    this.layoutSettingsOpen = false;
    if (this.el.layoutSettingsDropdown) this.el.layoutSettingsDropdown.classList.remove("is-open");
    this.el.layoutSettingsButton.setAttribute("aria-expanded", "false");
    this.el.layoutSettingsPanel.hidden = true;
    this.reclaimCanvasFocus();
  };

  Controller.prototype.updatePathTrail = function () {
    if (!this.el.pathTrail) return;
    const map = this.currentMap();
    this.el.pathTrail.replaceChildren();
    if (!map) return;
    const items = mindPathItems(this.mind, map.rootNodeId);
    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      button.addEventListener("click", () => this.openPathSource(item.id));
      this.el.pathTrail.append(button);
      if (index < items.length - 1) {
        const divider = document.createElement("span");
        divider.textContent = "/";
        this.el.pathTrail.append(divider);
      }
    });
  };

  Controller.prototype.save = function () {
    if (this.noteSaveTimer) {
      this.saveFocusedNote();
      return;
    }
    const saved = storage.save(this.workspaceSnapshot({ touchUpdatedAt: true }));
    this.markSaved(saved);
  };

  Controller.prototype.applyTheme = function () {
    const preset = config.themePresets[this.theme] || config.themePresets.light;
    const tokens = completeThemeTokens(this.theme === "custom" ? Object.assign({}, preset.tokens, this.customTheme) : preset.tokens);
    const colorScheme = this.theme === "custom" ? inferColorScheme(tokens.bg) : preset.colorScheme;
    document.documentElement.dataset.theme = colorScheme === "dark" ? "dark" : "light";
    document.documentElement.style.colorScheme = colorScheme;
    MANAGED_THEME_TOKEN_KEYS.forEach((key) => {
      document.documentElement.style.removeProperty("--" + key);
    });
    Object.entries(tokens).forEach(([key, value]) => {
      document.documentElement.style.setProperty("--" + key, value);
    });
    config.colors = storage.normalizeBranchColors(this.branchColors);
  };

  Controller.prototype.applyAppearance = function () {
    document.documentElement.style.setProperty("--node-font-size", this.appearance.nodeFontSize + "px");
    document.documentElement.style.setProperty("--leaf-marker-font-size", Math.max(7, Math.round(this.appearance.nodeFontSize * 0.69)) + "px");
    document.documentElement.dataset.style = storage.normalizeStylePreset(this.appearance.stylePreset);
    document.documentElement.dataset.background = storage.normalizeBackgroundEffect(this.appearance.backgroundEffect);
    const imageData = storage.normalizeBackgroundImageData(this.appearance.backgroundImageData);
    document.documentElement.style.setProperty("--background-image-url", imageData ? `url("${imageData}")` : "none");
    document.documentElement.dataset.view = normalizeViewMode(this.viewMode);
    this.applyStyleOverrides();
  };

  Controller.prototype.applyStyleOverrides = function () {
    const style = storage.normalizeStylePreset(this.appearance.stylePreset);
    const tokens = styleTokens(style, document.documentElement.dataset.theme === "dark");
    const styleOnlyKeys = MANAGED_STYLE_TOKEN_KEYS.filter((key) => !MANAGED_THEME_TOKEN_KEYS.includes(key));
    if (!tokens) {
      styleOnlyKeys.forEach((key) => {
        document.documentElement.style.removeProperty("--" + key);
      });
      return;
    }
    styleOnlyKeys.forEach((key) => {
      document.documentElement.style.removeProperty("--" + key);
    });
    Object.entries(tokens).forEach(([key, value]) => {
      if (MANAGED_THEME_TOKEN_KEYS.includes(key)) return;
      document.documentElement.style.setProperty("--" + key, value);
    });
  };

  Controller.prototype.syncStyleControls = function () {
    if (this.el.stylePresetInput && !this.el.stylePresetInput.options.length) {
      populateSelectOptions(this.el.stylePresetInput, config.stylePresets, config.styleGroups);
    }
    if (this.el.backgroundEffectInput && !this.el.backgroundEffectInput.options.length) {
      populateSelectOptions(this.el.backgroundEffectInput, config.backgroundEffects);
    }
    if (this.el.navigationModeInput && !this.el.navigationModeInput.options.length) {
      populateSelectOptions(this.el.navigationModeInput, config.navigationModes);
    }
    if (this.el.stylePresetInput) this.el.stylePresetInput.value = storage.normalizeStylePreset(this.appearance.stylePreset);
    if (this.el.backgroundEffectInput) this.el.backgroundEffectInput.value = storage.normalizeBackgroundEffect(this.appearance.backgroundEffect);
    if (this.el.navigationModeInput) this.el.navigationModeInput.value = storage.normalizeNavigationMode(this.appearance.navigationMode);
    this.renderCustomSelect(this.el.stylePresetInput, this.el.stylePresetDropdown);
    this.renderCustomSelect(this.el.backgroundEffectInput, this.el.backgroundEffectDropdown);
    this.renderCustomSelect(this.el.navigationModeInput, this.el.navigationModeDropdown);
    if (this.el.backgroundImageUpload) this.el.backgroundImageUpload.hidden = storage.normalizeBackgroundEffect(this.appearance.backgroundEffect) !== "image";
  };

  Controller.prototype.importBackgroundImage = function () {
    const file = this.el.backgroundImageInput && this.el.backgroundImageInput.files && this.el.backgroundImageInput.files[0];
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
      this.updateStatus("Background image must be an image file");
      this.el.backgroundImageInput.value = "";
      return;
    }
    const maxBytes = Math.floor((config.backgroundImageMaxDataUrlLength || 1500000) * 0.72);
    if (file.size > maxBytes) {
      this.updateStatus("Background image too large");
      this.el.backgroundImageInput.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = storage.normalizeBackgroundImageData(reader.result);
      if (!data) {
        this.updateStatus("Background image could not be loaded");
        return;
      }
      this.appearance.backgroundEffect = "image";
      this.appearance.backgroundImageData = data;
      this.applyAppearance();
      this.syncStyleControls();
      this.save();
      this.updateStatus("Background image added");
      this.el.backgroundImageInput.value = "";
    };
    reader.onerror = () => {
      this.updateStatus("Background image could not be loaded");
      this.el.backgroundImageInput.value = "";
    };
    reader.readAsDataURL(file);
  };

  Controller.prototype.syncThemeControls = function () {
    if (!this.el.themePresetInput) return;
    if (!this.el.themePresetInput.options.length) {
      populateSelectOptions(this.el.themePresetInput, config.themePresets, config.themeGroups);
    }
    this.el.themePresetInput.value = config.themePresets[this.theme] ? this.theme : "light";
    this.renderCustomSelect(this.el.themePresetInput, this.el.themePresetDropdown);
    if (this.el.customThemeEditor) this.el.customThemeEditor.hidden = this.theme !== "custom";
    if (!this.el.customThemeEditor || !this.el.customThemeEditor.contains(document.activeElement)) this.renderCustomThemeEditor();
  };

  Controller.prototype.renderCustomSelect = function (select, root) {
    if (!select || !root) return;
    select.classList.add("native-select-hidden");
    root.classList.add("custom-select-ready");
    root.replaceChildren();
    const selected = select.selectedOptions && select.selectedOptions[0];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "custom-select-button";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.textContent = selected ? selected.textContent : "";
    const list = document.createElement("div");
    list.className = "custom-select-list";
    list.setAttribute("role", "listbox");
    list.hidden = true;
    Array.from(select.children).forEach((child) => {
      if (child.tagName === "OPTGROUP") {
        const group = document.createElement("div");
        group.className = "custom-select-group";
        group.textContent = child.label;
        list.append(group);
        Array.from(child.children).forEach((option) => {
          list.append(this.customSelectOption(select, root, option));
        });
        return;
      }
      if (child.tagName === "OPTION") list.append(this.customSelectOption(select, root, child));
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.toggleCustomSelect(root);
    });
    button.addEventListener("keydown", (event) => this.handleCustomSelectButtonKey(event, root));
    root.append(button, list);
    if (this.activeCustomSelect && this.activeCustomSelect.root === root) this.activeCustomSelect = null;
  };

  Controller.prototype.customSelectOption = function (select, root, option) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "custom-select-option";
    item.dataset.value = option.value;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", option.selected ? "true" : "false");
    item.textContent = option.textContent;
    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      select.value = option.value;
      const button = root.querySelector(".custom-select-button");
      if (button) button.textContent = option.textContent;
      root.querySelectorAll(".custom-select-option").forEach((candidate) => {
        candidate.setAttribute("aria-selected", candidate === item ? "true" : "false");
      });
      select.dispatchEvent(new Event("change", { bubbles: true }));
      this.closeCustomSelect();
    });
    item.addEventListener("keydown", (event) => this.handleCustomSelectOptionKey(event));
    return item;
  };

  Controller.prototype.toggleCustomSelect = function (root) {
    if (this.activeCustomSelect && this.activeCustomSelect.root === root) {
      this.closeCustomSelect();
      return;
    }
    this.openCustomSelect(root);
  };

  Controller.prototype.openCustomSelect = function (root) {
    if (!root) return;
    this.closeCustomSelect();
    const button = root.querySelector(".custom-select-button");
    const list = root.querySelector(".custom-select-list");
    if (!button || !list) return;
    root.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");
    list.hidden = false;
    this.activeCustomSelect = { root, button, list };
    const selected = list.querySelector('[aria-selected="true"]') || list.querySelector(".custom-select-option");
    if (selected) selected.focus();
  };

  Controller.prototype.closeCustomSelect = function () {
    if (!this.activeCustomSelect) return;
    const { root, button, list } = this.activeCustomSelect;
    root.classList.remove("is-open");
    if (button) button.setAttribute("aria-expanded", "false");
    if (list) list.hidden = true;
    this.activeCustomSelect = null;
  };

  Controller.prototype.handleCustomSelectButtonKey = function (event, root) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    this.openCustomSelect(root);
  };

  Controller.prototype.handleCustomSelectOptionKey = function (event) {
    if (!this.activeCustomSelect) return;
    const options = Array.from(this.activeCustomSelect.list.querySelectorAll(".custom-select-option"));
    const index = options.indexOf(event.currentTarget);
    if (event.key === "Escape") {
      event.preventDefault();
      const button = this.activeCustomSelect.button;
      this.closeCustomSelect();
      if (button) button.focus();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.currentTarget.click();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    if (!options.length) return;
    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = Math.min(options.length - 1, index + 1);
    if (event.key === "ArrowUp") nextIndex = Math.max(0, index - 1);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = options.length - 1;
    options[nextIndex].focus();
  };

  Controller.prototype.renderCustomThemeEditor = function () {
    if (!this.el.customThemeEditor) return;
    this.el.customThemeEditor.replaceChildren();
    config.themeTokenControls.forEach((control) => {
      const label = document.createElement("label");
      const name = document.createElement("span");
      name.textContent = control.label;
      const input = document.createElement("input");
      input.type = "color";
      input.value = this.customTheme[control.key] || config.themePresets.custom.tokens[control.key] || "#000000";
      input.addEventListener("input", () => {
        if (document.activeElement !== input) return;
        this.theme = "custom";
        this.customTheme[control.key] = input.value;
        this.customTheme = storage.normalizeCustomTheme(this.customTheme);
        this.applyTheme();
        this.save();
        this.syncThemeControls();
      });
      label.append(name, input);
      this.el.customThemeEditor.append(label);
    });
  };

  Controller.prototype.renderBranchPalette = function () {
    if (!this.el.branchPalette) return;
    this.el.branchPalette.replaceChildren();
    this.branchColors.forEach((color, index) => {
      const input = document.createElement("input");
      input.type = "color";
      input.value = color;
      input.title = "Branch " + (index + 1);
      input.setAttribute("aria-label", "Branch " + (index + 1) + " color");
      input.addEventListener("input", () => {
        this.branchColors[index] = input.value;
        this.applyTheme();
        this.save();
        this.scheduleRender(false);
      });
      this.el.branchPalette.append(input);
    });
  };

  Controller.prototype.shuffleBranchPalette = function () {
    const odd = this.branchColors.filter((_, index) => index % 2 === 0);
    const even = this.branchColors.filter((_, index) => index % 2 === 1);
    this.branchColors = odd.concat(even);
    this.applyTheme();
    this.save();
    this.renderBranchPalette();
    this.scheduleRender(false);
    this.updateStatus("Branch palette shuffled");
  };

  Controller.prototype.resetBranchPalette = function () {
    this.branchColors = DEFAULT_BRANCH_COLORS.slice();
    this.applyTheme();
    this.save();
    this.renderBranchPalette();
    this.scheduleRender(false);
    this.updateStatus("Branch palette reset");
  };

  Controller.prototype.openNoteSidebar = function () {
    if (this.editingId) this.finishEdit(true);
    const node = this.currentMindNode();
    if (!node) {
      this.updateStatus("No node selected");
      return;
    }
    clearTimeout(this.noteCloseTimer);
    this.el.noteSidebar.classList.remove("is-closing");
    this.el.noteSidebar.hidden = false;
    document.documentElement.dataset.noteSidebar = "open";
    this.noteSidebarSourceId = this.focusedSourceId();
    this.syncNoteSidebar(true);
    if (!this.advanceTutorialGuide("opened-note", { sourceId: this.focusedSourceId() })) {
      this.updateStatus("Use [[Node Name]] to link ideas.");
    }
    requestAnimationFrame(() => this.el.noteInput.focus());
  };

  Controller.prototype.toggleNoteSidebar = function () {
    if (this.el.noteSidebar && !this.el.noteSidebar.hidden && !this.el.noteSidebar.classList.contains("is-closing")) {
      this.closeNoteSidebar();
      return;
    }
    this.openNoteSidebar();
  };

  Controller.prototype.closeNoteSidebar = function (focusCanvas) {
    if (!this.el.noteSidebar || this.el.noteSidebar.hidden) return;
    this.saveFocusedNote();
    this.closeNodeLinkSuggest();
    this.el.noteSidebar.classList.add("is-closing");
    clearTimeout(this.noteCloseTimer);
    const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.noteCloseTimer = setTimeout(() => {
      this.el.noteSidebar.hidden = true;
      this.el.noteSidebar.classList.remove("is-closing");
      this.noteSidebarSourceId = null;
      if (this.el.noteSidebar && this.el.noteSidebar.hidden) delete document.documentElement.dataset.noteSidebar;
    }, reducedMotion ? 1 : 130);
    if (focusCanvas !== false) this.reclaimCanvasFocus({ force: true });
    this.advanceTutorialGuide("closed-note");
  };

  Controller.prototype.syncNoteSidebar = function (forceNoteInput) {
    if (!this.el.noteSidebar || this.el.noteSidebar.hidden) return;
    const sourceId = this.focusedSourceId();
    const sourceChanged = Boolean(forceNoteInput && sourceId && this.noteSidebarSourceId && this.noteSidebarSourceId !== sourceId);
    if (forceNoteInput && sourceId) this.noteSidebarSourceId = sourceId;
    else if (!this.noteSidebarSourceId && sourceId) this.noteSidebarSourceId = sourceId;
    const node = this.noteSidebarSourceId ? this.mind.nodes[this.noteSidebarSourceId] : null;
    if (!node) {
      this.el.noteSidebar.hidden = true;
      this.noteSidebarSourceId = null;
      delete document.documentElement.dataset.noteSidebar;
      return;
    }
    forceNoteInput = forceNoteInput || sourceChanged;
    this.el.noteSidebarTitle.textContent = node.label;
    if (this.el.nodeStatusInput) this.el.nodeStatusInput.value = node.status || "open";
    if (this.el.nodePriorityInput) this.el.nodePriorityInput.value = node.priority || "normal";
    this.renderCustomSelect(this.el.nodeStatusInput, this.el.nodeStatusDropdown);
    this.renderCustomSelect(this.el.nodePriorityInput, this.el.nodePriorityDropdown);
    if (this.el.nodeMarkerInput) this.el.nodeMarkerInput.checked = node.markerEnabled === true;
    if (this.el.nodeTagsInput && document.activeElement !== this.el.nodeTagsInput) {
      this.el.nodeTagsInput.value = Array.isArray(node.tags) ? node.tags.join(", ") : "";
    }
    if (forceNoteInput || document.activeElement !== this.el.noteInput) this.el.noteInput.value = node.note || "";
    this.renderNoteLinks(node.note || "");
    this.renderBacklinks();
    this.renderNodeLinkSuggest();
  };

  Controller.prototype.saveFocusedNote = function () {
    if (!this.el.noteInput || this.el.noteSidebar.hidden) return;
    clearTimeout(this.noteSaveTimer);
    this.noteSaveTimer = null;
    const sourceId = this.noteSidebarSourceId || this.focusedSourceId();
    if (!sourceId || !this.mind.nodes[sourceId]) return;
    model.updateMindNodeNote(this.mind, sourceId, this.el.noteInput.value);
    model.updateMindNodeMeta(this.mind, sourceId, {
      status: this.el.nodeStatusInput ? this.el.nodeStatusInput.value : "open",
      priority: this.el.nodePriorityInput ? this.el.nodePriorityInput.value : "normal",
      markerEnabled: this.el.nodeMarkerInput ? this.el.nodeMarkerInput.checked : false,
      tags: this.el.nodeTagsInput ? this.el.nodeTagsInput.value : []
    });
    this.refreshViewTree(this.store.focusedId);
    this.save();
    this.renderNoteLinks(this.el.noteInput.value);
    this.renderBacklinks();
    this.scheduleRender(false);
    this.advanceTutorialGuide("saved-note", { sourceId, note: this.el.noteInput.value });
  };

  Controller.prototype.scheduleFocusedNoteSave = function () {
    this.renderNodeLinkSuggest();
    clearTimeout(this.noteSaveTimer);
    this.noteSaveTimer = setTimeout(() => this.saveFocusedNote(), 180);
  };

  Controller.prototype.focusNoteSourceNode = function () {
    if (!this.currentMindNode()) return;
    this.closeNoteSidebar(false);
    this.actionBarOpen = true;
    this.el.svg.focus();
    this.afterTreeChange(false, true);
    this.updateStatus("Node focused");
  };

  Controller.prototype.renderNoteLinks = function (note) {
    if (!this.el.noteLinks) return;
    this.el.noteLinks.replaceChildren();
    const items = noteLinkItems(note, this.mind, this.getMindIndex());
    this.el.noteLinks.hidden = !items.length;
    items.forEach((item) => {
      if (item.kind === "url") {
        const link = document.createElement("a");
        link.href = item.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = item.label;
        this.el.noteLinks.append(link);
        return;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      button.addEventListener("click", () => {
        this.closeNoteSidebar(false);
        this.focusSourceId(item.sourceId);
      });
      this.el.noteLinks.append(button);
    });
  };

  Controller.prototype.renderBacklinks = function () {
    if (!this.el.backlinks) return;
    this.el.backlinks.replaceChildren();
    const sourceId = this.focusedSourceId();
    const node = sourceId ? this.mind.nodes[sourceId] : null;
    if (!node) {
      this.el.backlinks.hidden = true;
      return;
    }
    const items = backlinkItems(this.getMindIndex(), node).slice(0, 8);
    this.el.backlinks.hidden = !items.length;
    if (!items.length) return;
    const heading = document.createElement("span");
    heading.className = "backlinks-title";
    heading.textContent = "Linked from";
    this.el.backlinks.append(heading);
    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      button.addEventListener("click", () => {
        this.closeNoteSidebar(false);
        this.focusSourceId(item.sourceId);
      });
      this.el.backlinks.append(button);
    });
  };

  Controller.prototype.renderNodeLinkSuggest = function () {
    if (!this.el.nodeLinkSuggest || document.activeElement !== this.el.noteInput) {
      this.closeNodeLinkSuggest();
      return;
    }
    const range = activeNodeLinkRange(this.el.noteInput);
    if (!range) {
      this.closeNodeLinkSuggest();
      return;
    }
    const query = range.query.toLowerCase();
    this.nodeLinkItems = this.getMindIndex().nodes
      .filter((item) => item.labelKey.includes(query))
      .sort((a, b) => {
        const aStarts = a.labelKey.startsWith(query) ? 0 : 1;
        const bStarts = b.labelKey.startsWith(query) ? 0 : 1;
        return aStarts - bStarts || a.node.label.localeCompare(b.node.label);
      })
      .slice(0, 8)
      .map((item) => item.node);
    this.nodeLinkRange = range;
    this.nodeLinkIndex = Math.min(this.nodeLinkIndex, Math.max(0, this.nodeLinkItems.length - 1));
    this.el.nodeLinkSuggest.replaceChildren();
    this.el.nodeLinkSuggest.hidden = !this.nodeLinkItems.length;
    this.nodeLinkItems.forEach((node, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", index === this.nodeLinkIndex ? "true" : "false");
      button.className = index === this.nodeLinkIndex ? "active" : "";
      button.textContent = node.label;
      button.addEventListener("mouseenter", () => {
        this.nodeLinkIndex = index;
        this.syncNodeLinkSuggestActive();
      });
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        this.insertNodeLink(node);
      });
      this.el.nodeLinkSuggest.append(button);
    });
  };

  Controller.prototype.handleNodeLinkSuggestKey = function (event) {
    if (!this.el.nodeLinkSuggest || this.el.nodeLinkSuggest.hidden) return false;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.nodeLinkIndex = Math.min(this.nodeLinkItems.length - 1, this.nodeLinkIndex + 1);
      this.syncNodeLinkSuggestActive();
      return true;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.nodeLinkIndex = Math.max(0, this.nodeLinkIndex - 1);
      this.syncNodeLinkSuggestActive();
      return true;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      const item = this.nodeLinkItems[this.nodeLinkIndex];
      if (!item) return false;
      event.preventDefault();
      this.insertNodeLink(item);
      return true;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      this.closeNodeLinkSuggest();
      return true;
    }
    return false;
  };

  Controller.prototype.syncNodeLinkSuggestActive = function () {
    Array.from(this.el.nodeLinkSuggest.children).forEach((child, index) => {
      const active = index === this.nodeLinkIndex;
      child.classList.toggle("active", active);
      child.setAttribute("aria-selected", active ? "true" : "false");
    });
  };

  Controller.prototype.insertNodeLink = function (node) {
    const range = this.nodeLinkRange || activeNodeLinkRange(this.el.noteInput);
    if (!range) return;
    const value = this.el.noteInput.value;
    const replacement = "[[node:" + node.id + "|" + node.label + "]]";
    this.el.noteInput.value = value.slice(0, range.start) + replacement + value.slice(range.end);
    const cursor = range.start + replacement.length;
    this.el.noteInput.setSelectionRange(cursor, cursor);
    this.closeNodeLinkSuggest();
    this.saveFocusedNote();
    this.el.noteInput.focus();
  };

  Controller.prototype.closeNodeLinkSuggest = function () {
    this.nodeLinkItems = [];
    this.nodeLinkIndex = 0;
    this.nodeLinkRange = null;
    if (!this.el.nodeLinkSuggest) return;
    this.el.nodeLinkSuggest.hidden = true;
    this.el.nodeLinkSuggest.replaceChildren();
  };

  Controller.prototype.focusedSourceId = function () {
    const found = model.findNode(this.store.tree, this.store.focusedId);
    const map = this.currentMap();
    return found && map ? model.sourceIdForViewNode(found.node, map.rootNodeId) : null;
  };

  Controller.prototype.currentMindNode = function () {
    const sourceId = this.focusedSourceId();
    return sourceId ? this.mind.nodes[sourceId] : null;
  };

  Controller.prototype.noteSidebarMindNode = function () {
    const sourceId = this.noteSidebarSourceId || this.focusedSourceId();
    return sourceId ? this.mind.nodes[sourceId] : null;
  };

  Controller.prototype.invalidateMindIndex = function () {
    this.mindIndex = null;
  };

  Controller.prototype.getMindIndex = function () {
    if (!this.mindIndex) this.mindIndex = buildMindIndex(this.mind);
    return this.mindIndex;
  };

  Controller.prototype.openPathSource = function (sourceId) {
    const existing = this.maps.find((map) => map.rootNodeId === sourceId);
    const map = existing || this.ensureMapForNode(sourceId);
    if (!map) return;
    this.openMap(map);
  };

  Controller.prototype.pushUndoSnapshot = function () {
    this.captureActiveMap();
    this.undoBytes = pushBoundedSnapshot(this.undoStack, this.undoBytes, this.snapshot());
    this.redoStack = [];
    this.redoBytes = 0;
  };

  Controller.prototype.snapshot = function () {
    return JSON.stringify({
      mind: this.mind,
      maps: this.maps,
      activeMapId: this.activeMapId,
      downMapStack: this.downMapStack,
      workspaceId: this.workspaceId,
      workspaceUpdatedAt: this.workspaceUpdatedAt,
      authorProfile: this.authorProfile,
      workspaceSync: this.workspaceSync,
      appearance: this.appearance,
      theme: this.theme,
      customTheme: this.customTheme,
      branchColors: this.branchColors
    });
  };

  Controller.prototype.restoreSnapshot = function (raw) {
    const snapshot = JSON.parse(raw);
    this.mind = snapshot.mind;
    this.workspaceId = snapshot.workspaceId || this.workspaceId || workspaceId();
    this.workspaceUpdatedAt = snapshot.workspaceUpdatedAt || new Date().toISOString();
    this.authorProfile = authorProfileForWorkspace(snapshot.authorProfile, this.authorProfile);
    this.workspaceSync = storage.normalizeWorkspaceSync(snapshot.workspaceSync);
    this.maps = snapshot.maps;
    this.activeMapId = snapshot.activeMapId;
    this.downMapStack = Array.isArray(snapshot.downMapStack) ? snapshot.downMapStack : [];
    this.appearance = storage.normalizeAppearance(snapshot.appearance, config.appearanceDefaults);
    this.theme = storage.normalizeTheme(snapshot.theme);
    this.customTheme = storage.normalizeCustomTheme(snapshot.customTheme);
    this.branchColors = storage.normalizeBranchColors(snapshot.branchColors);
    this.hideEditor();
    this.closeNoteSidebar(false);
    this.actionBarOpen = false;
    this.loadMap(this.currentMap());
    this.save();
    this.syncControls();
    this.render();
    this.el.svg.focus();
  };

  Controller.prototype.undo = function () {
    if (!this.undoStack.length) {
      this.updateStatus("Nothing to undo");
      return;
    }
    this.captureActiveMap();
    this.redoBytes = pushBoundedSnapshot(this.redoStack, this.redoBytes, this.snapshot());
    const raw = this.undoStack.pop();
    this.undoBytes = Math.max(0, this.undoBytes - raw.length);
    this.restoreSnapshot(raw);
    this.updateStatus("Undone");
  };

  Controller.prototype.redo = function () {
    if (!this.redoStack.length) {
      this.updateStatus("Nothing to redo");
      return;
    }
    this.captureActiveMap();
    this.undoBytes = pushBoundedSnapshot(this.undoStack, this.undoBytes, this.snapshot());
    const raw = this.redoStack.pop();
    this.redoBytes = Math.max(0, this.redoBytes - raw.length);
    this.restoreSnapshot(raw);
    this.updateStatus("Redone");
  };

  Controller.prototype.openCommandPalette = function () {
    this.el.commandPalette.hidden = false;
    this.el.commandInput.value = "";
    this.paletteIndex = 0;
    this.renderCommandResults();
    requestAnimationFrame(() => this.el.commandInput.focus());
  };

  Controller.prototype.closeCommandPalette = function () {
    this.el.commandPalette.hidden = true;
    this.reclaimCanvasFocus({ force: true });
  };

  Controller.prototype.openAppDialog = function (options) {
    if (!this.el.appDialog) return Promise.resolve(options && options.cancelValue);
    if (this.el.appDialog && !this.el.appDialog.hidden) this.closeAppDialog(this.appDialogCancelValue);
    const config = options || {};
    this.appDialogCancelValue = config.cancelValue;
    if (this.el.appDialogEyebrow) this.el.appDialogEyebrow.textContent = config.eyebrow || "Confirm";
    if (this.el.appDialogTitle) this.el.appDialogTitle.textContent = config.title || "Confirm action";
    if (this.el.appDialogMessage) this.el.appDialogMessage.textContent = config.message || "";
    if (this.el.appDialogActions) {
      this.el.appDialogActions.replaceChildren();
      (config.actions || []).forEach((action) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = action.label;
        if (action.icon) button.dataset.icon = action.icon;
        if (action.kind === "primary") button.classList.add("button-primary");
        if (action.kind === "danger") button.classList.add("button-danger");
        if (RingMapChart.icons) RingMapChart.icons.enhance(button);
        button.addEventListener("click", () => this.closeAppDialog(action.value));
        this.el.appDialogActions.append(button);
      });
    }
    this.el.appDialog.hidden = false;
    return new Promise((resolve) => {
      this.appDialogResolve = resolve;
      requestAnimationFrame(() => {
        const focusTarget = this.el.appDialogActions && this.el.appDialogActions.querySelector(".button-primary, .button-danger, button");
        if (focusTarget) focusTarget.focus();
      });
    });
  };

  Controller.prototype.closeAppDialog = function (value) {
    if (!this.el.appDialog || this.el.appDialog.hidden) return;
    this.el.appDialog.hidden = true;
    if (this.el.appDialogActions) this.el.appDialogActions.replaceChildren();
    const resolve = this.appDialogResolve;
    this.appDialogResolve = null;
    const result = value === undefined ? this.appDialogCancelValue : value;
    this.appDialogCancelValue = null;
    if (resolve) resolve(result);
    this.reclaimCanvasFocus({ force: true });
  };

  Controller.prototype.confirmAction = function (options) {
    return this.openAppDialog({
      eyebrow: options && options.eyebrow || "Confirm",
      title: options && options.title || "Confirm action",
      message: options && options.message || "",
      cancelValue: false,
      actions: [
        { label: options && options.cancelLabel || "Cancel", value: false },
        { label: options && options.confirmLabel || "Continue", value: true, kind: options && options.danger ? "danger" : "primary" }
      ]
    });
  };

  Controller.prototype.chooseAction = function (options) {
    return this.openAppDialog({
      eyebrow: options && options.eyebrow || "Choose",
      title: options && options.title || "Choose action",
      message: options && options.message || "",
      cancelValue: options && options.cancelValue || "",
      actions: options && options.actions || [{ label: "Cancel", value: "" }]
    });
  };

  Controller.prototype.openShortcutSheet = function () {
    if (!this.el.shortcutSheet) return;
    if (this.el.commandPalette) this.el.commandPalette.hidden = true;
    this.el.shortcutSheet.hidden = false;
    requestAnimationFrame(() => {
      if (this.el.shortcutSheetCloseButton) this.el.shortcutSheetCloseButton.focus();
    });
  };

  Controller.prototype.closeShortcutSheet = function () {
    if (!this.el.shortcutSheet) return;
    this.el.shortcutSheet.hidden = true;
    this.reclaimCanvasFocus({ force: true });
  };

  Controller.prototype.showWelcomeIfNeeded = function () {
    if (!this.el.welcomeDialog) return;
    let seen = false;
    try {
      seen = localStorage.getItem(WELCOME_KEY) === "seen";
    } catch (error) {
      seen = true;
    }
    if (seen) return;
    this.openWelcome();
  };

  Controller.prototype.openWelcome = function () {
    if (!this.el.welcomeDialog) return;
    if (this.el.shortcutSheet) this.el.shortcutSheet.hidden = true;
    if (this.el.commandPalette) this.el.commandPalette.hidden = true;
    if (this.el.recoveryDialog) this.el.recoveryDialog.hidden = true;
    this.renderWelcome();
    this.el.welcomeDialog.hidden = false;
    requestAnimationFrame(() => {
      if (this.el.welcomeCloseButton) this.el.welcomeCloseButton.focus();
    });
  };

  Controller.prototype.closeWelcome = function () {
    if (!this.el.welcomeDialog) return;
    this.el.welcomeDialog.hidden = true;
    try {
      localStorage.setItem(WELCOME_KEY, "seen");
    } catch (error) {
      this.reclaimCanvasFocus({ force: true });
      return;
    }
    this.reclaimCanvasFocus({ force: true });
  };

  Controller.prototype.renderWelcome = function () {
    if (this.el.welcomeStats) {
      const nodeCount = Object.keys(this.mind.nodes).length;
      this.el.welcomeStats.textContent = `${nodeCount} nodes · ${this.maps.length} maps · autosaved`;
    }
    if (!this.el.welcomeRecent) return;
    this.el.welcomeRecent.replaceChildren();
    if (!this.recentMinds.length) {
      const empty = document.createElement("span");
      empty.textContent = "Saved minds appear here. Import or start from template.";
      this.el.welcomeRecent.append(empty);
      return;
    }
    this.recentMinds.slice(0, 3).forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      button.addEventListener("click", () => {
        this.closeWelcome();
        this.openRecentMind(item.id);
      });
      this.el.welcomeRecent.append(button);
    });
  };

  Controller.prototype.openRecovery = function () {
    if (!this.el.recoveryDialog) return;
    if (this.el.shortcutSheet) this.el.shortcutSheet.hidden = true;
    if (this.el.commandPalette) this.el.commandPalette.hidden = true;
    if (this.el.welcomeDialog) this.el.welcomeDialog.hidden = true;
    if (this.el.mindMenu) this.el.mindMenu.removeAttribute("open");
    this.renderRecovery();
    this.el.recoveryDialog.hidden = false;
    requestAnimationFrame(() => {
      if (this.el.recoveryCloseButton) this.el.recoveryCloseButton.focus();
    });
  };

  Controller.prototype.closeRecovery = function () {
    if (!this.el.recoveryDialog) return;
    this.el.recoveryDialog.hidden = true;
    this.reclaimCanvasFocus({ force: true });
  };

  Controller.prototype.renderRecovery = function () {
    if (this.el.recoveryCurrentStats) {
      this.el.recoveryCurrentStats.textContent = recoveryStats(this.mind, this.maps, new Date().toISOString());
    }
    if (!this.el.recoveryList) return;
    this.el.recoveryList.replaceChildren();
    if (!this.recentMinds.length) {
      const empty = document.createElement("span");
      empty.textContent = "No recovery points yet";
      this.el.recoveryList.append(empty);
      return;
    }
    this.recentMinds.forEach((item) => {
      const row = document.createElement("div");
      row.className = "recovery-item";
      const meta = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = item.label;
      const detail = document.createElement("span");
      detail.textContent = recoveryItemDetail(item);
      meta.append(title, detail);

      const actions = document.createElement("div");
      const restore = document.createElement("button");
      restore.type = "button";
      restore.textContent = "Restore";
      restore.addEventListener("click", () => this.restoreRecoveryPoint(item.id));
      const download = document.createElement("button");
      download.type = "button";
      download.textContent = "Download";
      download.addEventListener("click", () => this.exportRecoveryPoint(item.id));
      actions.append(restore, download);
      row.append(meta, actions);
      this.el.recoveryList.append(row);
    });
  };

  Controller.prototype.saveRecoveryPoint = function () {
    const result = this.rememberCurrentMind();
    if (!result) {
      this.updateStatus("Recovery point failed");
      return;
    }
    this.renderRecovery();
    this.renderWelcome();
    this.updateStatus(result === "duplicate" ? "Recovery already current" : "Recovery point saved");
  };

  Controller.prototype.restoreRecoveryPoint = async function (recentId) {
    if (!await this.confirmAction({
      title: "Restore recovery point",
      message: "Replace the current browser mind with this recovery point?",
      confirmLabel: "Restore",
      danger: true
    })) return;
    this.closeRecovery();
    this.openRecentMind(recentId);
  };

  Controller.prototype.exportCurrentRecoveryBackup = function () {
    const payload = this.mindExportPayload();
    exportJsonPayload(payload, mindFilename(this.mind.nodes[this.mind.rootId]?.label || "mind"));
    this.updateStatus("Backup downloaded");
  };

  Controller.prototype.exportRecoveryPoint = function (recentId) {
    const item = this.recentMinds.find((recent) => recent.id === recentId);
    if (!item) {
      this.updateStatus("Recovery point missing");
      return;
    }
    const payload = Object.assign({
      type: "concen-mind",
      version: 1,
      exportedAt: new Date().toISOString()
    }, item.snapshot);
    exportJsonPayload(payload, mindFilename(item.label || "recovery"));
    this.updateStatus("Recovery point downloaded");
  };

  Controller.prototype.applyWelcomeStyle = function (style) {
    this.appearance.stylePreset = storage.normalizeStylePreset(style);
    this.applyAppearance();
    this.save();
    this.syncControls();
    this.renderWelcome();
    this.updateStatus(`Style: ${config.stylePresets[this.appearance.stylePreset].label}`);
  };

  Controller.prototype.applyModePack = function (packName) {
    const pack = config.modePacks && config.modePacks[packName];
    if (!pack) return false;
    this.theme = storage.normalizeTheme(pack.theme);
    this.appearance = storage.normalizeAppearance(Object.assign({}, this.appearance, {
      nodeFontSize: pack.nodeFontSize,
      stylePreset: pack.stylePreset,
      navigationMode: pack.navigationMode
    }), config.appearanceDefaults);
    this.spacing = storage.normalizeSpacing(Object.assign({}, this.spacing, pack.spacing || {}), config.spacingDefaults);
    this.viewMode = normalizeViewMode(pack.viewMode);
    this.shouldRevealFocus = true;
    this.applyTheme();
    this.applyAppearance();
    this.save();
    this.syncControls();
    this.render();
    this.renderWelcome();
    this.updateStatus("Mode: " + pack.label);
    return true;
  };

  Controller.prototype.applyWelcomeTemplate = async function (template, options) {
    const tree = welcomeTemplateTree(template);
    if (!tree) return false;
    const hasWork = !this.isStarterMind();
    if (hasWork && !await this.confirmAction({
      title: "Load template",
      message: "Replace the current mind with this starter template?",
      confirmLabel: "Replace",
      danger: true
    })) return false;
    this.pushUndoSnapshot();
    this.store = model.createStore(model.cloneAsRoot(tree));
    this.mind = model.createMindFromTree(this.store.tree);
    this.workspaceId = workspaceId();
    this.workspaceUpdatedAt = new Date().toISOString();
    this.workspaceSync = storage.normalizeWorkspaceSync(null);
    this.maps = [this.createMap(model.ROOT_ID, this.store.tree.label)];
    this.activeMapId = this.maps[0].id;
    this.downMapStack = [];
    this.hideEditor();
    this.closeNoteSidebar(false);
    this.actionBarOpen = false;
    this.cameraReady = false;
    this.loadMap(this.currentMap());
    this.save();
    this.syncControls();
    this.render();
    this.renderWelcome();
    if (options && options.closeWelcome) this.closeWelcome();
    this.updateStatus(template === "blank" ? "Enter adds a child. Shift+Enter renames." : "Pick one node, then Ctrl+Enter opens notes.");
    return true;
  };

  Controller.prototype.applyTutorialSnapshot = async function (options) {
    const snapshot = JSON.parse(JSON.stringify(RingMapChart.tutorialSnapshot));
    const hasWork = Object.keys(this.mind.nodes).length > 1 || this.currentMindNode()?.label !== "Chart Title";
    if (hasWork && !await this.confirmAction({
      title: "Load tutorial",
      message: "Replace the current mind with the tutorial mind?",
      confirmLabel: "Replace",
      danger: true
    })) return false;
    this.pushUndoSnapshot();
    this.mind = snapshot.mind;
    this.workspaceId = snapshot.workspaceId || workspaceId();
    this.workspaceUpdatedAt = snapshot.updatedAt || new Date().toISOString();
    this.authorProfile = authorProfileForWorkspace(snapshot.authorProfile, this.authorProfile);
    this.workspaceSync = storage.normalizeWorkspaceSync(snapshot.sync);
    this.maps = snapshot.maps;
    this.activeMapId = this.maps.some((map) => map.id === snapshot.activeMapId) ? snapshot.activeMapId : this.maps[0].id;
    this.downMapStack = [];
    this.appearance = storage.normalizeAppearance(snapshot.appearance, config.appearanceDefaults);
    this.theme = storage.normalizeTheme(snapshot.theme);
    this.customTheme = storage.normalizeCustomTheme(snapshot.customTheme);
    this.branchColors = storage.normalizeBranchColors(snapshot.branchColors);
    this.hideEditor();
    this.closeNoteSidebar(false);
    this.actionBarOpen = false;
    this.cameraReady = false;
    this.loadMap(this.currentMap());
    this.save();
    this.syncControls();
    this.render();
    this.renderWelcome();
    if (options && options.closeWelcome) this.closeWelcome();
    this.updateStatus("Tutorial loaded");
    return true;
  };

  Controller.prototype.startTutorial = async function () {
    if (!await this.applyWelcomeTemplate("tutorial", { closeWelcome: true })) return;
    this.createTutorialChapterMaps();
    this.startTutorialGuide();
  };

  Controller.prototype.startTutorialGuide = function () {
    const startSourceId = this.tutorialNodeSourceId("Start Here");
    const createSourceId = this.tutorialNodeSourceId("Press Enter on me");
    if (!startSourceId || !createSourceId) {
      this.tutorialGuide = null;
      this.updateStatus("Tutorial loaded. Follow note on right.");
      return;
    }
    this.tutorialGuide = {
      step: "create",
      startSourceId,
      createSourceId,
      renameSourceId: "",
      noteSourceId: "",
      linkTargetSourceId: "",
      findParentSourceId: "",
      commandSourceId: ""
    };
    this.focusSourceId(createSourceId);
    this.openNoteSidebar();
    this.reclaimCanvasFocus({ force: true });
    this.updateStatus("Step 1/4: press Enter to add an idea.");
  };

  Controller.prototype.tutorialNodeSourceId = function (label) {
    const match = Object.values(this.mind.nodes).find((node) => node.label === label);
    return match ? match.id : "";
  };

  Controller.prototype.advanceTutorialGuide = function (eventName, detail) {
    const guide = this.tutorialGuide;
    if (!guide) return false;
    const payload = detail || {};
    if (eventName === "created-child" && guide.step === "create" && payload.sourceId === guide.createSourceId) {
      guide.renameSourceId = this.revealTutorialNode(guide.startSourceId, {
        label: "Rename me",
        note: "Give this idea a clearer name.",
        status: "active",
        priority: "high",
        markerEnabled: true
      });
      this.showTutorialPause("rename", {
        title: "New idea added",
        message: "That is the basic move: pick an idea and press Enter to grow it. Next, give another idea a clearer name.",
        run: () => {
          guide.step = "rename";
          this.focusSourceId(guide.renameSourceId);
          this.startEdit(this.store.focusedId);
          this.updateStatus("Step 2/4: type a short name, then press Enter.");
        }
      });
      return true;
    }
    if (eventName === "renamed-node" && guide.step === "rename" && payload.sourceId === guide.renameSourceId && payload.renamed) {
      this.showTutorialPause("note", {
        title: "Name cleaned up",
        message: "Short names keep the map easy to scan. Longer thoughts belong in notes. Next, add detail without crowding the map.",
        run: () => {
          guide.noteSourceId = this.revealTutorialNode(guide.startSourceId, {
            label: "Add detail here",
            note: "Write one sentence here, then add this link: [[Link target]].",
            status: "active",
            priority: "high",
            markerEnabled: true
          });
          guide.linkTargetSourceId = this.revealTutorialNode(guide.startSourceId, {
            label: "Link target",
            note: "Links connect related ideas without moving them."
          });
          guide.step = "note";
          this.focusSourceId(guide.noteSourceId);
          this.openNoteSidebar();
          this.updateStatus("Step 3/4: write one sentence with [[Link target]].");
        }
      });
      return true;
    }
    if (eventName === "opened-note" && guide.step === "note" && payload.sourceId === guide.noteSourceId) {
      this.updateStatus("Write one sentence, then type [[Link target]].");
      return true;
    }
    if (eventName === "saved-note" && guide.step === "note" && payload.sourceId === guide.noteSourceId && /\[\[Link target\]\]/.test(payload.note || "")) {
      guide.step = "close-note";
      this.updateStatus("Link added. Press Esc when you are ready.");
      return true;
    }
    if (eventName === "closed-note" && guide.step === "close-note") {
      this.showTutorialPause("command", {
        title: "Ideas connected",
        message: "Now those two ideas point to each other. Next, use search to jump back to something without hunting around the map.",
        run: () => {
          guide.findParentSourceId = this.revealTutorialNode(this.mind.rootId, {
            label: "Find Things",
            note: "Search opens now. Use it to jump straight to the practice item.",
            status: "active",
            priority: "normal",
            markerEnabled: true
          });
          guide.commandSourceId = this.revealTutorialNode(guide.findParentSourceId, {
            label: "Find me from commands",
            note: "Search can find ideas, notes, and actions."
          });
          this.revealTutorialNode(this.mind.rootId, {
            label: "Learn more",
            note: "Next moves: Alt+Enter opens a focused map. Space+drag pans. Ctrl+wheel zooms. Save copy exports a backup.",
            status: "waiting",
            priority: "normal"
          });
          guide.step = "command";
          this.focusSourceId(guide.commandSourceId);
          this.openCommandPalette();
          this.updateStatus("Step 4/4: type Find me, then press Enter.");
        }
      });
      return true;
    }
    if (eventName === "ran-command" && guide.step === "command" && payload.item && payload.item.kind === "node" && payload.item.sourceId === guide.commandSourceId) {
      guide.step = "done";
      this.showTutorialPause("done", {
        title: "You have the loop",
        message: "You added an idea, gave it a clear name, wrote detail, linked ideas, and found one again. That is enough to start real work.",
        run: () => {
          this.tutorialGuide = null;
          this.updateStatus("Tutorial complete. Start from a template when ready.");
        }
      });
      this.updateStatus("Tutorial complete. Start from a template when ready.");
      return true;
    }
    return false;
  };

  Controller.prototype.showTutorialPause = async function (step, options) {
    const guide = this.tutorialGuide;
    if (!guide) return;
    const pauseStep = "pause-" + step;
    guide.step = pauseStep;
    await this.chooseAction({
      eyebrow: "Tutorial",
      title: options.title,
      message: options.message,
      cancelValue: "continue",
      actions: [{ label: "Continue", value: "continue", kind: "primary" }]
    });
    if (!this.tutorialGuide || this.tutorialGuide.step !== pauseStep) return;
    options.run();
  };

  Controller.prototype.revealTutorialNode = function (parentSourceId, node) {
    if (!parentSourceId || !node || !node.label) return "";
    const existing = Object.values(this.mind.nodes).find((item) => item.label === node.label);
    if (existing) return existing.id;
    const parent = this.mind.nodes[parentSourceId];
    if (!parent) return "";
    const viewDepth = Math.max(0, mindPathItems(this.mind, parentSourceId).length - 1);
    const sourceId = model.addMindChild(this.mind, parentSourceId, viewDepth, parent.children.length);
    if (!sourceId) return "";
    model.renameMindNode(this.mind, sourceId, node.label);
    model.updateMindNodeNote(this.mind, sourceId, node.note || "");
    model.updateMindNodeMeta(this.mind, sourceId, {
      status: node.status || "open",
      priority: node.priority || "normal",
      markerEnabled: node.markerEnabled === true,
      tags: node.tags || []
    });
    this.refreshViewTree(this.store.focusedId);
    this.save();
    this.scheduleRender(true);
    return sourceId;
  };

  Controller.prototype.createTutorialChapterMaps = function () {
    Object.values(this.mind.nodes)
      .filter((node) => /^Chapter \d+:/.test(node.label) || /^\d+\./.test(node.label))
      .forEach((node) => {
        if (!this.maps.some((map) => map.rootNodeId === node.id)) this.maps.push(this.createMap(node.id, node.label));
      });
    this.save();
    this.syncControls();
  };

  Controller.prototype.handleCommandKey = function (event) {
    if (event.key === "Escape") {
      event.preventDefault();
      this.closeCommandPalette();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      this.paletteIndex = Math.min(this.paletteItems.length - 1, this.paletteIndex + 1);
      this.renderCommandResults();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.paletteIndex = Math.max(0, this.paletteIndex - 1);
      this.renderCommandResults();
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = this.paletteItems[this.paletteIndex];
      if (item) this.runCommandItem(item);
    }
  };

  Controller.prototype.renderCommandResults = function () {
    const query = this.el.commandInput.value.trim().toLowerCase();
    this.paletteItems = this.commandItems(query).slice(0, 12);
    this.paletteIndex = Math.min(this.paletteIndex, Math.max(0, this.paletteItems.length - 1));
    this.el.commandResults.replaceChildren();
    this.paletteItems.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = index === this.paletteIndex ? "active" : "";
      button.setAttribute("aria-current", index === this.paletteIndex ? "true" : "false");
      const title = document.createElement("span");
      title.textContent = item.title;
      const detail = document.createElement("small");
      detail.textContent = item.detail;
      button.append(title, detail);
      button.addEventListener("mouseenter", () => {
        this.paletteIndex = index;
        Array.from(this.el.commandResults.children).forEach((child, childIndex) => {
          if (!child.classList) return;
          const active = childIndex === index;
          child.classList.toggle("active", active);
          child.setAttribute("aria-current", active ? "true" : "false");
        });
      });
      button.addEventListener("click", () => this.runCommandItem(item));
      this.el.commandResults.append(button);
    });
    if (!this.paletteItems.length) {
      const empty = document.createElement("p");
      empty.textContent = "No results. Try node label, action name, or status.";
      this.el.commandResults.append(empty);
    }
  };

  Controller.prototype.commandItems = function (query) {
    const focusedNode = this.currentMindNode();
    const mindIndex = this.getMindIndex();
    const primaryCommands = [
      { kind: "command", title: "Add child", detail: "Enter", run: () => this.addNode(true) },
      { kind: "command", title: "Open note", detail: "Ctrl+Enter or Ctrl+click", run: () => this.openNoteSidebar() },
      { kind: "command", title: "Edit label", detail: "Shift+Enter", run: () => this.startEdit(this.store.focusedId) },
      { kind: "command", title: "Fit view", detail: "Toolbar focus", run: () => this.fitCurrentView() },
      { kind: "command", title: focusedNode && focusedNode.markerEnabled ? "Hide marker" : "Show marker", detail: "Focused node", run: () => this.setFocusedMarker(!(focusedNode && focusedNode.markerEnabled)) },
      { kind: "command", title: "Delete focused node", detail: "Delete or Backspace", run: () => this.deleteFocused() },
      { kind: "command", title: "Show shortcuts", detail: "Toolbar ?", run: () => this.openShortcutSheet() },
      { kind: "command", title: "Find node", detail: "Ctrl+K", run: () => this.updateStatus("Type to search nodes and notes") }
    ];
    const movementCommands = [
      { kind: "command", title: "Move focus", detail: "Arrows, WASD, HJKL", run: () => this.updateStatus("Move focus: arrows, WASD, or HJKL") },
      { kind: "command", title: "Tree movement", detail: "Shift+Arrow", run: () => this.updateStatus("Tree movement: Shift+Arrow") },
      { kind: "command", title: "Pan canvas", detail: "Space+drag or wheel", run: () => this.updateStatus("Pan: Space+drag or wheel. Zoom: Ctrl+wheel") },
      { kind: "command", title: "Parent or child map", detail: "Ctrl+Left / Ctrl+Right", run: () => this.updateStatus("Map nav: Ctrl+Left parent, Ctrl+Right child") },
      { kind: "command", title: "Open node map", detail: "Alt+Enter", run: () => this.createMapFromFocusedNode() },
      { kind: "command", title: "Create parent", detail: "Ctrl+Shift+Enter", run: () => this.createParentForFocusedNode() }
    ];
    const viewCommands = [
      { kind: "command", title: "Toggle notes", detail: "Ctrl+Enter", run: () => this.toggleNoteSidebar() },
      { kind: "command", title: "Toggle theme", detail: "Light/dark", run: () => this.toggleTheme() },
      { kind: "command", title: "Cycle style", detail: "Style preset", run: () => this.cycleStylePreset() },
      { kind: "command", title: "Cycle navigation", detail: "Arrow policy", run: () => this.cycleNavigationMode() },
      { kind: "command", title: "Next view mode", detail: "Flat, radial, tree, book, notes", run: () => this.toggleViewMode() },
      { kind: "command", title: "Flat view", detail: "Single outer ring", run: () => this.setViewMode("tree") },
      { kind: "command", title: "Radial view", detail: "Hierarchical scatter disk", run: () => this.setViewMode("radial") },
      { kind: "command", title: "Tree view", detail: "Structured columns", run: () => this.setViewMode("book") },
      { kind: "command", title: "Book view", detail: "Document outline", run: () => this.setViewMode("document") },
      { kind: "command", title: "Notes view", detail: "Editable text document", run: () => this.setViewMode("notes") },
      { kind: "command", title: "Undo", detail: "Ctrl+Z", run: () => this.undo() },
      { kind: "command", title: "Redo", detail: "Ctrl+Shift+Z", run: () => this.redo() }
    ];
    const workspaceCommands = [
      { kind: "command", title: "Show welcome", detail: "Logo button", run: () => this.openWelcome() },
      { kind: "command", title: "New mind", detail: "Blank document", run: () => this.newMind() },
      { kind: "command", title: "Save mind", detail: "Local autosave", run: () => {
        this.save();
        this.updateStatus("Mind saved");
      } },
      { kind: "command", title: "Save copy", detail: ".mind.json", run: () => this.exportMind() },
      { kind: "command", title: "Recovery", detail: "Backups and restore points", run: () => this.openRecovery() },
      { kind: "command", title: "Clear recents", detail: "Remove stored snapshots", run: () => this.clearRecentMinds() },
      { kind: "command", title: "Export theme", detail: ".concen-theme.json", run: () => this.exportTheme() },
      { kind: "command", title: "Push to GitHub", detail: "Commit current mind JSON", run: () => this.pushMindToGithub() },
      { kind: "command", title: "Pull from GitHub", detail: "Replace current mind from repo", run: () => this.pullMindFromGithub() }
    ];
    const metadataCommands = [];
    ["open", "active", "waiting", "done"].forEach((status) => {
      metadataCommands.push({
        kind: "command",
        title: "Set status: " + titleCase(status),
        detail: "Focused node",
        text: ("status " + status + " set focused node").toLowerCase(),
        run: () => this.setFocusedStatus(status)
      });
    });
    ["low", "normal", "high", "critical"].forEach((priority) => {
      metadataCommands.push({
        kind: "command",
        title: "Set priority: " + titleCase(priority),
        detail: "Focused node",
        text: ("priority " + priority + " set focused node").toLowerCase(),
        run: () => this.setFocusedPriority(priority)
      });
    });
    const recent = this.recentMinds.map((item) => ({
      kind: "recent",
      title: item.label,
      detail: "Recent mind",
      recentId: item.id,
      text: `${item.label} recent mind`.toLowerCase()
    }));
    const nodes = mindIndex.searchItems.map((item) => ({
      kind: "node",
      title: item.node.label,
      detail: item.detail,
      sourceId: item.node.id,
      text: item.text
    }));
    const linkedNodes = focusedNode ? noteLinkItems(focusedNode.note || "", this.mind, mindIndex)
      .filter((item) => item.kind === "node")
      .map((item) => ({
        kind: "node",
        title: "Open linked node: " + item.label.replace(/^Node:\s*/, ""),
        detail: "From focused note",
        sourceId: item.sourceId,
        text: ("open linked node link " + item.label).toLowerCase()
      })) : [];
    const moveTargets = this.moveTargetItems(query);
    const all = primaryCommands.concat(moveTargets, linkedNodes, nodes, metadataCommands, movementCommands, viewCommands, recent, workspaceCommands);
    if (!query) return all;
    return all.filter((item) => (item.text || `${item.title} ${item.detail}`.toLowerCase()).includes(query));
  };

  Controller.prototype.runCommandItem = function (item) {
    this.closeCommandPalette();
    if (item.kind === "node") this.focusSourceId(item.sourceId);
    else if (item.kind === "move-target") this.moveFocusedTo(item.sourceId);
    else if (item.kind === "recent") this.openRecentMind(item.recentId);
    else item.run();
    this.advanceTutorialGuide("ran-command", { item });
  };

  Controller.prototype.moveTargetItems = function (query) {
    if (!/\b(move|reparent|under|to)\b/.test(query)) return [];
    const sourceId = this.focusedSourceId();
    if (!sourceId) return [];
    const map = this.currentMap();
    if (!map) return [];
    return model.visibleNodes(this.store.tree)
      .map(({ node }) => this.mind.nodes[model.sourceIdForViewNode(node, map.rootNodeId)])
      .filter(Boolean)
      .filter((node) => node.id !== sourceId && node.id !== this.mind.rootId)
      .filter((node) => this.validateNodeDrop(sourceId, node.id).ok)
      .map((node) => ({
        kind: "move-target",
        title: "Move under: " + node.label,
        detail: nodeSearchDetail(this.mind, node),
        sourceId: node.id,
        text: `move reparent under to ${node.label} ${node.note || ""}`.toLowerCase()
      }));
  };

  Controller.prototype.setFocusedStatus = function (status) {
    const sourceId = this.focusedSourceId();
    const node = sourceId ? this.mind.nodes[sourceId] : null;
    if (!node) return;
    this.pushUndoSnapshot();
    model.updateMindNodeMeta(this.mind, sourceId, {
      status,
      priority: node.priority,
      markerEnabled: node.markerEnabled,
      tags: node.tags
    });
    this.refreshViewTree(this.store.focusedId);
    this.syncNoteSidebar(true);
    this.afterTreeChange(true, false);
    this.updateStatus("Status set: " + titleCase(status));
  };

  Controller.prototype.setFocusedPriority = function (priority) {
    const sourceId = this.focusedSourceId();
    const node = sourceId ? this.mind.nodes[sourceId] : null;
    if (!node) return;
    this.pushUndoSnapshot();
    model.updateMindNodeMeta(this.mind, sourceId, {
      status: node.status,
      priority,
      markerEnabled: node.markerEnabled,
      tags: node.tags
    });
    this.refreshViewTree(this.store.focusedId);
    this.syncNoteSidebar(true);
    this.afterTreeChange(true, false);
    this.updateStatus("Priority set: " + titleCase(priority));
  };

  Controller.prototype.setFocusedMarker = function (markerEnabled) {
    const sourceId = this.focusedSourceId();
    const node = sourceId ? this.mind.nodes[sourceId] : null;
    if (!node) return;
    this.pushUndoSnapshot();
    model.updateMindNodeMeta(this.mind, sourceId, {
      status: node.status,
      priority: node.priority,
      markerEnabled,
      tags: node.tags
    });
    this.refreshViewTree(this.store.focusedId);
    this.syncNoteSidebar(true);
    this.afterTreeChange(true, false);
    this.updateStatus(markerEnabled ? "Marker shown" : "Marker hidden");
  };

  Controller.prototype.moveFocusedTo = function (targetId) {
    const sourceId = this.focusedSourceId();
    if (!sourceId) return;
    const validation = this.validateNodeDrop(sourceId, targetId);
    if (!validation.ok) {
      this.updateStatus(validation.message);
      return;
    }
    this.pushUndoSnapshot();
    this.layoutAnimationPositions = new Map(this.positions);
    if (!model.reparentMindNode(this.mind, sourceId, targetId)) {
      this.updateStatus("Cannot move node");
      return;
    }
    this.refreshViewTree(sourceId);
    this.afterTreeChange(true, true);
    this.updateStatus("Node moved");
  };

  Controller.prototype.toggleTheme = function () {
    this.theme = this.theme === "dark" ? "light" : "dark";
    this.applyTheme();
    this.save();
    this.syncControls();
  };

  Controller.prototype.toggleViewMode = function () {
    const modes = ["tree", "radial", "book", "document", "notes"];
    const index = modes.indexOf(this.viewMode);
    this.setViewMode(modes[(index + 1) % modes.length]);
  };

  Controller.prototype.setViewMode = function (mode) {
    if (this.viewMode === "notes") this.commitNotesDocument({ autoEnter: true });
    const nextMode = normalizeViewMode(mode);
    if (this.viewMode === nextMode) {
      this.syncViewModeControls();
      return;
    }
    this.viewMode = nextMode;
    this.save();
    this.syncControls();
    this.scheduleRender(true);
    if (nextMode === "notes" && this.el.notesRichEditor) {
      requestAnimationFrame(() => this.el.notesRichEditor.focus());
    }
  };

  Controller.prototype.syncNotesDocumentView = function () {
    const notesActive = this.viewMode === "notes";
    if (this.el.notesDocument) this.el.notesDocument.hidden = !notesActive;
    if (this.el.svg) this.el.svg.classList.toggle("notes-view-hidden", notesActive);
    if (notesActive) {
      this.closeNoteSidebar(false);
      this.hideEditor();
      this.actionBarOpen = false;
    }
  };

  Controller.prototype.handleNotesDocumentInput = function () {
    this.notesDocumentDirty = true;
    this.notesDocumentUndoPending = true;
    this.renderNotesRichEditor();
    clearTimeout(this.notesDocumentCommitTimer);
    this.notesDocumentCommitTimer = setTimeout(() => this.commitNotesDocument(), 900);
  };

  Controller.prototype.handleNotesRichEditorKeyDown = function (event) {
    if (event.key !== "Enter") return;
    this.normalizeNotesRichBlock(this.currentNotesRichBlock());
  };

  Controller.prototype.handleNotesRichEditorPaste = function (event) {
    const text = event.clipboardData && event.clipboardData.getData("text/plain");
    if (!text || !this.el.notesDocumentInput) return;
    event.preventDefault();
    this.el.notesDocumentInput.value = String(text).replace(/\r\n?/g, "\n");
    this.notesDocumentPendingEnterSourceId = null;
    this.notesDocumentDirty = true;
    this.notesDocumentUndoPending = true;
    this.renderNotesRichEditor({ force: true });
    this.focusNotesRichEditorEnd();
    clearTimeout(this.notesDocumentCommitTimer);
    this.notesDocumentCommitTimer = setTimeout(() => this.commitNotesDocument(), 250);
  };

  Controller.prototype.handleNotesRichEditorInput = function () {
    this.normalizeNotesRichEditorBlocks();
    this.trackNotesRichBlock();
    if (this.el.notesDocumentInput && this.el.notesRichEditor) {
      this.el.notesDocumentInput.value = this.serializeNotesRichEditor();
    }
    this.notesDocumentDirty = true;
    this.notesDocumentUndoPending = true;
    clearTimeout(this.notesDocumentCommitTimer);
    this.notesDocumentCommitTimer = setTimeout(() => this.commitNotesDocument(), 900);
  };

  Controller.prototype.syncNotesDocument = function () {
    if (!this.el.notesDocumentInput || this.viewMode !== "notes") return;
    if (document.activeElement === this.el.notesDocumentInput || document.activeElement === this.el.notesRichEditor) return;
    const nextValue = this.serializeNotesDocument();
    if (this.el.notesDocumentInput.value !== nextValue) this.el.notesDocumentInput.value = nextValue;
    this.notesDocumentDirty = false;
    this.renderNotesRichEditor();
  };

  Controller.prototype.renderNotesRichEditor = function (options) {
    const force = options && options.force === true;
    if (!this.el.notesDocumentInput || !this.el.notesRichEditor) return;
    if (!force && document.activeElement === this.el.notesRichEditor) return;
    this.el.notesRichEditor.replaceChildren();
    const lines = String(this.el.notesDocumentInput.value || "").replace(/\r\n?/g, "\n").split("\n");
    const headingNodes = model.visibleNodes(this.store.tree).map((item) => item.node).filter((node) => node.depth > 0);
    let headingIndex = 0;
    let list = null;
    const closeList = () => { list = null; };
    lines.forEach((line) => {
      const heading = line.match(/^(#{1,4})(?!#)\s+(.+)$/);
      if (heading) {
        closeList();
        const level = heading[1].length;
        const el = document.createElement("h" + level);
        el.className = "notes-md-heading notes-md-heading-" + level;
        this.appendInlineMarkdown(el, heading[2]);
        this.appendNotesHeadingMeta(el, headingNodes[headingIndex++], level - 1);
        this.el.notesRichEditor.append(el);
        return;
      }
      const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
      if (bullet) {
        if (!list) {
          list = document.createElement("ul");
          this.el.notesRichEditor.append(list);
        }
        const item = document.createElement("li");
        this.appendInlineMarkdown(item, bullet[1]);
        list.append(item);
        return;
      }
      closeList();
      const paragraph = document.createElement("p");
      if (line.trim()) this.appendInlineMarkdown(paragraph, line);
      else paragraph.append(document.createElement("br"));
      this.el.notesRichEditor.append(paragraph);
    });
  };

  Controller.prototype.trackNotesRichBlock = function () {
    if (!this.el.notesRichEditor || document.activeElement !== this.el.notesRichEditor) return;
    const block = this.currentNotesRichBlock();
    if (block !== this.notesRichLastBlock) {
      this.normalizeNotesRichBlock(this.notesRichLastBlock);
      this.notesRichLastBlock = block;
    }
  };

  Controller.prototype.currentNotesRichBlock = function () {
    const selection = window.getSelection && window.getSelection();
    const anchor = selection && selection.anchorNode;
    if (!anchor || !this.el.notesRichEditor || !this.el.notesRichEditor.contains(anchor)) return null;
    const element = anchor.nodeType === Node.ELEMENT_NODE ? anchor : anchor.parentElement;
    return element && element.closest ? element.closest("h1,h2,h3,h4,p,div,li") : null;
  };

  Controller.prototype.focusNotesRichEditorEnd = function () {
    if (!this.el.notesRichEditor || !window.getSelection || !document.createRange) return;
    this.el.notesRichEditor.focus();
    const range = document.createRange();
    range.selectNodeContents(this.el.notesRichEditor);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  Controller.prototype.normalizeNotesRichEditorBlocks = function () {
    if (!this.el.notesRichEditor) return;
    const current = this.currentNotesRichBlock();
    Array.from(this.el.notesRichEditor.querySelectorAll("p,div")).forEach((block) => {
      if (block !== current) this.normalizeNotesRichBlock(block);
    });
  };

  Controller.prototype.normalizeNotesRichBlock = function (block) {
    if (!block || !this.el.notesRichEditor || !this.el.notesRichEditor.contains(block)) return;
    if (!/^P|DIV$/i.test(block.tagName || "")) return;
    const text = block.textContent || "";
    const heading = text.match(/^\s*(#{1,4})(?!#)\s+(.+)$/);
    if (!heading) return;
    const level = heading[1].length;
    const next = document.createElement("h" + level);
    next.className = "notes-md-heading notes-md-heading-" + level;
    this.appendInlineMarkdown(next, heading[2]);
    block.replaceWith(next);
    if (this.el.notesDocumentInput) this.el.notesDocumentInput.value = this.serializeNotesRichEditor();
    this.notesDocumentDirty = true;
  };

  Controller.prototype.appendNotesHeadingMeta = function (target, node, expectedDepth) {
    if (!target || !node || node.depth !== expectedDepth) return;
    const map = this.currentMap();
    const sourceId = map ? model.sourceIdForViewNode(node, map.rootNodeId) : (node.sourceId || node.id);
    if (!sourceId || !this.mind.nodes[sourceId]) return;
    const meta = document.createElement("span");
    meta.className = "notes-heading-meta";
    meta.contentEditable = "false";
    meta.append(
      this.createNotesMetaSelect(sourceId, "status", node.status || "open", ["open", "active", "waiting", "done"]),
      this.createNotesMetaSelect(sourceId, "priority", node.priority || "normal", ["low", "normal", "high", "critical"])
    );
    target.append(meta);
  };

  Controller.prototype.createNotesMetaSelect = function (sourceId, key, value, values) {
    const select = document.createElement("select");
    select.className = "notes-heading-" + key + " " + key + "-" + value;
    select.setAttribute("aria-label", titleCase(key));
    select.dataset.sourceId = sourceId;
    select.dataset.metaKey = key;
    values.forEach((optionValue) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = titleCase(optionValue);
      select.append(option);
    });
    select.value = value;
    select.addEventListener("change", (event) => {
      const next = event.currentTarget.value;
      event.currentTarget.className = "notes-heading-" + key + " " + key + "-" + next;
      this.updateNotesHeadingMeta(sourceId, key, next);
    });
    return select;
  };

  Controller.prototype.updateNotesHeadingMeta = function (sourceId, key, value) {
    const node = this.mind.nodes[sourceId];
    if (!node || (key !== "status" && key !== "priority")) return;
    const next = {
      status: node.status || "open",
      priority: node.priority || "normal",
      markerEnabled: node.markerEnabled === true,
      tags: node.tags || []
    };
    next[key] = value;
    model.updateMindNodeMeta(this.mind, sourceId, next);
    this.refreshViewTree(this.store.focusedId);
    this.save();
    this.scheduleRender(false);
  };

  Controller.prototype.serializeNotesRichEditor = function () {
    if (!this.el.notesRichEditor) return "";
    const lines = [];
    Array.from(this.el.notesRichEditor.children).forEach((block) => {
      const tag = block.tagName;
      if (/^H[1-4]$/.test(tag)) {
        lines.push("#".repeat(Number(tag.slice(1))) + " " + serializeInlineMarkdown(block));
        lines.push("");
        return;
      }
      if (tag === "UL" || tag === "OL") {
        Array.from(block.children).forEach((item, index) => {
          const prefix = tag === "OL" ? String(index + 1) + ". " : "- ";
          lines.push(prefix + serializeInlineMarkdown(item));
        });
        lines.push("");
        return;
      }
      const text = serializeInlineMarkdown(block);
      lines.push(text);
      if (text) lines.push("");
    });
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
  };

  Controller.prototype.appendInlineMarkdown = function (target, source) {
    const pattern = /(\*\*([^*]+)\*\*)|(__([^_]+)__)|(~~([^~]+)~~)|(`([^`]+)`)|(==([^=]+)==)|(!?\[([^\]]*)\]\(([^)]+)\))|(\[\[([^\]|]+)\|([^\]]+)\]\])|(\[\[([^\]]+)\]\])/g;
    let cursor = 0;
    const appendText = (value) => {
      if (value) target.append(document.createTextNode(value));
    };
    String(source || "").replace(pattern, (match, boldA, boldTextA, boldB, boldTextB, strikeA, strikeText, codeA, codeText, markA, markText, linkA, linkText, linkHref, wikiAliasA, wikiTarget, wikiLabel, wikiA, wikiOnly, offset) => {
      appendText(source.slice(cursor, offset));
      cursor = offset + match.length;
      let el = null;
      if (boldA || boldB) {
        el = document.createElement("strong");
        el.textContent = boldTextA || boldTextB || "";
      } else if (strikeA) {
        el = document.createElement("s");
        el.textContent = strikeText || "";
      } else if (codeA) {
        el = document.createElement("code");
        el.textContent = codeText || "";
      } else if (markA) {
        el = document.createElement("mark");
        el.textContent = markText || "";
      } else if (linkA) {
        el = document.createElement(match.startsWith("!") ? "span" : "a");
        el.textContent = match.startsWith("!") ? "▣ " + (linkText || "image") : (linkText || linkHref || "link");
        if (!match.startsWith("!")) {
          el.href = linkHref || "#";
          el.target = "_blank";
          el.rel = "noopener noreferrer";
        }
      } else if (wikiAliasA || wikiA) {
        el = document.createElement("button");
        el.type = "button";
        el.className = "notes-md-wikilink";
        el.textContent = wikiLabel || wikiOnly || "node";
        el.addEventListener("click", () => {
          const node = linkedNode(wikiTarget || wikiOnly, this.mind, this.getMindIndex());
          if (node) this.focusSourceId(node.id);
          else this.updateStatus("Linked node not found");
        });
      }
      if (el) target.append(el);
      return match;
    });
    appendText(String(source || "").slice(cursor));
  };

  Controller.prototype.serializeNotesDocument = function () {
    const lines = [];
    const appendBlank = () => {
      if (lines.length && lines[lines.length - 1] !== "") lines.push("");
    };
    const visit = (node) => {
      if (node.depth > 0) lines.push("#".repeat(Math.min(node.depth + 1, 4)) + " " + (node.label || model.defaultLabel(node.depth, 0)));
      const note = String(node.note || "").trim();
      if (note) {
        appendBlank();
        note.split(/\n/).forEach((line) => lines.push(line));
      }
      node.children.forEach((child) => {
        appendBlank();
        visit(child);
      });
    };
    visit(this.store.tree);
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
  };

  Controller.prototype.commitNotesDocument = function (options) {
    const autoEnter = options && options.autoEnter === true;
    if (!this.el.notesDocumentInput || !this.notesDocumentDirty) {
      if (autoEnter) return this.enterPendingNotesChildMap();
      return false;
    }
    clearTimeout(this.notesDocumentCommitTimer);
    this.notesDocumentCommitTimer = null;
    const parsed = this.parseNotesDocument(this.el.notesDocumentInput.value);
    if (!parsed) {
      this.notesDocumentDirty = false;
      return false;
    }
    if (this.notesDocumentUndoPending) this.pushUndoSnapshot();
    this.notesDocumentUndoPending = false;
    const enterSourceId = this.replaceCurrentSubtreeFromNotes(parsed);
    this.notesDocumentDirty = false;
    if (enterSourceId && this.mind.nodes[enterSourceId]) this.notesDocumentPendingEnterSourceId = enterSourceId;
    if (autoEnter && this.enterPendingNotesChildMap()) {
      this.afterTreeChange(true, true);
      this.updateStatus("Notes synced; entered child node");
      return true;
    }
    this.refreshViewTree(this.store.focusedId);
    this.afterTreeChange(true, true);
    this.updateStatus("Notes synced to nodes");
    return true;
  };

  Controller.prototype.enterPendingNotesChildMap = function () {
    const enterSourceId = this.notesDocumentPendingEnterSourceId;
    if (!enterSourceId || !this.mind.nodes[enterSourceId]) {
      this.notesDocumentPendingEnterSourceId = null;
      return false;
    }
    const map = this.ensureMapForNode(enterSourceId);
    if (!map) return false;
    this.notesDocumentPendingEnterSourceId = null;
    this.captureActiveMap();
    this.activeMapId = map.id;
    this.loadMap(map);
    return true;
  };

  Controller.prototype.parseNotesDocument = function (raw) {
    const fallbackLabel = this.store.tree.label || "Chart Title";
    const lines = String(raw || "").replace(/\r\n?/g, "\n").split("\n");
    const hasTopLevelHeading = lines.some((line) => /^(#)(?!#)\s+.+$/.test(line));
    const root = { label: fallbackLabel, noteLines: [], children: [], autoEnterChild: hasTopLevelHeading };
    const stack = [root];
    let current = root;
    lines.forEach((line) => {
      const heading = line.match(/^(#{1,4})(?!#)\s+(.+)$/);
      if (heading) {
        const rawDepth = hasTopLevelHeading ? heading[1].length : heading[1].length - 1;
        const depth = Math.min(Math.max(1, rawDepth), config.limits.maxDepth);
        const parentDepth = Math.max(0, depth - 1);
        const parent = stack[parentDepth] || root;
        if (parent.children.length >= config.limits.maxChildren) {
          current = parent;
          return;
        }
        const node = {
          label: utils.cleanLabel(heading[2]) || model.defaultLabel(depth, parent.children.length),
          noteLines: [],
          children: []
        };
        parent.children.push(node);
        stack.length = depth + 1;
        stack[depth] = node;
        current = node;
        return;
      }
      current.noteLines.push(line);
    });
    return root;
  };

  Controller.prototype.replaceCurrentSubtreeFromNotes = function (parsedRoot) {
    const map = this.currentMap();
    const rootSourceId = map && map.rootNodeId && this.mind.nodes[map.rootNodeId] ? map.rootNodeId : this.mind.rootId;
    const oldByPath = new Map();
    const oldIds = new Set();
    const collectOld = (sourceId, path) => {
      const node = this.mind.nodes[sourceId];
      if (!node) return;
      oldByPath.set(path, node);
      oldIds.add(sourceId);
      node.children.forEach((childId, index) => collectOld(childId, path ? path + "." + index : String(index)));
    };
    collectOld(rootSourceId, "");

    const usedIds = new Set();
    const nextId = () => {
      let id;
      do {
        id = "node-" + this.mind.idCounter++;
      } while (this.mind.nodes[id] || usedIds.has(id));
      return id;
    };
    const noteText = (node) => utils.cleanNote((node.noteLines || []).join("\n").trim());
    const build = (input, path, sourceId) => {
      const existing = oldByPath.get(path);
      const id = sourceId || (existing && existing.id) || nextId();
      usedIds.add(id);
      const childIds = input.children.map((child, index) => build(child, path ? path + "." + index : String(index)));
      const previous = this.mind.nodes[id] || {};
      this.mind.nodes[id] = {
        id,
        label: utils.cleanLabel(input.label) || previous.label || "Chart Title",
        note: noteText(input),
        status: previous.status || "open",
        priority: previous.priority || "normal",
        markerEnabled: previous.markerEnabled === true,
        tags: previous.tags || [],
        children: childIds
      };
      return id;
    };

    build(parsedRoot, "", rootSourceId);
    const rootNode = this.mind.nodes[rootSourceId];
    const enterSourceId = parsedRoot.autoEnterChild && parsedRoot.children.length === 1 && rootNode ? rootNode.children[0] : null;
    oldIds.forEach((id) => {
      if (!usedIds.has(id) && id !== rootSourceId) delete this.mind.nodes[id];
    });
    this.maps = this.maps.filter((item) => this.mind.nodes[item.rootNodeId]);
    if (!this.maps.some((item) => item.id === this.activeMapId)) this.activeMapId = this.maps[0] ? this.maps[0].id : null;
    if (map && this.mind.nodes[rootSourceId]) map.title = this.mind.nodes[rootSourceId].label;
    this.invalidateMindIndex();
    return enterSourceId;
  };

  Controller.prototype.applyLayoutPreset = function (presetName) {
    const preset = LAYOUT_PRESETS[presetName];
    if (!preset) return;
    this.spacing = storage.normalizeSpacing(preset, config.spacingDefaults);
    this.syncSpacingInputs(true);
    this.save();
    this.shouldRevealFocus = true;
    this.render();
    this.updateStatus("Layout: " + titleCase(presetName));
  };

  Controller.prototype.cycleStylePreset = function () {
    const keys = Object.keys(config.stylePresets);
    const index = keys.indexOf(storage.normalizeStylePreset(this.appearance.stylePreset));
    this.appearance.stylePreset = keys[(index + 1) % keys.length];
    this.applyAppearance();
    this.save();
    this.syncControls();
    this.updateStatus(`Style: ${config.stylePresets[this.appearance.stylePreset].label}`);
  };

  Controller.prototype.cycleNavigationMode = function () {
    const keys = Object.keys(config.navigationModes);
    const index = keys.indexOf(storage.normalizeNavigationMode(this.appearance.navigationMode));
    this.appearance.navigationMode = keys[(index + 1) % keys.length];
    this.save();
    this.syncControls();
    this.updateStatus(`Navigation: ${config.navigationModes[this.appearance.navigationMode].label}`);
  };

  Controller.prototype.focusSourceId = function (sourceId) {
    this.saveFocusedNote();
    const visible = model.visibleNodes(this.store.tree).find(({ node }) => model.sourceIdForViewNode(node, this.currentMap().rootNodeId) === sourceId);
    if (visible) {
      model.setFocus(this.store, visible.node.id);
      this.syncNoteSidebar(true);
      this.actionBarOpen = false;
      this.afterTreeChange(false, true);
      this.el.svg.focus();
      return;
    }
    const map = this.maps.find((item) => item.rootNodeId === sourceId) || this.ensureMapForNode(sourceId);
    if (!map) return;
    this.openMap(map);
  };

  Controller.prototype.markSaved = function (saved) {
    if (!this.el.saveState) return;
    this.el.saveState.textContent = saved ? "Autosaved" : "Save failed";
    this.el.saveState.dataset.state = saved ? "saved" : "failed";
    clearTimeout(this.saveStateTimer);
    if (saved) {
      this.el.saveState.dataset.state = "saving";
      this.el.saveState.textContent = "Saving";
      this.saveStateTimer = setTimeout(() => {
        this.el.saveState.dataset.state = "saved";
        this.el.saveState.textContent = "Autosaved";
      }, 280);
    }
  };

  Controller.prototype.exportTheme = function () {
    const preset = config.themePresets[this.theme] || config.themePresets.light;
    const payload = {
      type: "concen-theme",
      version: 1,
      exportedAt: new Date().toISOString(),
      name: preset.label,
      theme: this.theme,
      stylePreset: this.appearance.stylePreset,
      customTheme: this.customTheme,
      branchColors: this.branchColors
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = themeFilename(payload.name);
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.updateStatus("Theme exported");
  };

  Controller.prototype.importTheme = function () {
    const file = this.el.importThemeInput.files && this.el.importThemeInput.files[0];
    if (!file) return;
    if (file.size > config.limits.maxStoredBytes) {
      this.el.importThemeInput.value = "";
      this.updateStatus("Theme file too large");
      return;
    }
    file.text().then((raw) => {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.type && parsed.type !== "concen-theme") throw new Error("Invalid theme file");
        this.theme = storage.normalizeTheme(parsed.theme || "custom");
        this.appearance.stylePreset = storage.normalizeStylePreset(parsed.stylePreset || this.appearance.stylePreset);
        this.customTheme = storage.normalizeCustomTheme(parsed.customTheme || parsed.tokens);
        this.branchColors = storage.normalizeBranchColors(parsed.branchColors);
        this.applyTheme();
        this.save();
        this.syncControls();
        this.render();
        this.updateStatus("Theme imported");
      } catch (error) {
        this.updateStatus("Theme import failed");
      } finally {
        this.el.importThemeInput.value = "";
      }
    });
  };

  Controller.prototype.exportMind = function () {
    const payload = this.mindExportPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = mindFilename(this.mind.nodes[this.mind.rootId]?.label || "mind");
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.updateStatus("Mind copy saved");
  };

  Controller.prototype.workspaceSnapshot = function (options) {
    this.captureActiveMap();
    if (options && options.touchUpdatedAt) this.workspaceUpdatedAt = new Date().toISOString();
    return {
      type: "concen-mind",
      version: 2,
      schemaVersion: 2,
      workspaceId: this.workspaceId,
      updatedAt: this.workspaceUpdatedAt,
      authorProfile: this.authorProfile,
      sync: this.workspaceSync,
      mind: this.mind,
      maps: this.maps,
      activeMapId: this.activeMapId,
      appearance: this.appearance,
      theme: this.theme,
      customTheme: this.customTheme,
      branchColors: this.branchColors
    };
  };

  Controller.prototype.mindExportPayload = function () {
    if (this.noteSaveTimer) this.saveFocusedNote();
    return Object.assign({ exportedAt: new Date().toISOString() }, this.workspaceSnapshot({ touchUpdatedAt: true }));
  };

  Controller.prototype.applyMindPayload = function (parsed) {
    const previous = localStorage.getItem(config.storageKey);
    try {
      localStorage.setItem(config.storageKey, JSON.stringify(parsed));
      const loaded = storage.load();
      if (!loaded) throw new Error("Invalid mind file");
      this.rememberCurrentMind();
      this.workspaceId = loaded.workspaceId || workspaceId();
      this.workspaceUpdatedAt = loaded.updatedAt || new Date().toISOString();
      this.authorProfile = authorProfileForWorkspace(loaded.authorProfile, this.authorProfile);
      saveAuthorProfile(this.authorProfile);
      this.workspaceSync = storage.normalizeWorkspaceSync(loaded.sync);
      this.mind = loaded.mind;
      this.maps = loaded.maps;
      this.activeMapId = loaded.activeMapId;
      this.appearance = storage.normalizeAppearance(loaded.appearance, config.appearanceDefaults);
      this.theme = loaded.theme;
      this.customTheme = storage.normalizeCustomTheme(loaded.customTheme);
      this.branchColors = storage.normalizeBranchColors(loaded.branchColors);
      this.hideEditor();
      this.loadMap(this.currentMap());
      this.save();
      this.syncControls();
      this.render();
      return true;
    } catch (error) {
      if (previous === null) localStorage.removeItem(config.storageKey);
      else localStorage.setItem(config.storageKey, previous);
      return false;
    }
  };

  Controller.prototype.importMind = function () {
    const file = this.el.importMindInput.files && this.el.importMindInput.files[0];
    if (!file) return;
    if (file.size > config.limits.maxStoredBytes) {
      this.el.importMindInput.value = "";
      this.updateStatus("Mind file too large");
      return;
    }
    file.text().then((raw) => {
      try {
        const parsed = JSON.parse(raw);
        if (!this.applyMindPayload(parsed)) throw new Error("Invalid mind file");
        this.updateStatus("Mind opened");
      } catch (error) {
        this.updateStatus("Import failed");
      } finally {
        this.el.importMindInput.value = "";
      }
    });
  };

  Controller.prototype.saveGithubSyncSettings = function () {
    const next = githubSyncFromInputs(this.el, this.githubSync, this.mind);
    if (!next.owner || !next.repo || !next.path || !next.token) {
      this.updateStatus("GitHub sync needs owner, repo, path, token");
      return;
    }
    this.githubSync = next;
    saveGithubSyncConfig(this.githubSync);
    this.syncGithubControls();
    this.syncTrustDataControls();
    this.updateStatus("GitHub sync saved");
  };

  Controller.prototype.exportGithubSyncSettings = function () {
    const sync = githubSyncFromInputs(this.el, this.githubSync, this.mind);
    if (!sync.owner || !sync.repo || !sync.path) {
      this.updateStatus("GitHub settings need owner, repo, path");
      return;
    }
    this.githubSync = sync;
    saveGithubSyncConfig(this.githubSync);
    const payload = githubSyncSettingsPayload(sync);
    const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = githubSettingsFilename(sync);
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.updateStatus("GitHub settings downloaded");
  };

  Controller.prototype.importGithubSyncSettings = function () {
    const input = this.el.githubImportSettingsInput;
    const file = input && input.files && input.files[0];
    if (!file) return;
    file.text().then((raw) => {
      try {
        const parsed = JSON.parse(raw);
        const imported = githubSyncFromSettingsPayload(parsed);
        if (!imported.owner || !imported.repo || !imported.path) throw new Error("Invalid GitHub settings");
        this.githubSync = normalizeGithubSyncConfig(Object.assign({}, imported, {
          token: imported.token || this.githubSync.token || "",
          sha: imported.sha || this.githubSync.sha || ""
        }), this.mind);
        saveGithubSyncConfig(this.githubSync);
        this.syncGithubControls();
        this.syncTrustDataControls();
        this.updateStatus(this.githubSync.token ? "GitHub settings opened" : "GitHub settings opened; token needed");
      } catch (error) {
        this.updateStatus("GitHub settings open failed");
      } finally {
        input.value = "";
      }
    });
  };

  Controller.prototype.disconnectGithubSync = async function () {
    if (!await this.confirmAction({
      title: "Disconnect GitHub sync",
      message: "Remove this browser's GitHub sync settings? Your mind data stays in ConCen.",
      confirmLabel: "Disconnect",
      danger: true
    })) return;
    this.githubSync = defaultGithubSyncConfig(this.mind);
    this.workspaceSync = storage.normalizeWorkspaceSync(null);
    saveGithubSyncConfig(this.githubSync);
    this.save();
    this.syncGithubControls();
    this.syncTrustDataControls();
    this.updateStatus("GitHub sync disconnected");
  };

  Controller.prototype.pushMindToGithub = async function () {
    const sync = this.readGithubSyncSettings();
    if (!sync) return;
    this.rememberCurrentMind();
    const payload = this.mindExportPayload();
    const content = JSON.stringify(payload, null, 2) + "\n";
    this.updateStatus("Pushing to GitHub");
    try {
      const remote = await githubGetContent(sync);
      if (remote && sync.sha && remote.sha !== sync.sha) {
        const action = await this.chooseAction({
          eyebrow: "GitHub Sync",
          title: "Remote changed",
          message: "The remote mind changed since your last pull. Choose how to protect your local work.",
          cancelValue: "",
          actions: [
            { label: "Download Backup", value: "backup" },
            { label: "Pull First", value: "pull", kind: "primary" },
            { label: "Overwrite Remote", value: "overwrite", kind: "danger" },
            { label: "Cancel", value: "" }
          ]
        });
        if (action === "backup") {
          this.exportCurrentRecoveryBackup();
          this.updateStatus("Backup downloaded; GitHub push cancelled");
          return;
        }
        if (action === "pull") {
          this.updateStatus("Pull remote before pushing");
          this.githubSync = Object.assign({}, sync, { sha: remote.sha || "" });
          saveGithubSyncConfig(this.githubSync);
          this.syncGithubControls();
          return;
        }
        if (action !== "overwrite") {
          this.updateStatus("GitHub push cancelled");
          return;
        }
      }
      if (remote && !sync.sha && !await this.confirmAction({
        eyebrow: "GitHub Sync",
        title: "Remote mind exists",
        message: "Push over the existing remote copy?",
        confirmLabel: "Overwrite",
        danger: true
      })) {
        this.updateStatus("GitHub push cancelled");
        return;
      }
      const result = await githubPutContent(sync, content, remote && remote.sha, `Update ${sync.path}`);
      const sha = result.content && result.content.sha || "";
      const now = new Date().toISOString();
      this.githubSync = Object.assign({}, sync, { sha });
      this.workspaceSync = storage.normalizeWorkspaceSync({ provider: "github", lastRemoteSha: sha, lastPushedAt: now, lastPulledAt: this.workspaceSync.lastPulledAt });
      saveGithubSyncConfig(this.githubSync);
      this.save();
      this.syncGithubControls();
      this.syncTrustDataControls();
      this.updateStatus("GitHub push complete");
    } catch (error) {
      this.updateStatus(githubErrorMessage(error, "GitHub push failed"));
    }
  };

  Controller.prototype.pullMindFromGithub = async function () {
    const sync = this.readGithubSyncSettings();
    if (!sync) return;
    if (!await this.confirmAction({
      eyebrow: "GitHub Sync",
      title: "Pull from GitHub",
      message: "Replace the current browser mind with the remote GitHub mind?",
      confirmLabel: "Pull",
      danger: true
    })) return;
    this.rememberCurrentMind();
    this.updateStatus("Pulling from GitHub");
    try {
      const remote = await githubGetContent(sync);
      if (!remote || !remote.content) throw new Error("GitHub file not found");
      const parsed = JSON.parse(decodeBase64Unicode(remote.content));
      if (!this.applyMindPayload(parsed)) throw new Error("Invalid GitHub mind");
      const now = new Date().toISOString();
      this.githubSync = Object.assign({}, sync, { sha: remote.sha || "" });
      this.workspaceSync = storage.normalizeWorkspaceSync({ provider: "github", lastRemoteSha: remote.sha || "", lastPulledAt: now, lastPushedAt: this.workspaceSync.lastPushedAt });
      saveGithubSyncConfig(this.githubSync);
      this.save();
      this.syncGithubControls();
      this.syncTrustDataControls();
      this.updateStatus("GitHub pull complete");
    } catch (error) {
      this.updateStatus(githubErrorMessage(error, "GitHub pull failed"));
    }
  };

  Controller.prototype.readGithubSyncSettings = function () {
    const next = githubSyncFromInputs(this.el, this.githubSync, this.mind);
    if (!next.owner || !next.repo || !next.path || !next.token) {
      this.updateStatus("GitHub sync needs owner, repo, path, token");
      return null;
    }
    this.githubSync = next;
    saveGithubSyncConfig(this.githubSync);
    return next;
  };

  Controller.prototype.clearRecentMinds = async function (source) {
    const recoveryLabel = source === "recovery";
    if (!await this.confirmAction({
      title: recoveryLabel ? "Clear recovery points" : "Clear recents",
      message: recoveryLabel ? "Clear all recovery points stored in this browser?" : "Clear all recent minds stored in this browser?",
      confirmLabel: "Clear",
      danger: true
    })) return;
    this.recentMinds = [];
    saveRecentMinds(this.recentMinds);
    this.renderRecovery();
    this.renderWelcome();
    this.updateStatus(recoveryLabel ? "Recovery points cleared" : "Recent minds cleared");
  };

  Controller.prototype.rememberCurrentMind = function () {
    const label = this.mind.nodes[this.mind.rootId]?.label || "Untitled Mind";
    const snapshot = cloneSnapshot(this.workspaceSnapshot({ touchUpdatedAt: false }));
    const raw = JSON.stringify(snapshot);
    if (raw.length > config.limits.maxStoredBytes) return false;
    if (this.recentMinds[0] && JSON.stringify(this.recentMinds[0].snapshot) === raw) return "duplicate";
    const id = "recent-" + Date.now().toString(36);
    const next = [
      { id, label, updatedAt: new Date().toISOString(), authorProfile: this.authorProfile, schemaVersion: 2, snapshot }
    ].concat(this.recentMinds).slice(0, RECENT_MAX_ITEMS);
    if (!saveRecentMinds(next)) return false;
    this.recentMinds = loadRecentMinds();
    return "saved";
  };

  Controller.prototype.openRecentMind = function (recentId) {
    const item = this.recentMinds.find((recent) => recent.id === recentId);
    if (!item) {
      this.updateStatus("Recent mind missing");
      return;
    }
    this.rememberCurrentMind();
    const previous = localStorage.getItem(config.storageKey);
    try {
      localStorage.setItem(config.storageKey, JSON.stringify(item.snapshot));
      const loaded = storage.load();
      if (!loaded) throw new Error("Invalid recent mind");
      this.workspaceId = loaded.workspaceId || workspaceId();
      this.workspaceUpdatedAt = loaded.updatedAt || new Date().toISOString();
      this.authorProfile = authorProfileForWorkspace(loaded.authorProfile, this.authorProfile);
      saveAuthorProfile(this.authorProfile);
      this.workspaceSync = storage.normalizeWorkspaceSync(loaded.sync);
      this.mind = loaded.mind;
      this.maps = loaded.maps;
      this.activeMapId = loaded.activeMapId;
      this.appearance = storage.normalizeAppearance(loaded.appearance, config.appearanceDefaults);
      this.theme = loaded.theme;
      this.customTheme = storage.normalizeCustomTheme(loaded.customTheme);
      this.branchColors = storage.normalizeBranchColors(loaded.branchColors);
      this.hideEditor();
      this.closeNoteSidebar(false);
      this.actionBarOpen = false;
      this.loadMap(this.currentMap());
      this.save();
      this.syncControls();
      this.render();
      this.updateStatus("Recent mind opened");
    } catch (error) {
      if (previous === null) localStorage.removeItem(config.storageKey);
      else localStorage.setItem(config.storageKey, previous);
      this.updateStatus("Recent mind failed");
    }
  };

  Controller.prototype.viewBox = function () {
    return {
      x: this.camera.x,
      y: this.camera.y,
      width: this.viewport.width / this.camera.scale,
      height: this.viewport.height / this.camera.scale
    };
  };

  Controller.prototype.clampCamera = function () {
    this.camera.scale = utils.clampNumber(this.camera.scale, 0.35, 4, 1);
    const viewWidth = this.viewport.width / this.camera.scale;
    const viewHeight = this.viewport.height / this.camera.scale;
    this.camera.x = utils.clampNumber(this.camera.x, 0, Math.max(0, this.world.width - viewWidth), 0);
    this.camera.y = utils.clampNumber(this.camera.y, 0, Math.max(0, this.world.height - viewHeight), 0);
  };

  Controller.prototype.centerCamera = function () {
    this.camera.x = Math.max(0, (this.world.width - this.viewport.width / this.camera.scale) / 2);
    this.camera.y = Math.max(0, (this.world.height - this.viewport.height / this.camera.scale) / 2);
  };

  Controller.prototype.revealFocus = function () {
    const found = model.findNode(this.store.tree, this.store.focusedId);
    const point = this.positions.get(this.store.focusedId);
    if (!found || !point) return;
    const margin = 48;
    const size = this.layoutEngine.nodeSize(found.node);
    const view = this.viewBox();
    if (point.x - size.width / 2 < view.x + margin) this.camera.x = point.x - size.width / 2 - margin;
    if (point.x + size.width / 2 > view.x + view.width - margin) this.camera.x = point.x + size.width / 2 + margin - view.width;
    if (point.y - size.height / 2 < view.y + margin) this.camera.y = point.y - size.height / 2 - margin;
    if (point.y + size.height / 2 > view.y + view.height - margin) this.camera.y = point.y + size.height / 2 + margin - view.height;
    this.clampCamera();
  };

  Controller.prototype.fitBounds = function (bounds) {
    if (!bounds || !bounds.width || !bounds.height) return;
    const padding = config.layout.ringFitPadding;
    const width = bounds.width + padding * 2;
    const height = bounds.height + padding * 2;
    const scale = Math.min(this.viewport.width / width, this.viewport.height / height, 1);
    this.camera.scale = utils.clampNumber(scale, 0.35, 4, 1);
    this.camera.x = bounds.left + bounds.width / 2 - (this.viewport.width / this.camera.scale) / 2;
    this.camera.y = bounds.top + bounds.height / 2 - (this.viewport.height / this.camera.scale) / 2;
    this.clampCamera();
  };

  Controller.prototype.fitCurrentView = function () {
    if (!this.currentBounds) {
      this.shouldRevealFocus = true;
      this.render();
      return;
    }
    this.fitBounds(this.currentBounds);
    this.updateStatus("Fit view");
    this.updateCameraView();
  };

  Controller.prototype.zoomBy = function (factor) {
    const rect = this.el.svg.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const before = this.clientToWorld(centerX, centerY);
    this.camera.scale = utils.clampNumber(this.camera.scale * factor, 0.35, 4, 1);
    this.clampCamera();
    const view = this.viewBox();
    this.camera.x = before.x - view.width / 2;
    this.camera.y = before.y - view.height / 2;
    this.clampCamera();
    this.updateCameraView(Math.round(this.camera.scale * 100) + "% zoom");
  };

  Controller.prototype.zoomAt = function (clientX, clientY, deltaY) {
    const rect = this.el.svg.getBoundingClientRect();
    const before = this.clientToWorld(clientX, clientY);
    this.camera.scale = utils.clampNumber(this.camera.scale * (deltaY < 0 ? 1.12 : 0.89), 0.35, 4, 1);
    this.clampCamera();
    const view = this.viewBox();
    this.camera.x = before.x - ((clientX - rect.left) / rect.width) * view.width;
    this.camera.y = before.y - ((clientY - rect.top) / rect.height) * view.height;
    this.clampCamera();
    this.updateCameraView();
  };

  Controller.prototype.clientToWorld = function (clientX, clientY) {
    const rect = this.el.svg.getBoundingClientRect();
    const view = this.viewBox();
    return {
      x: view.x + ((clientX - rect.left) / rect.width) * view.width,
      y: view.y + ((clientY - rect.top) / rect.height) * view.height
    };
  };

  Controller.prototype.updateCameraView = function (status) {
    this.renderer.setViewBox(this.viewBox());
    if (status) this.updateStatus(status);
    this.positionEditor();
    this.positionActionBar();
  };

  Controller.prototype.startPan = function (event) {
    this.isPointerOverCanvas = true;
    if (!this.isSpaceDown || event.button !== 0) return;
    event.preventDefault();
    this.hideEditor();
    this.el.svg.focus();
    this.isPanning = true;
    this.panStart = {
      clientX: event.clientX,
      clientY: event.clientY,
      cameraX: this.camera.x,
      cameraY: this.camera.y,
      view: this.viewBox()
    };
    this.el.svg.classList.add("is-panning");
    this.el.svg.setPointerCapture(event.pointerId);
  };

  Controller.prototype.startNodeDrag = function (event, id) {
    if (this.isSpaceDown || event.button !== 0 || this.editingId) return;
    const found = model.findNode(this.store.tree, id);
    const map = this.currentMap();
    const sourceId = found && map ? model.sourceIdForViewNode(found.node, map.rootNodeId) : null;
    if (!found || !sourceId || sourceId === this.mind.rootId) return;
    event.preventDefault();
    event.stopPropagation();
    this.nodeDrag = {
      pointerId: event.pointerId,
      id,
      sourceId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      targetId: null,
      targetSourceId: null
    };
    this.el.svg.setPointerCapture(event.pointerId);
  };

  Controller.prototype.moveNodeDrag = function (event) {
    const drag = this.nodeDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.active && moved < 6) return;
    if (!drag.active) {
      this.hideEditor();
      this.closeNoteSidebar(false);
      this.actionBarOpen = false;
    }
    drag.active = true;
    event.preventDefault();
    const target = this.nodeDropTarget(event.clientX, event.clientY, drag.sourceId);
    this.setNodeDropTarget(target);
  };

  Controller.prototype.endNodeDrag = function (event) {
    const drag = this.nodeDrag;
    if (!drag || (event && drag.pointerId !== event.pointerId)) return;
    this.clearNodeDropTarget();
    this.nodeDrag = null;
    if (event && Number.isInteger(event.pointerId) && this.el.svg.hasPointerCapture(event.pointerId)) {
      this.el.svg.releasePointerCapture(event.pointerId);
    }
    if (!drag.active) {
      this.focusNode(drag.id, event);
      return;
    }
    event.preventDefault();
    const target = drag.targetSourceId;
    if (!target) {
      this.updateStatus("Drop on a node to reparent");
      return;
    }
    const validation = this.validateNodeDrop(drag.sourceId, target);
    if (!validation.ok) {
      this.updateStatus(validation.message);
      return;
    }
    this.pushUndoSnapshot();
    this.layoutAnimationPositions = new Map(this.positions);
    if (!model.reparentMindNode(this.mind, drag.sourceId, target)) {
      this.updateStatus("Cannot move node");
      return;
    }
    this.refreshViewTree(drag.sourceId);
    this.afterTreeChange(true, true);
    this.updateStatus("Node moved");
  };

  Controller.prototype.cancelNodeDrag = function (event) {
    if (!this.nodeDrag) return;
    const pointerId = this.nodeDrag.pointerId;
    this.nodeDrag = null;
    this.clearNodeDropTarget();
    if (event && Number.isInteger(event.pointerId) && this.el.svg.hasPointerCapture(event.pointerId)) {
      this.el.svg.releasePointerCapture(event.pointerId);
    } else if (Number.isInteger(pointerId) && this.el.svg.hasPointerCapture(pointerId)) {
      this.el.svg.releasePointerCapture(pointerId);
    }
    this.updateStatus("Move canceled");
  };

  Controller.prototype.nodeDropTarget = function (clientX, clientY, sourceId) {
    const element = document.elementFromPoint(clientX, clientY);
    const group = element && element.closest ? element.closest(".node") : null;
    const id = group ? group.getAttribute("data-node-id") : null;
    const found = id ? model.findNode(this.store.tree, id) : null;
    const map = this.currentMap();
    const targetSourceId = found && map ? model.sourceIdForViewNode(found.node, map.rootNodeId) : null;
    if (!targetSourceId || targetSourceId === sourceId) return null;
    return { id, sourceId: targetSourceId };
  };

  Controller.prototype.setNodeDropTarget = function (target) {
    const drag = this.nodeDrag;
    if (!drag) return;
    if (drag.targetId === (target && target.id)) return;
    this.clearNodeDropTarget();
    if (!target) {
      drag.targetId = null;
      drag.targetSourceId = null;
      return;
    }
    drag.targetId = target.id;
    drag.targetSourceId = target.sourceId;
    const group = this.el.svg.querySelector(`.node[data-node-id="${CSS.escape(target.id)}"]`);
    if (group) group.classList.add("drop-target");
  };

  Controller.prototype.clearNodeDropTarget = function () {
    this.el.svg.querySelectorAll(".node.drop-target").forEach((node) => node.classList.remove("drop-target"));
  };

  Controller.prototype.validateNodeDrop = function (sourceId, targetId) {
    if (sourceId === this.mind.rootId) return { ok: false, message: "Root cannot move" };
    if (sourceId === targetId) return { ok: false, message: "Cannot drop on itself" };
    if (!this.mind.nodes[targetId]) return { ok: false, message: "Drop target missing" };
    if (model.findMindParentId(this.mind, sourceId) === targetId) return { ok: false, message: "Already child of target" };
    if (model.isMindDescendant(this.mind, sourceId, targetId)) return { ok: false, message: "Cannot drop on descendant" };
    if (this.mind.nodes[targetId].children.length >= config.limits.maxChildren) return { ok: false, message: "Target child limit reached" };
    const sourceNode = this.viewNodeForSource(sourceId);
    const targetNode = this.viewNodeForSource(targetId);
    if (!sourceNode || !targetNode) return { ok: false, message: "Move target not visible" };
    const nextDepth = targetNode.depth + 1 + visibleSubtreeDepth(sourceNode);
    if (nextDepth > config.limits.maxDepth) return { ok: false, message: "Move exceeds max depth" };
    return { ok: true, message: "" };
  };

  Controller.prototype.viewNodeForSource = function (sourceId) {
    const map = this.currentMap();
    if (!map) return null;
    const found = model.visibleNodes(this.store.tree)
      .find(({ node }) => model.sourceIdForViewNode(node, map.rootNodeId) === sourceId);
    return found ? found.node : null;
  };

  Controller.prototype.movePan = function (event) {
    if (!this.isPanning || !this.panStart) return;
    const rect = this.el.svg.getBoundingClientRect();
    this.camera.x = this.panStart.cameraX - ((event.clientX - this.panStart.clientX) / rect.width) * this.panStart.view.width;
    this.camera.y = this.panStart.cameraY - ((event.clientY - this.panStart.clientY) / rect.height) * this.panStart.view.height;
    this.clampCamera();
    this.updateCameraView();
  };

  Controller.prototype.endPan = function (event) {
    if (!this.isPanning) return;
    this.isPanning = false;
    this.panStart = null;
    this.el.svg.classList.remove("is-panning");
    if (event && Number.isInteger(event.pointerId) && this.el.svg.hasPointerCapture(event.pointerId)) {
      this.el.svg.releasePointerCapture(event.pointerId);
    }
  };

  Controller.prototype.positionEditor = function () {
    if (!this.editingId || this.el.nodeEditor.hidden) return;
    const found = model.findNode(this.store.tree, this.editingId);
    const point = this.positions.get(this.editingId);
    if (!found || !point) return;
    const rect = this.renderer.editorRect(found.node, point, this.viewBox());
    this.el.nodeEditor.style.left = rect.left + "px";
    this.el.nodeEditor.style.top = rect.top + "px";
    this.el.nodeEditor.style.width = rect.width + "px";
    this.el.nodeEditor.style.height = rect.height + "px";
  };

  Controller.prototype.positionActionBar = function () {
    if (!this.el.nodeActionBar) return;
    if (!this.actionBarOpen || (this.editingId && !this.el.nodeEditor.hidden)) {
      this.el.nodeActionBar.hidden = true;
      return;
    }
    const found = model.findNode(this.store.tree, this.store.focusedId);
    const point = this.positions.get(this.store.focusedId);
    if (!found || !point) {
      this.el.nodeActionBar.hidden = true;
      return;
    }
    const rect = this.renderer.editorRect(found.node, point, this.viewBox());
    const wrapRect = this.el.svg.getBoundingClientRect();
    const bar = this.el.nodeActionBar;
    bar.hidden = false;
    bar.style.left = rect.left + rect.width / 2 + "px";
    bar.style.top = Math.min(wrapRect.height - 52, rect.top + rect.height + 12) + "px";
    requestAnimationFrame(() => {
      const width = bar.offsetWidth;
      const left = Math.max(12 + width / 2, Math.min(wrapRect.width - 12 - width / 2, rect.left + rect.width / 2));
      bar.style.left = left + "px";
    });
  };

  function normalizeWheelDelta(event, axis) {
    const raw = axis === "x" ? event.deltaX : event.deltaY;
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return raw * 16;
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return raw * (axis === "x" ? window.innerWidth : window.innerHeight);
    return raw;
  }

  function normalizedPanDelta(event) {
    let x = normalizeWheelDelta(event, "x");
    let y = normalizeWheelDelta(event, "y");
    if (event.shiftKey && Math.abs(x) < Math.abs(y)) {
      x = y;
      y = 0;
    }
    return {
      x: clampWheelStep(x),
      y: clampWheelStep(y)
    };
  }


  function serializeInlineMarkdown(node) {
    if (!node) return "";
    return Array.from(node.childNodes).map((child) => {
      if (child.nodeType === Node.TEXT_NODE) return child.textContent || "";
      if (child.nodeType !== Node.ELEMENT_NODE) return "";
      if (child.classList && child.classList.contains("notes-heading-meta")) return "";
      const tag = child.tagName;
      const inner = serializeInlineMarkdown(child);
      if (tag === "BR") return "";
      if (tag === "STRONG" || tag === "B") return inner ? "**" + inner + "**" : "";
      if (tag === "EM" || tag === "I") return inner ? "*" + inner + "*" : "";
      if (tag === "S" || tag === "DEL") return inner ? "~~" + inner + "~~" : "";
      if (tag === "CODE") return inner ? "`" + inner.replace(/`/g, "") + "`" : "";
      if (tag === "MARK") return inner ? "==" + inner + "==" : "";
      if (tag === "A") {
        const href = child.getAttribute("href") || inner;
        return inner ? "[" + inner + "](" + href + ")" : href;
      }
      if (child.classList && child.classList.contains("notes-md-wikilink")) return inner ? "[[" + inner + "]]" : "";
      return inner;
    }).join("").replace(/\u00a0/g, " ").trim();
  }

  function normalizeViewMode(mode) {
    return ["tree", "radial", "book", "document", "notes"].includes(mode) ? mode : "radial";
  }

  function usesSpatialNavigation(mode) {
    return ["radial", "book"].includes(mode);
  }

  function clampWheelStep(value) {
    if (!Number.isFinite(value)) return 0;
    const maxStep = 240;
    return utils.clampNumber(value, -maxStep, maxStep, 0);
  }

  function maxDepth(node) {
    if (!node.children.length) return node.depth;
    return Math.max(node.depth, ...node.children.map(maxDepth));
  }

  function visibleSubtreeDepth(node) {
    if (!node.children.length) return 0;
    return Math.max(...node.children.map((child) => 1 + visibleSubtreeDepth(child)));
  }

  function mindPathItems(mind, sourceId) {
    const items = [];
    const seen = new Set();
    let currentId = sourceId;
    while (currentId && mind.nodes[currentId] && !seen.has(currentId)) {
      seen.add(currentId);
      items.unshift({ id: currentId, label: mind.nodes[currentId].label });
      if (currentId === mind.rootId) break;
      currentId = model.findMindParentId(mind, currentId);
    }
    return items.length ? items : [{ id: mind.rootId, label: "Chart Title" }];
  }

  function focusContext(tree, focusedId) {
    const siblingIds = new Set();
    const pathNodeIds = new Set();
    const pathChildIds = new Set();
    collectFocusPath(tree, focusedId, [], { siblingIds, pathNodeIds, pathChildIds });
    return { siblingIds, pathNodeIds, pathChildIds };
  }

  function collectFocusPath(node, focusedId, path, context) {
    const nextPath = path.concat(node);
    if (node.id === focusedId) {
      nextPath.forEach((item, index) => {
        context.pathNodeIds.add(item.id);
        if (index > 0) context.pathChildIds.add(item.id);
      });
      const parent = path[path.length - 1];
      if (parent) parent.children.forEach((child) => context.siblingIds.add(child.id));
      return true;
    }
    return node.children.some((child) => collectFocusPath(child, focusedId, nextPath, context));
  }

  function mindFilename(label) {
    const slug = utils.cleanId(label.toLowerCase().replace(/\s+/g, "-"), "mind");
    return slug + ".mind.json";
  }

  function exportJsonPayload(payload, filename) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function cloneSnapshot(snapshot) {
    return JSON.parse(JSON.stringify(snapshot));
  }

  function pushBoundedSnapshot(stack, currentBytes, raw) {
    stack.push(raw);
    let bytes = currentBytes + raw.length;
    while (stack.length > UNDO_MAX_ITEMS) {
      bytes -= stack.shift().length;
    }
    while (bytes > UNDO_MAX_BYTES && stack.length > 1) {
      bytes -= stack.shift().length;
    }
    return Math.max(0, bytes);
  }

  function recoveryStats(mind, maps, updatedAt) {
    const nodeCount = mind && mind.nodes ? Object.keys(mind.nodes).length : 0;
    const mapCount = Array.isArray(maps) ? maps.length : 0;
    const stamp = updatedAt ? shortDate(updatedAt) : "unknown time";
    return `${nodeCount} nodes · ${mapCount} maps · ${stamp}`;
  }

  function recoveryItemDetail(item) {
    const snapshot = item && item.snapshot || {};
    const author = item && item.authorProfile && item.authorProfile.displayName ? " · " + item.authorProfile.displayName : "";
    const schema = item && item.schemaVersion ? " · schema v" + item.schemaVersion : "";
    return recoveryStats(snapshot.mind, snapshot.maps, item && item.updatedAt) + author + schema;
  }

  function shortDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "unknown time";
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function githubSettingsFilename(sync) {
    const bits = [sync.owner, sync.repo].filter(Boolean).join("-");
    const slug = utils.cleanId((bits || "github-sync").toLowerCase().replace(/\s+/g, "-"), "github-sync");
    return slug + ".concen-github-sync.json";
  }

  function defaultGithubPath(mind) {
    const label = mind && mind.nodes && mind.nodes[mind.rootId] ? mind.nodes[mind.rootId].label : "concen";
    return "minds/" + mindFilename(label);
  }

  function defaultGithubSyncConfig(mind) {
    return { owner: "", repo: "", branch: "main", path: defaultGithubPath(mind), token: "", sha: "" };
  }

  function workspaceId() {
    return "workspace-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function loadAuthorProfile() {
    try {
      const raw = localStorage.getItem(AUTHOR_PROFILE_KEY);
      return storage.normalizeAuthorProfile(raw ? JSON.parse(raw) : null);
    } catch (error) {
      return storage.normalizeAuthorProfile(null);
    }
  }

  function authorProfileForWorkspace(candidate, fallback) {
    const normalized = storage.normalizeAuthorProfile(candidate);
    if (normalized.displayName) return normalized;
    return storage.normalizeAuthorProfile(fallback || normalized);
  }

  function saveAuthorProfile(profile) {
    try {
      localStorage.setItem(AUTHOR_PROFILE_KEY, JSON.stringify(storage.normalizeAuthorProfile(profile)));
    } catch (error) {
      return false;
    }
    return true;
  }

  function githubSyncSettingsPayload(sync) {
    const normalized = normalizeGithubSyncConfig(sync, null);
    return {
      type: "concen-github-sync",
      version: 1,
      exportedAt: new Date().toISOString(),
      owner: normalized.owner,
      repo: normalized.repo,
      branch: normalized.branch,
      path: normalized.path,
      sha: normalized.sha
    };
  }

  function githubSyncFromSettingsPayload(payload) {
    const source = payload && typeof payload === "object" && payload.type === "concen-github-sync" ? payload : {};
    return normalizeGithubSyncConfig({
      owner: source.owner,
      repo: source.repo,
      branch: source.branch,
      path: source.path,
      token: source.token,
      sha: source.sha
    }, null);
  }

  function loadGithubSyncConfig() {
    try {
      const raw = localStorage.getItem(GITHUB_SYNC_KEY);
      if (!raw) return defaultGithubSyncConfig(null);
      return normalizeGithubSyncConfig(JSON.parse(raw), null);
    } catch (error) {
      return defaultGithubSyncConfig(null);
    }
  }

  function saveGithubSyncConfig(sync) {
    try {
      localStorage.setItem(GITHUB_SYNC_KEY, JSON.stringify(normalizeGithubSyncConfig(sync, null)));
    } catch (error) {
      return false;
    }
    return true;
  }

  function githubSyncFromInputs(el, previous, mind) {
    return normalizeGithubSyncConfig({
      owner: el.githubOwnerInput ? el.githubOwnerInput.value : previous && previous.owner,
      repo: el.githubRepoInput ? el.githubRepoInput.value : previous && previous.repo,
      branch: el.githubBranchInput ? el.githubBranchInput.value : previous && previous.branch,
      path: el.githubPathInput ? el.githubPathInput.value : previous && previous.path,
      token: el.githubTokenInput ? el.githubTokenInput.value : previous && previous.token,
      sha: previous && previous.sha
    }, mind);
  }

  function normalizeGithubSyncConfig(input, mind) {
    const fallback = defaultGithubSyncConfig(mind);
    const sync = input && typeof input === "object" ? input : {};
    return {
      owner: cleanGithubPart(sync.owner),
      repo: cleanGithubPart(sync.repo),
      branch: cleanGithubBranch(sync.branch || fallback.branch),
      path: cleanGithubPath(sync.path || fallback.path),
      token: String(sync.token || "").trim(),
      sha: /^[0-9a-f]{40}$/i.test(String(sync.sha || "")) ? String(sync.sha) : ""
    };
  }

  function cleanGithubPart(value) {
    return String(value || "").trim().replace(/^\/+|\/+$/g, "");
  }

  function cleanGithubBranch(value) {
    return String(value || "main").trim().replace(/^\/+|\/+$/g, "") || "main";
  }

  function cleanGithubPath(value) {
    return String(value || "").trim().replace(/^\/+/, "").replace(/\/+/g, "/");
  }

  function githubContentUrl(sync) {
    const path = sync.path.split("/").map(encodeURIComponent).join("/");
    const owner = encodeURIComponent(sync.owner);
    const repo = encodeURIComponent(sync.repo);
    const branch = encodeURIComponent(sync.branch || "main");
    return `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  }

  function githubWriteUrl(sync) {
    const path = sync.path.split("/").map(encodeURIComponent).join("/");
    const owner = encodeURIComponent(sync.owner);
    const repo = encodeURIComponent(sync.repo);
    return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  }

  function githubHeaders(sync) {
    return {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + sync.token,
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function githubGetContent(sync) {
    return fetch(githubContentUrl(sync), { headers: githubHeaders(sync) }).then((response) => {
      if (response.status === 404) return null;
      if (!response.ok) return githubResponseError(response, "GET");
      return response.json();
    });
  }

  function githubPutContent(sync, content, sha, message) {
    const body = {
      message,
      content: encodeBase64Unicode(content),
      branch: sync.branch || "main"
    };
    if (sha) body.sha = sha;
    return fetch(githubWriteUrl(sync), {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, githubHeaders(sync)),
      body: JSON.stringify(body)
    }).then((response) => {
      if (!response.ok) return githubResponseError(response, "PUT");
      return response.json();
    });
  }

  function githubResponseError(response, method) {
    return response.json().catch(() => ({})).then((body) => {
      const detail = body && body.message ? ": " + body.message : "";
      throw new Error(`GitHub ${method} ${response.status}${detail}`);
    });
  }

  function encodeBase64Unicode(value) {
    const bytes = new TextEncoder().encode(String(value || ""));
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function decodeBase64Unicode(value) {
    const binary = atob(String(value || "").replace(/\s/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new TextDecoder().decode(bytes);
  }

  function githubErrorMessage(error, fallback) {
    const message = error && error.message || "";
    if (/401|403/.test(message)) return "GitHub auth failed";
    if (/PUT 404/.test(message)) return "GitHub push 404: check repo access, token Contents write, and branch";
    if (/GET 404/.test(message)) return "GitHub pull 404: file/repo/branch not found";
    if (/409/.test(message)) return "GitHub conflict";
    if (/422/.test(message)) return "GitHub rejected path or branch";
    return fallback;
  }

  function themeFilename(label) {
    const slug = utils.cleanId(label.toLowerCase().replace(/\s+/g, "-"), "theme");
    return slug + ".concen-theme.json";
  }

  function inferColorScheme(hex) {
    const clean = String(hex || "#ffffff").replace("#", "");
    const red = parseInt(clean.slice(0, 2), 16);
    const green = parseInt(clean.slice(2, 4), 16);
    const blue = parseInt(clean.slice(4, 6), 16);
    return (red * 299 + green * 587 + blue * 114) / 1000 > 140 ? "light" : "dark";
  }

  function completeThemeTokens(input) {
    const tokens = Object.assign({}, input);
    const surface = tokens["surface-solid"] || tokens["canvas-bg"] || tokens.bg;
    const canvas = tokens["canvas-bg"] || tokens.bg;
    const focus = tokens.focus || tokens["root-node-fill"] || "#0a84ff";
    tokens.label = tokens.label || tokens.muted || tokens.ink;
    tokens.surface = tokens.surface || `color-mix(in srgb, ${surface} 72%, transparent)`;
    tokens["surface-raised"] = tokens["surface-raised"] || `color-mix(in srgb, ${surface} 88%, transparent)`;
    tokens["surface-recessed"] = tokens["surface-recessed"] || `color-mix(in srgb, ${canvas} 88%, transparent)`;
    tokens["glass-border"] = tokens["glass-border"] || `color-mix(in srgb, ${tokens.muted || tokens.ink} 26%, transparent)`;
    tokens.hairline = tokens.hairline || `color-mix(in srgb, ${tokens.muted || tokens.ink} 16%, transparent)`;
    tokens.field = tokens.field || `color-mix(in srgb, ${surface} 86%, transparent)`;
    tokens["field-hover"] = tokens["field-hover"] || surface;
    tokens.control = tokens.control || `linear-gradient(180deg, ${surface}, ${canvas})`;
    tokens["control-hover"] = tokens["control-hover"] || `linear-gradient(180deg, ${surface}, color-mix(in srgb, ${canvas} 86%, ${focus}))`;
    tokens["control-pressed"] = tokens["control-pressed"] || `linear-gradient(180deg, ${canvas}, ${surface})`;
    tokens["control-ink"] = tokens["control-ink"] || tokens.ink;
    tokens.focus = focus;
    tokens["focus-soft"] = tokens["focus-soft"] || `color-mix(in srgb, ${focus} 22%, transparent)`;
    tokens["path-glow"] = tokens["path-glow"] || `color-mix(in srgb, ${focus} 28%, transparent)`;
    tokens["path-fill"] = tokens["path-fill"] || `color-mix(in srgb, ${focus} 6%, transparent)`;
    tokens["sibling-glow"] = tokens["sibling-glow"] || `color-mix(in srgb, ${tokens.muted || focus} 22%, transparent)`;
    tokens["sibling-fill"] = tokens["sibling-fill"] || `color-mix(in srgb, ${tokens.muted || focus} 6%, transparent)`;
    tokens["canvas-wash"] = tokens["canvas-wash"] || `color-mix(in srgb, ${surface} 58%, transparent)`;
    tokens["canvas-grid"] = tokens["canvas-grid"] || tokens["ring-guide"];
    tokens["node-ink"] = tokens["node-ink"] || tokens.ink;
    tokens["root-node-ink"] = tokens["root-node-ink"] || tokens.ink;
    return tokens;
  }

  function buildMindIndex(mind) {
    const nodes = Object.values(mind.nodes).map((node) => ({
      node,
      labelKey: String(node.label || "").trim().toLowerCase()
    }));
    const labelMap = new Map();
    nodes.forEach((item) => {
      if (item.labelKey && !labelMap.has(item.labelKey)) labelMap.set(item.labelKey, item.node);
    });
    const index = {
      nodes,
      labelMap,
      backlinks: new Map(),
      searchItems: nodes.map((item) => ({
        node: item.node,
        detail: nodeSearchDetail(mind, item.node),
        text: `${item.node.label} ${item.node.note || ""} ${item.node.status || ""} ${item.node.priority || ""} ${(item.node.tags || []).join(" ")}`.toLowerCase()
      }))
    };
    nodes.forEach((item) => {
      noteLinkedNodeIds(item.node.note, mind, index).forEach((targetId) => {
        if (targetId === item.node.id) return;
        const list = index.backlinks.get(targetId) || [];
        list.push({ sourceId: item.node.id, label: item.node.label });
        index.backlinks.set(targetId, list);
      });
    });
    return index;
  }

  function noteLinkItems(note, mind, mindIndex) {
    const items = [];
    const seen = new Set();
    const text = String(note || "");
    const wikiPattern = /\[\[([^\]]{1,240})\]\]/g;
    for (const match of text.matchAll(wikiPattern)) {
      const link = parseWikiLink(match[1]);
      if (!link.target) continue;
      if (isHttpUrl(link.target)) {
        const href = cleanUrl(link.target);
        if (seen.has("url:" + href)) continue;
        seen.add("url:" + href);
        items.push({ kind: "url", href, label: link.title || href });
        continue;
      }
      const node = linkedNode(link.target, mind, mindIndex);
      if (!node || seen.has("node:" + node.id)) continue;
      seen.add("node:" + node.id);
      items.push({ kind: "node", sourceId: node.id, label: "Node: " + (link.title || node.label) });
    }
    const urlPattern = /\bhttps?:\/\/[^\s<>"'\]\|]+/gi;
    for (const match of text.matchAll(urlPattern)) {
      const href = cleanUrl(match[0]);
      if (seen.has("url:" + href)) continue;
      seen.add("url:" + href);
      items.push({ kind: "url", href, label: href });
    }
    return items.slice(0, 8);
  }

  function backlinkItems(mindIndex, targetNode) {
    if (!targetNode || !targetNode.id) return [];
    return (mindIndex.backlinks.get(targetNode.id) || []).slice();
  }

  function noteLinkedNodeIds(note, mind, mindIndex) {
    const ids = new Set();
    const text = String(note || "");
    const wikiPattern = /\[\[([^\]]{1,240})\]\]/g;
    for (const match of text.matchAll(wikiPattern)) {
      const link = parseWikiLink(match[1]);
      if (isHttpUrl(link.target)) continue;
      const node = linkedNode(link.target, mind, mindIndex);
      if (node) ids.add(node.id);
    }
    return ids;
  }

  function parseWikiLink(value) {
    const text = String(value || "").trim();
    const divider = text.indexOf("|");
    if (divider < 0) return { target: text, title: "" };
    return {
      target: text.slice(0, divider).trim(),
      title: text.slice(divider + 1).trim()
    };
  }

  function linkedNode(target, mind, mindIndex) {
    const raw = String(target || "").trim();
    if (!raw) return null;
    const id = raw.startsWith("node:") ? raw.slice(5).trim() : "";
    if (id && mind.nodes[id]) return mind.nodes[id];
    const label = raw.toLowerCase();
    if (mindIndex && mindIndex.labelMap) return mindIndex.labelMap.get(label) || null;
    return Object.values(mind.nodes).find((item) => item.label.trim().toLowerCase() === label) || null;
  }

  function isHttpUrl(value) {
    return /^https?:\/\/\S+$/i.test(String(value || "").trim());
  }

  function cleanUrl(value) {
    return String(value || "").trim().replace(/[),.;]+$/, "");
  }

  function nodeSearchDetail(mind, node) {
    const parts = [mindPathItems(mind, node.id).map((item) => item.label).join(" / ")];
    if (node.status) parts.push(titleCase(node.status));
    if (node.priority) parts.push(titleCase(node.priority));
    if (node.note) parts.push("note");
    return parts.filter(Boolean).join(" · ");
  }

  function welcomeTemplateTree(template) {
    if (template === "tutorial" && RingMapChart.tutorialTemplateTree) return RingMapChart.tutorialTemplateTree();
    const child = (label, children, note, status, priority) => ({
      label,
      note: note || "",
      status: status || "open",
      priority: priority || "normal",
      markerEnabled: false,
      tags: [],
      children: children || []
    });
    const templates = {
      blank: child("Chart Title", []),
      tutorial: child("Tutorial Mind", [], "Tutorial source did not load. Refresh the page and try again.", "waiting", "high"),
      project: child("Project Plan", [
        child("Goals", [child("Outcome"), child("Constraints")]),
        child("Workstreams", [child("Design"), child("Build"), child("Launch")]),
        child("Risks", [child("Open Questions", [], "", "waiting", "high")]),
        child("Next Actions", [child("Owner"), child("Due Date")], "", "active", "high")
      ], "Use notes for decisions and [[Risks]] for linked references.", "active"),
      decision: child("Decision Map", [
        child("Decision", [child("Recommendation"), child("Deadline")], "", "active", "high"),
        child("Options", [child("Option A"), child("Option B"), child("Option C")]),
        child("Evidence", [child("Pros"), child("Cons"), child("Unknowns", [], "", "waiting", "high")]),
        child("Stakeholders", [child("Approver"), child("Impacted Teams")])
      ], "Compare options, then link evidence with [[Evidence]]."),
      research: child("Research Notes", [
        child("Questions", [child("Primary Question"), child("Follow-ups")], "", "active"),
        child("Sources", [child("Articles"), child("Interviews"), child("Data")]),
        child("Findings", [child("Patterns"), child("Contradictions"), child("Quotes")]),
        child("Synthesis", [child("Summary"), child("Next Research")])
      ], "Use [[Findings]] links as notes mature."),
      issues: child("Issue Tracker", [
        child("Open", [child("Bug"), child("Request")], "", "open", "high"),
        child("Active", [child("In Progress"), child("Blocked", [], "", "waiting", "critical")], "", "active"),
        child("Waiting", [child("Needs Reply"), child("External")], "", "waiting"),
        child("Done", [child("Shipped"), child("Archived")], "", "done")
      ], "Turn markers on for the tickets that need status/priority at a glance.")
    };
    return templates[template] || null;
  }

  function titleCase(value) {
    const text = String(value || "");
    return text ? text[0].toUpperCase() + text.slice(1) : "";
  }

  function activeNodeLinkRange(input) {
    const cursor = input.selectionStart;
    if (cursor === null || cursor !== input.selectionEnd) return null;
    const before = input.value.slice(0, cursor);
    const start = before.lastIndexOf("[[");
    if (start < 0) return null;
    const close = before.lastIndexOf("]]");
    if (close > start) return null;
    const query = before.slice(start + 2);
    if (/[\n\r\]]/.test(query) || query.length > 80) return null;
    return { start, end: cursor, query };
  }

  function styleTokens(style, dark) {
    if (style === "papery") return dark ? darkPaperyTokens() : lightPaperyTokens();
    if (style === "dust") return dustTokens(dark);
    if (style === "blueprint") return blueprintTokens();
    if (style === "terminal") return terminalTokens();
    if (style === "schematic") return schematicTokens(dark);
    return null;
  }

  function populateSelectOptions(select, presets, groups) {
    if (!select || !presets) return;
    if (groups) {
      Object.values(groups).forEach((group) => {
        const optgroup = document.createElement("optgroup");
        optgroup.label = group.label;
        group.variants.forEach((key) => {
          const preset = presets[key];
          if (!preset) return;
          const option = document.createElement("option");
          option.value = key;
          option.textContent = preset.label;
          optgroup.append(option);
        });
        if (optgroup.children.length) select.append(optgroup);
      });
      return;
    }
    Object.entries(presets).forEach(([key, preset]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = preset.label;
      select.append(option);
    });
  }

  function isCanvasPointerTarget(target, svg) {
    if (!target || !svg) return false;
    return target === svg || target.ownerSVGElement === svg;
  }

  function schematicTokens(dark) {
    return dark ? {
      bg: "#0b1111",
      surface: "rgba(17, 27, 27, 0.8)",
      "surface-solid": "#142020",
      "surface-raised": "rgba(25, 39, 39, 0.92)",
      "surface-recessed": "rgba(8, 15, 15, 0.9)",
      "glass-border": "rgba(125, 211, 252, 0.18)",
      hairline: "rgba(125, 211, 252, 0.12)",
      field: "rgba(10, 18, 18, 0.94)",
      "field-hover": "rgba(18, 31, 31, 0.98)",
      control: "linear-gradient(180deg, rgba(31, 52, 52, 0.9), rgba(16, 29, 29, 0.94))",
      "control-hover": "linear-gradient(180deg, rgba(41, 69, 69, 0.94), rgba(22, 39, 39, 0.98))",
      "control-pressed": "linear-gradient(180deg, rgba(7, 14, 14, 0.98), rgba(33, 57, 57, 0.9))",
      "control-ink": "#e8fffb",
      focus: "#7dd3fc",
      "focus-soft": "rgba(125, 211, 252, 0.22)",
      "path-glow": "rgba(125, 211, 252, 0.28)",
      "path-fill": "rgba(125, 211, 252, 0.06)",
      "sibling-glow": "rgba(244, 184, 92, 0.22)",
      "sibling-fill": "rgba(244, 184, 92, 0.055)",
      ink: "#e8fffb",
      muted: "#a8c9c7",
      label: "#90b4b2",
      "canvas-bg": "#0c1515",
      "canvas-grid": "rgba(125, 211, 252, 0.08)",
      "canvas-wash": "rgba(56, 189, 248, 0.1)",
      "ring-guide": "rgba(125, 211, 252, 0.3)",
      "node-fill": "rgba(17, 29, 30, 0.96)",
      "node-ink": "#e8fffb",
      "root-node-fill": "#7dd3fc",
      "root-node-ink": "#061112",
      "node-shadow": "drop-shadow(0 5px 8px rgba(0, 0, 0, 0.22))"
    } : {
      bg: "#f0f2f3",
      surface: "rgba(255, 255, 255, 0.78)",
      "surface-solid": "#ffffff",
      "surface-raised": "rgba(255, 255, 255, 0.94)",
      "surface-recessed": "rgba(231, 235, 238, 0.82)",
      "glass-border": "rgba(78, 91, 105, 0.2)",
      hairline: "rgba(78, 91, 105, 0.15)",
      field: "rgba(255, 255, 255, 0.94)",
      "field-hover": "#ffffff",
      control: "linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(232, 237, 241, 0.9))",
      "control-hover": "linear-gradient(180deg, #ffffff, rgba(224, 231, 236, 0.94))",
      "control-pressed": "linear-gradient(180deg, rgba(217, 225, 231, 0.92), rgba(246, 248, 250, 0.98))",
      "control-ink": "#1f2933",
      focus: "#0f6f9e",
      "focus-soft": "rgba(15, 111, 158, 0.18)",
      "path-glow": "rgba(15, 111, 158, 0.24)",
      "path-fill": "rgba(15, 111, 158, 0.05)",
      "sibling-glow": "rgba(107, 114, 128, 0.16)",
      "sibling-fill": "rgba(107, 114, 128, 0.045)",
      ink: "#1f2933",
      muted: "#66727f",
      label: "#758392",
      "canvas-bg": "#f8fafc",
      "canvas-grid": "rgba(78, 91, 105, 0.085)",
      "canvas-wash": "rgba(255, 255, 255, 0.62)",
      "ring-guide": "rgba(78, 91, 105, 0.3)",
      "node-fill": "rgba(255, 255, 255, 0.95)",
      "node-ink": "#1f2933",
      "root-node-fill": "#1f2933",
      "root-node-ink": "#ffffff",
      "node-shadow": "drop-shadow(0 5px 8px rgba(31, 41, 51, 0.12))"
    };
  }

  function blueprintTokens() {
    return {
      focus: "#38bdf8",
      "focus-soft": "rgba(56, 189, 248, 0.22)",
      "canvas-bg": "#0b2431",
      "canvas-grid": "rgba(125, 211, 252, 0.16)",
      "canvas-wash": "rgba(14, 116, 144, 0.18)",
      "ring-guide": "rgba(125, 211, 252, 0.46)",
      "node-fill": "rgba(8, 47, 73, 0.88)",
      "node-ink": "#e0f2fe",
      "root-node-fill": "#e0f2fe",
      "root-node-ink": "#082f49",
      "node-shadow": "drop-shadow(0 0 10px rgba(56, 189, 248, 0.16))"
    };
  }

  function terminalTokens() {
    return {
      focus: "#22c55e",
      "focus-soft": "rgba(34, 197, 94, 0.22)",
      "canvas-bg": "#030712",
      "canvas-grid": "rgba(34, 197, 94, 0.12)",
      "canvas-wash": "rgba(15, 23, 42, 0.34)",
      "ring-guide": "rgba(34, 197, 94, 0.34)",
      "node-fill": "rgba(2, 6, 23, 0.9)",
      "node-ink": "#bbf7d0",
      "root-node-fill": "#22c55e",
      "root-node-ink": "#03120a",
      "node-shadow": "drop-shadow(0 0 7px rgba(34, 197, 94, 0.24))"
    };
  }

  function lightPaperyTokens() {
    return {
      bg: "#efe6cf",
      surface: "rgba(255, 251, 240, 0.74)",
      "surface-solid": "#fff7e6",
      "surface-raised": "rgba(255, 253, 246, 0.9)",
      "surface-recessed": "rgba(246, 239, 220, 0.72)",
      ink: "#292218",
      muted: "#6f624e",
      label: "#76664d",
      field: "rgba(255, 253, 246, 0.92)",
      "field-hover": "#fffdf6",
      control: "linear-gradient(180deg, rgba(255, 252, 242, 0.96), rgba(238, 226, 201, 0.88))",
      "control-hover": "linear-gradient(180deg, #fffdf6, rgba(233, 219, 190, 0.92))",
      "control-pressed": "linear-gradient(180deg, rgba(226, 210, 178, 0.9), rgba(250, 244, 230, 0.96))",
      "control-ink": "#292218",
      "canvas-bg": "#f7f0dc",
      "canvas-grid": "rgba(117, 94, 54, 0.055)",
      "canvas-wash": "rgba(255, 252, 242, 0.62)",
      "ring-guide": "rgba(117, 94, 54, 0.26)",
      "node-fill": "rgba(255, 252, 242, 0.94)",
      "node-ink": "#292218",
      "shadow-sm": "0 1px 1px rgba(80, 62, 35, 0.08), 0 1px 0 rgba(255, 255, 255, 0.58) inset",
      "shadow-md": "0 8px 18px rgba(80, 62, 35, 0.12)",
      "shadow-lg": "0 18px 42px rgba(80, 62, 35, 0.16)",
      "node-shadow": "drop-shadow(0 5px 8px rgba(80, 62, 35, 0.13))"
    };
  }

  function darkPaperyTokens() {
    return {
      bg: "#15120d",
      surface: "rgba(36, 30, 22, 0.78)",
      "surface-solid": "#231d15",
      "surface-raised": "rgba(47, 39, 28, 0.92)",
      "surface-recessed": "rgba(30, 25, 18, 0.82)",
      "glass-border": "rgba(238, 220, 184, 0.18)",
      hairline: "rgba(238, 220, 184, 0.12)",
      field: "rgba(38, 31, 22, 0.94)",
      "field-hover": "rgba(51, 42, 30, 0.96)",
      control: "linear-gradient(180deg, rgba(66, 55, 40, 0.9), rgba(42, 34, 24, 0.92))",
      "control-hover": "linear-gradient(180deg, rgba(78, 65, 47, 0.94), rgba(50, 41, 30, 0.96))",
      "control-pressed": "linear-gradient(180deg, rgba(35, 28, 20, 0.96), rgba(63, 52, 37, 0.9))",
      "control-ink": "#f5ead2",
      ink: "#f5ead2",
      muted: "#c9b895",
      label: "#b8a681",
      "canvas-bg": "#211b13",
      "canvas-grid": "rgba(238, 220, 184, 0.052)",
      "canvas-wash": "rgba(80, 65, 43, 0.34)",
      "ring-guide": "rgba(238, 220, 184, 0.2)",
      "node-fill": "rgba(50, 41, 29, 0.94)",
      "node-ink": "#f7ecd4",
      "root-node-fill": "#f3dfb4",
      "root-node-ink": "#1d160d",
      "shadow-sm": "0 1px 1px rgba(0, 0, 0, 0.28), 0 1px 0 rgba(255, 247, 222, 0.06) inset",
      "shadow-md": "0 10px 24px rgba(0, 0, 0, 0.3)",
      "shadow-lg": "0 22px 54px rgba(0, 0, 0, 0.42)",
      "node-shadow": "drop-shadow(0 7px 12px rgba(0, 0, 0, 0.32))"
    };
  }

  function dustTokens(dark) {
    return dark ? {
      "shadow-sm": "0 1px 1px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(245, 222, 179, 0.035) inset",
      "shadow-md": "0 10px 22px rgba(0, 0, 0, 0.34)",
      "shadow-lg": "0 22px 52px rgba(0, 0, 0, 0.44)",
      "node-shadow": "drop-shadow(0 8px 12px rgba(0, 0, 0, 0.34))"
    } : {
      "shadow-sm": "0 1px 1px rgba(103, 82, 48, 0.1), 0 1px 0 rgba(255, 255, 255, 0.5) inset",
      "shadow-md": "0 9px 20px rgba(103, 82, 48, 0.13)",
      "shadow-lg": "0 20px 46px rgba(103, 82, 48, 0.18)",
      "node-shadow": "drop-shadow(0 6px 9px rgba(103, 82, 48, 0.15))"
    };
  }

  function loadRecentMinds() {
    try {
      const raw = localStorage.getItem(config.recentMindsKey);
      if (!raw || raw.length > config.limits.maxStoredBytes) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => item && item.snapshot && item.id)
        .map((item) => ({
          id: utils.cleanId(item.id, "recent"),
          label: utils.cleanLabel(item.label) || "Untitled Mind",
          updatedAt: item.updatedAt || "",
          snapshot: item.snapshot
        }))
        .slice(0, RECENT_MAX_ITEMS);
    } catch (error) {
      return [];
    }
  }

  function saveRecentMinds(items) {
    try {
      const trimmed = items.slice(0, RECENT_MAX_ITEMS);
      let raw = JSON.stringify(trimmed);
      while (raw.length > config.limits.maxStoredBytes && trimmed.length > 1) {
        trimmed.pop();
        raw = JSON.stringify(trimmed);
      }
      if (raw.length > config.limits.maxStoredBytes) return false;
      localStorage.setItem(config.recentMindsKey, raw);
    } catch (error) {
      return false;
    }
    return true;
  }

  RingMapChart.Controller = Controller;
})(window);
