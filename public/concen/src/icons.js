(function (global) {
  "use strict";

  const RingMapChart = global.RingMapChart || {};
  const SVG_NS = "http://www.w3.org/2000/svg";

  const ICONS = {
    add: [
      ["path", { d: "M12 5v14" }],
      ["path", { d: "M5 12h14" }]
    ],
    arrowDown: [
      ["path", { d: "M12 5v12" }],
      ["path", { d: "m7 12 5 5 5-5" }]
    ],
    arrowUp: [
      ["path", { d: "M12 19V7" }],
      ["path", { d: "m7 12 5-5 5 5" }]
    ],
    check: [
      ["path", { d: "m5 12 4 4 10-10" }]
    ],
    chevronLeft: [
      ["path", { d: "m15 18-6-6 6-6" }]
    ],
    chevronRight: [
      ["path", { d: "m9 18 6-6-6-6" }]
    ],
    close: [
      ["path", { d: "M6 6l12 12" }],
      ["path", { d: "M18 6 6 18" }]
    ],
    command: [
      ["path", { d: "M9 9h6v6H9z" }],
      ["path", { d: "M9 9H7a3 3 0 1 1 3-3v12a3 3 0 1 1-3-3h10a3 3 0 1 1-3 3V6a3 3 0 1 1 3 3h-2" }]
    ],
    search: [
      ["circle", { cx: "11", cy: "11", r: "6" }],
      ["path", { d: "m16 16 4 4" }]
    ],
    delete: [
      ["path", { d: "M9 6V4h6v2" }],
      ["path", { d: "M5 6h14" }],
      ["path", { d: "M8 6l1 14h6l1-14" }],
      ["path", { d: "M10 10v6" }],
      ["path", { d: "M14 10v6" }]
    ],
    download: [
      ["path", { d: "M12 4v10" }],
      ["path", { d: "m7 10 5 5 5-5" }],
      ["path", { d: "M5 19h14" }]
    ],
    edit: [
      ["path", { d: "M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z" }],
      ["path", { d: "m14 7 3 3" }]
    ],
    external: [
      ["path", { d: "M8 8h8v8" }],
      ["path", { d: "m9 15 7-7" }],
      ["path", { d: "M6 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" }]
    ],
    fit: [
      ["path", { d: "M8 4H5a1 1 0 0 0-1 1v3" }],
      ["path", { d: "M16 4h3a1 1 0 0 1 1 1v3" }],
      ["path", { d: "M20 16v3a1 1 0 0 1-1 1h-3" }],
      ["path", { d: "M8 20H5a1 1 0 0 1-1-1v-3" }]
    ],
    github: [
      ["circle", { cx: "7", cy: "6", r: "2" }],
      ["circle", { cx: "17", cy: "6", r: "2" }],
      ["circle", { cx: "12", cy: "18", r: "2" }],
      ["path", { d: "M7 8v2a4 4 0 0 0 4 4h1" }],
      ["path", { d: "M17 8v2a4 4 0 0 1-4 4h-1" }],
      ["path", { d: "M12 14v2" }]
    ],
    help: [
      ["circle", { cx: "12", cy: "12", r: "8" }],
      ["path", { d: "M9.8 9.2a2.5 2.5 0 0 1 4.7 1.3c0 1.9-2.5 2.1-2.5 3.8" }],
      ["path", { d: "M12 17h.01" }]
    ],
    history: [
      ["path", { d: "M4 7v5h5" }],
      ["path", { d: "M5.5 12A7 7 0 1 0 8 6.7L4 12" }],
      ["path", { d: "M12 8v4l3 2" }]
    ],
    menu: [
      ["path", { d: "M5 7h14" }],
      ["path", { d: "M5 12h14" }],
      ["path", { d: "M5 17h14" }]
    ],
    minus: [
      ["path", { d: "M5 12h14" }]
    ],
    note: [
      ["path", { d: "M6 4h9l3 3v13H6z" }],
      ["path", { d: "M15 4v4h4" }],
      ["path", { d: "M9 12h6" }],
      ["path", { d: "M9 16h4" }]
    ],
    openFolder: [
      ["path", { d: "M3 7h7l2 2h9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }],
      ["path", { d: "M3 11h18" }]
    ],
    parent: [
      ["path", { d: "M12 19V6" }],
      ["path", { d: "m7 11 5-5 5 5" }]
    ],
    save: [
      ["path", { d: "M5 4h12l2 2v14H5z" }],
      ["path", { d: "M8 4v6h8V4" }],
      ["path", { d: "M8 20v-6h8v6" }]
    ],
    settings: [
      ["circle", { cx: "12", cy: "12", r: "3" }],
      ["path", { d: "M12 3v3" }],
      ["path", { d: "M12 18v3" }],
      ["path", { d: "m4.8 6.2 2.1 2.1" }],
      ["path", { d: "m17.1 15.7 2.1 2.1" }],
      ["path", { d: "M3 12h3" }],
      ["path", { d: "M18 12h3" }],
      ["path", { d: "m4.8 17.8 2.1-2.1" }],
      ["path", { d: "m17.1 8.3 2.1-2.1" }]
    ],
    shield: [
      ["path", { d: "M12 3 5 6v5c0 4.7 3 8.4 7 10 4-1.6 7-5.3 7-10V6z" }],
      ["path", { d: "m9 12 2 2 4-4" }]
    ],
    upload: [
      ["path", { d: "M12 20V10" }],
      ["path", { d: "m7 14 5-5 5 5" }],
      ["path", { d: "M5 5h14" }]
    ]
  };

  const GLYPH_MAP = {
    "+": "add",
    "−": "minus",
    "-": "minus",
    "×": "close",
    "✓": "check",
    "‹": "chevronLeft",
    "›": "chevronRight",
    "↑": "parent",
    "↳": "external",
    "⇧": "upload",
    "⇩": "download",
    "↺": "history",
    "⇄": "history",
    "⌫": "delete",
    "⌘": "command",
    "⌕": "search",
    "?": "help",
    "☰": "menu",
    "⚙": "settings",
    "□": "fit",
    "✎": "note",
    "◇": "shield",
    "⌁": "github",
    "▶": "chevronRight"
  };

  const ID_MAP = {
    exportMindButton: "download",
    trustBackupButton: "download",
    githubExportSettingsButton: "download",
    recoveryExportCurrentButton: "download",
    backgroundImageUpload: "upload",
    githubPushButton: "upload",
    trustPushButton: "upload",
    githubPullButton: "download",
    trustPullButton: "download",
    commandPaletteButton: "search",
    importMindInput: "openFolder",
    openMapButton: "external",
    noteButton: "note",
    saveMindButton: "save",
    saveAuthorProfileButton: "save",
    githubSaveSettingsButton: "save",
    welcomeCommandButton: "search"
  };

  function iconNameFor(el) {
    if (!el) return "";
    if (el.dataset.iconName) return el.dataset.iconName;
    if (el.id && ID_MAP[el.id]) return ID_MAP[el.id];
    if (el.classList.contains("import-mind")) return "openFolder";
    if (el.classList.contains("github-import-settings")) return "download";
    if (el.classList.contains("import-theme")) return "download";
    return GLYPH_MAP[el.dataset.icon] || "";
  }

  function addChild(svg, spec) {
    const [tag, attrs] = spec;
    const child = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => child.setAttribute(key, value));
    svg.append(child);
  }

  function createIcon(name) {
    const parts = ICONS[name];
    if (!parts) return null;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "ui-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    parts.forEach((part) => addChild(svg, part));
    return svg;
  }

  function enhanceIcon(el) {
    if (!el || el.classList.contains("has-ui-icon")) return;
    const name = iconNameFor(el);
    const icon = createIcon(name);
    if (!icon) return;
    el.classList.add("has-ui-icon");
    el.dataset.iconName = name;
    el.insertBefore(icon, el.firstChild);
  }

  function enhance(root) {
    const scope = root || document;
    if (scope.matches && scope.matches("[data-icon]")) enhanceIcon(scope);
    scope.querySelectorAll("[data-icon]").forEach(enhanceIcon);
  }

  RingMapChart.icons = { enhance };
  global.RingMapChart = RingMapChart;
})(window);
