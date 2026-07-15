(function (global) {
  "use strict";

  const RingMapChart = global.RingMapChart;
  const { config, model, utils } = RingMapChart;

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(config.storageKey) || localStorage.getItem("ring-map-chart-v2");
    } catch (error) {
      return null;
    }
    if (!raw || raw.length > config.limits.maxStoredBytes) return null;
    try {
      const saved = JSON.parse(raw);
      if (Array.isArray(saved.maps)) return normalizeWorkspace(saved);
      const map = normalizeMap(saved, "map-1");
      return map ? {
	        type: "concen-mind",
	        version: 2,
	        schemaVersion: 2,
	        workspaceId: normalizeWorkspaceId(saved.workspaceId),
	        updatedAt: normalizeTimestamp(saved.updatedAt || saved.exportedAt),
	        authorProfile: normalizeAuthorProfile(saved.authorProfile),
	        sync: normalizeWorkspaceSync(saved.sync),
	        mind: model.createMindFromTree(map.tree),
	        maps: [mapFromTreeMap(map, model.ROOT_ID)],
	        activeMapId: map.id,
	        appearance: normalizeAppearance(saved.appearance, config.appearanceDefaults),
	        theme: normalizeTheme(saved.theme),
        customTheme: normalizeCustomTheme(saved.customTheme),
        branchColors: normalizeBranchColors(saved.branchColors)
      } : null;
    } catch (error) {
      remove();
      return null;
    }
  }

  function save(snapshot) {
    try {
      const raw = JSON.stringify(snapshot);
      if (raw.length > config.limits.maxStoredBytes) return false;
      localStorage.setItem(config.storageKey, raw);
    } catch (error) {
      return false;
    }
    return true;
  }

  function remove() {
    try {
      localStorage.removeItem(config.storageKey);
      localStorage.removeItem("ring-map-chart-v2");
    } catch (error) {
      return false;
    }
    return true;
  }

  function normalizeSpacing(input, fallback) {
    const spacing = Object.assign({}, fallback);
    Object.keys(config.spacingLimits).forEach((key) => {
      if (!input || input[key] === undefined) return;
      const limits = config.spacingLimits[key];
      spacing[key] = utils.clampNumber(input[key], limits.min, limits.max, fallback[key]);
    });
    return spacing;
  }

  function normalizeAppearance(input, fallback) {
    const appearance = Object.assign({}, fallback);
    Object.keys(config.appearanceLimits).forEach((key) => {
      if (!input || input[key] === undefined) return;
      const limits = config.appearanceLimits[key];
      appearance[key] = utils.clampNumber(input[key], limits.min, limits.max, fallback[key]);
    });
    appearance.stylePreset = normalizeStylePreset(input && input.stylePreset);
    appearance.backgroundEffect = normalizeBackgroundEffect(input && input.backgroundEffect);
    appearance.backgroundImageData = normalizeBackgroundImageData(input && input.backgroundImageData);
    appearance.navigationMode = normalizeNavigationMode(input && input.navigationMode);
    appearance.screensaverEnabled = input && typeof input.screensaverEnabled === "boolean" ? input.screensaverEnabled : fallback.screensaverEnabled === true;
    appearance.showStatusMarkers = input && typeof input.showStatusMarkers === "boolean" ? input.showStatusMarkers : fallback.showStatusMarkers !== false;
    appearance.showPriorityMarkers = input && typeof input.showPriorityMarkers === "boolean" ? input.showPriorityMarkers : fallback.showPriorityMarkers !== false;
    return appearance;
  }

  function normalizeWorkspace(saved) {
    let mind = normalizeMind(saved.mind);
    if (!mind) {
      const first = saved.maps.map((mapInput, index) => normalizeMap(mapInput, "map-" + (index + 1))).find(Boolean);
      if (!first) return null;
      mind = model.createMindFromTree(first.tree);
    }
    const maps = saved.maps
      .map((mapInput, index) => normalizeViewMap(mapInput, "map-" + (index + 1), mind))
      .filter(Boolean);
    if (!maps.length) return null;
    const activeMapId = maps.some((map) => map.id === saved.activeMapId) ? saved.activeMapId : maps[0].id;
    return {
      type: "concen-mind",
      version: 2,
      schemaVersion: 2,
      workspaceId: normalizeWorkspaceId(saved.workspaceId),
      updatedAt: normalizeTimestamp(saved.updatedAt || saved.exportedAt),
      authorProfile: normalizeAuthorProfile(saved.authorProfile),
      sync: normalizeWorkspaceSync(saved.sync),
      mind,
      maps,
      activeMapId,
      appearance: normalizeAppearance(saved.appearance, config.appearanceDefaults),
      theme: normalizeTheme(saved.theme),
      customTheme: normalizeCustomTheme(saved.customTheme),
      branchColors: normalizeBranchColors(saved.branchColors)
    };
  }

  function normalizeMap(saved, fallbackId) {
    const tree = model.sanitizeTree(saved.tree);
    if (!tree || tree.id !== model.ROOT_ID) return null;
    const id = utils.cleanId(saved.id, fallbackId);
    return {
      id,
      title: utils.cleanLabel(saved.title || tree.label) || "Chart Title",
      tree,
      focusedId: typeof saved.focusedId === "string" && model.findNode(tree, saved.focusedId) ? saved.focusedId : model.ROOT_ID,
      idCounter: Math.max(Number(saved.idCounter) || 1, model.nextId(tree)),
      viewMode: normalizeViewMode(saved.viewMode, Number(saved.ring) >= 50 ? "radial" : "tree"),
      spacing: saved.spacing || null
    };
  }

  function normalizeWorkspaceId(value) {
    const clean = utils.cleanId(value, "");
    return clean || "workspace-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function normalizeTimestamp(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }

  function normalizeAuthorProfile(input) {
    const source = input && typeof input === "object" ? input : {};
    const displayName = utils.cleanLabel(source.displayName) || "";
    return {
      id: utils.cleanId(source.id, "") || "author-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
      displayName
    };
  }

  function normalizeWorkspaceSync(input) {
    const sync = input && typeof input === "object" ? input : {};
    return {
      provider: sync.provider === "github" ? "github" : "",
      lastRemoteSha: /^[0-9a-f]{40}$/i.test(String(sync.lastRemoteSha || "")) ? String(sync.lastRemoteSha) : "",
      lastPulledAt: sync.lastPulledAt ? normalizeTimestamp(sync.lastPulledAt) : "",
      lastPushedAt: sync.lastPushedAt ? normalizeTimestamp(sync.lastPushedAt) : ""
    };
  }

  function normalizeViewMap(saved, fallbackId, mind) {
    if (saved.rootNodeId && mind.nodes[saved.rootNodeId]) {
      return {
        id: utils.cleanId(saved.id, fallbackId),
        title: utils.cleanLabel(saved.title || mind.nodes[saved.rootNodeId].label) || "Chart Title",
        rootNodeId: saved.rootNodeId,
        focusedId: typeof saved.focusedId === "string" ? saved.focusedId : model.ROOT_ID,
        viewMode: normalizeViewMode(saved.viewMode, "radial"),
	        spacing: saved.spacing || null
      };
    }
    const treeMap = normalizeMap(saved, fallbackId);
    return treeMap ? mapFromTreeMap(treeMap, mind.rootId) : null;
  }

  function mapFromTreeMap(treeMap, rootNodeId) {
    return {
      id: treeMap.id,
      title: treeMap.title,
      rootNodeId,
      focusedId: treeMap.focusedId,
      viewMode: treeMap.viewMode,
      spacing: treeMap.spacing
    };
  }

  function normalizeMind(input) {
    if (!input || typeof input !== "object" || !input.nodes || typeof input.nodes !== "object") return null;
    const inputRootId = utils.cleanId(input.rootId, model.ROOT_ID);
    const rootId = Object.hasOwn(input.nodes, inputRootId) ? inputRootId : model.ROOT_ID;
    const mind = {
      rootId,
      idCounter: Math.max(Number(input.idCounter) || 1, 1),
      nodes: Object.create(null)
    };
    const keys = Object.keys(input.nodes).slice(0, maxMindNodes());
    keys.forEach((key) => {
      const inputNode = input.nodes[key];
      if (!inputNode || typeof inputNode !== "object") return;
      const id = utils.cleanId(inputNode.id, "");
      if (!id) return;
      mind.nodes[id] = {
        id,
        label: utils.cleanLabel(inputNode.label) || "Untitled",
        note: utils.cleanNote(inputNode.note),
        status: utils.cleanChoice(inputNode.status, ["open", "active", "waiting", "done"], "open"),
        priority: utils.cleanChoice(inputNode.priority, ["low", "normal", "high", "critical"], "normal"),
        markerEnabled: inputNode.markerEnabled === true,
        tags: utils.cleanTags(inputNode.tags),
        children: Array.isArray(inputNode.children) ? inputNode.children.slice(0, config.limits.maxChildren).map((childId) => utils.cleanId(childId, "")).filter(Boolean) : []
      };
    });
    if (!Object.hasOwn(mind.nodes, rootId)) return null;
    Object.values(mind.nodes).forEach((node) => {
      node.children = node.children.filter((childId) => Object.hasOwn(mind.nodes, childId));
    });
    return mind;
  }

  function maxMindNodes() {
    const childLimit = config.limits.maxChildren;
    const depthLimit = config.limits.maxDepth;
    let total = 0;
    let level = 1;
    for (let depth = 0; depth <= depthLimit; depth += 1) {
      total += level;
      level *= childLimit;
    }
    return total;
  }

  function normalizeTheme(value) {
    const theme = String(value || "light");
    if (config.themeAliases && config.themeAliases[theme]) return config.themeAliases[theme];
    return config.themePresets[theme] ? theme : "light";
  }

  function normalizeStylePreset(value) {
    const style = String(value || config.appearanceDefaults.stylePreset || "glass");
    if (config.styleAliases && config.styleAliases[style]) return config.styleAliases[style];
    return config.stylePresets[style] ? style : "glass";
  }

  function normalizeBackgroundEffect(value) {
    const effect = String(value || config.appearanceDefaults.backgroundEffect || "none");
    if (config.backgroundEffectAliases && config.backgroundEffectAliases[effect]) return config.backgroundEffectAliases[effect];
    return config.backgroundEffects && config.backgroundEffects[effect] ? effect : "none";
  }

  function normalizeBackgroundImageData(value) {
    const data = String(value || "");
    if (!data) return "";
    if (data.length > config.backgroundImageMaxDataUrlLength) return "";
    return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(data) ? data : "";
  }

  function normalizeNavigationMode(value) {
    const fallback = config.appearanceDefaults.navigationMode || "outline";
    const mode = String(value || fallback);
    return config.navigationModes[mode] ? mode : fallback;
  }

  function normalizeViewMode(value, fallback) {
    const mode = String(value || fallback || "radial");
    return ["tree", "radial", "book", "document", "notes"].includes(mode) ? mode : "radial";
  }

  function normalizeBranchColors(input) {
    const source = Array.isArray(input) ? input : config.colors;
    const colors = source
      .map((color) => String(color || "").trim())
      .filter((color) => /^#[0-9A-Fa-f]{6}$/.test(color))
      .slice(0, config.colors.length);
    return colors.length === config.colors.length ? colors : config.colors.slice();
  }

  function normalizeCustomTheme(input) {
    const fallback = config.themePresets.custom.tokens;
    const tokens = Object.assign({}, fallback);
    if (!input || typeof input !== "object") return tokens;
    config.themeTokenControls.forEach((control) => {
      const value = String(input[control.key] || "").trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(value)) tokens[control.key] = value;
    });
    tokens.label = tokens.muted;
    tokens["node-ink"] = readableInk(tokens["node-fill"]);
    tokens["root-node-ink"] = readableInk(tokens["root-node-fill"]);
    tokens["canvas-grid"] = tokens["ring-guide"];
    return tokens;
  }

  function readableInk(hex) {
    const clean = hex.replace("#", "");
    const red = parseInt(clean.slice(0, 2), 16);
    const green = parseInt(clean.slice(2, 4), 16);
    const blue = parseInt(clean.slice(4, 6), 16);
    return (red * 299 + green * 587 + blue * 114) / 1000 > 140 ? "#111111" : "#ffffff";
  }

  RingMapChart.storage = {
    load,
    save,
    remove,
    normalizeSpacing,
    normalizeAppearance,
    normalizeTheme,
    normalizeStylePreset,
    normalizeBackgroundEffect,
    normalizeBackgroundImageData,
    normalizeNavigationMode,
    normalizeBranchColors,
    normalizeCustomTheme,
    normalizeAuthorProfile,
    normalizeWorkspaceSync
  };
})(window);
