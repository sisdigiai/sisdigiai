---
name: Geometric Precision
colors:
  surface: '#0d131f'
  surface-dim: '#0d131f'
  surface-bright: '#333946'
  surface-container-lowest: '#080e1a'
  surface-container-low: '#161c27'
  surface-container: '#1a202c'
  surface-container-high: '#242a36'
  surface-container-highest: '#2f3542'
  on-surface: '#dde2f3'
  on-surface-variant: '#c7c6cd'
  inverse-surface: '#dde2f3'
  inverse-on-surface: '#2a303d'
  outline: '#909097'
  outline-variant: '#46464c'
  surface-tint: '#c2c6db'
  primary: '#c2c6db'
  on-primary: '#2b3040'
  primary-container: '#0a0f1e'
  on-primary-container: '#777b8e'
  inverse-primary: '#595e70'
  secondary: '#adcebd'
  on-secondary: '#18362a'
  secondary-container: '#314f42'
  on-secondary-container: '#9fc0af'
  tertiary: '#c5c7c8'
  on-tertiary: '#2e3132'
  tertiary-container: '#0d1011'
  on-tertiary-container: '#7a7c7d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dee1f7'
  primary-fixed-dim: '#c2c6db'
  on-primary-fixed: '#161b2b'
  on-primary-fixed-variant: '#414658'
  secondary-fixed: '#c8ead8'
  secondary-fixed-dim: '#adcebd'
  on-secondary-fixed: '#012116'
  on-secondary-fixed-variant: '#2f4d40'
  tertiary-fixed: '#e1e3e4'
  tertiary-fixed-dim: '#c5c7c8'
  on-tertiary-fixed: '#191c1d'
  on-tertiary-fixed-variant: '#454748'
  background: '#0d131f'
  on-background: '#dde2f3'
  surface-variant: '#2f3542'
typography:
  display-lg:
    fontFamily: Source Serif 4
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Source Serif 4
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.08em
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max: 1440px
---

## Brand & Style
The design system is built on the philosophy of "Quiet Tech." It avoids the loud, neon-soaked tropes of typical AI branding in favor of an editorial corporate aesthetic rooted in Swiss Design principles. The brand personality conveys silent power through geometric precision and scalable intelligence.

The visual direction is strictly orthogonal, emphasizing a structured grid and intentional white space. It utilizes a mix of **Minimalism** and **Modern Corporate** styles to create a UI that feels like a high-end publication for technical pioneers. The emotional response should be one of calm authority, reliability, and human-centric sophistication.

## Colors
The palette is dominated by a deep, monochromatic foundation to evoke stability and depth.
- **Base (Primary):** #0A0F1E (Dark Navy) provides a dense, sophisticated background that replaces standard blacks.
- **Accent (Secondary):** #2D4B3E (Deep Forest) acts as a subtle, organic counterpoint to the technical base, used sparingly for primary actions and status indicators.
- **Clarity (Tertiary):** #F8F9FA (Off-White) is used for maximum legibility of text and key icons.
- **Surface (Neutral):** #1A202C is utilized for subtle layering and container separation within the dark interface.

## Typography
The typography strategy creates a tension between editorial tradition and technical precision.
- **Headlines:** Source Serif 4 provides an authoritative, literary feel. Use optical sizing where available to maintain elegance at large scales.
- **Body:** Inter ensures maximum readability across data-dense applications.
- **Technical Metadata:** JetBrains Mono is introduced for labels, captions, and code-like data points to reinforce the "Geometric Precision" of the holding company's output.
- **Alignment:** All text should follow a strict baseline grid. Headlines should use tight tracking (-0.01em to -0.02em) for a more "locked-in" appearance.

## Layout & Spacing
This design system employs a **Fixed Grid** model based on a 12-column system for desktop and a 4-column system for mobile.
- **Rhythm:** All spacing must be a multiple of the 4px base unit.
- **Desktop:** 64px outer margins provide "Quiet" breathing room, emphasizing the content's importance.
- **Tablet:** 32px margins with an 8-column grid.
- **Mobile:** 16px margins with 16px gutters.
- **Logic:** Use generous vertical padding (80px+) between major sections to maintain the editorial feel. Elements should align strictly to the grid edges—avoid centered layouts for technical content.

## Elevation & Depth
In keeping with the Swiss design influence, depth is achieved through **Tonal Layers** and **Low-contrast Outlines** rather than shadows.
- **Surface Tiers:** Use #1A202C (Neutral) for containers that sit atop the #0A0F1E base.
- **Borders:** Define boundaries with 1px solid strokes in a low-opacity off-white (rgba(248, 249, 250, 0.1)). 
- **Active States:** Subtle shifts in background tone or the introduction of the Forest Green accent represent interaction, rather than physical lifting or "floating."
- **Clarity:** Do not use blurs or frosted glass. Every layer must be opaque and mathematically distinct.

## Shapes
The shape language is strictly **Sharp (0px)**. 
Corners are kept at 90 degrees to reflect "Geometric Precision" and engineering excellence. This applies to buttons, input fields, cards, and modal windows. The only exception to this rule is circular iconography or avatars where necessary for human identification, but even these should be housed within square containers when possible.

## Components
- **Buttons:** Rectangular, sharp-edged. Primary buttons use the Forest Green accent with white text. Secondary buttons are outlined with 1px strokes.
- **Input Fields:** Bottom-border only or full-stroke rectangles. Use JetBrains Mono for placeholder text to signal a "system-ready" state.
- **Cards:** No shadows. Use 1px borders or a slightly lighter background shade than the canvas. All content within cards must align to an internal 8px grid.
- **Chips/Labels:** Small, all-caps monospace text. Used for categorization and status without mimicking the appearance of buttons.
- **Lists:** Clean dividers (1px) with high vertical padding. Icons should be monochrome and geometric (2px stroke weight).
- **Navigation:** Top-tier navigation should be minimalist, using typography rather than icons to guide the user.