// Data model

const RULE_PACKS = [
  {
    id: "baseline",
    name: "Baseline Policy",
    short: "Baseline",
    description: "Default program rules for prod & staging.",
    defaultActive: true,
    rules: [
      {
        id: "baseline-allow-standard",
        name: "Allow standard requests",
        packId: "baseline",
        scope: "global",
        environments: ["prod", "staging"],
        tags: [],
        effect: "allow",
        priority: 70,
        status: "active"
      },
      {
        id: "baseline-deny-anonymous",
        name: "Deny anonymous traffic",
        packId: "baseline",
        scope: "global",
        environments: ["prod", "staging"],
        tags: ["anonymous"],
        effect: "deny",
        priority: 40,
        status: "active"
      },
      {
        id: "baseline-transform-beta",
        name: "Throttle beta-flagged traffic",
        packId: "baseline",
        scope: "beta-flagged",
        environments: ["prod"],
        tags: ["betaFlag"],
        effect: "transform",
        priority: 55,
        status: "active"
      }
    ]
  },
  {
    id: "experimentA",
    name: "Experiment A",
    short: "Experiment A",
    description: "Overrides baseline for selected beta cohort.",
    defaultActive: false,
    rules: [
      {
        id: "expA-allow-beta",
        name: "Allow beta traffic with relaxed limits",
        packId: "experimentA",
        scope: "beta cohort",
        environments: ["prod"],
        tags: ["betaFlag", "experimentOverride"],
        effect: "allow",
        priority: 35,
        status: "active"
      }
    ]
  },
  {
    id: "sandboxOverride",
    name: "Sandbox Override",
    short: "Sandbox",
    description: "Force allow in sandbox unless emergency block.",
    defaultActive: true,
    rules: [
      {
        id: "sandbox-allow-default",
        name: "Allow all non-emergency sandbox traffic",
        packId: "sandboxOverride",
        scope: "sandbox",
        environments: ["sandbox"],
        tags: [],
        effect: "allow",
        priority: 80,
        status: "active"
      },
      {
        id: "sandbox-deny-emergency",
        name: "Emergency block in sandbox",
        packId: "sandboxOverride",
        scope: "sandbox emergency",
        environments: ["sandbox"],
        tags: ["emergencyOverride"],
        effect: "deny",
        priority: 10,
        status: "active"
      }
    ]
  },
  {
    id: "legacyMode",
    name: "Legacy Mode",
    short: "Legacy",
    description: "Keeps behavior compatible with legacy systems.",
    defaultActive: false,
    rules: [
      {
        id: "legacy-transform-prod",
        name: "Transform prod requests to legacy path",
        packId: "legacyMode",
        scope: "prod legacy",
        environments: ["prod"],
        tags: ["legacyMode"],
        effect: "transform",
        priority: 45,
        status: "active"
      }
    ]
  }
];

const SCENARIOS = [
  {
    id: "standard",
    name: "Standard request",
    environment: "prod",
    tags: [],
    description: "Typical authenticated request in production."
  },
  {
    id: "overlappingFlags",
    name: "Overlapping flags",
    environment: "prod",
    tags: ["betaFlag", "experimentOverride"],
    description: "Beta cohort with experiment override enabled."
  },
  {
    id: "sandboxEmergency",
    name: "Sandbox emergency",
    environment: "sandbox",
    tags: ["emergencyOverride"],
    description: "Sandbox request during incident with emergency flag set."
  },
  {
    id: "legacyPath",
    name: "Legacy path",
    environment: "prod",
    tags: ["legacyMode"],
    description: "Production request routed via legacy compatibility mode."
  }
];

// State

let activeScenarioId = SCENARIOS[0].id;
let activePackIds = new Set(
  RULE_PACKS.filter((p) => p.defaultActive).map((p) => p.id)
);
let lastEvaluation = null;

// Utility helpers

function $(selector) {
  return document.querySelector(selector);
}

function createElem(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function getScenarioById(id) {
  return SCENARIOS.find((s) => s.id === id);
}

function getPackById(id) {
  return RULE_PACKS.find((p) => p.id === id);
}

function getAllActiveRules() {
  const rules = [];
  activePackIds.forEach((packId) => {
    const pack = getPackById(packId);
    if (pack) {
      pack.rules.forEach((rule) =>
        rules.push({
          ...rule,
          packName: pack.name,
          packShort: pack.short
        })
      );
    }
  });
  return rules.sort((a, b) => a.priority - b.priority);
}

function scenarioMatchesRule(scenario, rule) {
  if (!rule.environments.includes(scenario.environment)) {
    return false;
  }
  if (rule.tags.length === 0) return true;
  return rule.tags.every((t) => scenario.tags.includes(t));
}

// Rendering: scenario chips

function renderScenarioChips() {
  const row = $("#scenarioChips");
  row.innerHTML = "";
  SCENARIOS.forEach((scenario) => {
    const chip = createElem("button", "chip", null);
    chip.type = "button";
    chip.dataset.scenarioId = scenario.id;
    chip.setAttribute("aria-pressed", scenario.id === activeScenarioId);

    if (scenario.id === activeScenarioId) {
      chip.classList.add("chip-active");
    }

    const main = createElem("span", "chip-label-main", scenario.name);
    const sub = createElem("span", "chip-label-sub", scenario.description);
    chip.appendChild(main);
    chip.appendChild(sub);

    chip.addEventListener("click", () => {
      activeScenarioId = scenario.id;
      renderScenarioChips();
      updateRuleStackSummary();
    });

    row.appendChild(chip);
  });
}

// Rendering: pack chips

function renderPackChips() {
  const row = $("#packChips");
  row.innerHTML = "";

  RULE_PACKS.forEach((pack) => {
    const chip = createElem("button", "chip chip-secondary", null);
    chip.type = "button";
    chip.dataset.packId = pack.id;

    const isActive = activePackIds.has(pack.id);
    if (isActive) chip.classList.add("chip-active");

    const main = createElem("span", "chip-label-main", pack.short);
    const sub = createElem("span", "chip-label-sub", pack.description);
    chip.appendChild(main);
    chip.appendChild(sub);

    chip.addEventListener("click", () => {
      if (activePackIds.has(pack.id)) {
        activePackIds.delete(pack.id);
      } else {
        activePackIds.add(pack.id);
      }
      renderPackChips();
      renderRuleStack();
    });

    row.appendChild(chip);
  });
}

// Rendering: rule stack

function updateRuleStackSummary() {
  const summary = $("#ruleStackSummary");
  const scenario = getScenarioById(activeScenarioId);
  const totalPacks = activePackIds.size;
  summary.textContent = `Scenario: ${scenario.name} · Environment: ${
    scenario.environment
  } · Tags: ${
    scenario.tags.length ? scenario.tags.join(", ") : "none"
  } · Active rule packs: ${totalPacks}`;
}

function renderRuleStack() {
  const container = $("#ruleStack");
  container.innerHTML = "";
  const rules = getAllActiveRules();

  updateRuleStackSummary();

  if (!rules.length) {
    const empty = createElem(
      "div",
      "lane-empty",
      "No active rule packs. Toggle a pack above to populate the stack."
    );
    container.appendChild(empty);
    return;
  }

  rules.forEach((rule) => {
    const card = createElem("div", "rule-card");

    const header = createElem("div", "rule-card-header");
    const name = createElem("div", "rule-name", rule.name);
    const packBadge = createElem("div", "rule-pack-badge", rule.packShort);
    header.appendChild(name);
    header.appendChild(packBadge);

    const effectTag = createElem(
      "div",
      `rule-effect-tag rule-effect-${rule.effect}`,
      rule.effect === "allow"
        ? "Allow"
        : rule.effect === "deny"
        ? "Deny"
        : "Transform"
    );

    const statusTag = createElem(
      "div",
      "rule-status-tag",
      rule.status === "active" ? "Active" : "Draft"
    );

    const metaRow = createElem("div", "rule-meta-row");
    const scope = createElem(
      "div",
      "rule-meta-item",
      `Scope: ${rule.scope}`
    );
    const env = createElem(
      "div",
      "rule-meta-item",
      `Env: ${rule.environments.join(", ")}`
    );
    const tags =
      rule.tags && rule.tags.length
        ? rule.tags.join(", ")
        : "none";

    const tagsEl = createElem("div", "rule-meta-item", `Tags: ${tags}`);
    const prio = createElem(
      "div",
      "rule-meta-item",
      `Priority: ${rule.priority}`
    );

    metaRow.appendChild(scope);
    metaRow.appendChild(env);
    metaRow.appendChild(tagsEl);
    metaRow.appendChild(prio);

    const rightCol = createElem("div", null);
    rightCol.appendChild(effectTag);
    rightCol.appendChild(statusTag);

    card.appendChild(header);
    card.appendChild(metaRow);
    card.appendChild(rightCol);

    container.appendChild(card);
  });
}

// Rendering: lanes

function clearLane(el) {
  el.innerHTML = "";
}

function renderLaneRules(laneEl, rules, winnerId) {
  clearLane(laneEl);

  if (!rules.length) {
    const empty = createElem("div", "lane-empty", "No rules matched.");
    laneEl.appendChild(empty);
    return;
  }

  rules.forEach((rule) => {
    const pill = createElem("div", "rule-pill");
    const main = createElem("div", "rule-pill-main");
    const name = createElem("span", "rule-pill-name", rule.name);
    const pack = createElem(
      "span",
      "rule-pill-pack",
      rule.packShort || rule.packName
    );
    main.appendChild(name);
    main.appendChild(pack);

    const prio = createElem(
      "span",
      "rule-pill-priority",
      `P${rule.priority}`
    );

    pill.appendChild(main);
    pill.appendChild(prio);

    if (rule.id === winnerId) {
      pill.classList.add("rule-pill-winner");
    }

    laneEl.appendChild(pill);
  });
}

// Decision and explanation

function setDecisionState(effect, explanationText, metaText, traceLines) {
  const pill = $("#decisionPill");
  const label = pill.querySelector(".decision-label") || pill;
  const meta = $("#decisionMeta");
  const explanation = $("#explanation");
  const traceLog = $("#traceLog");

  pill.className = "decision-pill";

  if (effect === "allow") {
    pill.classList.add("decision-pill-allow");
    label.textContent = "Allowed";
  } else if (effect === "deny") {
    pill.classList.add("decision-pill-deny");
    label.textContent = "Blocked";
  } else if (effect === "transform") {
    pill.classList.add("decision-pill-transform");
    label.textContent = "Transformed";
  } else {
    pill.classList.add("decision-pill-idle");
    label.textContent = "Waiting for evaluation";
  }

  meta.textContent = metaText || "";
  explanation.textContent = explanationText || "";

  traceLog.textContent = (traceLines || []).join("\n");
}

// Evaluation

function runEvaluation() {
  const scenario = getScenarioById(activeScenarioId);
  const allRules = getAllActiveRules();

  const trace = [];
  trace.push(
    `Scenario: ${scenario.name} (env=${scenario.environment}, tags=[${scenario.tags.join(
      ", "
    )}])`
  );
  trace.push(`Active rule packs: ${Array.from(activePackIds).join(", ") || "none"}`);
  trace.push("");

  const matchingRules = allRules.filter((rule) => {
    const matches = scenarioMatchesRule(scenario, rule);
    trace.push(
      `Rule ${rule.id} (${rule.name}) -> ${matches ? "MATCH" : "no match"}`
    );
    return matches;
  });

  trace.push("");
  trace.push(
    matchingRules.length
      ? `Total matching rules: ${matchingRules.length}`
      : "No rules matched this scenario."
  );

  const lanes = {
    allow: matchingRules.filter((r) => r.effect === "allow"),
    deny: matchingRules.filter((r) => r.effect === "deny"),
    transform: matchingRules.filter((r) => r.effect === "transform")
  };

  let winner = null;
  if (matchingRules.length) {
    winner = matchingRules.reduce((best, rule) =>
      !best || rule.priority < best.priority ? rule : best
    );
    trace.push(
      `Winner: ${winner.id} (${winner.name}), effect=${winner.effect}, priority=${winner.priority}`
    );
  }

  // Render lanes
  renderLaneRules($("#laneAllow"), lanes.allow, winner && winner.effect === "allow" ? winner.id : null);
  renderLaneRules($("#laneDeny"), lanes.deny, winner && winner.effect === "deny" ? winner.id : null);
  renderLaneRules(
    $("#laneTransform"),
    lanes.transform,
    winner && winner.effect === "transform" ? winner.id : null
  );

  // Decision text
  let effect = null;
  let explanationText = "";
  let metaText = "";

  if (!matchingRules.length) {
    effect = null;
    metaText = "No rules matched this scenario. Check environments, tags, or active packs.";
    explanationText =
      "With the current scenario and rule packs, no rule produced a decision. In a real system, this would typically fall back to a default policy.";
  } else {
    effect = winner.effect;
    const losing = matchingRules.filter((r) => r.id !== winner.id);
    const losingSummary = losing
      .map((r) => `${r.name} (P${r.priority})`)
      .join("; ");

    if (effect === "allow") {
      explanationText = `Request is allowed by "${winner.name}" from ${winner.packShort}.`;
    } else if (effect === "deny") {
      explanationText = `Request is blocked by "${winner.name}" from ${winner.packShort}.`;
    } else if (effect === "transform") {
      explanationText = `Request is transformed by "${winner.name}" from ${winner.packShort}.`;
    }

    if (losing.length) {
      metaText = `Winner: ${winner.name} (P${winner.priority}). Other matching rules were shadowed: ${losingSummary}.`;
    } else {
      metaText = `Only one rule matched: ${winner.name} (P${winner.priority}).`;
    }
  }

  setDecisionState(effect, explanationText, metaText, trace);
  lastEvaluation = { scenario, matchingRules, winner };
}

// Reset

function reset() {
  activeScenarioId = SCENARIOS[0].id;
  activePackIds = new Set(
    RULE_PACKS.filter((p) => p.defaultActive).map((p) => p.id)
  );
  renderScenarioChips();
  renderPackChips();
  renderRuleStack();
  renderLaneRules($("#laneAllow"), [], null);
  renderLaneRules($("#laneDeny"), [], null);
  renderLaneRules($("#laneTransform"), [], null);
  setDecisionState(
    null,
    "",
    "Select a scenario and rule packs, then run evaluation.",
    []
  );
}

// Trace toggle

function setupTraceToggle() {
  const btn = $("#toggleTraceButton");
  const log = $("#traceLog");
  btn.addEventListener("click", () => {
    const visible = log.style.display === "block";
    log.style.display = visible ? "none" : "block";
    btn.textContent = visible ? "Show trace" : "Hide trace";
  });
}

// Init

document.addEventListener("DOMContentLoaded", () => {
  renderScenarioChips();
  renderPackChips();
  renderRuleStack();
  renderLaneRules($("#laneAllow"), [], null);
  renderLaneRules($("#laneDeny"), [], null);
  renderLaneRules($("#laneTransform"), [], null);
  setDecisionState(
    null,
    "",
    "Select a scenario and rule packs, then run evaluation.",
    []
  );

  $("#evaluateButton").addEventListener("click", runEvaluation);
  $("#resetButton").addEventListener("click", reset);
  setupTraceToggle();
});
