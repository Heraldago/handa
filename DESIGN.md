# HANDĀ Design System Specification (`DESIGN.md`)

> **Single Source of Truth** for UI design, components, typography, color semantics, and interaction patterns across HANDĀ customer booking (`/`) and staff admin dashboard (`/admin`).

---

## 1. Brand Identity & Design Principles

* **Aesthetic Philosophy**: Minimalist Japanese Izakaya / Modern Brutalist. High-contrast, stark, confident, functional, and devoid of unnecessary ornamentation.
* **Canvas & Surface**: Pure crisp white (`#ffffff`) as the primary canvas. Light neutral backgrounds (`#f5f5f5` / `bg-neutral-100`) for segmented trays and subtle containers.
* **Geometry**: Strict **zero border-radius** (`rounded-none`). Every card, button, input, badge, and modal is a sharp rectangular plane.
* **Numbers & Numerals**: Standard geometric sans-serif (Inter / System Sans). **No slashed zeros, no monospaced tabular styling**.

---

## 2. Color Palette & Semantic System

| Token | Hex / Class | Semantic Meaning & Usage Rules |
| :--- | :--- | :--- |
| **Canvas** | `#ffffff` | Primary background canvas. Keeps the screen luminous and legible. |
| **Primary Ink** | `#000000` | Text, primary headings, stark borders, and primary CTA backgrounds. |
| **Muted Ink** | `#525252` (`neutral-600`) | Secondary labels, descriptions, and helper text. |
| **Subtle Ink** | `#a3a3a3` (`neutral-400`) | Placeholders, inactive hints, and subtle dividers. |
| **Brand Red** | `#e60000` | **Brand Accent Only**: Dot in `HANDA.`, urgent warnings, dietary allergen badges. |
| **Semantic Success** | `#059669` (`emerald-600`) | **Open / Arrived**: `☀️ ESTERNO APERTO`, `✓ Seduti`, `Al Tavolo` badge. |
| **Semantic Pending** | `#f59e0b` (`amber-500`) | **Waiting / In Arrival**: `● In Attesa` filter and status badges. |
| **Semantic Danger/Stop** | `#dc2626` (`red-600`) | **Closed / Error / Cancel**: `🌧️ ESTERNO CHIUSO`, `🔴 Turno Bloccato`, `Cancellata`. |

> [!IMPORTANT]
> **Semantic Rule for Red (`#e60000` / `#dc2626`)**:
> **Never** use red as an indicator of an active/selected button or choice. Red strictly signals **stop, closed, cancelled, error, or allergen alert**.

---

## 3. Figma Button States & Hierarchy Framework

Based on Figma's official State Architecture guidelines:

### A. Button Hierarchy (Styles)
* **Primary CTA**: Solid black (`bg-black text-white`). Highest visual weight, reserved for key final actions (e.g. `[CONFERMA PRENOTAZIONE →]`, `[📞 + PRENOTA]`).
* **Secondary / Card Options**: Crisp white canvas with stark borders (`bg-white border-2 border-neutral-200`). Used for choices, shifts, tables, and segmented steps.
* **Tertiary / Ghost**: Borderless or subtle outline with neutral text, for secondary utility links.

### B. The 9 Core Interactive States

| State | Visual Behavior in HANDĀ | Accessibility / CSS Implementation |
| :--- | :--- | :--- |
| **1. Default (Idle)** | Clean border, neutral text, legible typography. | Base class |
| **2. Hover** | Darker border (`hover:border-black`), subtle background tint. | Desktop `:hover` (no-op on touch) |
| **3. Active (Pressed)** | Tactile micro-depression feedback (`active:scale-95` or `active:scale-98`). | Momentary `:active` state on tap/click |
| **4. Focus-Visible** | High-contrast stark focus ring (`focus-visible:ring-2 focus-visible:ring-black`). | Keyboard navigation (WCAG 2.2) |
| **5. Disabled** | Reduced opacity (`opacity-35`), dashed border, `cursor-not-allowed`. | `disabled` attribute & `aria-disabled="true"` |
| **6. Selected / Toggled** | **Cards**: White background + heavy frame (`border-2 border-black shadow-md`) + explicit `[✓ SELEZIONATO]` badge.<br>**Chips/Pills**: Inverted solid black (`bg-black text-white`). | Persistent state with `aria-pressed="true"` / `aria-selected="true"` |
| **7. Loading** | Button text replaced by spinner or "Conferma in corso...", disabled to prevent duplicate submissions. | `disabled={submitting}` & spinner animation |
| **8. Success** | Instant closure confirmation screen (`Prenotazione Confermata ✓`). | Screen transition with green confirmation badge |
| **9. Error** | Red alert banner (`bg-red-50 text-[#e60000] border-l-4 border-[#e60000]`) with recovery instructions. | Inline message, button resets to clickable state |

---

## 4. Floor Management & Admin Dashboard Semantics

* **Status Filter Bar**:
  * `Tutti`: Neutral high-contrast black pill (`bg-black text-white`).
  * `● In Attesa`: Warm amber pill (`bg-amber-400 text-amber-950 font-black shadow-xs`).
  * `✓ Seduti`: Vivid emerald pill (`bg-emerald-600 text-white font-black shadow-xs`).
* **Outdoor Master Toggle**:
  * `Aperto`: Green border and background (`border-emerald-600 bg-emerald-50/70 text-emerald-950`) with green track knob at right.
  * `Chiuso`: Red border and background (`border-red-600 bg-red-50/80 text-red-950`) with red track knob at left.
* **Date Orientation**:
  * Big date headline (`text-2xl sm:text-4xl lg:text-5xl font-black uppercase`) readable at a distance from the restaurant floor.
  * Quick jump buttons (`Oggi`, `Domani`, `Dopodomani`) sized at minimum 40–44px for thumb operation.

---

## 5. Mobile & Touch Ergonomics

1. **Touch Targets**: All interactive elements (buttons, segmented options, status toggles) must have a minimum touch height of **40px–48px** (`h-10` to `h-12`).
2. **iOS Safari Zoom Prevention**: All form text inputs must have a font size of at least `16px` (`text-base`). Font sizes smaller than 16px trigger iOS auto-zoom on focus, breaking fixed headers and sticky navigation bars.
3. **Navbar Overflow Prevention**: On mobile screens (<390px), buttons in headers must use concise copy (e.g. `[📞 + PRENOTA]`) and flex-shrink protection to prevent layout breaking or text clipping.
