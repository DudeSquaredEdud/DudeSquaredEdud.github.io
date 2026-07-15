(function (global) {
  "use strict";

  const RingMapChart = global.RingMapChart;
  const { config, model, utils } = RingMapChart;

  function Renderer(svg, layoutEngine) {
    this.svg = svg;
    this.layoutEngine = layoutEngine;
    this.viewMode = "radial";
    this.viewBox = { x: 0, y: 0, width: config.layout.minViewportWidth, height: config.layout.minViewportHeight };
    this.handlers = null;
    this.bindEvents();
  }

  Renderer.prototype.render = function (data, handlers) {
    this.handlers = handlers;
    this.viewBox = data.viewBox;
    this.viewMode = data.viewMode || "radial";
    this.setViewBox(data.viewBox);
    this.svg.replaceChildren();
    this.svg.classList.toggle("dense-map", data.nodes.length > config.layout.maxDetailedEdgeNodes);

    const defs = this.renderDefs();
    const guidesLayer = utils.svgEl("g", { class: "ring-guides", "aria-hidden": "true" });
    const edgesLayer = utils.svgEl("g", { class: "edges" });
    const pathEdgesLayer = utils.svgEl("g", { class: "path-edges" });
    const nodesLayer = utils.svgEl("g", { class: "nodes" });
    this.svg.append(defs, guidesLayer, edgesLayer, pathEdgesLayer, nodesLayer);

    (data.rings || []).forEach((ring) => this.renderRingGuide(guidesLayer, ring));
    const detailedEdges = data.nodes.length <= config.layout.maxDetailedEdgeNodes;
    data.nodes.forEach(({ node }) => {
      node.children.forEach((child) => this.renderEdge(edgesLayer, pathEdgesLayer, defs, data.tree, node, child, data.positions, data.focusContext, detailedEdges));
    });
    data.nodes.forEach(({ node, parent }) => {
      this.renderNode(nodesLayer, data.tree, node, parent, data.positions.get(node.id), data.previousPositions && data.previousPositions.get(node.id), data.focusedId, data.animatedFocusId, data.animatedNewId, data.focusContext, data.mapRootIds, data.showStatusMarkers, data.showPriorityMarkers, data.viewMode, handlers);
    });
  };

  Renderer.prototype.bindEvents = function () {
    this.svg.addEventListener("pointerdown", (event) => {
      const item = eventNode(event, this.svg);
      if (!item || !this.handlers || !this.handlers.nodePointerDown) return;
      this.handlers.nodePointerDown(event, item.id);
    });
    this.svg.addEventListener("click", (event) => {
      const item = eventNode(event, this.svg);
      if (!item || !this.handlers || !this.handlers.focus) return;
      this.handlers.focus(item.id, event);
    });
    this.svg.addEventListener("dblclick", (event) => {
      const item = eventNode(event, this.svg);
      if (!item || !this.handlers) return;
      const group = (event.target.closest && event.target.closest(".node")) || item.group;
      const noteTarget = event.target.closest && event.target.closest(".note-marker, .node-note-preview");
      if (noteTarget && this.handlers.openNote) {
        this.handlers.openNote(item.id);
        return;
      }
      if (!this.handlers.edit) return;
      this.handlers.edit(item.id);
    });
  };

  Renderer.prototype.setViewBox = function (viewBox) {
    this.viewBox = viewBox;
    this.svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
  };

  Renderer.prototype.renderDefs = function () {
    const defs = utils.svgEl("defs");
    const sketchFilter = utils.svgEl("filter", {
      id: "pencil-sketch",
      x: "-8%",
      y: "-8%",
      width: "116%",
      height: "116%"
    });
    sketchFilter.append(
      utils.svgEl("feTurbulence", {
        type: "fractalNoise",
        baseFrequency: "0.035",
        numOctaves: "2",
        seed: "7",
        result: "noise"
      }),
      utils.svgEl("feDisplacementMap", {
        in: "SourceGraphic",
        in2: "noise",
        scale: "1.8",
        xChannelSelector: "R",
        yChannelSelector: "G",
        result: "wobble"
      }),
      utils.svgEl("feTurbulence", {
        type: "fractalNoise",
        baseFrequency: "0.82",
        numOctaves: "3",
        seed: "19",
        result: "grain"
      }),
      utils.svgEl("feColorMatrix", {
        in: "grain",
        type: "matrix",
        values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .3 .3 .3 0 .55",
        result: "grainAlpha"
      }),
      utils.svgEl("feComposite", {
        in: "wobble",
        in2: "grainAlpha",
        operator: "in"
      })
    );
    defs.append(sketchFilter);
    const dustFilter = utils.svgEl("filter", {
      id: "dust-edge-grain",
      x: "-18%",
      y: "-18%",
      width: "136%",
      height: "136%"
    });
    dustFilter.append(
      utils.svgEl("feTurbulence", {
        type: "fractalNoise",
        baseFrequency: "0.92",
        numOctaves: "4",
        seed: "31",
        result: "grain"
      }),
      utils.svgEl("feColorMatrix", {
        in: "grain",
        type: "matrix",
        values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .95 .95 .95 0 -.28",
        result: "grainAlpha"
      }),
      utils.svgEl("feComposite", {
        in: "SourceGraphic",
        in2: "grainAlpha",
        operator: "in",
        result: "texturedStroke"
      }),
      utils.svgEl("feTurbulence", {
        type: "fractalNoise",
        baseFrequency: "0.09",
        numOctaves: "2",
        seed: "13",
        result: "wobble"
      }),
      utils.svgEl("feDisplacementMap", {
        in: "texturedStroke",
        in2: "wobble",
        scale: "1.7",
        xChannelSelector: "R",
        yChannelSelector: "G",
        result: "roughStatic"
      }),
      utils.svgEl("feGaussianBlur", {
        in: "roughStatic",
        stdDeviation: "0.16"
      })
    );
    defs.append(dustFilter);
    config.textures.forEach((markup, index) => {
      const pattern = utils.svgEl("pattern", {
        id: `texture-${index}`,
        width: "8",
        height: "8",
        patternUnits: "userSpaceOnUse"
      });
      pattern.innerHTML = markup;
      defs.append(pattern);
    });
    return defs;
  };

  Renderer.prototype.renderRingGuide = function (layer, ring) {
    layer.append(utils.svgEl("circle", {
      class: `ring-guide depth-${ring.depth}`,
      cx: ring.center.x,
      cy: ring.center.y,
      r: ring.radius,
      opacity: config.layout.ringGuideOpacity
    }));
  };

  Renderer.prototype.renderEdge = function (layer, pathLayer, defs, tree, parent, child, positions, focusContext, detailedEdges) {
    const from = positions.get(parent.id);
    const to = positions.get(child.id);
    if (!from || !to) return;
    const gradientId = detailedEdges ? `grad-${parent.id}-${child.id}` : "";
    if (detailedEdges) {
      const gradient = utils.svgEl("linearGradient", {
        id: gradientId,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        gradientUnits: "userSpaceOnUse"
      });
      gradient.append(
        utils.svgEl("stop", { offset: "0%", "stop-color": renderColor(tree, parent) }),
        utils.svgEl("stop", { offset: "100%", "stop-color": renderColor(tree, child) })
      );
      defs.append(gradient);
    }
    const isPathEdge = Boolean(focusContext && focusContext.pathChildIds && focusContext.pathChildIds.has(child.id));
    const targetLayer = isPathEdge ? pathLayer : layer;
    const edge = utils.svgEl("path", {
      class: `edge ${isPathEdge ? "path-edge" : ""}`,
      d: `M ${from.x} ${from.y} L ${to.x} ${to.y}`,
      stroke: detailedEdges ? `url(#${gradientId})` : renderColor(tree, child)
    });
    targetLayer.append(utils.svgEl("path", {
      class: `dust-edge ${isPathEdge ? "path-edge" : ""}`,
      d: `M ${from.x} ${from.y} L ${to.x} ${to.y}`,
      stroke: detailedEdges ? `url(#${gradientId})` : renderColor(tree, child)
    }));
    targetLayer.append(edge);
    if (detailedEdges) targetLayer.append(this.renderPencilEdge(parent.id + "-" + child.id, from, to, isPathEdge));
  };

  Renderer.prototype.renderPencilEdge = function (id, from, to, isPathEdge) {
    const group = utils.svgEl("g", {
      class: `pencil-edge ${isPathEdge ? "path-edge" : ""}`,
      "aria-hidden": "true"
    });
    const strokes = isPathEdge ? 5 : 4;
    for (let index = 0; index < strokes; index += 1) {
      group.append(utils.svgEl("path", {
        class: "pencil-stroke",
        d: pencilPath(id, from, to, index),
        "data-stroke": String(index)
      }));
    }
    return group;
  };

  Renderer.prototype.renderNode = function (layer, tree, node, parent, point, previousPoint, focusedId, animatedFocusId, animatedNewId, focusContext, mapRootIds, showStatusMarkers, showPriorityMarkers, viewMode, handlers) {
    if (!point) return;
    const size = this.layoutEngine.nodeSize(node, viewMode);
    const color = renderColor(tree, node);
    const hasMap = Boolean(mapRootIds && mapRootIds.has(node.sourceId || node.id));
    const hasNote = Boolean(node.note && node.note.trim());
    const isSibling = Boolean(focusContext && focusContext.siblingIds && focusContext.siblingIds.has(node.id) && node.id !== focusedId);
    const isPathNode = Boolean(focusContext && focusContext.pathNodeIds && focusContext.pathNodeIds.has(node.id));
    const group = utils.svgEl("g", {
      class: `node depth-${node.depth} view-${viewMode || "radial"} role-${viewRole(viewMode, node.depth)} ${node.depth === 3 ? "leaf" : ""} ${hasMap ? "has-map" : ""} ${hasNote ? "has-note" : ""} ${isSibling ? "sibling" : ""} ${isPathNode ? "path-node" : ""} ${node.id === focusedId ? "focused" : ""}`,
      transform: `translate(${point.x - size.width / 2}, ${point.y - size.height / 2})`,
      tabindex: "0",
      role: "button",
      "aria-label": node.label,
      "data-node-id": node.id
    });
    if (node.id === animatedFocusId) group.classList.add("focus-pop");
    if (node.id === animatedNewId) group.classList.add("node-enter");

    if (previousPoint && Math.hypot(previousPoint.x - point.x, previousPoint.y - point.y) > 2) {
      const settle = utils.svgEl("animateTransform", {
        attributeName: "transform",
        type: "translate",
        additive: "sum",
        from: `${(previousPoint.x - point.x).toFixed(1)} ${(previousPoint.y - point.y).toFixed(1)}`,
        to: "0 0",
        dur: "170ms"
      });
      group.append(settle);
    }

    group.append(utils.svgEl("rect", {
      class: "node-box",
      width: size.width,
      height: size.height,
      fill: node.depth === 0 ? "var(--root-node-fill)" : "var(--node-fill)",
      stroke: color
    }));
    group.append(utils.svgEl("rect", {
      class: "node-accent",
      x: 0,
      y: 0,
      width: Math.min(7, Math.max(4, size.width * 0.025)),
      height: size.height,
      fill: color,
      "pointer-events": "none",
      "aria-hidden": "true"
    }));

    if (node.markerEnabled === true && showPriorityMarkers) {
      this.renderMetaMarker(group, node, size, showStatusMarkers, showPriorityMarkers);
    }

    if (hasMap) {
      group.append(utils.svgEl("line", {
        class: "map-marker",
        x1: 10,
        y1: size.height + 5,
        x2: size.width - 10,
        y2: size.height + 5,
        stroke: color
      }));
    }

    if (hasNote) {
      group.append(utils.svgEl("circle", {
        class: "note-marker",
        cx: size.width - 10,
        cy: 10,
        r: 3.2,
        fill: color
      }));
    }

    const title = utils.svgEl("title");
    title.textContent = node.label;
    group.append(title);

    const textureIndex = model.textureIndex(tree, node);
    if (textureIndex !== null && node.depth > 1) {
      group.append(utils.svgEl("rect", {
        class: "texture-fill",
        width: size.width,
        height: size.height,
        fill: `url(#texture-${textureIndex % config.textures.length})`,
        "pointer-events": "none"
      }));
    }

    if (node.depth === 3 && parent) {
      const marker = utils.svgEl("text", { class: "leaf-marker", x: 8, y: 11 });
      const index = parent.children.findIndex((child) => child.id === node.id);
      marker.textContent = config.romanNumerals[index] || String(index + 1);
      group.append(marker);
    }

    this.renderNodeText(group, node, size, viewMode, handlers, showPriorityMarkers);
    layer.append(group);
  };

  Renderer.prototype.renderNodeText = function (group, node, size, viewMode, handlers, showPriorityMarkers) {
    const profile = textProfile(viewMode, node.depth);
    if (!profile) {
      const label = utils.svgEl("text", { class: "node-label", x: size.width / 2, y: size.height / 2 });
      label.textContent = node.label;
      group.append(label);
      return;
    }

    const labelLines = markdownLines(node.label, profile.labelChars, profile.labelLines, "heading");
    const noteLines = markdownLines(node.note, profile.noteChars, profile.noteLines, "note");
    const contentHeight = labelLines.length * profile.labelLineHeight +
      (noteLines.length ? profile.noteGap + noteLines.length * profile.noteLineHeight : 0);
    let y = Math.max(profile.padY, (size.height - contentHeight) / 2);
    const markerIndent = node.markerEnabled === true && showPriorityMarkers ? Math.min(34, Math.max(26, size.width * 0.08)) : 0;
    const x = profile.padX + markerIndent;
    const label = utils.svgEl("text", {
      class: "node-label",
      x,
      y: y + profile.labelLineHeight / 2,
      "text-anchor": "start",
      "dominant-baseline": "middle"
    });
    appendMarkdownTspans(label, labelLines, x, profile.labelLineHeight, handlers);
    group.append(label);

    if (!noteLines.length) return;
    y += labelLines.length * profile.labelLineHeight + profile.noteGap;
    const note = utils.svgEl("text", {
      class: "node-note-preview",
      x,
      y: y + profile.noteLineHeight / 2,
      "text-anchor": "start",
      "dominant-baseline": "middle"
    });
    appendMarkdownTspans(note, noteLines, x, profile.noteLineHeight, handlers);
    group.append(note);
  };

  Renderer.prototype.renderMetaMarker = function (group, node, size, showStatusMarkers, showPriorityMarkers) {
    const statusColor = {
      open: "#ef4444",
      active: "#22c55e",
      waiting: "#f59e0b",
      done: "#3b82f6"
    }[node.status || "open"] || "#ef4444";
    const priority = node.priority || "normal";
    const markerRadius = Math.min(34, Math.max(24, Math.min(size.width, size.height) * 0.42));
    const marker = utils.svgEl("g", {
      class: `meta-marker status-${node.status || "open"} priority-${priority}`,
      transform: "translate(0, 0)"
    });
    if (showPriorityMarkers) {
      marker.append(utils.svgEl("path", {
        class: "priority-corner-base",
        d: `M0 0H${markerRadius}A${markerRadius} ${markerRadius} 0 0 1 0 ${markerRadius}Z`
      }));
      const clipPath = utils.svgEl("clipPath", {
        id: `priority-clip-${node.id}`
      });
      clipPath.append(utils.svgEl("path", {
        d: `M0 0H${markerRadius}A${markerRadius} ${markerRadius} 0 0 1 0 ${markerRadius}Z`
      }));
      marker.append(clipPath);
      marker.append(utils.svgEl("g", {
        class: "priority-fill-layer",
        "clip-path": `url(#priority-clip-${node.id})`
      }));
      this.renderPriorityFill(marker.lastChild, priority, markerRadius, statusColor, showStatusMarkers);
    }
    group.append(marker);
  };

  Renderer.prototype.renderPriorityFill = function (marker, priority, radius, statusColor, showStatusMarkers) {
    const fillColor = showStatusMarkers ? statusColor : "var(--muted)";
    const amount = {
      low: 0.28,
      normal: 0.52,
      high: 0.76,
      critical: 1
    }[priority] || 0.38;
    const fillRadius = radius * amount;
    const d = [
      "M0 0",
      `H${fillRadius.toFixed(2)}`,
      `A${fillRadius.toFixed(2)} ${fillRadius.toFixed(2)} 0 0 1 0 ${fillRadius.toFixed(2)}`,
      "Z"
    ].join(" ");
    marker.append(utils.svgEl("path", {
      class: `priority-fill priority-fill-${priority}`,
      d,
      fill: fillColor
    }));
    marker.append(utils.svgEl("path", {
      class: "priority-fill-rim",
      d: `M${fillRadius.toFixed(2)} 0A${fillRadius.toFixed(2)} ${fillRadius.toFixed(2)} 0 0 1 0 ${fillRadius.toFixed(2)}`,
      stroke: fillColor
    }));
  };

  Renderer.prototype.editorRect = function (node, point, activeViewBox) {
    const size = this.layoutEngine.nodeSize(node, this.viewMode);
    const rect = this.svg.getBoundingClientRect();
    return {
      left: (point.x - size.width / 2 - activeViewBox.x) * (rect.width / activeViewBox.width),
      top: (point.y - size.height / 2 - activeViewBox.y) * (rect.height / activeViewBox.height),
      width: size.width * (rect.width / activeViewBox.width),
      height: size.height * (rect.height / activeViewBox.height)
    };
  };

  function renderColor(tree, node) {
    return node.depth === 0 ? "var(--root-node-fill)" : model.nodeColor(tree, node);
  }

  function eventNode(event, svg) {
    const target = event.target;
    const group = target && target.closest ? target.closest(".node") : null;
    if (group && svg.contains(group)) return nodeItem(group);
    return eventNodeAtPoint(event, svg);
  }

  function eventNodeAtPoint(event, svg) {
    if (!event || !svg) return null;
    const nodes = Array.from(svg.querySelectorAll(".node"));
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const group = nodes[index];
      const rect = group.getBoundingClientRect();
      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) return nodeItem(group);
    }
    return null;
  }

  function nodeItem(group) {
    const id = group && group.getAttribute("data-node-id");
    return id ? { id, group } : null;
  }

  function viewRole(viewMode, depth) {
    const roles = {
      book: ["cover", "chapter", "section", "note"],
      document: ["doc-title", "section", "subsection", "subsubsection"]
    };
    return (roles[viewMode] && roles[viewMode][depth]) || "node";
  }

  function textProfile(viewMode, depth) {
    const profiles = {
      book: {
        0: { padX: 24, padY: 24, labelChars: 25, labelLines: 2, noteChars: 54, noteLines: Infinity, labelLineHeight: 31, noteLineHeight: 21, noteGap: 16 },
        1: { padX: 19, padY: 17, labelChars: 25, labelLines: 2, noteChars: 44, noteLines: Infinity, labelLineHeight: 24, noteLineHeight: 19, noteGap: 13 },
        2: { padX: 17, padY: 16, labelChars: 30, labelLines: 2, noteChars: 48, noteLines: Infinity, labelLineHeight: 22, noteLineHeight: 18, noteGap: 12 },
        3: { padX: 15, padY: 14, labelChars: 26, labelLines: 2, noteChars: 40, noteLines: Infinity, labelLineHeight: 20, noteLineHeight: 17, noteGap: 10 }
      },
      document: {
        0: { padX: 32, padY: 28, labelChars: 40, labelLines: 2, noteChars: 86, noteLines: Infinity, labelLineHeight: 36, noteLineHeight: 22, noteGap: 18 },
        1: { padX: 26, padY: 18, labelChars: 52, labelLines: 2, noteChars: 84, noteLines: Infinity, labelLineHeight: 27, noteLineHeight: 20, noteGap: 14 },
        2: { padX: 24, padY: 15, labelChars: 56, labelLines: 2, noteChars: 80, noteLines: Infinity, labelLineHeight: 23, noteLineHeight: 19, noteGap: 12 },
        3: { padX: 22, padY: 13, labelChars: 58, labelLines: 2, noteChars: 76, noteLines: Infinity, labelLineHeight: 20, noteLineHeight: 18, noteGap: 10 }
      }
    };
    return profiles[viewMode] && profiles[viewMode][depth];
  }

  function appendMarkdownTspans(text, lines, x, lineHeight, handlers) {
    lines.forEach((line, lineIndex) => {
      if (!line.segments.length) return;
      let first = true;
      line.segments.forEach((segment) => {
        const attrs = {
          dy: lineIndex === 0 && first ? 0 : first ? lineHeight : 0
        };
        if (first) attrs.x = x;
        if (segment.bold || segment.tableHeader || segment.tablePrimary || line.variant === "heading" || line.variant === "table-heading") attrs["font-weight"] = "900";
        if (segment.italic || line.variant === "quote") attrs["font-style"] = "italic";
        if (segment.strike) attrs["text-decoration"] = "line-through";
        if (segment.code) attrs.class = "markdown-code";
        if (segment.codeBlock) {
          attrs.class = attrs.class ? attrs.class + " markdown-code-block" : "markdown-code-block";
          attrs["xml:space"] = "preserve";
        }
        if (segment.link) attrs.class = attrs.class ? attrs.class + " markdown-link" : "markdown-link";
        if (segment.highlight) attrs.class = attrs.class ? attrs.class + " markdown-highlight" : "markdown-highlight";
        if (segment.tableCell) attrs.class = attrs.class ? attrs.class + " markdown-table-cell" : "markdown-table-cell";
        if (segment.tableHeader) attrs.class = attrs.class ? attrs.class + " markdown-table-header" : "markdown-table-header";
        if (segment.tablePrimary) attrs.class = attrs.class ? attrs.class + " markdown-table-primary" : "markdown-table-primary";
        if (line.variant === "table-card-meta") attrs.class = attrs.class ? attrs.class + " markdown-table-meta" : "markdown-table-meta";
        if (segment.cellX !== null && segment.cellX !== undefined) attrs.x = x + segment.cellX;
        const tspan = utils.svgEl("tspan", attrs);
        tspan.textContent = segment.text;
        if (segment.action && handlers.markdownAction) {
          tspan.setAttribute("role", "link");
          tspan.setAttribute("tabindex", "0");
          tspan.addEventListener("click", (event) => {
            event.stopPropagation();
            handlers.markdownAction(segment.action, event);
          });
          tspan.addEventListener("pointerdown", (event) => {
            event.stopPropagation();
          });
          tspan.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            handlers.markdownAction(segment.action, event);
          });
        }
        text.append(tspan);
        first = false;
      });
    });
  }

  function markdownLines(text, charsPerLine, maxLines, purpose) {
    if (!charsPerLine || !maxLines) return [];
    const clean = String(text || "").trim();
    if (!clean) return [];
    const limit = Number.isFinite(maxLines) ? maxLines : Infinity;
    const result = [];
    const rawLines = clean.split("\n");
    for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex += 1) {
      const rawLine = rawLines[lineIndex];
      const code = markdownCodeBlockLines(rawLines, lineIndex, charsPerLine);
      if (code) {
        code.lines.forEach((line) => result.push(line));
        lineIndex += code.consumed - 1;
        continue;
      }
      if (!rawLine.trim()) continue;
      const table = markdownTableLines(rawLines, lineIndex, charsPerLine);
      if (table) {
        table.lines.forEach((line) => result.push(line));
        lineIndex += table.consumed - 1;
        continue;
      }
      const block = blockMarkdown(rawLine, purpose);
      if (block.variant === "rule") {
        result.push({ segments: [markdownSegment("─".repeat(Math.max(32, charsPerLine)))], variant: "rule" });
        continue;
      }
      wrapSegments(parseInlineMarkdown(block.text), charsPerLine).forEach((segments) => {
        result.push({ segments, variant: block.variant });
      });
    }
    return result.slice(0, limit);
  }

  function markdownCodeBlockLines(rawLines, startIndex, charsPerLine) {
    const first = String(rawLines[startIndex] || "").trim();
    if (!/^```/.test(first)) return null;
    const body = [];
    let cursor = startIndex + 1;
    while (cursor < rawLines.length) {
      const line = String(rawLines[cursor] || "");
      if (/^```/.test(line.trim())) break;
      body.push(line.replace(/\t/g, "  "));
      cursor += 1;
    }
    const consumed = cursor < rawLines.length ? cursor - startIndex + 1 : cursor - startIndex;
    const width = Math.max(8, charsPerLine - 2);
    const lines = [];
    const source = body.length ? body : [""];
    source.forEach((line) => {
      fixedWidthChunks(line, width).forEach((chunk) => {
        lines.push({
          segments: [markdownSegment("  " + (chunk || " "), { code: true, codeBlock: true })],
          variant: "code-block"
        });
      });
    });
    return { lines, consumed: Math.max(1, consumed) };
  }

  function fixedWidthChunks(value, width) {
    const text = String(value || "");
    if (!text) return [""];
    const chunks = [];
    for (let index = 0; index < text.length; index += width) {
      chunks.push(text.slice(index, index + width));
    }
    return chunks;
  }

  function markdownTableLines(rawLines, startIndex, charsPerLine) {
    const header = parseTableRow(rawLines[startIndex]);
    const separator = parseTableRow(rawLines[startIndex + 1]);
    if (!header || !separator || !isTableSeparator(separator.cells)) return null;

    const rows = [header.cells];
    let cursor = startIndex + 2;
    while (cursor < rawLines.length) {
      const nextSeparator = parseTableRow(rawLines[cursor + 1]);
      if (cursor > startIndex + 2 && nextSeparator && isTableSeparator(nextSeparator.cells)) break;
      const row = parseTableRow(rawLines[cursor]);
      if (!row) break;
      rows.push(row.cells);
      cursor += 1;
    }

    const colCount = Math.max(1, ...rows.map((row) => row.length));
    const lines = colCount > 4
      ? wideTableCardLines(rows, charsPerLine)
      : compactTableLines(rows, colCount, charsPerLine);
    return { lines, consumed: Math.max(2, cursor - startIndex) };
  }

  function parseTableRow(rawLine) {
    const text = String(rawLine || "").trim();
    if (!text || !text.includes("|")) return null;
    const body = text.replace(/^\|/, "").replace(/\|$/, "");
    const cells = body.split("|").map((cell) => cell.trim());
    if (cells.length < 2) return null;
    return { cells };
  }

  function isTableSeparator(cells) {
    return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
  }

  function compactTableLines(rows, colCount, charsPerLine) {
    const gapChars = 3;
    const cellChars = Math.max(5, Math.floor((charsPerLine - (colCount - 1) * gapChars) / colCount));
    const cellStep = Math.max(52, (cellChars + gapChars) * 7);
    const lines = [];

    rows.forEach((cells, rowIndex) => {
      const wrappedCells = [];
      for (let index = 0; index < colCount; index += 1) {
        wrappedCells.push(wrapTableCell(cells[index] || "", cellChars));
      }
      const rowHeight = Math.max(1, ...wrappedCells.map((cell) => cell.length));
      for (let lineIndex = 0; lineIndex < rowHeight; lineIndex += 1) {
        lines.push({
          segments: tableSegments(wrappedCells.map((cell) => cell[lineIndex] || ""), colCount, cellStep, rowIndex === 0),
          variant: rowIndex === 0 ? "table-heading" : "table"
        });
      }
      if (rowIndex === 0 || rowIndex < rows.length - 1) {
        lines.push({
          segments: [markdownSegment("─".repeat(Math.max(18, Math.min(charsPerLine, colCount * cellChars + (colCount - 1) * gapChars))))],
          variant: rowIndex === 0 ? "table-rule" : "table-row-rule"
        });
      }
    });
    return lines;
  }

  function wideTableCardLines(rows, charsPerLine) {
    const headers = rows[0].map((cell) => cleanMarkdownCell(cell));
    const lines = [];
    rows.slice(1).forEach((cells, rowIndex) => {
      const title = cleanMarkdownCell(cells[0] || "Row " + (rowIndex + 1));
      wrapSegments(parseInlineMarkdown(title), charsPerLine).forEach((segments) => {
        lines.push({ segments: segments.map((segment) => Object.assign({}, segment, { tablePrimary: true })), variant: "table-card-title" });
      });
      const details = cells.slice(1)
        .map((cell, index) => {
          const header = headers[index + 1] || "Field " + (index + 2);
          const value = cleanMarkdownCell(cell);
          return value ? header + ": " + value : "";
        })
        .filter(Boolean)
        .join(" · ");
      if (details) {
        wrapSegments(parseInlineMarkdown(details), Math.max(12, charsPerLine - 2)).forEach((segments) => {
          lines.push({ segments, variant: "table-card-meta" });
        });
      }
      if (rowIndex < rows.length - 2) {
        lines.push({ segments: [markdownSegment("─".repeat(Math.max(18, Math.min(charsPerLine, 42))))], variant: "table-row-rule" });
      }
    });
    return lines;
  }

  function wrapTableCell(value, maxChars) {
    const text = cleanMarkdownCell(value);
    if (!text) return [""];
    const lines = [];
    let line = "";
    text.split(/\s+/).filter(Boolean).forEach((word) => {
      const next = line ? line + " " + word : word;
      if (next.length <= maxChars) {
        line = next;
        return;
      }
      if (line) lines.push(line);
      line = word.length > maxChars ? word.slice(0, maxChars) : word;
    });
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function cleanMarkdownCell(value) {
    return String(value || "").trim();
  }

  function tableSegments(cells, colCount, cellStep, isHeader) {
    const segments = [];
    for (let index = 0; index < colCount; index += 1) {
      const parsed = parseInlineMarkdown(cells[index] || "");
      parsed.forEach((segment, segmentIndex) => {
        segments.push(Object.assign({}, segment, {
          tableHeader: isHeader,
          tableCell: true,
          tablePrimary: index === 0,
          cellX: segmentIndex === 0 ? index * cellStep : null
        }));
      });
    }
    return segments.length ? segments : [markdownSegment("")];
  }

  function blockMarkdown(rawLine, purpose) {
    let text = String(rawLine || "").trim();
    let variant = purpose || "note";
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(text)) {
      return { text: "", variant: "rule" };
    }
    if (/^\|.*\|$/.test(text)) {
      return { text: text.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()).filter(Boolean).join("  •  "), variant };
    }
    const heading = text.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      return { text: heading[2], variant: "heading" };
    }
    const task = text.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/);
    if (task) {
      return { text: (task[1].trim() ? "☑ " : "☐ ") + task[2], variant };
    }
    const unordered = text.match(/^[-*+]\s+(.+)$/);
    if (unordered) {
      return { text: "• " + unordered[1], variant };
    }
    const ordered = text.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      return { text: "• " + ordered[1], variant };
    }
    const quote = text.match(/^>\s+(.+)$/);
    if (quote) {
      return { text: quote[1], variant: "quote" };
    }
    return { text, variant };
  }

  function wrapSegments(segments, charsPerLine) {
    const lines = [];
    let line = [];
    let length = 0;
    segments.forEach((segment) => {
      const words = segment.text.split(/(\s+)/).filter(Boolean);
      words.forEach((word) => {
        const isSpace = /^\s+$/.test(word);
        const text = isSpace ? " " : word;
        if (!isSpace && length > 0 && length + text.length > charsPerLine) {
          lines.push(line);
          line = [];
          length = 0;
        }
        if (isSpace && length === 0) return;
        pushSegment(line, Object.assign({}, segment, { text }));
        length += text.length;
      });
    });
    if (line.length) lines.push(line);
    return lines.length ? lines : [[markdownSegment("")]];
  }

  function pushSegment(line, segment) {
    const previous = line[line.length - 1];
    if (previous &&
      previous.bold === segment.bold &&
      previous.italic === segment.italic &&
      previous.code === segment.code &&
      previous.strike === segment.strike &&
      previous.highlight === segment.highlight &&
      previous.link === segment.link &&
      JSON.stringify(previous.action) === JSON.stringify(segment.action)) {
      previous.text += segment.text;
      return;
    }
    line.push(segment);
  }

  function parseInlineMarkdown(text) {
    const source = String(text || "");
    const segments = [];
    const pattern = /(\*\*([^*]+)\*\*)|(__([^_]+)__)|(~~([^~]+)~~)|(==([^=]+)==)|(`([^`]+)`)|(!\[([^\]]*)\]\([^)]+\))|(\*([^*]+)\*)|(_([^_]+)_)|(\[([^\]]+)\]\([^)]+\))|(\[\[([^\]|]+)\|([^\]]+)\]\])|(\[\[([^\]]+)\]\])/g;
    let cursor = 0;
    let match;
    while ((match = pattern.exec(source))) {
      if (match.index > cursor) segments.push(markdownSegment(source.slice(cursor, match.index)));
      if (match[2]) segments.push(markdownSegment(match[2], { bold: true }));
      else if (match[4]) segments.push(markdownSegment(match[4], { bold: true }));
      else if (match[6]) segments.push(markdownSegment(match[6], { strike: true }));
      else if (match[8]) segments.push(markdownSegment(match[8], { highlight: true }));
      else if (match[10]) segments.push(markdownSegment(match[10], { code: true }));
      else if (match[12] !== undefined) segments.push(markdownSegment("▣ " + (match[12] || "image"), { italic: true }));
      else if (match[14]) segments.push(markdownSegment(match[14], { italic: true }));
      else if (match[16]) segments.push(markdownSegment(match[16], { italic: true }));
      else if (match[18]) segments.push(markdownSegment(match[18], { link: true, action: { kind: "url", href: match[0].match(/\(([^)]+)\)$/)[1] } }));
      else if (match[21]) segments.push(markdownSegment(match[21], { link: true, action: { kind: "node", target: match[20] } }));
      else if (match[23]) segments.push(markdownSegment(match[23], { link: true, action: { kind: isHttpUrl(match[23]) ? "url" : "node", href: match[23], target: match[23] } }));
      cursor = pattern.lastIndex;
    }
    if (cursor < source.length) segments.push(markdownSegment(source.slice(cursor)));
    return segments.length ? segments : [markdownSegment(source)];
  }

  function markdownSegment(text, attrs) {
    return Object.assign({ text, bold: false, italic: false, code: false, codeBlock: false, strike: false, highlight: false, link: false, action: null }, attrs || {});
  }

  function isHttpUrl(value) {
    return /^https?:\/\/\S+$/i.test(String(value || "").trim());
  }

  function pencilPath(id, from, to, index) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;
    const seed = hashString(id + ":" + index);
    const offsetA = seededRange(seed, -1.8, 1.8);
    const offsetB = seededRange(seed * 7, -2.2, 2.2);
    const bow = seededRange(seed * 13, -7, 7);
    const start = {
      x: from.x + nx * offsetA + seededRange(seed * 17, -1.4, 1.4),
      y: from.y + ny * offsetA + seededRange(seed * 19, -1.4, 1.4)
    };
    const end = {
      x: to.x + nx * offsetB + seededRange(seed * 23, -1.4, 1.4),
      y: to.y + ny * offsetB + seededRange(seed * 29, -1.4, 1.4)
    };
    const c1 = {
      x: from.x + dx * 0.34 + nx * (offsetA + bow),
      y: from.y + dy * 0.34 + ny * (offsetA + bow)
    };
    const c2 = {
      x: from.x + dx * 0.68 + nx * (offsetB - bow * 0.6),
      y: from.y + dy * 0.68 + ny * (offsetB - bow * 0.6)
    };
    return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRange(seed, min, max) {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return min + (value - Math.floor(value)) * (max - min);
  }

  RingMapChart.Renderer = Renderer;
})(window);
