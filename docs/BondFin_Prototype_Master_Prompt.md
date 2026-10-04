# BondFin Prototype Master Prompt

Create a BondFin prototype for **[feature or screen]**.

**Audience:** [member, admin concept, or other]  
**Route:** [existing prototype route or new development-only route]  
**Reference:** [Figma frame, screenshot, description, or existing BondFin screen]  
**Desired demo interactions:** [none, or list harmless local-only interactions]

## Goal

Build a polished, responsive Next.js and Tailwind prototype that fits BondFin's ROSCA purpose and existing visual style.

This is a visual prototype only. It is not production functionality and must not be connected to real data or financial workflows.

## Data and Security Boundaries

- Use clearly fictional sample data only. Do not display actual member, account, or financial records.
- Do not query Supabase, call APIs, use server actions, or make network requests.
- Do not modify the database schema, RLS policies, authentication, or financial workflows.
- Do not add service-role credentials or other secrets.
- Keep the prototype isolated from member-facing production workflows.
- For the existing `/admin` prototype, bypass Supabase sign-in only in development, because the prototype uses no private data. The route must be unavailable in production.
- Do not expose a development server to public networks.

## Demo Interactions

- Harmless interactions such as tabs, filters, navigation, and preview dialogs may work using in-memory prototype state only.
- Demo interactions must make no network requests and persist no data.
- Clearly label demo interactions as demonstrations.
- Any control that appears to approve, verify, pay, transfer, or delete must be disabled, or clearly marked as a nonfunctional demonstration.
- Never show a simulated success state that could be mistaken for a completed financial action.

## Prototype Labeling

Show a prominent **"Prototype · Synthetic data only"** notice.

Clearly identify sample records and values without adding repetitive labels that make the interface difficult to scan.

## UX Principles

**Usable**
- Clear hierarchy and understandable labels.
- Responsive layout and predictable interactions.
- Include relevant empty, loading, error, and status states using synthetic content.

**Equitable**
- Keyboard-accessible controls.
- Readable contrast and visible focus states.
- Do not communicate meaning through color alone.
- Use inclusive language and layouts.

**Enjoyable**
- Polished, calm visuals that follow BondFin's established design style.
- Use motion sparingly and only when it supports the experience.

**Useful**
- Focus on the stated user task.
- Avoid unnecessary features and complexity.

## Implementation Workflow

1. Inspect the relevant BondFin styles, project structure, and installed Next.js documentation before editing.
2. Briefly state the files you plan to change and the prototype states you intend to demonstrate.
3. Implement only the isolated prototype. Keep the page server-rendered by default; add a minimal client component only if a requested local-only interaction requires it.
4. Do not connect the prototype to real data or workflows.
5. Run `npm run lint` and `npm run build`. Report results and any limitations.
6. Do not document or implement production security decisions until I approve the prototype's screen and behavior.

## Acceptance Criteria

- The prototype is clearly identified as non-production and synthetic.
- No Supabase access, API calls, server actions, or real data writes are added.
- No existing member workflow, schema, RLS policy, or authentication behavior is changed.
- Any demo interaction is local-only, reversible, and visibly a demonstration.
- The prototype route is unavailable in production.
- The interface follows the four UX principles above.
- Lint and build results are reported.
