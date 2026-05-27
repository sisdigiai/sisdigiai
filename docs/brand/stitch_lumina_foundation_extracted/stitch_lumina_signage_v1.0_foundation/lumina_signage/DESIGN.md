---
name: Lumina Signage
colors:
  surface: '#131316'
  surface-dim: '#131316'
  surface-bright: '#39393c'
  surface-container-lowest: '#0e0e11'
  surface-container-low: '#1b1b1e'
  surface-container: '#1f1f22'
  surface-container-high: '#2a2a2d'
  surface-container-highest: '#353438'
  on-surface: '#e4e1e6'
  on-surface-variant: '#c7c4d8'
  inverse-surface: '#e4e1e6'
  inverse-on-surface: '#303033'
  outline: '#918fa1'
  outline-variant: '#464555'
  surface-tint: '#c3c0ff'
  primary: '#c3c0ff'
  on-primary: '#1d00a5'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#4d44e3'
  secondary: '#ffb95f'
  on-secondary: '#472a00'
  secondary-container: '#ee9800'
  on-secondary-container: '#5b3800'
  tertiary: '#d2bbff'
  on-tertiary: '#3f008e'
  tertiary-container: '#7531e6'
  on-tertiary-container: '#e4d4ff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#eaddff'
  tertiary-fixed-dim: '#d2bbff'
  on-tertiary-fixed: '#25005a'
  on-tertiary-fixed-variant: '#5a00c6'
  background: '#131316'
  on-background: '#e4e1e6'
  surface-variant: '#353438'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 72px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  status-label:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  margin-tv: 64px
---

## Brand & Style
The design system is engineered for operational excellence in digital signage management. It bridges the gap between a high-density administrative dashboard and an immersive fullscreen TV experience. The brand personality is **Premium, Operational, and Immersive**.

The visual direction follows a **Modern Corporate** style infused with **Cinematic** elements. It prioritizes clarity for complex scheduling tasks while utilizing light-emissive effects to represent live media states. The interface should feel like a high-end control room: precise, authoritative, and responsive. 

Key attributes include:
- **Professionalism:** High-density layouts for data-heavy workflows.
- **High-Contrast:** Deep blacks and crisp whites to ensure legibility on large-format displays.
- **Cinematic Motion:** Transitions that mimic professional broadcast graphics.

## Colors
The palette is optimized for dark-mode environments typical of NOC (Network Operations Center) displays and TV screens. 

- **Primary (#4F46E5):** A deep Indigo used for primary actions and brand anchoring. It avoids standard blue tones to maintain a premium feel.
- **Secondary/Media Active (#F59E0B):** A warm Amber used exclusively to denote "Active Media" or "Live Broadcast" states, creating a distinct visual glow.
- **Accent (#7C3AED):** A Sharp Violet for secondary highlights and specialized administrative tools.
- **Neutrals:** Based on a Zinc scale. The background uses a deep #09090B to ensure "True Black" on OLED panels, while surfaces use #18181B.

**Semantic Mapping:**
- **device-online:** Success Green (#22C55E) with a subtle outer glow.
- **device-offline:** Error Red (#EF4444) for immediate visibility.
- **media-active:** Amber (#F59E0B) with a localized "spotlight" shadow effect.

## Typography
The typography system uses **Inter** for its exceptional legibility and systematic weight distribution. For large-format signage, the **Display** weights are tightened to create a cinematic, high-impact feel.

- **Headlines:** Set with negative letter-spacing and heavy weights to command attention on TV screens.
- **Technical Data:** **JetBrains Mono** is utilized for device IDs, MAC addresses, and scheduling timestamps to provide a precise, technical aesthetic.
- **High Density:** Body text uses a slightly tighter line-height (1.5) than standard web apps to accommodate more data rows in the admin dashboard.

## Layout & Spacing
This design system utilizes a **Fixed Grid** model for the Dashboard and a **Safe Area** model for the TV Player.

- **Dashboard:** 12-column grid with 24px gutters. High-density views can toggle to an 8px spacing rhythm to maximize information on-screen.
- **TV Player:** Adheres to a 5% "Title Safe" margin on all sides to prevent content clipping on older displays. 
- **Breakpoints:**
  - Mobile (<640px): Single column, 16px margins.
  - Desktop (>1024px): 12 columns, 32px margins.
  - Large Screen/TV (>1920px): 12 columns, 64px margins for comfortable viewing from a distance.

## Elevation & Depth
Hierarchy is established through **Tonal Layers** and specialized **Spotlight Shadows**.

- **Surfaces:** The background is the lowest tier (#09090B). Cards and containers use a slightly elevated tint (#18181B).
- **The "Spotlight" Shadow:** Active media or selected devices feature a #F59E0B (Amber) glow shadow. This is an ultra-diffused shadow (Blur: 40px, Spread: 2px, Opacity: 0.3) that mimics a backlit screen effect.
- **Borders:** Instead of heavy shadows, use 1px solid borders in #27272A for inactive elements, switching to the primary color for active/focused states.

## Shapes
The shape language is **Soft (0.25rem)** to maintain a professional, architectural feel. 

- **Buttons & Inputs:** 4px (0.25rem) radius.
- **Dashboard Cards:** 8px (0.5rem) radius.
- **TV Content Containers:** 12px (0.75rem) radius to soften the edges of broadcast media.
- **Status Indicators:** Full pill-shape for "Online/Offline" chips to differentiate them from interactive buttons.

## Components
Consistent implementation of these components ensures the "Operational" brand feel:

- **Buttons:** High-contrast backgrounds. Primary buttons use Indigo (#4F46E5) with white text. Ghost buttons use a 1px Zinc-700 border.
- **Status Chips:** Small, uppercase labels with a leading 8px circular indicator. "Online" uses a pulsing animation.
- **Media Cards:** Feature a 16:9 aspect ratio container. When "Active," the card gains the Amber Spotlight Glow.
- **Inputs:** Dark backgrounds (#09090B) with 1px Zinc-800 borders. Focus state uses a Primary Indigo border with 0px blur—sharp and digital.
- **Lists:** Data-dense rows with subtle #27272A bottom borders. Hover states should brighten the background slightly (#27272A).
- **Cinematic Transitions:** All state changes (e.g., switching playlists) must use an 800ms ease-in-out fade or a 600ms slide-and-fade to maintain the premium TV aesthetic.