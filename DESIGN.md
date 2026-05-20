---
name: Intelligent Growth
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fd'
  on-secondary-container: '#57657b'
  tertiary: '#55615a'
  on-tertiary: '#ffffff'
  tertiary-container: '#99a69e'
  on-tertiary-container: '#303c36'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#d9e6dd'
  tertiary-fixed-dim: '#bdcac1'
  on-tertiary-fixed: '#131e19'
  on-tertiary-fixed-variant: '#3e4943'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  caption:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  container-max: 1280px
---

## Brand & Style
The design system is built on the concept of "Growth Engineering"—a philosophy that balances the precision of technical architecture with the organic nature of learning. The personality is highly competent and structured, yet remains approachable and encouraging.

The visual style blends **Cyber-Blueprint Modernism** — a fusion of architectural drafting aesthetics with futuristic, high-tech interface design. Think blueprint precision meets Tron: Legacy. The interface feels like an engineer's holographic workstation.

**Core aesthetic pillars:**
- **Dot-grid canvas** — A subtle, repeating dot-grid background replaces flat colors, evoking CAD software, drafting tables, and Figma-like design surfaces
- **Neon accent glows** — Emerald green glow effects on hover states and key interactive elements, reminiscent of holographic HUDs
- **Blueprint line work** — Fine hairlines, corner accents, and dashed construction guides bring the precision of engineering schematics
- **Depth through light** — Ambient emerald glows create elevation instead of heavy shadows, suggesting illuminated glass panels
- **Tech metadata** — Small version labels, monospace annotations, and technical notations reinforce the "engineer's workspace" atmosphere

## Colors
The palette is anchored by **Emerald Green (#10b981)**, representing both technical precision and natural vitality. In the high-tech aesthetic, emerald functions as the "neon accent" — appearing as glow effects, active states, and progress indicators against the dark blueprint canvas.

The neutral scale utilizes **Slate Grays** to provide a sophisticated, architectural foundation. Dark mode is the signature experience, with the dot-grid canvas reading as an engineer's dark-mode drafting interface.
- **Primary:** Emerald Green for growth, success, and neon-glow accents.
- **Secondary:** Deep Slate for structural elements and primary typography.
- **Surface:** Ultra-light Slate for light-mode card backgrounds; deep Slate-900/950 for dark-mode surfaces.
- **Background Canvas:** Slate-950 (#020617) in dark mode with dot-grid overlay; Slate-50 (#f8f9ff) in light mode with blue-tinted grid.
- **Accent:** Soft Mint and Sage washes for low-priority highlights; Emerald at reduced opacity (15-25%) for ambient glow overlays.

### Glow Effects
- **Primary glow:** `0 0 15px rgba(16, 185, 129, 0.3)` — used on interactive hover states
- **Ambient glow:** `0 0 40px rgba(16, 185, 129, 0.08)` — used as background aura behind key content areas
- **Text glow:** Emerald text with `text-shadow: 0 0 8px rgba(16, 185, 129, 0.4)` — reserved for hero headlines and key labels
- **Border glow:** `border-color` transitions to emerald with `box-shadow: 0 0 6px rgba(16, 185, 129, 0.25)` — on card hover states

## Grid Background
The system uses a CSS-based dot-grid pattern applied to the main canvas. It's inspired by architectural drafting paper and modern design tools like Figma.

### Dot Grid Specification
- **Dot size:** 1px diameter
- **Grid spacing:** 24px × 24px (desktop), 20px × 20px (mobile)
- **Light mode:** `rgba(15, 23, 42, 0.06)` — nearly invisible, just enough texture to prevent sterile flatness
- **Dark mode:** `rgba(148, 163, 184, 0.06)` — subtle slate dots on the deep navy canvas
- **Implementation:** CSS `radial-gradient` repeating pattern on a background layer
- **Z-index:** Behind all content, above the solid background color

### Secondary Line Grid (Blueprints)
For section dividers and hero areas, a secondary grid using thin lines (0.5px, dashed) can overlay at 48px intervals to create a "construction document" feel. These are intentionally ultra-subtle and should never compete with content readability.

### Grid Variations
- **Hex/Isometric grid:** Reserved for landing hero or "advanced topic" callout cards — 32px hexagons in `rgba(16, 185, 129, 0.05)`
- **Scanline overlay:** A subtle horizontal scanline effect (1px repeating at 3px intervals, 2% opacity) on overlay panels for a CRT/holographic feel

## Typography
The typography strategy prioritizes clarity and institutional trust. **Hanken Grotesk** is used for headlines and labels; its sharp, contemporary geometry provides the "intelligent" and technical edge required for an architectural feel.

**Public Sans** is utilized for all body copy. As a font designed for accessibility and institutional clarity, it ensures that educational content is digestible and inclusive. Large displays use a tighter letter-spacing and heavier weights to command attention, while labels utilize uppercase tracking to mimic blueprint annotations.

## Layout & Spacing
The layout follows a **Fixed-Grid System** inspired by drafting paper. It uses a 12-column grid for desktop and a 4-column grid for mobile. 

Spacing is strictly derived from an 8px base unit to maintain mathematical harmony. To emphasize the "architectural" theme, use generous inner padding within containers (minimum 24px) to give content room to breathe. Margins and gutters are kept consistent to reinforce a sense of stability and order. Reflow rules should prioritize vertical stacking on mobile, maintaining the 8px rhythm even when elements collapse.

## Elevation & Depth
Depth in this high-tech system is communicated through **Low-Contrast Outlines**, **Tonal Layers**, and **Ambient Glow** — never heavy drop shadows. The aesthetic evokes illuminated glass panels floating above a drafting surface.

1.  **Level 0 (Base Canvas):** The dot-grid background. Dark mode: deep navy (#020617); Light mode: near-white (#f8f9ff). Both carry the subtle dot-grid pattern.
2.  **Level 1 (Cards/Panels):** Surfaces with a 1px border in slate-200 (light) or slate-700 (dark). On dark mode, cards carry a faint emerald ambient glow (`box-shadow: 0 0 30px rgba(16, 185, 129, 0.04)`). White surfaces in light mode; Slate-800 (#1e293b) in dark mode.
3.  **Level 2 (Interactive/Hover):** Cards lift with a emerald border glow (`0 0 12px rgba(16, 185, 129, 0.15)`) and a subtle Y-axis translate (-2px) to simulate floating glass panels. No shadow — pure luminous elevation.
4.  **Level 3 (Overlays/Modals):** Backdrop blur + subtle emerald ring glow. The content appears to float above the canvas with a soft luminous aura.

### Construction Lines
To reinforce the blueprint aesthetic, use thin, dotted or dashed separators between secondary content areas. These should be 1px dotted lines in `slate-300` (light) or `slate-600` (dark) at 40-60% opacity.

## Shapes
The shape language is "Soft-Technical." Elements use a **0.25rem (4px)** base radius. This small radius keeps the UI feeling precise and engineered, but removes the aggressive "sharpness" of 90-degree corners, making it feel friendlier for a learning environment.

Large containers like cards should use `rounded-lg` (8px), while interactive elements like buttons and input fields stay consistent with the base `rounded` (4px). Avoid fully rounded "pill" shapes, as they conflict with the structured, architectural narrative.

## Components
### Buttons
Primary buttons use the Emerald Green background with white text. They should feel "solid" and dependable, with a subtle glow on hover (`box-shadow: 0 0 16px rgba(16, 185, 129, 0.25)`). An active press state shrinks slightly (`scale: 0.97`).

Secondary buttons use a Slate-800 outline with a transparent background, reinforcing the blueprint aesthetic. On hover in dark mode, the border faintly illuminates (`border-emerald-600/40`).

### Tech Accents
Small UI details that reinforce the high-tech, engineering-workspace aesthetic:

- **Corner brackets:** 6px × 6px L-shaped emerald lines at the corners of featured containers — reminiscent of CAD selection handles
- **Monospace metadata:** Version numbers, performance metrics, and technical labels rendered in `JetBrains Mono` at 10-11px, subtly placed in card corners
- **Scanline dividers:** Horizontal rules rendered as a thin dashed or dotted line, sometimes with a subtle gradient fade to transparent on both ends
- **HUD status dots:** Small pulsing emerald dots used for "live" or "active" indicators (2.5px diameter, with a `pulse` animation at 2s intervals)
- **Blueprint annotations:** Uppercase, wide-tracked labels (letter-spacing: 0.08em) in `surface-400` mimicking architectural drawing callouts

### Input Fields
Fields use a white background with a subtle Slate-200 border. On focus, the border transitions to Emerald Green with a soft 2px outer glow. Labels always sit above the field in the Hanken Grotesk label style.

### Cards
Cards are the primary container for learning modules. They feature a surface with 1px slate border and 24px internal padding. In dark mode, cards carry a faint emerald ambient glow (`box-shadow: 0 0 30px rgba(16, 185, 129, 0.04)`). On hover, the border transitions to emerald with a subtle glow effect (`box-shadow: 0 0 12px rgba(16, 185, 129, 0.15)`), and the card lifts 2px with a smooth transition — like an illuminated glass panel activating.

Cards may include small technical metadata (e.g., "Module v.1.2") in the top right corner using the monospace caption style, and corner accent lines (2px × 12px emerald lines at top-left and bottom-right corners) for a "tech HUD" framing element on featured cards.

### Progress Indicators
Progress bars should be thin and precise, using Emerald for the "filled" state and a light Slate-100 for the "unfilled" track.

### Chips/Tags
Use a "Soft" style: light Emerald or Slate backgrounds with dark text, no borders, and the base 4px corner radius. These are used for categorizing topics or marking difficulty levels.
