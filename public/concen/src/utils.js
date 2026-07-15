(function (global) {
  "use strict";

  const RingMapChart = global.RingMapChart;

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function cleanLabel(value) {
    return String(value || "").trim().slice(0, RingMapChart.config.limits.maxLabelLength);
  }

  function cleanNote(value) {
    return String(value || "").slice(0, RingMapChart.config.limits.maxNoteLength);
  }

  function cleanId(value, fallback) {
    const id = String(value || fallback).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 48);
    if (!id || isUnsafeObjectKey(id)) return fallback;
    return id;
  }

  function isUnsafeObjectKey(value) {
    return value === "__proto__" || value === "prototype" || value === "constructor";
  }

  function cleanChoice(value, allowed, fallback) {
    const choice = String(value || "").trim().toLowerCase();
    return allowed.includes(choice) ? choice : fallback;
  }

  function cleanTags(value) {
    const source = Array.isArray(value) ? value : String(value || "").split(",");
    const seen = new Set();
    const tags = [];
    source.forEach((item) => {
      const tag = String(item || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, RingMapChart.config.limits.maxTagLength);
      const key = tag.toLowerCase();
      if (!tag || seen.has(key)) return;
      seen.add(key);
      tags.push(tag);
    });
    return tags.slice(0, RingMapChart.config.limits.maxTags);
  }

  function svgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs || {}).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    return [0, 2, 4].map((offset) => parseInt(clean.slice(offset, offset + 2), 16));
  }

  function mixColor(hexA, hexB, amount) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    const mixed = a.map((channel, index) => Math.round(channel + (b[index] - channel) * amount));
    return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
  }

  function isEditableTarget(target) {
    return target && (
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "SUMMARY"].includes(target.tagName) ||
      target.isContentEditable
    );
  }

  RingMapChart.utils = {
    clampNumber,
    cleanLabel,
    cleanNote,
    cleanId,
    isUnsafeObjectKey,
    cleanChoice,
    cleanTags,
    svgEl,
    mixColor,
    isEditableTarget
  };
})(window);
