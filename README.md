# INZILA — National Underground Infrastructure Mapping & Coordination Platform

**Interactive 3D demo twin — "Google Earth, but with underground."**

This repository contains a browser-based 3D demonstration of **Inzila**, a proposed national digital twin for Zimbabwe that maps both surface infrastructure (buildings, roads, traffic signals, bus terminals, fire-fighting water points) and underground infrastructure (fibre ducts, water reticulation, electricity cable, and mine tunnel networks) in a single, explorable model.

The concept is described in full in [`Inzila_AI4I_Proposal_Data-1.pdf`](Inzila_AI4I_Proposal_Data-1.pdf), submitted to the POTRAZ AI for Impact Challenge 2026 (Track 1, Data) by Team Inzila. This demo turns that written proposal into something you can fly around, click into, and interrogate.

> All data in this demo is **synthetic and illustrative** — generated procedurally to be geographically plausible, not survey-accurate. It exists to demonstrate what the real Inzila register and viewer would look and feel like once populated with verified field data, per the data model in Section 3 of the proposal.

## What it does

- Renders the **entire country of Zimbabwe** as an interactive 3D terrain block, with Lake Kariba, the Great Dyke, all major cities and towns, the national road network, and the principal fibre and power transmission corridors.
- Every city is built out with **procedurally generated buildings**, a street grid, and street-level assets: manholes/chambers, fire hydrants, traffic signals, and bus terminals — plus underground utility grids (fibre, water, power) running beneath the streets at their own depths.
- Every major **mine** in the country (gold, platinum, chrome, nickel, lithium, diamonds, coal) is modelled with a headframe, shaft, and a branching network of underground tunnel levels/drives, clickable down to individual drives.
- A **ground-opacity slider** and Surface / X-ray / Underground presets let you peel back the earth to see what's buried beneath any point in the country — the core "with underground" pitch of the proposal.
- A **dig-safe clearance check** mode mirrors the proposal's Section 4.3 access tier: click anywhere on the map to run a buffer check against every mapped underground asset and get a presence/absence + nearest-distance result, exactly like the UK National Underground Asset Register's Safe Dig model referenced in the proposal.
- Clicking any asset — a building, manhole, hydrant, traffic signal, bus terminal, fibre trunk, transmission pylon, power station, mine, or mine tunnel — opens a **register record card** modelled on the proposal's Appendix A data dictionary: `asset_id`, `capture_method`, `verification_status`, `last_updated`, `captured_by` (pseudonymous, per Section 3.2), etc.
- A live **stats panel** tallies buildings, underground assets, and kilometres of fibre/water/power mapped, echoing the pilot-scale reporting described in Section 2.2 and Section 3.6 of the proposal.

## Why it's built this way

Every design choice in the demo maps back to a specific commitment in the proposal:

| Demo feature | Proposal section |
|---|---|
| Two-tier record status (`verified` / `unverified` / `unverified_digitised`) | §2.4 — two-tier verification workflow |
| `capture_method` field (`gnss_rtk`, `gnss_handheld`, `electromagnetic_locator`, `digitised_drawing`, `as_built_import`) | §3.2 — controlled vocabulary for capture confidence |
| Pseudonymous `captured_by: TECH-####` instead of a real name | §3.2, §4.1 — technician data is personal data, handled separately from asset data |
| Dig-safe buffer check returns presence/absence + distance only, not full precision | §4.3 — dig-safe clearance access tier |
| Restricted layer note on mines, HV lines, and fibre trunks | §4.1, §4.5 — critical infrastructure sensitivity, theft/sabotage risk mitigation |
| Depth-from-surface shown in metres on every underground asset | §3.2 — `depth_from_surface_m`, range 0–6m for utility assets |
| National → provincial → pilot-corridor framing (fly-to any city or mine) | §2.2, §5.5 — phased pilot → trunk routes → full national coverage |

## Running the demo

No build step or dependencies to install — it's a static page using Three.js from a CDN via an import map.

```bash
# from the repository root
python -m http.server 8080
# then open http://localhost:8080 in a browser
```

Any static file server works (`npx serve`, VS Code's Live Server, etc.) — the page just needs to be served over HTTP rather than opened as a `file://` URL, because it uses ES module imports.

## Controls

- **Drag** — orbit the camera
- **Scroll** — zoom in/out
- **Right-drag** — pan
- **Click any asset** — open its register record card
- **Fly to…** — jump straight to any city or mine
- **Surface / X-ray / Underground** — quick view presets, or drag the ground-opacity slider for a manual cutaway
- **Layers panel** — toggle buildings, roads, fibre, water, power, street assets, mines, and labels independently
- **Dig-safe clearance check** — toggle on, then click anywhere to run a buffer check against the mapped register

## Project structure

```
index.html          Page shell, control panel, legend, info card markup
css/style.css        All styling (dark "ops console" theme)
js/data.js            Seed data: national border, cities, mines, roads, fibre/power routes
js/main.js             Three.js scene: terrain, cities, underground grids, mines, picking, UI wiring
Inzila_AI4I_Proposal_Data-1.pdf   The source proposal this demo visualises
```

## Notes on scale

Real underground assets sit centimetres to a few metres below the surface — invisible at national scale. To make the underground layer legible from orbit, this demo draws utility grids and mine workings at exaggerated depths and building heights are stylised, not survey-accurate. Every asset's info card states its real-world depth in metres so the exaggeration never misleads about the actual data model — only about the picture.

## Status

Demo / concept visualisation only. It is not connected to any live register, GIS system, or partner data source. Building the real Inzila register — partner data ingestion, field verification workflow, AI-assisted digitisation, and the access-tiered API described in the proposal — is future work outlined in Sections 2, 3, and 5 of the proposal.
