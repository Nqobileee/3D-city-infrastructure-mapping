# INZILA — National Underground Infrastructure Mapping & Coordination Platform

**Interactive 3D demo twin — "Google Earth, but with underground."**

This repository contains a browser-based 3D demonstration of **Inzila**, a proposed national digital twin for Zimbabwe that maps both surface infrastructure (buildings, roads, traffic signals, bus terminals, fire-fighting water points) and underground infrastructure (fibre ducts, water reticulation, electricity cable, and mine tunnel networks) in a single, explorable model.

The concept is described in full in [`Inzila_AI4I_Proposal_Data-1.pdf`](Inzila_AI4I_Proposal_Data-1.pdf), submitted to the POTRAZ AI for Impact Challenge 2026 (Track 1, Data) by Team Inzila. This demo turns that written proposal into something you can fly around, click into, and interrogate.

> All data in this demo is **synthetic and illustrative** — generated procedurally to be plausible, not survey-accurate. It exists to demonstrate what the real Inzila register and viewer would look and feel like once populated with verified field data, per the data model in Section 3 of the proposal.

## What it shows

The demo models one round pilot city — **Harare CBD, the proposal's phase-one pilot corridor** — in a clean low-poly style, plus its immediate industrial surroundings:

- **The city**: a circular street grid with block-based buildings (denser and taller downtown), the Joina City landmark from the proposal's Figure 1, and street-level assets at intersections — manholes/chambers, fire hydrants, traffic signals, water valves, and bus terminals.
- **The underground**: fibre ducts, water reticulation, and electricity cable running beneath the streets at their own depths, each in its legend colour. A **ground-opacity slider** and Surface / X-ray / Underground presets peel back the earth to show what's buried below — the core "with underground" pitch of the proposal.
- **A mine**: Freda Rebecca (illustrative) sits outside the city with a headframe, main shaft, and branching underground tunnel drives across three levels, connected to town by an access road and a fibre spur.
- **Power**: a thermal power station on the far side of the city, linked to the mine by an overhead HV transmission corridor with pylons.
- A **dig-safe clearance check** mode mirrors the proposal's Section 4.3 access tier: click anywhere to run a buffer check against every mapped underground asset and get a presence/absence + nearest-distance result, modelled on the UK National Underground Asset Register's Safe Dig workflow referenced in the proposal.
- Clicking any asset opens a **register record card** modelled on the proposal's Appendix A data dictionary: `asset_id`, `capture_method`, `verification_status`, `last_updated`, `captured_by` (pseudonymous, per Section 3.2), and depth from surface in metres.
- A live **stats panel** tallies buildings, underground assets, and kilometres of fibre/water/power mapped, echoing the pilot-scale reporting in Sections 2.2 and 3.6.

## Why it's built this way

Every design choice maps back to a specific commitment in the proposal:

| Demo feature | Proposal section |
|---|---|
| Single-city pilot scope (Harare CBD corridor) | §2.2, §5.5 — ninety-day CBD pilot before trunk-route and national expansion |
| Two-tier record status (`verified` / `unverified` / `unverified_digitised`) | §2.4 — two-tier verification workflow |
| `capture_method` field (`gnss_rtk`, `gnss_handheld`, `electromagnetic_locator`, `digitised_drawing`, `as_built_import`) | §3.2 — controlled vocabulary for capture confidence |
| Pseudonymous `captured_by: TECH-####` instead of a real name | §3.2, §4.1 — technician data is personal data, handled separately from asset data |
| Dig-safe buffer check returns presence/absence + distance only, not full precision | §4.3 — dig-safe clearance access tier |
| Restricted-layer note on the mine, HV line, and fibre trunk records | §4.1, §4.5 — critical infrastructure sensitivity, theft/sabotage risk mitigation |
| Depth-from-surface shown in metres on every underground asset | §3.2 — `depth_from_surface_m`, range 0–6 m for utility assets |
| Joina City called out as a landmark | §1.1, Figure 1 — the multi-utility duct bank exposed near Joina City |

## Running the demo

No build step or dependencies to install — it's a static page using Three.js from a CDN via an import map.

```bash
# from the repository root
python -m http.server 8080
# then open http://localhost:8080 in a browser
```

Any static file server works (`npx serve`, VS Code's Live Server, etc.) — the page just needs to be served over HTTP rather than opened as a `file://` URL, because it uses ES module imports.

Works on desktop and mobile: the layout is responsive, and the canvas supports touch orbit/pinch-zoom.

## Controls

- **Drag** (or one-finger drag) — orbit the camera
- **Scroll** (or pinch) — zoom in/out
- **Right-drag** — pan
- **Click / tap any asset** — open its register record card
- **Fly to…** — jump to the city centre, Joina City, the mine, or the power station
- **Surface / X-ray / Underground** — quick view presets, or drag the ground-opacity slider for a manual cutaway
- **Layers panel** — toggle buildings, roads, fibre, water, power, street assets, the mine, and labels independently
- **Dig-safe clearance check** — toggle on, then click anywhere to run a buffer check against the mapped register

## Project structure

```
index.html          Page shell, control panel, legend, info card markup
css/style.css        All styling (dark "ops console" UI over a light low-poly scene), mobile responsive
js/data.js            Seed data: city parameters, landmark, mine, power station, utility owners
js/main.js             Three.js scene: terrain, city, underground grids, mine, picking, dig-safe, UI wiring
Inzila_AI4I_Proposal_Data-1.pdf   The source proposal this demo visualises
```

## Notes on scale

Real underground utilities sit centimetres to a few metres below the surface — invisible at city scale. To keep the underground layer legible, the demo draws utility grids at exaggerated depths and the mine's workings at ×5 depth; building heights are stylised. Every asset's info card states its real-world depth in metres, so the exaggeration never misleads about the actual data model — only about the picture.

## Status

Demo / concept visualisation only. It is not connected to any live register, GIS system, or partner data source. Building the real Inzila register — partner data ingestion, field verification workflow, AI-assisted digitisation, and the access-tiered API described in the proposal — is future work outlined in Sections 2, 3, and 5 of the proposal.
