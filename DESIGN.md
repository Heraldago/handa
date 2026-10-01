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

## 3. Interactive States & Component Affordances

### A. Primary Action CTAs vs Selection States
To prevent the screen from turning into an oppressive black void, a strict distinction is enforced:

* **Primary Action Buttons (CTAs)**:
  * Examples: `[CONFERMA PRENOTAZIONE →]`, `[📞 + PRENOTA]`, `[✓ Siedi al Tavolo]`.
  * Style: Solid black background (`bg-black text-white`), bold uppercase, hover transition to red or emerald (`hover:bg-[#e60000]` or `hover:bg-emerald-600`).
* **Selection Cards (Large surfaces: Shifts, Seating Areas)**:
  * **Selected**: Remains **luminous white** (`bg-white`), framed by heavy stark black border and subtle elevation (`border-2 border-black shadow-md ring-1 ring-black`). In the top-right corner, an explicit high-contrast badge is displayed: `[✓ SELEZIONATO]`.
  * **Unselected**: Light border (`border-2 border-neutral-200 bg-white text-neutral-600 hover:border-black hover:text-black`), accompanied by an empty radio circle `○`.
  * **Unavailable / Closed**: Muted dashed border (`border-dashed border-neutral-300 opacity-40 bg-neutral-100 cursor-not-allowed`) with a clear reason badge (e.g. `[CHIUSO METEO]`, `[COMPLETO]`).
* **Compact Segmented Chips (Pax Numbers 1–6, Dates Oggi/Domani, Time Slots, Lang IT/EN)**:
  * **Selected**: Inverted solid black (`border-2 border-black bg-black text-white shadow-xs font-black`). Because it is a small single chip (36–48px), it creates an instant focal point without darkening the page.
  * **Unselected**: Clean white (`border-2 border-neutral-200 bg-white text-neutral-700 hover:border-black hover:text-black`).
  * *Note*: Avoid dark gray / anthracite for active states, as it visually reads as "disabled/inactive".

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
