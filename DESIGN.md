---
name: Monospace Utilitarian
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#5d3f3b'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#926f6a'
  outline-variant: '#e7bdb7'
  surface-tint: '#c0000a'
  primary: '#bc000a'
  on-primary: '#ffffff'
  primary-container: '#e2241f'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4aa'
  secondary: '#aa352b'
  on-secondary: '#ffffff'
  secondary-container: '#fd7363'
  on-secondary-container: '#6f0807'
  tertiary: '#00647f'
  on-tertiary: '#ffffff'
  tertiary-container: '#007fa0'
  on-tertiary-container: '#fafdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad5'
  primary-fixed-dim: '#ffb4aa'
  on-primary-fixed: '#410001'
  on-primary-fixed-variant: '#930005'
  secondary-fixed: '#ffdad5'
  secondary-fixed-dim: '#ffb4aa'
  on-secondary-fixed: '#410001'
  on-secondary-fixed-variant: '#891d16'
  tertiary-fixed: '#bbe9ff'
  tertiary-fixed-dim: '#68d3fc'
  on-tertiary-fixed: '#001f29'
  on-tertiary-fixed-variant: '#004d63'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: JetBrains Mono
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.1'
  headline-md:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  body-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
  code-snippet:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.6'
spacing:
  base: 4px
  unit: 8px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  max-width: 1280px
---

## Brand & Style
This design system is built on the philosophy of **Technical Objectivity**. It treats information as the primary interface element, stripping away decorative styling in favor of a raw, brutalist, and highly efficient aesthetic. It is designed for users who value precision over polish—developers, data analysts, and technical professionals.

The style is a hybrid of **Minimalism** and **Brutalism**. It uses a strict structural grid where every element is contained within defined borders. The emotional response is one of clarity, transparency, and high-functioning utility. There is no ambiguity; the UI should feel "compiled" rather than "decorated."

## Colors
The palette is intentionally restrictive to maintain focus and urgency. 

- **Primary (Alert Red):** Used exclusively for call-to-actions, active states, and critical data points. It is a high-visibility signal within an otherwise neutral environment.
- **Neutral (Slate-Gray/Black):** Used for all structural elements, including thin borders, text, and icons.
- **Background (Off-White):** A soft, non-reflective base (#F2F2F2) that reduces eye strain while maintaining high contrast with the text.

Color is never used for decoration; it is used solely as a functional indicator of "State" or "Importance."

## Typography
The design system employs **JetBrains Mono** for 100% of its type. This monospaced font ensures that data aligns perfectly across vertical and horizontal planes, reinforcing the grid-based nature of the UI.

- **Hierarchy through Weight:** Since font family variety is absent, visual hierarchy is achieved through drastic weight shifts (Bold vs. Regular) and case transformations (UPPERCASE for labels).
- **Alignment:** All text should ideally align to a 4px baseline grid.
- **Character Spacing:** Letter spacing is tightened slightly for large display text and loosened for all-caps labels to ensure legibility.

## Layout & Spacing
The layout follows a **Rigid Fixed Grid** model. The interface is divided into "Cells" using thin 1px borders.

- **Grid:** A 12-column grid is used for desktop, but the visual manifestation is a series of boxed containers. 
- **Borders as Dividers:** Whitespace is used sparingly; instead, 1px solid borders (#1A1A1A) define the boundaries between content sections.
- **Rhythm:** All margins and paddings must be multiples of 8px. This creates a predictable, mathematical rhythm that complements the monospaced typography.
- **Density:** The layout should lean towards high density, mimicking a terminal or a technical blueprint.

## Elevation & Depth
This design system is **completely flat**. It rejects the use of shadows, blurs, or gradients.

- **Depth through Layering:** Visual depth is communicated through the stacking of boxed containers.
- **Depth through Inversion:** To indicate that an element is "raised" or "active," the color scheme is inverted (e.g., a button becomes a solid black block with white text).
- **Z-Index Indicators:** Modals or overlays do not use shadows; they use a thick 2px border or a high-contrast "ghost" offset border to separate themselves from the background layer.

## Shapes
The shape language is **Sharp**. Every corner is 0px radius. 

This reinforces the brutalist, architectural feel of the system. Rectilinear shapes are used for every component—from buttons and input fields to large container cards and tooltips. There are no circles; even radio buttons should be expressed as squares with inner square indicators to maintain the geometric consistency.

## Components

- **Buttons:** Rectangular with a 1px border. No background fill in the default state. On hover/active, the background fills with #1A1A1A and text flips to #F2F2F2. The "Primary" button uses the Alert Red (#FF3B30) as a solid background.
- **Input Fields:** Labeled with an uppercase tag. The input area is a 1px bordered box. Focus state is indicated by a thicker 2px border, never a shadow.
- **Chips/Tags:** Small rectangular boxes with a 1px border. Used for metadata or status indicators. Status: Active uses a solid red fill.
- **Lists:** Rows separated by 1px horizontal lines. No vertical lines within the list unless it is a multi-column data table.
- **Cards:** Simple containers with a 1px border. Header areas within cards should be separated by a 1px horizontal line.
- **Checkboxes:** Square boxes. Checked state is indicated by a solid black fill or a large "X" character in JetBrains Mono.
- **Data Tables:** The core of the system. Use thin borders for both rows and columns. Headers are always bold and uppercase.