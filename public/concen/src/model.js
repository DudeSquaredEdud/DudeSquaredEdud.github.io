(function (global) {
  "use strict";

  const RingMapChart = global.RingMapChart;
  const { cleanChoice, cleanId, cleanLabel, cleanNote, cleanTags } = RingMapChart.utils;
  const { limits } = RingMapChart.config;
  const ROOT_ID = "root";
  const STATUS_VALUES = ["open", "active", "waiting", "done"];
  const PRIORITY_VALUES = ["low", "normal", "high", "critical"];

  function initialTree() {
    return {
      id: ROOT_ID,
      label: "Chart Title",
      status: "open",
      priority: "normal",
      markerEnabled: false,
      tags: [],
      depth: 0,
      colorIndex: null,
      textureIndex: null,
      children: []
    };
  }

  function createStore(savedTree) {
    return {
      tree: savedTree || initialTree(),
      focusedId: ROOT_ID,
      idCounter: 1
    };
  }

  function findNode(tree, id, parent) {
    if (tree.id === id) return { node: tree, parent: parent || null };
    for (const child of tree.children) {
      const found = findNode(child, id, tree);
      if (found) return found;
    }
    return null;
  }

  function visibleNodes(tree, parent, list) {
    const nodes = list || [];
    nodes.push({ node: tree, parent: parent || null });
    tree.children.forEach((child) => visibleNodes(child, tree, nodes));
    return nodes;
  }

  function defaultLabel(depth, index) {
    return ["Title", "Primary", "Secondary", "Leaf"][depth] + " " + (index + 1);
  }

  function primaryAncestor(tree, node) {
    let current = node;
    while (current && current.depth > 1) {
      const found = findNode(tree, current.id);
      current = found ? found.parent : null;
    }
    return current && current.depth === 1 ? current : null;
  }

  function nodeColor(tree, node) {
    if (node.depth === 0) return "#111111";
    const colors = RingMapChart.config.colors;
    const primary = node.depth === 1 ? node : primaryAncestor(tree, node);
    const base = colors[(primary ? primary.colorIndex : 0) % colors.length];
    if (node.depth === 1) return base;
    return RingMapChart.utils.mixColor(base, "#ffffff", node.depth === 2 ? 0.28 : 0.44);
  }

  function textureIndex(tree, node) {
    if (node.depth === 0) return null;
    if (node.depth === 3) {
      const found = findNode(tree, node.id);
      return found && found.parent ? found.parent.textureIndex : node.textureIndex;
    }
    return node.textureIndex;
  }

  function addChild(store) {
    const found = findNode(store.tree, store.focusedId);
    if (!found) return null;
    const node = found.node;
    if (node.depth >= limits.maxDepth || node.children.length >= limits.maxChildren) return null;
    const index = node.children.length;
    const primary = node.depth === 0 ? null : primaryAncestor(store.tree, node) || node;
    const child = {
      id: "node-" + store.idCounter++,
      label: defaultLabel(node.depth + 1, index),
      status: "open",
      priority: "normal",
      markerEnabled: false,
      tags: [],
      depth: node.depth + 1,
      colorIndex: node.depth === 0 ? index : primary.colorIndex,
      textureIndex: node.depth === 0 ? null : index,
      children: []
    };
    node.children.push(child);
    store.focusedId = child.id;
    return child.id;
  }

  function deleteFocused(store) {
    if (store.focusedId === ROOT_ID) return false;
    const found = findNode(store.tree, store.focusedId);
    if (!found || !found.parent) return false;
    const siblings = found.parent.children;
    const index = siblings.findIndex((child) => child.id === found.node.id);
    siblings.splice(index, 1);
    store.focusedId = siblings[index] ? siblings[index].id : siblings[index - 1] ? siblings[index - 1].id : found.parent.id;
    return true;
  }

  function renameNode(store, id, label) {
    const found = findNode(store.tree, id);
    const cleaned = cleanLabel(label);
    if (!found || !cleaned) return false;
    found.node.label = cleaned;
    return true;
  }

  function setFocus(store, id) {
    if (!findNode(store.tree, id)) return false;
    store.focusedId = id;
    return true;
  }

  function focusRelative(store, key, positions, mode) {
    const found = findNode(store.tree, store.focusedId);
    if (!found) return false;
    if (positions && mode === "directional" && focusSpatial(store, key, positions)) return true;
    const node = found.node;
    const parent = found.parent;

    if (key === "ArrowDown" && node.children.length) return setFocus(store, node.children[0].id);
    if (key === "ArrowUp" && parent) return setFocus(store, parent.id);
    if ((key === "ArrowLeft" || key === "ArrowRight") && parent) {
      const siblings = parent.children;
      const index = siblings.findIndex((child) => child.id === node.id);
      const delta = key === "ArrowRight" ? 1 : -1;
      return setFocus(store, siblings[(index + delta + siblings.length) % siblings.length].id);
    }
    if (positions && mode !== "outline") return focusSpatial(store, key, positions);
    return false;
  }

  function focusSpatial(store, key, positions) {
    const current = positions.get(store.focusedId);
    if (!current) return false;
    const direction = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 }
    }[key];
    const next = visibleNodes(store.tree)
      .filter(({ node }) => node.id !== store.focusedId && positions.has(node.id))
      .map(({ node }) => {
        const point = positions.get(node.id);
        const dx = point.x - current.x;
        const dy = point.y - current.y;
        const forward = dx * direction.x + dy * direction.y;
        const sideways = Math.abs(dx * direction.y - dy * direction.x);
        return { node, forward, sideways, distance: Math.hypot(dx, dy) };
      })
      .filter((item) => item.forward > 8)
      .sort((a, b) => (a.sideways + a.forward * 0.35) - (b.sideways + b.forward * 0.35) || a.distance - b.distance)[0];
    return next ? setFocus(store, next.node.id) : false;
  }

  function sanitizeTree(inputTree) {
    const seen = new Set();
    const counter = { total: 0, generated: 1 };
    return sanitizeNode(inputTree, 0, 0, null, seen, counter);
  }

  function sanitizeNode(inputNode, depth, index, primaryColorIndex, seen, counter) {
    if (!inputNode || typeof inputNode !== "object") return null;
    if (counter.total >= 1 + 12 + 144 + 1728) return null;
    counter.total += 1;

    const fallbackId = depth === 0 ? ROOT_ID : nextSavedId(seen, counter);
    const candidateId = depth === 0 ? ROOT_ID : cleanId(inputNode.id, fallbackId);
    const id = seen.has(candidateId) ? nextSavedId(seen, counter) : candidateId;
    seen.add(id);

    const colorIndex = depth === 0 ? null : depth === 1 ? index : primaryColorIndex;
    const node = {
      id,
      label: cleanLabel(inputNode.label) || defaultLabel(depth, index),
      note: cleanNote(inputNode.note),
      status: cleanStatus(inputNode.status),
      priority: cleanPriority(inputNode.priority),
      markerEnabled: inputNode.markerEnabled === true,
      tags: cleanTags(inputNode.tags),
      depth,
      colorIndex,
      textureIndex: depth <= 1 ? null : index,
      children: []
    };
    if (depth >= limits.maxDepth || !Array.isArray(inputNode.children)) return node;
    inputNode.children.slice(0, limits.maxChildren).forEach((childInput, childIndex) => {
      const child = sanitizeNode(childInput, depth + 1, childIndex, depth === 0 ? childIndex : colorIndex, seen, counter);
      if (child) node.children.push(child);
    });
    return node;
  }

  function nextSavedId(seen, counter) {
    let id;
    do {
      id = "node-saved-" + counter.generated++;
    } while (seen.has(id));
    return id;
  }

  function nextId(tree) {
    const ids = visibleNodes(tree)
      .map(({ node }) => node.id.match(/^node-(\d+)$/))
      .filter(Boolean)
      .map((match) => Number(match[1]));
    return ids.length ? Math.max(...ids) + 1 : 1;
  }

  function createMindFromTree(tree) {
    const mind = { rootId: ROOT_ID, idCounter: nextId(tree), nodes: Object.create(null) };
    collectMindNodes(tree, mind);
    return mind;
  }

  function collectMindNodes(node, mind) {
    const sourceId = node.sourceId || node.id;
    mind.nodes[sourceId] = {
      id: sourceId,
      label: cleanLabel(node.label) || "Chart Title",
      note: cleanNote(node.note),
      status: cleanStatus(node.status),
      priority: cleanPriority(node.priority),
      markerEnabled: node.markerEnabled === true,
      tags: cleanTags(node.tags),
      children: node.children.map((child) => child.sourceId || child.id)
    };
    node.children.forEach((child) => collectMindNodes(child, mind));
  }

  function viewTree(mind, rootNodeId) {
    const root = mind.nodes[rootNodeId] || mind.nodes[mind.rootId];
    if (!root) return initialTree();
    return viewNode(mind, root.id, root.id, 0, 0, null, new Set());
  }

  function viewNode(mind, sourceId, rootNodeId, depth, index, primaryColorIndex, seen) {
    const source = mind.nodes[sourceId];
    if (!source || seen.has(sourceId)) return null;
    seen.add(sourceId);
    const colorIndex = depth === 0 ? null : depth === 1 ? index : primaryColorIndex;
    const node = {
      id: sourceId === rootNodeId ? ROOT_ID : sourceId,
      sourceId,
      label: source.label,
      note: cleanNote(source.note),
      status: cleanStatus(source.status),
      priority: cleanPriority(source.priority),
      markerEnabled: source.markerEnabled === true,
      tags: cleanTags(source.tags),
      depth,
      colorIndex,
      textureIndex: depth <= 1 ? null : index,
      children: []
    };
    if (depth >= limits.maxDepth) return node;
    source.children.slice(0, limits.maxChildren).forEach((childId, childIndex) => {
      const child = viewNode(mind, childId, rootNodeId, depth + 1, childIndex, depth === 0 ? childIndex : colorIndex, seen);
      if (child) node.children.push(child);
    });
    return node;
  }

  function sourceIdForViewNode(node, rootNodeId) {
    return node.id === ROOT_ID ? rootNodeId : (node.sourceId || node.id);
  }

  function addMindChild(mind, parentId, viewDepth, index) {
    const parent = mind.nodes[parentId];
    if (!parent || viewDepth >= limits.maxDepth || parent.children.length >= limits.maxChildren) return null;
    const childId = nextMindNodeId(mind);
    mind.nodes[childId] = {
      id: childId,
      label: defaultLabel(viewDepth + 1, index),
      note: "",
      status: "open",
      priority: "normal",
      markerEnabled: false,
      tags: [],
      children: []
    };
    parent.children.push(childId);
    return childId;
  }

  function renameMindNode(mind, sourceId, label) {
    const node = mind.nodes[sourceId];
    const cleaned = cleanLabel(label);
    if (!node || !cleaned) return false;
    node.label = cleaned;
    return true;
  }

  function updateMindNodeNote(mind, sourceId, note) {
    const node = mind.nodes[sourceId];
    if (!node) return false;
    node.note = cleanNote(note);
    return true;
  }

  function updateMindNodeMeta(mind, sourceId, meta) {
    const node = mind.nodes[sourceId];
    if (!node) return false;
    node.status = cleanStatus(meta && meta.status);
    node.priority = cleanPriority(meta && meta.priority);
    node.markerEnabled = meta && meta.markerEnabled === true;
    node.tags = cleanTags(meta && meta.tags);
    return true;
  }

  function deleteMindNode(mind, sourceId) {
    if (!mind.nodes[sourceId] || sourceId === mind.rootId) return null;
    const parentId = findMindParentId(mind, sourceId);
    if (!parentId) return null;
    const siblings = mind.nodes[parentId].children;
    const index = siblings.indexOf(sourceId);
    siblings.splice(index, 1);
    deleteMindSubtree(mind, sourceId);
    return siblings[index] || siblings[index - 1] || parentId;
  }

  function reparentMindNode(mind, sourceId, nextParentId) {
    const node = mind.nodes[sourceId];
    const nextParent = mind.nodes[nextParentId];
    if (!node || !nextParent || sourceId === mind.rootId || sourceId === nextParentId) return false;
    if (isMindDescendant(mind, sourceId, nextParentId)) return false;
    if (nextParent.children.length >= limits.maxChildren) return false;
    const currentParentId = findMindParentId(mind, sourceId);
    const currentParent = currentParentId ? mind.nodes[currentParentId] : null;
    if (!currentParent || currentParentId === nextParentId) return false;
    currentParent.children = currentParent.children.filter((childId) => childId !== sourceId);
    nextParent.children.push(sourceId);
    return true;
  }

  function wrapMindNode(mind, sourceId, viewDepth) {
    if (!mind.nodes[sourceId] || sourceId === mind.rootId) return null;
    const parentId = findMindParentId(mind, sourceId);
    if (!parentId) return null;
    const siblings = mind.nodes[parentId].children;
    const index = siblings.indexOf(sourceId);
    if (index < 0) return null;
    const wrapperId = nextMindNodeId(mind);
    mind.nodes[wrapperId] = {
      id: wrapperId,
      label: defaultLabel(viewDepth, index),
      note: "",
      status: "open",
      priority: "normal",
      markerEnabled: false,
      tags: [],
      children: [sourceId]
    };
    siblings[index] = wrapperId;
    return wrapperId;
  }

  function deleteMindSubtree(mind, sourceId) {
    const node = mind.nodes[sourceId];
    if (!node) return;
    node.children.forEach((childId) => deleteMindSubtree(mind, childId));
    delete mind.nodes[sourceId];
  }

  function cleanStatus(value) {
    return cleanChoice(value, STATUS_VALUES, "open");
  }

  function cleanPriority(value) {
    return cleanChoice(value, PRIORITY_VALUES, "normal");
  }

  function findMindParentId(mind, sourceId) {
    return Object.values(mind.nodes).find((node) => node.children.includes(sourceId))?.id || null;
  }

  function isMindDescendant(mind, sourceId, candidateId) {
    const node = mind.nodes[sourceId];
    if (!node) return false;
    if (node.children.includes(candidateId)) return true;
    return node.children.some((childId) => isMindDescendant(mind, childId, candidateId));
  }

  function mindNodeDepth(mind, sourceId) {
    let depth = 0;
    let currentId = sourceId;
    while (currentId && currentId !== mind.rootId) {
      currentId = findMindParentId(mind, currentId);
      depth += 1;
      if (depth > limits.maxDepth) return depth;
    }
    return depth;
  }

  function mindSubtreeDepth(mind, sourceId, depth) {
    const node = mind.nodes[sourceId];
    if (!node || !node.children.length) return depth;
    return Math.max(...node.children.map((childId) => mindSubtreeDepth(mind, childId, depth + 1)));
  }

  function nextMindNodeId(mind) {
    let id;
    do {
      id = "node-" + mind.idCounter++;
    } while (mind.nodes[id]);
    return id;
  }

  function cloneAsRoot(node) {
    const counter = { next: 1 };
    return cloneForDepth(node, 0, 0, null, counter);
  }

  function cloneForDepth(inputNode, depth, index, primaryColorIndex, counter) {
    const colorIndex = depth === 0 ? null : depth === 1 ? index : primaryColorIndex;
    const node = {
      id: depth === 0 ? ROOT_ID : "node-" + counter.next++,
      label: cleanLabel(inputNode.label) || defaultLabel(depth, index),
      note: cleanNote(inputNode.note),
      status: cleanStatus(inputNode.status),
      priority: cleanPriority(inputNode.priority),
      markerEnabled: inputNode.markerEnabled === true,
      tags: cleanTags(inputNode.tags),
      depth,
      colorIndex,
      textureIndex: depth <= 1 ? null : index,
      children: []
    };
    if (depth >= limits.maxDepth) return node;
    inputNode.children.forEach((child, childIndex) => {
      node.children.push(cloneForDepth(child, depth + 1, childIndex, depth === 0 ? childIndex : colorIndex, counter));
    });
    return node;
  }

  RingMapChart.model = {
    ROOT_ID,
    initialTree,
    createStore,
    findNode,
    visibleNodes,
    defaultLabel,
    primaryAncestor,
    nodeColor,
    textureIndex,
    addChild,
    deleteFocused,
    renameNode,
    setFocus,
    focusRelative,
    sanitizeTree,
    nextId,
    cloneAsRoot,
    createMindFromTree,
    viewTree,
    sourceIdForViewNode,
    addMindChild,
    renameMindNode,
    updateMindNodeNote,
    updateMindNodeMeta,
    deleteMindNode,
    reparentMindNode,
    isMindDescendant,
    mindNodeDepth,
    mindSubtreeDepth,
    wrapMindNode,
    findMindParentId
  };
})(window);
