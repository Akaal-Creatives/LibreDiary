/**
 * LibreDiary Design Tokens
 *
 * This file defines the design system tokens for LibreDiary.
 * Use these values when creating components, layouts, or pages to ensure consistency.
 *
 * The design follows an "organic minimalism" aesthetic:
 * - Calm, grounded feel optimized for long work sessions
 * - Sage green accent colors inspired by nature
 * - Generous whitespace and visual breathing room
 * - Minimal distraction with subtle interactions
 */

// =============================================================================
// COLOR SCHEMES
// =============================================================================

/**
 * Light Theme - "Morning Meadow"
 * A calm, welcoming palette with off-white backgrounds and sage green accents.
 * Optimized for daytime use with high readability.
 */
export const lightTheme = {
  // Backgrounds
  background: '#F6F8F6', // Main app background - soft off-white with green tint
  surface: '#FFFFFF', // Cards, modals, elevated elements
  surfaceSunken: '#EEF2EE', // Inset areas, code blocks, input backgrounds

  // Text Colors
  textPrimary: '#2C2F2C', // Main text - dark with subtle warmth
  textSecondary: '#5C635C', // Secondary text, descriptions
  textTertiary: '#8A918A', // Placeholder text, hints, disabled
  textInverse: '#FFFFFF', // Text on accent/dark backgrounds

  // Accent Colors (Sage Green)
  accent: '#6B8F71', // Primary accent - sage green
  accentHover: '#5A7D60', // Darker sage for hover states
  accentSubtle: 'rgba(107, 143, 113, 0.1)', // Light sage for backgrounds
  accentMuted: 'rgba(107, 143, 113, 0.3)', // Medium sage for borders

  // Borders
  border: '#E2E8E2', // Default border - light sage-tinted gray
  borderStrong: '#C8D1C8', // Emphasized borders, hover states

  // Interactive States
  hover: 'rgba(107, 143, 113, 0.08)', // Hover background
  active: 'rgba(107, 143, 113, 0.12)', // Active/pressed background
  focusRing: 'rgba(107, 143, 113, 0.25)', // Focus ring color

  // Semantic Colors
  success: '#5A9A6B', // Success states - forest green
  warning: '#C4973B', // Warning states - amber
  error: '#C45C5C', // Error states - muted red
  info: '#5A8A9A', // Info states - teal

  // Semantic Subtle Backgrounds
  successSubtle: 'rgba(90, 154, 107, 0.1)',
  warningSubtle: 'rgba(196, 151, 59, 0.1)',
  errorSubtle: 'rgba(196, 92, 92, 0.1)',
  infoSubtle: 'rgba(90, 138, 154, 0.1)',

  // Input Fields
  inputBg: '#FFFFFF',
  inputBorder: '#E2E8E2',
  inputFocusBorder: '#6B8F71',
} as const;

/**
 * Dark Theme - "Forest at Dusk"
 * A deep, restful palette inspired by a forest as evening falls.
 * Optimized for low-light environments with reduced eye strain.
 */
export const darkTheme = {
  // Backgrounds
  background: '#161917', // Main app background - deep forest black
  surface: '#1E2220', // Cards, modals, elevated elements
  surfaceSunken: '#0F1110', // Inset areas, code blocks

  // Text Colors
  textPrimary: '#E4E8E4', // Main text - soft white with warmth
  textSecondary: '#9CA69C', // Secondary text
  textTertiary: '#6B756B', // Placeholder, hints
  textInverse: '#161917', // Text on accent backgrounds

  // Accent Colors (Lighter Sage for Dark Mode)
  accent: '#88B08E', // Primary accent - lighter sage for visibility
  accentHover: '#9AC0A0', // Even lighter for hover
  accentSubtle: 'rgba(136, 176, 142, 0.15)', // Subtle sage background
  accentMuted: 'rgba(136, 176, 142, 0.3)', // Medium sage for borders

  // Borders
  border: '#2E3430', // Default border - subtle forest green tint
  borderStrong: '#3E4640', // Emphasized borders

  // Interactive States
  hover: 'rgba(136, 176, 142, 0.1)', // Hover background
  active: 'rgba(136, 176, 142, 0.15)', // Active/pressed
  focusRing: 'rgba(136, 176, 142, 0.3)', // Focus ring

  // Semantic Colors (Brighter for dark mode visibility)
  success: '#7AB888',
  warning: '#D4A74B',
  error: '#D47777',
  info: '#7ABAD4',

  // Semantic Subtle Backgrounds
  successSubtle: 'rgba(122, 184, 136, 0.15)',
  warningSubtle: 'rgba(212, 167, 75, 0.15)',
  errorSubtle: 'rgba(212, 119, 119, 0.15)',
  infoSubtle: 'rgba(122, 186, 212, 0.15)',

  // Input Fields
  inputBg: '#1E2220',
  inputBorder: '#2E3430',
  inputFocusBorder: '#88B08E',
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

/**
 * Font Families
 * Sans-serif only for clean, modern appearance.
 */
export const fonts = {
  /** Primary font for all UI text */
  sans: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",

  /** Monospace font for code blocks and technical content */
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace",
} as const;

/**
 * Font Sizes
 * Based on a modular scale for visual harmony.
 */
export const fontSizes = {
  xs: '0.75rem', // 12px - Captions, labels
  sm: '0.875rem', // 14px - Secondary text, buttons
  base: '1rem', // 16px - Body text
  lg: '1.125rem', // 18px - Lead paragraphs
  xl: '1.25rem', // 20px - Section headers
  '2xl': '1.5rem', // 24px - Page titles
  '3xl': '1.875rem', // 30px - Hero sections
  '4xl': '2.25rem', // 36px - Large titles
  '5xl': '3rem', // 48px - Display text
} as const;

/**
 * Font Weights
 */
export const fontWeights = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Line Heights
 */
export const lineHeights = {
  tight: '1.2', // Headings
  snug: '1.4', // Subheadings
  normal: '1.6', // Body text
  relaxed: '1.75', // Long-form content
} as const;

/**
 * Letter Spacing
 */
export const letterSpacing = {
  tight: '-0.02em', // Large headings
  normal: '0', // Body text
  wide: '0.05em', // All-caps labels
} as const;

// =============================================================================
// SPACING
// =============================================================================

/**
 * Spacing Scale
 * Based on 4px increments for consistent rhythm.
 */
export const spacing = {
  0: '0',
  1: '0.25rem', // 4px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

/**
 * Border Radius Scale
 * From subtle rounding to fully circular.
 */
export const borderRadius = {
  none: '0',
  sm: '4px', // Subtle rounding
  md: '6px', // Default for buttons, inputs
  lg: '8px', // Cards, modals
  xl: '12px', // Large cards
  '2xl': '16px', // Hero sections
  full: '9999px', // Pills, avatars
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

/**
 * Shadow Scale
 * Subtle, natural shadows for depth.
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.04)', // Subtle elevation
  md: '0 2px 8px rgba(0, 0, 0, 0.06)', // Cards
  lg: '0 4px 16px rgba(0, 0, 0, 0.08)', // Modals, dropdowns
  xl: '0 8px 32px rgba(0, 0, 0, 0.1)', // Floating elements
} as const;

// =============================================================================
// TRANSITIONS
// =============================================================================

/**
 * Transition Durations
 */
export const transitions = {
  fast: '150ms ease', // Micro-interactions (hover, focus)
  base: '200ms ease', // Standard transitions
  slow: '300ms ease', // Complex animations
  slower: '500ms ease', // Page transitions
} as const;

// =============================================================================
// Z-INDEX
// =============================================================================

/**
 * Z-Index Scale
 * Consistent layering for overlapping elements.
 */
export const zIndex = {
  dropdown: 100,
  sticky: 200,
  modal: 300,
  popover: 400,
  tooltip: 500,
  toast: 600,
} as const;

// =============================================================================
// BREAKPOINTS
// =============================================================================

/**
 * Responsive Breakpoints
 */
export const breakpoints = {
  sm: '640px', // Mobile landscape
  md: '768px', // Tablet
  lg: '1024px', // Desktop
  xl: '1280px', // Large desktop
  '2xl': '1536px', // Extra large
} as const;

// =============================================================================
// ICONOGRAPHY
// =============================================================================

/**
 * Icon Guidelines
 *
 * IMPORTANT: Always use flat, single-color SVG icons. Never use:
 * - Colorful 3D emojis (e.g., 📝, 🏠, 📋)
 * - Multi-colored icons
 * - Gradient-filled icons
 *
 * Icon Style:
 * - Stroke-based (outline) icons preferred over filled
 * - Stroke width: 1.5px for consistency
 * - Single color using currentColor (inherits from parent)
 * - Rounded line caps and joins (stroke-linecap="round" stroke-linejoin="round")
 *
 * Icon Sizes:
 * - Small (16px): Inline with text, buttons
 * - Medium (18-20px): Navigation, action buttons
 * - Large (24px): Feature highlights, empty states
 * - XLarge (32-48px): Hero sections, illustrations
 *
 * Icon Colors:
 * - Default: var(--color-text-secondary) or currentColor
 * - Interactive: var(--color-text-primary) on hover
 * - Accent: var(--color-accent) for primary actions
 * - Muted: var(--color-text-tertiary) for disabled/placeholder
 *
 * Example SVG structure:
 * ```html
 * <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
 *   <path d="..." stroke="currentColor" stroke-width="1.5"
 *         stroke-linecap="round" stroke-linejoin="round"/>
 * </svg>
 * ```
 */
export const iconography = {
  // Sizes
  sizes: {
    sm: '16px',
    md: '20px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },

  // Stroke
  strokeWidth: '1.5',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,

  // Colors (use CSS variables)
  colors: {
    default: 'currentColor',
    primary: 'var(--color-text-primary)',
    secondary: 'var(--color-text-secondary)',
    tertiary: 'var(--color-text-tertiary)',
    accent: 'var(--color-accent)',
    inverse: 'var(--color-text-inverse)',
  },
} as const;

// =============================================================================
// COMPONENT-SPECIFIC TOKENS
// =============================================================================

/**
 * Sidebar Dimensions
 */
export const sidebar = {
  width: '260px',
  collapsedWidth: '64px',
} as const;

/**
 * Header Dimensions
 */
export const header = {
  height: '52px',
} as const;

/**
 * Input Field Styles
 */
export const inputs = {
  height: '40px',
  heightSm: '32px',
  heightLg: '48px',
  paddingX: spacing[4],
  paddingY: spacing[2],
} as const;

/**
 * Button Styles
 */
export const buttons = {
  height: '40px',
  heightSm: '32px',
  heightLg: '48px',
  paddingX: spacing[4],
  paddingXSm: spacing[3],
  paddingXLg: spacing[6],
} as const;

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type Theme = typeof lightTheme;
export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSize = keyof typeof fontSizes;
export type Spacing = keyof typeof spacing;
export type BorderRadius = keyof typeof borderRadius;
export type Shadow = keyof typeof shadows;

// =============================================================================
// CSS VARIABLE MAPPING
// =============================================================================

/**
 * Maps design tokens to CSS custom properties.
 * Use this to generate CSS variables or for reference.
 */
export const cssVariables = {
  // Colors (theme-dependent, defined in main.css)
  '--color-background': 'var(--color-background)',
  '--color-surface': 'var(--color-surface)',
  '--color-surface-sunken': 'var(--color-surface-sunken)',
  '--color-text-primary': 'var(--color-text-primary)',
  '--color-text-secondary': 'var(--color-text-secondary)',
  '--color-text-tertiary': 'var(--color-text-tertiary)',
  '--color-text-inverse': 'var(--color-text-inverse)',
  '--color-accent': 'var(--color-accent)',
  '--color-accent-hover': 'var(--color-accent-hover)',
  '--color-accent-subtle': 'var(--color-accent-subtle)',
  '--color-accent-muted': 'var(--color-accent-muted)',
  '--color-border': 'var(--color-border)',
  '--color-border-strong': 'var(--color-border-strong)',
  '--color-hover': 'var(--color-hover)',
  '--color-active': 'var(--color-active)',
  '--color-focus-ring': 'var(--color-focus-ring)',

  // Typography
  '--font-sans': fonts.sans,
  '--font-mono': fonts.mono,
  '--text-xs': fontSizes.xs,
  '--text-sm': fontSizes.sm,
  '--text-base': fontSizes.base,
  '--text-lg': fontSizes.lg,
  '--text-xl': fontSizes.xl,
  '--text-2xl': fontSizes['2xl'],
  '--text-3xl': fontSizes['3xl'],
  '--text-4xl': fontSizes['4xl'],

  // Spacing
  '--space-1': spacing[1],
  '--space-2': spacing[2],
  '--space-3': spacing[3],
  '--space-4': spacing[4],
  '--space-5': spacing[5],
  '--space-6': spacing[6],
  '--space-8': spacing[8],
  '--space-10': spacing[10],
  '--space-12': spacing[12],
  '--space-16': spacing[16],
  '--space-20': spacing[20],

  // Border Radius
  '--radius-sm': borderRadius.sm,
  '--radius-md': borderRadius.md,
  '--radius-lg': borderRadius.lg,
  '--radius-xl': borderRadius.xl,
  '--radius-2xl': borderRadius['2xl'],
  '--radius-full': borderRadius.full,

  // Shadows
  '--shadow-sm': shadows.sm,
  '--shadow-md': shadows.md,
  '--shadow-lg': shadows.lg,
  '--shadow-xl': shadows.xl,

  // Transitions
  '--transition-fast': transitions.fast,
  '--transition-base': transitions.base,
  '--transition-slow': transitions.slow,
} as const;
