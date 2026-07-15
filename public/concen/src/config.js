(function (global) {
  "use strict";

  const RingMapChart = global.RingMapChart || {};

  RingMapChart.config = {
    limits: {
      maxChildren: 12,
      maxDepth: 3,
      maxLabelLength: 80,
      maxNoteLength: 12000,
      maxTagLength: 24,
      maxTags: 8,
      maxStoredBytes: 5000000
    },
    storageKey: "ring-map-chart-v3",
    recentMindsKey: "ring-map-chart-recent-minds-v1",
    backgroundImageMaxDataUrlLength: 1500000,
    layout: {
      minViewportWidth: 900,
      minViewportHeight: 560,
      ringStartAngle: -Math.PI / 2,
      nodeWidth: 132,
      nodeHeight: 42,
      rootWidth: 168,
      rootHeight: 48,
      nodePadX: 26,
      ringGuideOpacity: 0.42,
      minSiblingArc: Math.PI / 5,
      singleChildAngleOffset: Math.PI / 4,
      compactRingGap: 108,
      secondaryRingGap: 92,
      leafRingGap: 128,
      ringFitPadding: 72,
      minNodeDistance: 42,
      minPrimarySector: Math.PI / 10,
      leafWeight: 1.35,
      overlapPadding: 18,
      overlapResolvePasses: 36,
      maxOverlapResolveNodes: 420,
      maxDetailedEdgeNodes: 420,
      overlapMinNudge: 10,
      overlapStagger: 18
    },
    spacingDefaults: {
      treeLevelGap: 72,
      treeLeafGap: 92,
      ringBaseRadius: 102,
      ringDepthGap: 90,
      ringNodeGap: 20
    },
    spacingLimits: {
      treeLevelGap: { min: 40, max: 260 },
      treeLeafGap: { min: 32, max: 360 },
      ringBaseRadius: { min: 40, max: 500 },
      ringDepthGap: { min: 40, max: 500 },
      ringNodeGap: { min: 0, max: 200 }
    },
    layoutModeControls: {
      tree: {
        label: "Flat",
        controls: {
          treeLevelGap: "Layer spacing",
          treeLeafGap: "Column spacing"
        }
      },
      radial: {
        label: "Radial",
        controls: {
          ringBaseRadius: "Center radius",
          ringDepthGap: "Ring spacing",
          ringNodeGap: "Node spacing"
        }
      },
      book: {
        label: "Tree",
        controls: {
          treeLevelGap: "Row spacing",
          treeLeafGap: "Column spacing"
        }
      },
      document: {
        label: "Book",
        controls: {
          treeLevelGap: "Paragraph spacing"
        }
      },
      notes: {
        label: "Notes",
        controls: {}
      }
    },
    appearanceDefaults: {
      nodeFontSize: 13,
      stylePreset: "glass",
      backgroundEffect: "none",
      navigationMode: "outline",
      screensaverEnabled: false,
      showStatusMarkers: false,
      showPriorityMarkers: true
    },
    appearanceLimits: {
      nodeFontSize: { min: 9, max: 22 }
    },
    stylePresets: {
      glass: { label: "Glass" },
      print: { label: "Print" },
      papery: { label: "Papery" },
      blueprint: { label: "Blueprint" },
      terminal: { label: "Terminal" },
      soft: { label: "Soft" },
      dust: { label: "Dust" },
      schematic: { label: "Schematic" }
    },
    styleAliases: {
      "index-card": "papery",
      radar: "terminal",
      kanban: "schematic"
    },
    styleGroups: {
      core: { label: "Core", variants: ["glass", "soft", "print"] },
      texture: { label: "Texture", variants: ["papery", "dust"] },
      technical: { label: "Technical", variants: ["blueprint", "terminal", "schematic"] }
    },
    backgroundEffects: {
      none: { label: "None" },
      spirits: { label: "Spirits" },
      dunes: { label: "Dunes" },
      circles: { label: "Circles" },
      image: { label: "Image" }
    },
    backgroundEffectAliases: {
      aurora: "spirits",
      "aurora-real": "spirits",
      waves: "circles"
    },
    navigationModes: {
      directional: { label: "Spatial arrows" },
      outline: { label: "Tree outline" },
      hybrid: { label: "Hybrid" }
    },
    themePresets: {
      light: {
        label: "Light",
        group: "neutral",
        colorScheme: "light",
        tokens: {
          bg: "#f3f4f6",
          "surface-solid": "#ffffff",
          ink: "#1d1d1f",
          muted: "#6e737c",
          label: "#7b818c",
          field: "rgba(255, 255, 255, 0.86)",
          "canvas-bg": "#f7f8fa",
          "canvas-grid": "rgba(86, 98, 120, 0.055)",
          "node-fill": "rgba(255, 255, 255, 0.9)",
          "root-node-fill": "#111111",
          "root-node-ink": "#ffffff",
          "ring-guide": "rgba(94, 105, 124, 0.38)"
        }
      },
      dark: {
        label: "Dark",
        group: "neutral",
        colorScheme: "dark",
        tokens: {
          bg: "#101114",
          "surface-solid": "#22242a",
          ink: "#f5f5f7",
          muted: "#a3a8b2",
          label: "#9096a2",
          field: "rgba(25, 27, 32, 0.84)",
          "canvas-bg": "#111318",
          "canvas-grid": "rgba(255, 255, 255, 0.045)",
          "node-fill": "rgba(32, 35, 42, 0.88)",
          "root-node-fill": "#111111",
          "root-node-ink": "#ffffff",
          "ring-guide": "rgba(169, 178, 194, 0.34)"
        }
      },
      graphite: {
        label: "Graphite",
        group: "neutral",
        colorScheme: "dark",
        tokens: {
          bg: "#17181c",
          "surface-solid": "#26282e",
          ink: "#f4f4f6",
          muted: "#a7acb6",
          label: "#969ca7",
          field: "rgba(29, 31, 37, 0.9)",
          "canvas-bg": "#14161b",
          "canvas-grid": "rgba(255, 255, 255, 0.04)",
          "node-fill": "rgba(39, 42, 49, 0.9)",
          "root-node-fill": "#0b0c0f",
          "root-node-ink": "#ffffff",
          "ring-guide": "rgba(176, 184, 198, 0.3)"
        }
      },
      paper: {
        label: "Paper",
        group: "paper",
        colorScheme: "light",
        tokens: {
          bg: "#ebe7dc",
          "surface-solid": "#fbf8ef",
          ink: "#24211b",
          muted: "#746d60",
          label: "#837a6b",
          field: "rgba(255, 252, 242, 0.88)",
          "canvas-bg": "#f6f1e6",
          "canvas-grid": "rgba(91, 75, 45, 0.055)",
          "node-fill": "rgba(255, 252, 244, 0.92)",
          "root-node-fill": "#222018",
          "root-node-ink": "#fffaf0",
          "ring-guide": "rgba(109, 95, 70, 0.32)"
        }
      },
      contrast: {
        label: "High Contrast",
        group: "neutral",
        colorScheme: "dark",
        tokens: {
          bg: "#000000",
          "surface-solid": "#111111",
          ink: "#ffffff",
          muted: "#d7d7d7",
          label: "#e6e6e6",
          field: "#050505",
          "canvas-bg": "#000000",
          "canvas-grid": "rgba(255, 255, 255, 0.08)",
          "node-fill": "#090909",
          "root-node-fill": "#ffffff",
          "root-node-ink": "#000000",
          "ring-guide": "rgba(255, 255, 255, 0.5)"
        }
      },
      "mono-high": {
        label: "Mono High",
        group: "neutral",
        colorScheme: "dark",
        tokens: {
          bg: "#050505",
          "surface-solid": "#141414",
          ink: "#f8f8f8",
          muted: "#cfcfcf",
          label: "#e0e0e0",
          field: "#0a0a0a",
          "canvas-bg": "#000000",
          "canvas-grid": "rgba(255, 255, 255, 0.11)",
          "node-fill": "#0d0d0d",
          "root-node-fill": "#ffffff",
          "root-node-ink": "#000000",
          "ring-guide": "rgba(255, 255, 255, 0.58)"
        }
      },
      sage: {
        label: "Sage",
        group: "paper",
        colorScheme: "light",
        tokens: {
          bg: "#eef2ec",
          "surface-solid": "#fbfdf8",
          ink: "#1d2a22",
          muted: "#65746b",
          label: "#6d7d72",
          field: "rgba(251, 253, 248, 0.9)",
          "canvas-bg": "#f4f7f1",
          "canvas-grid": "rgba(73, 109, 87, 0.065)",
          "node-fill": "rgba(251, 253, 248, 0.93)",
          "root-node-fill": "#365c42",
          "root-node-ink": "#f7fff2",
          "ring-guide": "rgba(73, 109, 87, 0.3)"
        }
      },
      solar: {
        label: "Solar",
        group: "paper",
        colorScheme: "light",
        tokens: {
          bg: "#f6f0df",
          "surface-solid": "#fffaf0",
          ink: "#2c261b",
          muted: "#746955",
          label: "#85745b",
          field: "rgba(255, 250, 240, 0.9)",
          "canvas-bg": "#fbf4df",
          "canvas-grid": "rgba(176, 112, 32, 0.065)",
          "node-fill": "rgba(255, 250, 240, 0.93)",
          "root-node-fill": "#c55f2c",
          "root-node-ink": "#fff8ea",
          "ring-guide": "rgba(176, 112, 32, 0.3)"
        }
      },
      sand: {
        label: "Sand",
        group: "paper",
        colorScheme: "light",
        tokens: {
          bg: "#e8dbc3",
          "surface-solid": "#fff4dd",
          ink: "#312819",
          muted: "#7c6d52",
          label: "#897456",
          field: "rgba(255, 246, 226, 0.9)",
          "canvas-bg": "#efe1c3",
          "canvas-grid": "rgba(132, 104, 62, 0.06)",
          "node-fill": "rgba(255, 246, 226, 0.93)",
          "root-node-fill": "#8b6b38",
          "root-node-ink": "#fff6e4",
          "ring-guide": "rgba(132, 104, 62, 0.32)"
        }
      },
      sandstorm: {
        label: "Sandstorm",
        group: "paper",
        colorScheme: "dark",
        tokens: {
          bg: "#1a100a",
          "surface-solid": "#2d1b10",
          ink: "#ffd8a3",
          muted: "#d79a63",
          label: "#e0a66b",
          field: "rgba(57, 32, 18, 0.86)",
          "canvas-bg": "#150c07",
          "canvas-grid": "rgba(255, 139, 54, 0.08)",
          "canvas-wash": "rgba(231, 98, 27, 0.2)",
          "node-fill": "rgba(52, 28, 16, 0.92)",
          "node-ink": "#ffd9aa",
          "root-node-fill": "#e8792e",
          "root-node-ink": "#1b0c05",
          "ring-guide": "rgba(232, 121, 46, 0.34)",
          focus: "#ff9a3d"
        }
      },
      oxide: {
        label: "Oxide",
        group: "heat",
        colorScheme: "dark",
        tokens: {
          bg: "#171312",
          "surface-solid": "#2b211f",
          ink: "#f7ede8",
          muted: "#c8aaa1",
          label: "#b89084",
          field: "rgba(44, 34, 31, 0.9)",
          "canvas-bg": "#1d1715",
          "canvas-grid": "rgba(242, 120, 83, 0.07)",
          "node-fill": "rgba(54, 41, 37, 0.92)",
          "root-node-fill": "#f27853",
          "root-node-ink": "#1b100d",
          "ring-guide": "rgba(242, 120, 83, 0.32)"
        }
      },
      ember: {
        label: "Ember",
        group: "heat",
        colorScheme: "dark",
        tokens: {
          bg: "#120f12",
          "surface-solid": "#241b22",
          ink: "#fff1e8",
          muted: "#d0aaa0",
          label: "#c58f83",
          field: "rgba(39, 29, 35, 0.9)",
          "canvas-bg": "#171116",
          "canvas-grid": "rgba(255, 149, 87, 0.07)",
          "node-fill": "rgba(43, 31, 38, 0.92)",
          "root-node-fill": "#ff8a4c",
          "root-node-ink": "#1a0d07",
          "ring-guide": "rgba(255, 149, 87, 0.32)"
        }
      },
      custom: {
        label: "Custom",
        group: "custom",
        colorScheme: "light",
        tokens: {
          bg: "#f3f4f6",
          "surface-solid": "#ffffff",
          ink: "#1d1d1f",
          muted: "#6e737c",
          label: "#7b818c",
          field: "#ffffff",
          "canvas-bg": "#f7f8fa",
          "canvas-grid": "#e7eaf0",
          "node-fill": "#ffffff",
          "root-node-fill": "#111111",
          "root-node-ink": "#ffffff",
          "ring-guide": "#9aa3b2"
        }
      }
    },
    themeGroups: {
      neutral: { label: "Neutral", variants: ["light", "dark", "graphite", "contrast", "mono-high"] },
      paper: { label: "Paper", variants: ["paper", "sage", "solar", "sand", "sandstorm"] },
      heat: { label: "Heat", variants: ["ember", "oxide"] },
      custom: { label: "Custom", variants: ["custom"] }
    },
    modePacks: {
      research: {
        label: "Research Desk",
        theme: "sage",
        stylePreset: "papery",
        navigationMode: "outline",
        viewMode: "radial",
        nodeFontSize: 13,
        spacing: { treeLevelGap: 86, treeLeafGap: 122, ringBaseRadius: 118, ringDepthGap: 108, ringNodeGap: 30 }
      },
      ops: {
        label: "Ops Board",
        theme: "oxide",
        stylePreset: "schematic",
        navigationMode: "hybrid",
        viewMode: "tree",
        nodeFontSize: 12.5,
        spacing: { treeLevelGap: 72, treeLeafGap: 96, ringBaseRadius: 102, ringDepthGap: 88, ringNodeGap: 18 }
      },
      war: {
        label: "War Room",
        theme: "ember",
        stylePreset: "terminal",
        navigationMode: "directional",
        viewMode: "radial",
        nodeFontSize: 12,
        spacing: { treeLevelGap: 78, treeLeafGap: 104, ringBaseRadius: 140, ringDepthGap: 132, ringNodeGap: 44 }
      },
      print: {
        label: "Print Packet",
        theme: "solar",
        stylePreset: "schematic",
        navigationMode: "outline",
        viewMode: "tree",
        nodeFontSize: 12,
        spacing: { treeLevelGap: 92, treeLeafGap: 132, ringBaseRadius: 120, ringDepthGap: 112, ringNodeGap: 36 }
      }
    },
    themeTokenControls: [
      { key: "bg", label: "Background" },
      { key: "surface-solid", label: "Surface" },
      { key: "ink", label: "Text" },
      { key: "muted", label: "Muted" },
      { key: "field", label: "Field" },
      { key: "canvas-bg", label: "Canvas" },
      { key: "node-fill", label: "Node" },
      { key: "root-node-fill", label: "Center" },
      { key: "ring-guide", label: "Guides" }
    ],
    colors: [
      "#e3342f",
      "#f59e0b",
      "#22c55e",
      "#06b6d4",
      "#6366f1",
      "#d946ef",
      "#f97316",
      "#84cc16",
      "#14b8a6",
      "#3b82f6",
      "#8b5cf6",
      "#ec4899"
    ],
    textures: [
      '<path d="M0 0 L8 8 M8 0 L0 8" stroke="rgba(0,0,0,.09)" stroke-width="1"/>',
      '<path d="M0 4 H8" stroke="rgba(0,0,0,.1)" stroke-width="1"/>',
      '<path d="M4 0 V8" stroke="rgba(0,0,0,.1)" stroke-width="1"/>',
      '<circle cx="2" cy="2" r="1" fill="rgba(0,0,0,.1)"/><circle cx="6" cy="6" r="1" fill="rgba(0,0,0,.1)"/>',
      '<path d="M0 8 L8 0" stroke="rgba(0,0,0,.1)" stroke-width="1.2"/>',
      '<path d="M0 0 H8 V8 H0 Z" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="1"/>',
      '<path d="M0 2 H8 M0 6 H8" stroke="rgba(0,0,0,.1)" stroke-width="1"/>',
      '<path d="M2 0 V8 M6 0 V8" stroke="rgba(0,0,0,.1)" stroke-width="1"/>',
      '<path d="M0 0 L8 0 L0 8 Z" fill="rgba(0,0,0,.06)"/>',
      '<circle cx="4" cy="4" r="2.1" fill="none" stroke="rgba(0,0,0,.1)" stroke-width="1"/>',
      '<path d="M0 4 Q2 0 4 4 T8 4" fill="none" stroke="rgba(0,0,0,.1)" stroke-width="1"/>',
      '<path d="M4 0 L8 4 L4 8 L0 4 Z" fill="rgba(0,0,0,.06)"/>'
    ],
    romanNumerals: ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]
  };

  global.RingMapChart = RingMapChart;
})(window);
