# Admin Rule Engine Playground  
[![Live Demo](https://img.shields.io/badge/Live%20Demo-000?style=for-the-badge)](https://rtfenter.github.io/Admin-Rule-Engine/)


### A small tool to see how admin-configured rules stack, conflict, and resolve across scenarios.

This project is part of my **Applied Intelligence Systems Series**, exploring how agents, models, and governance layers behave beneath the UI — from safety rules to event contracts to interpretation drift.

The goal of this playground is to make admin rule logic legible:

- Rule scopes and conditions  
- Priority and ordering  
- Conflicts and overrides  
- Default / fallback behavior  
- Active vs. draft rule sets  

Instead of hiding behavior inside config files or code paths, this prototype exposes rules as a simple, testable surface.

---

## Features (MVP)

This prototype includes:

- A small library of **predefined rule packs** (e.g., “baseline policy”, “strict mode”, “experiment mode”)  
- A visual panel showing:
  - Which rules are active  
  - How priorities are applied  
  - Where conflicts appear  
- A **scenario loader** with canned examples:
  - “Standard request”  
  - “Edge case with overlapping rules”  
  - “Conflicting flags across environments”  
- A rule evaluation summary showing:
  - Which rules fired  
  - Which rules were skipped or shadowed  
  - The final decision and key justifications  
- A tiny “explainability” panel that describes, in plain language, what happened.

All text inputs are replaced with **loadable scenarios** and **preset rule packs** — no freeform user text required.

---

## Demo Screenshot

<img width="2806" height="2160" alt="Screenshot 2025-11-28 at 16-43-26 Admin Rule Engine Playground" src="https://github.com/user-attachments/assets/e48ed457-2cbe-4a8e-841e-8f54e63b69cb" />


---

## Admin Rule Resolution Flow

\`\`\`text
        [Select Rule Pack + Scenario]
                      |
                      v
             Rule Set Assembly
          (base rules + overrides)
                      |
                      v
            Conflict & Priority Pass
      (which rules win, lose, or merge)
                      |
                      v
            Scenario Evaluation Engine
      (apply assembled rules to example)
                      |
                      v
          Final Decision & Justification
   ("Allowed with warnings", "Blocked: 
    policy override", "Allowed via fallback")
                      |
                      v
           Human-Readable Explanation
("Request allowed by v3 policy in EU",
 "Blocked: admin override for sandbox")
\`\`\`

---

## Purpose

In real systems, admin-configured rules tend to drift over time:

- New rules are added on top of old ones  
- Priorities are changed without clear documentation  
- “Temporary” overrides never get removed  
- Different environments (dev, staging, prod) diverge  

Eventually, it becomes difficult to answer basic questions:

**“Which rules are actually active right now — and why did *this* one win?”**

This tool provides a small, understandable way to:

- Assemble rule packs from base rules and overrides  
- Run canned scenarios against them  
- See which rules actually fired, and which ones were shadowed  

---

## How This Maps to Real Systems

### Rule Set Assembly  
Where base policy, feature flags, and admin overrides are combined into a single effective rule set.

### Conflict & Priority Pass  
The step that decides which rules win when multiple could apply — often where unexpected behavior shows up.

### Scenario Evaluation  
Applying the assembled rules to example requests, events, or entities to see how behavior changes.

### Final Decision  
The system must output a clear outcome: allow, block, transform, or escalate — with the right rule attached.

### Explanation Layer  
Critical for admins, support, and auditors trying to understand what the system is actually doing.

This prototype builds a legible slice of that full rule engine lifecycle.

---

## Part of the Applied Intelligence Systems Series

Main repo:  
https://github.com/rtfenter/Applied-Intelligence-Systems-Series

---

## Status  

MVP is implemented and active.  
The initial UI will focus on **preset rule packs + canned scenarios**, with logic and visualization layered in iteratively.

---

## Local Use

Everything runs client-side.

1. Clone the repo  
2. Open `index.html` in your browser  

That’s it — no backend required.
