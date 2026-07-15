(function (global) {
  "use strict";

  const RingMapChart = global.RingMapChart;
  const { config, model } = RingMapChart;

  function createLayoutEngine() {
    const measureCanvas = document.createElement("canvas");
    const measureContext = measureCanvas.getContext("2d");
    const nodeSizeCache = new Map();
    let fontMetrics = null;

    function measureLabel(label) {
      measureContext.font = readFontMetrics().font;
      return measureContext.measureText(label).width;
    }

    function readFontMetrics() {
      const rootStyle = getComputedStyle(document.documentElement);
      const sizeText = rootStyle.getPropertyValue("--node-font-size").trim() || "13px";
      const numericSize = parseFloat(sizeText);
      const family = getComputedStyle(document.body).fontFamily || "Inter, ui-sans-serif, system-ui, sans-serif";
      const key = `${sizeText}|${family}`;
      if (!fontMetrics || fontMetrics.key !== key) {
        nodeSizeCache.clear();
        fontMetrics = {
          key,
          size: Number.isFinite(numericSize) ? numericSize : 13,
          font: `800 ${sizeText} ${family}`
        };
      }
      return fontMetrics;
    }

    function nodeFontSize() {
      return readFontMetrics().size;
    }

    function nodeSize(node, viewMode) {
      const metrics = readFontMetrics();
      const cacheKey = [
        metrics.key,
        viewMode || "",
        node.id,
        node.depth,
        node.label,
        node.note || ""
      ].join("\u0001");
      const cached = nodeSizeCache.get(cacheKey);
      if (cached) return cached;
      const base = config.layout;
      const fontSize = metrics.size;
      const scale = fontSize / 13;
      const minWidth = node.depth === 0 ? base.rootWidth : base.nodeWidth;
      const minHeight = node.depth === 0 ? base.rootHeight : base.nodeHeight;
      const contentSize = contentNodeSize(node, viewMode, scale);
      const size = contentSize || {
        width: Math.max(minWidth * scale, Math.ceil(measureLabel(node.label) + base.nodePadX * scale * 2)),
        height: Math.max(minHeight, Math.ceil(minHeight * scale))
      };
      if (nodeSizeCache.size > 5000) nodeSizeCache.clear();
      nodeSizeCache.set(cacheKey, size);
      return size;
    }

    function contentNodeSize(node, viewMode, scale) {
      const mode = String(viewMode || "");
      if (mode !== "book" && mode !== "document") return null;
      const note = normalizedNote(node.note);
      const profile = contentProfile(mode, node.depth);
      const labelLines = wrappedLineCount(node.label, profile.labelChars, profile.labelLines);
      const noteLines = note ? wrappedLineCount(note, profile.noteChars, profile.noteLines) : 0;
      const width = Math.max(profile.width * scale, Math.ceil(measureLabel(node.label) + config.layout.nodePadX * scale * 2));
      const height = Math.max(
        profile.minHeight * scale,
        profile.paddingY * 2 * scale + labelLines * profile.labelLineHeight * scale + (noteLines ? profile.noteGap * scale + noteLines * profile.noteLineHeight * scale : 0)
      );
      return { width: Math.ceil(width), height: Math.ceil(height) };
    }

    function contentProfile(viewMode, depth) {
      const profiles = {
        book: {
          0: { width: 460, minHeight: 124, labelChars: 25, labelLines: 2, noteChars: 54, noteLines: Infinity, paddingY: 24, labelLineHeight: 31, noteGap: 16, noteLineHeight: 21 },
          1: { width: 360, minHeight: 86, labelChars: 25, labelLines: 2, noteChars: 44, noteLines: Infinity, paddingY: 17, labelLineHeight: 24, noteGap: 13, noteLineHeight: 19 },
          2: { width: 390, minHeight: 82, labelChars: 30, labelLines: 2, noteChars: 48, noteLines: Infinity, paddingY: 16, labelLineHeight: 22, noteGap: 12, noteLineHeight: 18 },
          3: { width: 330, minHeight: 72, labelChars: 26, labelLines: 2, noteChars: 40, noteLines: Infinity, paddingY: 14, labelLineHeight: 20, noteGap: 10, noteLineHeight: 17 }
        },
        document: {
          0: { width: 780, minHeight: 132, labelChars: 40, labelLines: 2, noteChars: 86, noteLines: Infinity, paddingY: 28, labelLineHeight: 36, noteGap: 18, noteLineHeight: 22 },
          1: { width: 760, minHeight: 92, labelChars: 52, labelLines: 2, noteChars: 84, noteLines: Infinity, paddingY: 18, labelLineHeight: 27, noteGap: 14, noteLineHeight: 20 },
          2: { width: 720, minHeight: 78, labelChars: 56, labelLines: 2, noteChars: 80, noteLines: Infinity, paddingY: 15, labelLineHeight: 23, noteGap: 12, noteLineHeight: 19 },
          3: { width: 680, minHeight: 68, labelChars: 58, labelLines: 2, noteChars: 76, noteLines: Infinity, paddingY: 13, labelLineHeight: 20, noteGap: 10, noteLineHeight: 18 }
        }
      };
      return (profiles[viewMode] && profiles[viewMode][depth]) || profiles[viewMode][3];
    }

    function wrappedLineCount(text, charsPerLine, maxLines) {
      if (!charsPerLine || !maxLines) return 0;
      const lines = wrapTextLines(text, charsPerLine, maxLines);
      return lines.length;
    }

    function wrapTextLines(text, charsPerLine, maxLines) {
      const clean = normalizedNote(text);
      if (!clean) return [];
      const limit = Number.isFinite(maxLines) ? maxLines : Infinity;
      const result = [];
      clean.split(/\n+/).forEach((paragraph) => {
        const words = paragraph.trim().split(/\s+/).filter(Boolean);
        let line = "";
        words.forEach((word) => {
          const next = line ? line + " " + word : word;
          if (next.length <= charsPerLine) {
            line = next;
            return;
          }
          if (line) result.push(line);
          line = word.length > charsPerLine ? word.slice(0, charsPerLine) : word;
        });
        if (line) result.push(line);
      });
      return result.slice(0, limit);
    }

    function normalizedNote(value) {
      return String(value || "")
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
        .replace(/\[\[([^\]]+)\]\]/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/^[-*+]\s+\[[ xX]\]\s+/gm, "☐ ")
        .replace(/^[-*+]\s+/gm, "• ")
        .replace(/^\d+[.)]\s+/gm, "• ")
        .replace(/^>\s+/gm, "")
        .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, "────────────────")
        .replace(/^\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/gm, "")
        .replace(/^\|(.+)\|$/gm, (match) => match.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()).filter(Boolean).join(" • "))
        .replace(/[*_`~=]/g, "")
        .trim();
    }

    function maxNodeWidth(tree, viewMode) {
      return model.visibleNodes(tree).reduce((max, { node }) => Math.max(max, nodeSize(node, viewMode).width), config.layout.rootWidth);
    }

    function leafCounts(tree) {
      const counts = new Map();
      function count(node) {
        const total = node.children.length ? node.children.reduce((sum, child) => sum + count(child), 0) : 1;
        counts.set(node.id, total);
        return total;
      }
      count(tree);
      return counts;
    }

    function subtreeMaxDepth(node) {
      if (!node.children.length) return node.depth;
      return Math.max(...node.children.map(subtreeMaxDepth));
    }

    function treeBranchSpan(primary, spacing) {
      return (subtreeMaxDepth(primary) - 1) * spacing.treeLevelGap + config.layout.nodeHeight + spacing.treeLevelGap;
    }

    function treeLayerHeight(tree, spacing) {
      if (!tree.children.length) return config.layout.rootHeight;
      const branchHeight = tree.children.reduce((sum, primary) => sum + treeBranchSpan(primary, spacing), 0);
      return config.layout.rootHeight + spacing.treeLevelGap + branchHeight - spacing.treeLevelGap;
    }

    function treeLeafGap(tree, spacing) {
      return Math.max(spacing.treeLeafGap, maxNodeWidth(tree) + 14);
    }

    function maxPrimaryLeafCount(tree, counts) {
      if (!tree.children.length) return 1;
      return tree.children.reduce((max, primary) => Math.max(max, counts.get(primary.id) || 1), 1);
    }

    function worldSize(tree, viewport, viewMode, spacing) {
      const nodeWidth = maxNodeWidth(tree, viewMode);
      if (viewMode === "book") return structuredWorldSize(tree, viewport, viewMode, spacing);
      if (viewMode === "document") return documentWorldSize(tree, viewport, viewMode, spacing);
      const radius = viewMode === "radial" ? radialDiskRadius(tree, spacing) : flatRingRadius(tree, spacing);
      const ringDiameter = radius * 2 + nodeWidth + 48;
      return {
        width: Math.max(viewport.width + 240, ringDiameter),
        height: Math.max(viewport.height + 180, ringDiameter)
      };
    }

    function layout(tree, viewport, viewMode, spacing, focusedId) {
      const world = worldSize(tree, viewport, viewMode, spacing);
      const nodes = model.visibleNodes(tree);
      if (viewMode === "ring") {
        const ring = ringLayout(tree, nodes, world, spacing);
        staggerCrowdedRingNodes(nodes, ring.positions, ring.center);
        resolveNodeOverlaps(nodes, ring.positions, viewMode);
        return { world, positions: ring.positions, nodes, rings: ring.rings, bounds: layoutBounds(nodes, ring.positions, viewMode) };
      }
      if (viewMode === "radial") {
        const radial = radialDiskLayout(tree, nodes, world, spacing);
        resolveNodeOverlaps(nodes, radial.positions, viewMode);
        return { world, positions: radial.positions, nodes, rings: radial.rings, bounds: layoutBounds(nodes, radial.positions, viewMode) };
      }
      if (viewMode === "book") {
        const book = bookLayout(tree, nodes, world, spacing);
        resolveNodeOverlaps(nodes, book.positions, viewMode);
        return { world, positions: book.positions, nodes, rings: [], bounds: layoutBounds(nodes, book.positions, viewMode) };
      }
      if (viewMode === "document") {
        const documentLayoutResult = documentLayout(tree, nodes, world, spacing);
        return { world, positions: documentLayoutResult.positions, nodes, rings: [], bounds: layoutBounds(nodes, documentLayoutResult.positions, viewMode) };
      }
      const flat = flatRingLayout(tree, nodes, world, spacing);
      staggerCrowdedRingNodes(nodes, flat.positions, flat.center);
      resolveNodeOverlaps(nodes, flat.positions, viewMode);
      return { world, positions: flat.positions, nodes, rings: flat.rings, bounds: layoutBounds(nodes, flat.positions, viewMode) };
    }

    function treeLayout(tree, world, counts, spacing) {
      const positions = new Map();
      const rootX = world.width / 2;
      const contentHeight = treeLayerHeight(tree, spacing);
      const rootY = Math.max(config.layout.rootHeight / 2 + 48, (world.height - contentHeight) / 2 + config.layout.rootHeight / 2);
      const leafGap = treeLeafGap(tree, spacing);
      let layerTop = rootY + spacing.treeLevelGap;
      positions.set(model.ROOT_ID, { x: rootX, y: rootY });

      function place(node, nextLeafX) {
        const y = layerTop + (node.depth - 1) * spacing.treeLevelGap;
        if (!node.children.length) {
          positions.set(node.id, { x: nextLeafX, y });
          return { x: nextLeafX, nextLeafX: nextLeafX + leafGap };
        }
        const childXs = [];
        let cursor = nextLeafX;
        node.children.forEach((child) => {
          const placed = place(child, cursor);
          childXs.push(placed.x);
          cursor = placed.nextLeafX;
        });
        const x = childXs.reduce((sum, value) => sum + value, 0) / childXs.length;
        positions.set(node.id, { x, y });
        return { x, nextLeafX: cursor };
      }

      tree.children.forEach((primary) => {
        const branchLeafCount = Math.max(counts.get(primary.id), 1);
        place(primary, rootX - ((branchLeafCount - 1) * leafGap) / 2);
        layerTop += treeBranchSpan(primary, spacing);
      });
      return positions;
    }

    function flatRingLayout(tree, nodes, world, spacing) {
      const positions = new Map();
      const center = { x: world.width / 2, y: world.height / 2 };
      const radius = flatRingRadius(tree, spacing);
      positions.set(model.ROOT_ID, center);

      const ringNodes = nodes
        .map(({ node }) => node)
        .filter((node) => node.id !== model.ROOT_ID);
      const angles = spreadAngles(config.layout.ringStartAngle + Math.PI, Math.PI * 2, ringNodes.length);
      ringNodes.forEach((node, index) => {
        positions.set(node.id, polarPoint(center, angles[index], radius));
      });
      return {
        positions,
        center,
        rings: ringNodes.length ? [{ depth: 1, radius, center }] : []
      };
    }

    function bookLayout(tree, nodes, world, spacing) {
      const positions = new Map();
      const columnWidth = structuredColumnWidth(tree, spacing, "book");
      const rowGap = structuredRowGap(spacing, "book");
      const primaries = tree.children;
      const startX = world.width / 2 - ((Math.max(primaries.length, 1) - 1) * columnWidth) / 2;
      const rootY = Math.max(config.layout.rootHeight / 2 + 36, 72);
      positions.set(model.ROOT_ID, { x: world.width / 2, y: rootY });
      primaries.forEach((primary, primaryIndex) => {
        const x = startX + primaryIndex * columnWidth;
        let previous = tree;
        let y = stackNextY(rootY, previous, primary, rowGap, "book");
        positions.set(primary.id, { x, y });
        previous = primary;
        primary.children.forEach((secondary) => {
          y = stackNextY(y, previous, secondary, rowGap, "book");
          positions.set(secondary.id, { x, y });
          previous = secondary;
          secondary.children.forEach((leaf) => {
            y = stackNextY(y, previous, leaf, rowGap * 0.72, "book");
            positions.set(leaf.id, { x, y });
            previous = leaf;
          });
        });
      });
      fillMissingStructured(nodes, positions, world);
      return { positions };
    }

    function documentLayout(tree, nodes, world, spacing) {
      const positions = new Map();
      const pageWidth = documentPageWidth();
      const pageLeft = (world.width - pageWidth) / 2;
      const rowGap = Math.max(16, spacing.treeLevelGap * 0.34);
      let y = 76;
      documentNodes(tree).forEach((node) => {
        const size = nodeSize(node, "document");
        const indent = documentIndent(node.depth);
        const centerX = pageLeft + indent + size.width / 2;
        positions.set(node.id, { x: centerX, y: y + size.height / 2 });
        y += size.height + (node.depth === 0 ? rowGap * 1.35 : rowGap);
      });
      fillMissingStructured(nodes, positions, world);
      return { positions };
    }

    function radialDiskLayout(tree, nodes, world, spacing) {
      const positions = new Map();
      const center = { x: world.width / 2, y: world.height / 2 };
      const radius = radialDiskRadius(tree, spacing);
      const anglePlan = buildAnglePlan(tree);
      const visible = nodes.map(({ node }) => node).filter((node) => node.id !== model.ROOT_ID);
      const maxDepth = Math.max(1, ...visible.map((node) => node.depth));
      positions.set(model.ROOT_ID, center);

      visible.forEach((node, index) => {
        const plan = anglePlan.get(node.id) || { angle: stableAngle(node.id), span: Math.PI * 2, depth: node.depth };
        const depthShare = node.depth / (maxDepth + 0.82);
        const fillShare = Math.sqrt((index + 1) / Math.max(visible.length, 1));
        const radialJitter = (stableUnit(node.id + ":r") - 0.5) * spacing.ringNodeGap * 1.8;
        const angleJitter = (stableUnit(node.id + ":a") - 0.5) * Math.min(plan.span * 0.36, 0.72);
        const nodeRadius = Math.max(
          spacing.ringBaseRadius * 0.44,
          radius * (0.18 + depthShare * 0.58 + fillShare * 0.18) + radialJitter
        );
        positions.set(node.id, polarPoint(center, plan.angle + angleJitter, Math.min(radius, nodeRadius)));
      });

      return {
        positions,
        center,
        rings: [0.32, 0.58, 0.84].map((share, index) => ({ depth: index + 1, radius: radius * share, center }))
      };
    }

    function flatRingRadius(tree, spacing) {
      const nodes = model.visibleNodes(tree).filter(({ node }) => node.id !== model.ROOT_ID);
      if (!nodes.length) return Math.max(spacing.treeLevelGap, spacing.ringBaseRadius);
      const nodeArc = Math.max(spacing.treeLeafGap, maxNodeWidth(tree) * 0.82 + spacing.ringNodeGap);
      return Math.max(spacing.ringBaseRadius, spacing.treeLevelGap) + (nodes.length * nodeArc) / (Math.PI * 2);
    }

    function radialDiskRadius(tree, spacing) {
      const nodes = model.visibleNodes(tree).filter(({ node }) => node.id !== model.ROOT_ID);
      if (!nodes.length) return Math.max(spacing.ringBaseRadius, spacing.treeLevelGap);
      const nodeFootprint = Math.max(maxNodeWidth(tree) * 0.86 + spacing.ringNodeGap, spacing.treeLeafGap);
      const countRadius = Math.sqrt(nodes.length) * nodeFootprint * 0.62;
      const depthRadius = maxDepthForTree(tree) * Math.max(spacing.ringDepthGap * 0.62, config.layout.nodeHeight + spacing.ringNodeGap * 0.6);
      return Math.max(spacing.ringBaseRadius, countRadius, depthRadius);
    }

    function structuredWorldSize(tree, viewport, viewMode, spacing) {
      const columnWidth = structuredColumnWidth(tree, spacing, viewMode);
      const columnCount = Math.max(tree.children.length, 1);
      return {
        width: Math.max(viewport.width + 160, columnCount * columnWidth + 160),
        height: Math.max(viewport.height + 120, structuredContentHeight(tree, viewMode, spacing) + 160)
      };
    }

    function documentWorldSize(tree, viewport, viewMode, spacing) {
      const rowGap = Math.max(16, spacing.treeLevelGap * 0.34);
      let contentHeight = 76;
      documentNodes(tree).forEach((node) => {
        contentHeight += nodeSize(node, viewMode).height + (node.depth === 0 ? rowGap * 1.35 : rowGap);
      });
      return {
        width: Math.max(viewport.width + 160, documentPageWidth() + 220),
        height: Math.max(viewport.height + 140, contentHeight + 96)
      };
    }

    function documentNodes(tree) {
      const result = [];
      const visit = (node) => {
        result.push(node);
        node.children.forEach(visit);
      };
      visit(tree);
      return result;
    }

    function documentPageWidth() {
      return 820;
    }

    function documentIndent(depth) {
      return 0;
    }

    function structuredColumnWidth(tree, spacing, viewMode) {
      return Math.max(maxNodeWidth(tree, viewMode) + spacing.treeLeafGap, 188);
    }

    function structuredRowGap(spacing, viewMode) {
      const base = Math.max(config.layout.nodeHeight + 12, spacing.treeLevelGap * 0.68);
      return base;
    }

    function structuredContentHeight(tree, viewMode, spacing) {
      const rowGap = structuredRowGap(spacing, viewMode);
      const rootHeight = nodeSize(tree, viewMode).height;
      let maxHeight = rootHeight;
      tree.children.forEach((primary) => {
        let previous = tree;
        let branchHeight = rootHeight / 2 + rowGap + nodeSize(primary, viewMode).height / 2;
        previous = primary;
        primary.children.forEach((secondary) => {
          branchHeight += nodeSize(previous, viewMode).height / 2 + rowGap + nodeSize(secondary, viewMode).height / 2;
          previous = secondary;
          secondary.children.forEach((leaf) => {
            branchHeight += nodeSize(previous, viewMode).height / 2 + rowGap * 0.72 + nodeSize(leaf, viewMode).height / 2;
            previous = leaf;
          });
        });
        maxHeight = Math.max(maxHeight, branchHeight);
      });
      return maxHeight;
    }

    function stackNextY(currentY, previousNode, nextNode, gap, viewMode) {
      return currentY + nodeSize(previousNode, viewMode).height / 2 + gap + nodeSize(nextNode, viewMode).height / 2;
    }

    function fillMissingStructured(nodes, positions, world) {
      const missing = nodes.map(({ node }) => node).filter((node) => !positions.has(node.id));
      if (!missing.length) return;
      const center = { x: world.width / 2, y: world.height / 2 };
      const fallbackRadius = Math.min(world.width, world.height) * 0.28;
      const angles = spreadAngles(-Math.PI / 2, Math.PI * 2, missing.length);
      missing.forEach((node, index) => positions.set(node.id, polarPoint(center, angles[index], fallbackRadius)));
    }

    function ringLayout(tree, nodes, world, spacing) {
      const positions = new Map();
      const center = { x: world.width / 2, y: world.height / 2 };
      positions.set(model.ROOT_ID, center);
      const anglePlan = buildAnglePlan(tree);
      const radii = compactRingRadii(tree, spacing, anglePlan);
      const rings = Object.keys(radii)
        .map((depth) => ({ depth: Number(depth), radius: radii[depth], center }))
        .sort((a, b) => a.depth - b.depth);

      anglePlan.forEach((item, id) => {
        if (id === model.ROOT_ID) return;
        positions.set(id, polarPoint(center, item.angle, radii[item.depth]));
      });

      return { positions, center, rings };
    }

    function buildAnglePlan(tree) {
      const fullCircle = Math.PI * 2;
      const plan = new Map();
      plan.set(model.ROOT_ID, { angle: 0, span: fullCircle, depth: 0 });
      placeWeightedChildren(tree, config.layout.ringStartAngle, fullCircle, true);
      return plan;

      function placeWeightedChildren(parent, parentAngle, parentSpan, isRoot) {
        const children = parent.children;
        if (!children.length) return;
        const sectors = weightedSectors(children, parentAngle, parentSpan, isRoot);
        sectors.forEach((sector) => {
          plan.set(sector.node.id, {
            angle: sector.angle,
            span: sector.span,
            depth: sector.node.depth
          });
          placeWeightedChildren(sector.node, sector.angle, sector.span, false);
        });
      }
    }

    function weightedSectors(children, centerAngle, totalSpan, isRoot) {
      const minSpan = isRoot ? Math.min(config.layout.minPrimarySector, totalSpan / Math.max(children.length, 1)) : 0;
      const availableSpan = Math.max(0, totalSpan - minSpan * children.length);
      const weights = children.map(subtreeWeight);
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
      let cursor = centerAngle - totalSpan / 2;
      return children.map((child, index) => {
        const span = minSpan + availableSpan * (weights[index] / totalWeight);
        const angle = cursor + span / 2;
        cursor += span;
        return { node: child, angle, span };
      });
    }

    function subtreeWeight(node) {
      if (!node.children.length) return node.depth === 3 ? config.layout.leafWeight : 1;
      return 1 + node.children.reduce((sum, child) => sum + subtreeWeight(child), 0);
    }

    function spreadAngles(centerAngle, span, count) {
      const start = centerAngle - span / 2;
      return Array.from({ length: count }, (_, index) => start + (span * (index + 0.5)) / count);
    }

    function childWindow(parentSpan, childCount) {
      const target = Math.max(config.layout.minSiblingArc * Math.max(childCount - 1, 1), config.layout.minSiblingArc);
      return Math.min(Math.max(target, parentSpan * 0.68), Math.PI * 1.45, parentSpan * 0.92);
    }

    function childSectorSpan(parentSpan, childCount) {
      if (childCount <= 1) return Math.max(config.layout.minSiblingArc * 2, parentSpan * 0.72);
      return Math.max(config.layout.minSiblingArc, childWindow(parentSpan, childCount) / childCount);
    }

    function boundedSingleChildOffset(parentSpan, parentDepth) {
      const direction = parentDepth % 2 === 0 ? 1 : -1;
      const maxOffset = Math.max(config.layout.minSiblingArc / 2, parentSpan * 0.42);
      return direction * Math.min(config.layout.singleChildAngleOffset, maxOffset);
    }

    function polarPoint(center, angle, radius) {
      return {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      };
    }

    function stableAngle(value) {
      return stableUnit(value) * Math.PI * 2;
    }

    function stableUnit(value) {
      const text = String(value || "");
      let hash = 2166136261;
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0) / 4294967295;
    }

    function maxDepthForTree(tree) {
      return Math.max(...model.visibleNodes(tree).map(({ node }) => node.depth), 0);
    }

    function compactRingRadii(tree, spacing, anglePlan) {
      const depthCounts = new Map();
      model.visibleNodes(tree).forEach(({ node }) => depthCounts.set(node.depth, (depthCounts.get(node.depth) || 0) + 1));
      const radii = {};
      for (let depth = 1; depth <= config.limits.maxDepth; depth += 1) {
        const count = depthCounts.get(depth) || 0;
        if (!count) continue;
        if (depth === 1) {
          const primaryWidth = Math.max(config.layout.nodeWidth, maxNodeWidthForDepth(tree, 1));
          radii[1] = Math.max(spacing.ringBaseRadius, radiusForMinimumAngle(primaryWidth, spacing, minSiblingAngleForDepth(tree, anglePlan, depth)));
        } else {
          radii[depth] = radii[depth - 1] + ringGapForDepth(depth, spacing);
        }
      }
      return radii;
    }

    function ringGapForDepth(depth, spacing) {
      if (depth === 2) return Math.min(spacing.ringDepthGap, config.layout.secondaryRingGap);
      if (depth === 3) return Math.min(Math.max(spacing.ringDepthGap, config.layout.leafRingGap), config.spacingLimits.ringDepthGap.max);
      return Math.min(spacing.ringDepthGap, config.layout.compactRingGap);
    }

    function minSiblingAngleForDepth(tree, anglePlan, depth) {
      let minAngle = Math.PI * 2;
      model.visibleNodes(tree).forEach(({ node }) => {
        if (!node.children.length || node.children[0].depth !== depth) return;
        const angles = node.children
          .map((child) => anglePlan.get(child.id))
          .filter(Boolean)
          .map((item) => item.angle)
          .sort((a, b) => a - b);
        if (angles.length <= 1) return;
        minAngle = Math.min(minAngle, smallestAngleGap(angles));
      });
      return Math.max(minAngle, 0.01);
    }

    function smallestAngleGap(angles) {
      const gaps = [];
      for (let index = 1; index < angles.length; index += 1) {
        gaps.push(angles[index] - angles[index - 1]);
      }
      gaps.push((Math.PI * 2) - angles[angles.length - 1] + angles[0]);
      return Math.min(...gaps);
    }

    function radiusForMinimumAngle(width, spacing, angle) {
      return (width + spacing.ringNodeGap + config.layout.minNodeDistance) / angle;
    }

    function maxNodeWidthForDepth(tree, depth) {
      return model.visibleNodes(tree).reduce((max, { node }) => {
        return node.depth === depth ? Math.max(max, nodeSize(node).width) : max;
      }, config.layout.nodeWidth);
    }

    function outerRingRadius(tree, spacing) {
      const radii = compactRingRadii(tree, spacing, buildAnglePlan(tree));
      let maxRadius = Math.max(...Object.values(radii), spacing.ringBaseRadius);
      return maxRadius + maxNodeWidth(tree) / 2 + ringBandGap(spacing);
    }

    function ringBandGap(spacing) {
      return Math.max(72, config.layout.nodeHeight + spacing.ringNodeGap);
    }

    function staggerCrowdedRingNodes(nodes, positions, center) {
      const ringItems = nodes
        .map(({ node }) => {
          if (node.id === model.ROOT_ID) return null;
          const point = positions.get(node.id);
          if (!point) return null;
          return {
            node,
            point,
            size: nodeSize(node),
            angle: Math.atan2(point.y - center.y, point.x - center.x)
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.angle - b.angle);
      if (ringItems.length < 2) return;

      const crowded = new Set();
      for (let index = 0; index < ringItems.length; index += 1) {
        const next = ringItems[(index + 1) % ringItems.length];
        if (paddedBoxesOverlap(ringItems[index], next, config.layout.overlapPadding)) {
          crowded.add(ringItems[index]);
          crowded.add(next);
        }
      }

      ringItems.forEach((item, index) => {
        if (!crowded.has(item)) return;
        const dx = item.point.x - center.x;
        const dy = item.point.y - center.y;
        const distance = Math.hypot(dx, dy) || 1;
        const direction = index % 2 === 0 ? 1 : -1;
        const nudge = direction * config.layout.overlapStagger;
        item.point.x += (dx / distance) * nudge;
        item.point.y += (dy / distance) * nudge;
      });
    }

    function paddedBoxesOverlap(first, second, padding) {
      return Math.abs(second.point.x - first.point.x) < (first.size.width + second.size.width) / 2 + padding &&
        Math.abs(second.point.y - first.point.y) < (first.size.height + second.size.height) / 2 + padding;
    }

    function resolveNodeOverlaps(nodes, positions, viewMode) {
      const items = nodes
        .map(({ node }) => {
          const point = positions.get(node.id);
          if (!point) return null;
          return { node, point, size: nodeSize(node, viewMode) };
        })
        .filter(Boolean);
      if (items.length > config.layout.maxOverlapResolveNodes) return;
      const padding = config.layout.overlapPadding;

      for (let pass = 0; pass < config.layout.overlapResolvePasses; pass += 1) {
        let moved = false;
        for (let firstIndex = 0; firstIndex < items.length; firstIndex += 1) {
          for (let secondIndex = firstIndex + 1; secondIndex < items.length; secondIndex += 1) {
            const first = items[firstIndex];
            const second = items[secondIndex];
            const overlap = overlapVector(first, second, padding);
            if (!overlap) continue;
            separateItems(first, second, overlap);
            moved = true;
          }
        }
        if (!moved) return;
      }
    }

    function overlapVector(first, second, padding) {
      const dx = second.point.x - first.point.x;
      const dy = second.point.y - first.point.y;
      const overlapX = (first.size.width + second.size.width) / 2 + padding - Math.abs(dx);
      const overlapY = (first.size.height + second.size.height) / 2 + padding - Math.abs(dy);
      if (overlapX <= 0 || overlapY <= 0) return null;
      if (overlapX < overlapY) {
        return { x: (dx >= 0 ? 1 : -1) * (overlapX + config.layout.overlapMinNudge), y: 0 };
      }
      return { x: 0, y: (dy >= 0 ? 1 : -1) * (overlapY + config.layout.overlapMinNudge) };
    }

    function separateItems(first, second, overlap) {
      if (first.node.id === model.ROOT_ID && second.node.id === model.ROOT_ID) return;
      if (first.node.id === model.ROOT_ID) {
        second.point.x += overlap.x;
        second.point.y += overlap.y;
        return;
      }
      if (second.node.id === model.ROOT_ID) {
        first.point.x -= overlap.x;
        first.point.y -= overlap.y;
        return;
      }
      first.point.x -= overlap.x / 2;
      first.point.y -= overlap.y / 2;
      second.point.x += overlap.x / 2;
      second.point.y += overlap.y / 2;
    }

    function layoutBounds(nodes, positions, viewMode) {
      const boxes = nodes
        .map(({ node }) => {
          const point = positions.get(node.id);
          if (!point) return null;
          const size = nodeSize(node, viewMode);
          return {
            left: point.x - size.width / 2,
            right: point.x + size.width / 2,
            top: point.y - size.height / 2,
            bottom: point.y + size.height / 2
          };
        })
        .filter(Boolean);
      if (!boxes.length) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
      const left = Math.min(...boxes.map((box) => box.left));
      const right = Math.max(...boxes.map((box) => box.right));
      const top = Math.min(...boxes.map((box) => box.top));
      const bottom = Math.max(...boxes.map((box) => box.bottom));
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    }

    return {
      layout,
      nodeSize,
      maxNodeWidth
    };
  }

  RingMapChart.createLayoutEngine = createLayoutEngine;
})(window);
