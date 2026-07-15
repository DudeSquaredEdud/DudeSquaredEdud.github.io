(function (global) {
  "use strict";

  const RingMapChart = global.RingMapChart || {};

  function child(label, children, note, status, priority, markerEnabled, tags) {
    return {
      label,
      note: note || "",
      status: status || "open",
      priority: priority || "normal",
      markerEnabled: Boolean(markerEnabled),
      tags: tags || [],
      children: children || []
    };
  }

  RingMapChart.tutorialTemplateTree = function () {
    return child("Tutorial Mind", [
      child("Start Here", [
        child("Press Enter on me", [], "Press Enter once.\n\nA new idea appears nearby. Then we pause and talk about what happened.", "active", "high", true)
      ], "We will go one move at a time.\n\nStart with [[Press Enter on me]].", "active", "critical", true)
    ], "This guide stays open while you work on the map.\n\nStart by pressing Enter on [[Press Enter on me]].", "active", "critical", true, ["tutorial"]);
  };

  global.RingMapChart = RingMapChart;
})(window);
