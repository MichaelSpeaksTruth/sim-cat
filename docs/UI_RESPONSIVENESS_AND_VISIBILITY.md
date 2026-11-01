# SIM-CAT Workstation UI Responsiveness & Scientific Visibility Architecture

**Document Version**: 1.0  
**Scope**: Scientific Workstation Layout, Responsive Card Grids, Global Viewport Scaling, and Data Visibility

---

## 1. Problem Statement & Root Cause Analysis

In standard fixed-bed reactor simulation workflows, researchers operate across a wide variety of display configurations:
1. High-DPI laptop displays ($1920 \times 1080$ or $1366 \times 768$ at $125\%$ to $150\%$ OS display scaling).
2. Multi-column workstation split views where the main canvas shares screen width with a $250\ \mathrm{px}$ Navigation Rail and a $340\ \mathrm{px}$ Engineering Inspector panel.
3. 50/50 split views (such as the Simulation & Playback studio) where a 3D WebGL reactor and a 1D axial solver chart sit side-by-side.

### Previous Failure Modes
- **Viewport Media Query Decoupling**: Component grids used standard viewport-based media queries (e.g., `xl:grid-cols-7`). When the browser viewport was $\ge 1280\ \mathrm{px}$, the media query forced 7 columns into a container that was only $\approx 400\ \mathrm{px}$ wide inside a half-column split. This squeezed cards into $35\ \mathrm{px}$ pillars.
- **Aggressive Text Truncation**: CSS `truncate` (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`) was applied to metric titles, values, and unit strings, reducing critical physical values into unreadable dot notation (`A...`, `26.7...`, `mol/(k...`, `Φ = 0....`).
- **Vertical Viewport Overflow**: On laptop displays, stacked components (header, 3D WebGL canvas, axial charts, inspection cards, and reactor suggestion card) exceeded the vertical fold ($> 800\ \mathrm{px}$), requiring extensive scrolling to verify solution metrics.

---

## 2. Implemented Architecture & Solutions

### 2.1 Container-Aware Auto-Fill Dynamic Grids
Instead of relying on browser window width (`sm:`, `md:`, `lg:`, `xl:`), metric card containers now employ container-aware auto-fill grids:
```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
gap: 0.625rem;
```
- **Wide Containers ($> 1100\ \mathrm{px}$)**: Renders all 7 cards horizontally ($150\text{--}170\ \mathrm{px}$ each).
- **Medium Containers ($700\text{--}900\ \mathrm{px}$)**: Renders 4 cards on row 1, 3 cards on row 2.
- **Narrow Containers ($\approx 400\ \mathrm{px}$)**: Renders 3 cards on row 1, 3 cards on row 2, 1 card on row 3 ($130\ \mathrm{px}$ minimum width).
- **Mobile Containers ($< 350\ \mathrm{px}$)**: Renders 2 cards per row.

### 2.2 Complete Elimination of Value & Unit Truncation
All metric cards in `AxialCharts.tsx`, `NistMappingView.tsx`, and `DiagnosticCard.tsx` now preserve complete labels, physical symbols, formatted numbers, and units:
- **Axial Coordinate ($z$)**: Measured in $\mathrm{mm}$ and percentage of bed length ($\% L$).
- **Temperature ($T$)**: Displayed in Kelvin [$\mathrm{K}$] with companion Celsius [$\mathrm{^\circ C}$] conversion.
- **Total Pressure ($P$)**: Displayed in $\mathrm{bar}$ with Ergun friction pressure drop ($\Delta P$ in $\mathrm{kPa}$).
- **Conversion ($X_{\mathrm{N}_2}$)**: Displayed as single-pass percentage of feed nitrogen reacted.
- **Ammonia Mole Fraction ($y_{\mathrm{NH}_3}$)**: Bulk gas phase molar concentration.
- **Observed Reaction Rate ($r_{\mathrm{obs}}$)**: Formatted in scientific notation or fixed decimals in $\mathrm{mol}/(\mathrm{kg\text{-}cat}\cdot\mathrm{s})$.
- **Pellet Effectiveness ($\eta$) & Weisz-Prater ($\Phi$)**: Evaluated against the Eurokin $\eta \ge 0.95$ ($95\%$) intrinsic threshold and $\Phi < 1$.

### 2.3 Global Workstation Scale Controller
An interactive zoom controller is embedded directly into the top `WorkstationHeader.tsx`:
- Controls: `[-]` Zoom Out, `{zoom}%` indicator/reset, `[+]` Zoom In.
- Range: $70\%$ to $130\%$ scale with preset increments.
- Storage: Automatically persists the user's zoom preference to browser `localStorage` (`simcat_global_zoom`).
- Implementation: Applied via CSS `zoom` on the central `<main>` canvas, maintaining native container calculations, font rendering, and scroll dynamics without layout clipping.

### 2.4 Simulation & Playback Studio Layout Modes
The Simulation Studio (`App.tsx`) now features a dedicated layout switcher:
- **Stacked (Full Width)** *(Default)*: Full-width centerpiece 3D WebGL Reactor tube on top, full-width Synchronized Axial Profile below. Eliminates all horizontal cramping.
- **Split (Side-by-Side)**: Allocates $42\%$ width (`xl:col-span-5`) to the slender reactor tube and $58\%$ width (`xl:col-span-7`) to the axial profile, with container-aware auto-wrapping cards.

### 2.5 Results Explorer Multi-View Dashboard
The Results Explorer (`App.tsx`) includes:
- **Top Summary Ribbon**: Immediate visual readout of Bed Length, Hotspot Temperature ($T_{\max}$ at $z$), Cumulative $\Delta P$, Outlet Conversion ($X_{\mathrm{N}_2}$), and Commercial NH₃ Rate ($\mathrm{kg/h}$).
- **View Filter Tabs**:
  - `Complete View`: Full dashboard pairing the 1D axial chart with the multi-dimensional reactor feasibility card.
  - `Axial Profile`: Dedicated view focusing on the finite difference solver and metric inspection cards.
  - `Feasibility`: Architectural and geometric feasibility evaluation.
  - `Data Table`: Interactive finite-difference slice discretization table with clickable rows that synchronize with the axial coordinate cursor.
- **One-Click Canvas Expansion**: Toggle button in the header and toolbar to collapse the $340\ \mathrm{px}$ inspector and expand canvas width immediately.

### 2.6 Interactive Eurokin Metrics Guide
An expandable **Metrics Guide** drawer is embedded directly into the axial charts header, explaining:
- Physical definitions and differential equations for $z, T(z), P(z), X(z), y_{\mathrm{NH}_3}(z), r_{\mathrm{obs}}(z), \eta(z), \Phi$.
- Eurokin Consortium benchmark acceptance criteria ($\eta \ge 0.95$, $\Phi < 1$, Ergun limits).
- Units, thermodynamic foundations, and kinetic rate law interpretation.
