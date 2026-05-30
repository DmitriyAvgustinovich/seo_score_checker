const TOOLTIP_GAP = 8;
const VIEWPORT_MARGIN = 8;
const TOOLTIP_MAX_WIDTH = 260;
const TOOLTIP_MIN_WIDTH = 120;
const ARROW_MARGIN = 14;

const boundRoots = new WeakSet();

let activeTrigger = null;
let floatingTooltip = null;
let floatingArrow = null;
let floatingBody = null;
let hideTimer = 0;
let globalListenersBound = false;

function clamp(value, min, max) {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function getViewport() {
  const doc = document.documentElement;

  return {
    width: window.innerWidth || doc.clientWidth,
    height: window.innerHeight || doc.clientHeight
  };
}

function ensureFloatingTooltip() {
  if (floatingTooltip && document.body.contains(floatingTooltip)) {
    return floatingTooltip;
  }

  floatingTooltip = document.createElement("div");
  floatingTooltip.id = "help-tooltip-floating";
  floatingTooltip.className = "help-tooltip";
  floatingTooltip.setAttribute("role", "tooltip");
  floatingTooltip.hidden = true;

  floatingArrow = document.createElement("span");
  floatingArrow.className = "help-tooltip__arrow";
  floatingArrow.setAttribute("aria-hidden", "true");

  floatingBody = document.createElement("span");
  floatingBody.className = "help-tooltip__body";

  floatingTooltip.append(floatingArrow, floatingBody);
  document.body.append(floatingTooltip);

  return floatingTooltip;
}

function choosePlacement(triggerRect, tooltipRect, viewport) {
  const space = {
    top: triggerRect.top - VIEWPORT_MARGIN,
    bottom: viewport.height - triggerRect.bottom - VIEWPORT_MARGIN,
    right: viewport.width - triggerRect.right - VIEWPORT_MARGIN,
    left: triggerRect.left - VIEWPORT_MARGIN
  };
  const required = {
    top: tooltipRect.height + TOOLTIP_GAP,
    bottom: tooltipRect.height + TOOLTIP_GAP,
    right: tooltipRect.width + TOOLTIP_GAP,
    left: tooltipRect.width + TOOLTIP_GAP
  };
  const preferredPlacements = ["top", "bottom", "right", "left"];
  const fittingPlacement = preferredPlacements.find((placement) => space[placement] >= required[placement]);

  if (fittingPlacement) {
    return fittingPlacement;
  }

  return preferredPlacements.reduce((best, placement) => (space[placement] > space[best] ? placement : best), "top");
}

function getTooltipCoordinates(placement, triggerRect, tooltipRect, viewport) {
  const triggerCenterX = triggerRect.left + triggerRect.width / 2;
  const triggerCenterY = triggerRect.top + triggerRect.height / 2;
  let left = triggerCenterX - tooltipRect.width / 2;
  let top = triggerRect.top - tooltipRect.height - TOOLTIP_GAP;

  if (placement === "bottom") {
    top = triggerRect.bottom + TOOLTIP_GAP;
  }

  if (placement === "right") {
    left = triggerRect.right + TOOLTIP_GAP;
    top = triggerCenterY - tooltipRect.height / 2;
  }

  if (placement === "left") {
    left = triggerRect.left - tooltipRect.width - TOOLTIP_GAP;
    top = triggerCenterY - tooltipRect.height / 2;
  }

  return {
    left: clamp(left, VIEWPORT_MARGIN, viewport.width - tooltipRect.width - VIEWPORT_MARGIN),
    top: clamp(top, VIEWPORT_MARGIN, viewport.height - tooltipRect.height - VIEWPORT_MARGIN)
  };
}

function positionArrow(placement, triggerRect, coordinates, tooltipRect) {
  const triggerCenterX = triggerRect.left + triggerRect.width / 2;
  const triggerCenterY = triggerRect.top + triggerRect.height / 2;

  floatingArrow.style.left = "";
  floatingArrow.style.top = "";

  if (placement === "top" || placement === "bottom") {
    const arrowX = clamp(triggerCenterX - coordinates.left, ARROW_MARGIN, tooltipRect.width - ARROW_MARGIN);
    floatingArrow.style.left = arrowX + "px";
    return;
  }

  const arrowY = clamp(triggerCenterY - coordinates.top, ARROW_MARGIN, tooltipRect.height - ARROW_MARGIN);
  floatingArrow.style.top = arrowY + "px";
}

function positionTooltip(trigger) {
  const tooltip = ensureFloatingTooltip();
  const viewport = getViewport();
  const maxWidth = Math.max(TOOLTIP_MIN_WIDTH, Math.min(TOOLTIP_MAX_WIDTH, viewport.width - VIEWPORT_MARGIN * 2));

  tooltip.style.maxWidth = maxWidth + "px";
  tooltip.style.left = "-9999px";
  tooltip.style.top = "-9999px";
  tooltip.dataset.placement = "top";

  const triggerRect = trigger.getBoundingClientRect();

  if (
    triggerRect.right < 0 ||
    triggerRect.left > viewport.width ||
    triggerRect.bottom < 0 ||
    triggerRect.top > viewport.height
  ) {
    hideTooltip();
    return;
  }

  const measuredRect = tooltip.getBoundingClientRect();
  const tooltipRect = {
    width: measuredRect.width,
    height: measuredRect.height
  };
  const placement = choosePlacement(triggerRect, tooltipRect, viewport);
  const coordinates = getTooltipCoordinates(placement, triggerRect, tooltipRect, viewport);

  tooltip.dataset.placement = placement;
  tooltip.style.left = Math.round(coordinates.left) + "px";
  tooltip.style.top = Math.round(coordinates.top) + "px";
  positionArrow(placement, triggerRect, coordinates, tooltipRect);
}

function showTooltip(trigger) {
  const text = trigger.dataset.help || trigger.getAttribute("aria-label") || "";

  if (!text) {
    return;
  }

  const tooltip = ensureFloatingTooltip();

  window.clearTimeout(hideTimer);
  floatingBody.textContent = text;
  tooltip.hidden = false;
  tooltip.classList.remove("help-tooltip--visible");
  activeTrigger = trigger;
  activeTrigger.removeAttribute("title");
  activeTrigger.setAttribute("aria-describedby", tooltip.id);

  positionTooltip(trigger);
  tooltip.classList.add("help-tooltip--visible");
}

function hideTooltip() {
  if (!floatingTooltip) {
    return;
  }

  if (activeTrigger) {
    activeTrigger.removeAttribute("aria-describedby");
  }

  activeTrigger = null;
  floatingTooltip.classList.remove("help-tooltip--visible");
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    if (floatingTooltip && !floatingTooltip.classList.contains("help-tooltip--visible")) {
      floatingTooltip.hidden = true;
    }
  }, 160);
}

function findHelpTrigger(event, root) {
  if (typeof Element === "undefined" || !(event.target instanceof Element)) {
    return null;
  }

  const trigger = event.target.closest(".help-tip");

  if (!trigger || !root.contains(trigger)) {
    return null;
  }

  return trigger;
}

function bindGlobalListeners() {
  if (globalListenersBound) {
    return;
  }

  globalListenersBound = true;
  window.addEventListener("resize", () => {
    if (activeTrigger && document.contains(activeTrigger)) {
      positionTooltip(activeTrigger);
    }
  });
  window.addEventListener(
    "scroll",
    () => {
      if (activeTrigger && document.contains(activeTrigger)) {
        positionTooltip(activeTrigger);
      }
    },
    true
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideTooltip();
    }
  });
}

export function bindHelpTooltips(root) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const bindRoot = root || document;

  if (!bindRoot || boundRoots.has(bindRoot)) {
    return;
  }

  boundRoots.add(bindRoot);
  bindGlobalListeners();

  bindRoot.addEventListener(
    "pointerover",
    (event) => {
      const trigger = findHelpTrigger(event, bindRoot);

      if (trigger) {
        showTooltip(trigger);
      }
    },
    true
  );

  bindRoot.addEventListener(
    "pointerout",
    (event) => {
      const trigger = findHelpTrigger(event, bindRoot);
      const nextTarget = event.relatedTarget;

      if (trigger && (!(nextTarget instanceof Node) || !trigger.contains(nextTarget))) {
        hideTooltip();
      }
    },
    true
  );

  bindRoot.addEventListener(
    "focusin",
    (event) => {
      const trigger = findHelpTrigger(event, bindRoot);

      if (trigger) {
        showTooltip(trigger);
      }
    },
    true
  );

  bindRoot.addEventListener(
    "focusout",
    (event) => {
      const trigger = findHelpTrigger(event, bindRoot);

      if (trigger) {
        hideTooltip();
      }
    },
    true
  );
}
