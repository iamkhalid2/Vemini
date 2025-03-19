/**
 * Modern design system for Vemini
 * Provides consistent colors, typography, spacing, and other design tokens
 */

// Color palette
export const colors = {
  // Primary colors
  primary: {
    main: '#7C5DFA',
    light: '#9277FF',
    dark: '#4D2EE3',
    contrast: '#FFFFFF',
  },
  // Secondary colors
  secondary: {
    main: '#00C2FF',
    light: '#70E4FF',
    dark: '#0087B3',
    contrast: '#000000',
  },
  // Accent colors for actions and highlights
  accent: {
    success: '#00CA90',
    warning: '#FFB800',
    error: '#FF4757',
    info: '#2196F3',
  },
  // Neutral colors for backgrounds, text, etc.
  neutral: {
    0: '#000000',
    5: '#0D1117',
    10: '#161B22',
    15: '#21262D',
    20: '#30363D',
    30: '#484F58',
    40: '#6E7681',
    50: '#8B949E',
    60: '#A5ACB6',
    70: '#C9D1D9',
    80: '#DADFE4',
    90: '#F0F3F6',
    100: '#FFFFFF',
  },
};

// Typography
export const typography = {
  fontFamily: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Space Mono", monospace',
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
  },
  lineHeight: {
    tight: 1.1,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing system (in pixels)
export const spacing = {
  0: '0',
  1: '0.25rem',    // 4px
  2: '0.5rem',     // 8px
  3: '0.75rem',    // 12px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  8: '2rem',       // 32px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
};

// Border radius
export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  '3xl': '2rem',   // 32px
  full: '9999px',
};

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
};

// Transitions
export const transitions = {
  default: 'all 0.2s ease-in-out',
  fast: 'all 0.1s ease-in-out',
  slow: 'all 0.3s ease-in-out',
};

// Z-index values
export const zIndex = {
  negative: -1,
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  modal: 100,
  tooltip: 500,
};

// Animation keyframes
export const keyframes = {
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  fadeOut: `
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `,
  pulse: `
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
  `,
  gradientBg: `
    @keyframes gradientBg {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `,
};

// Media query breakpoints
export const breakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// CSS variables to be injected into :root
export const cssVariables = `
  :root {
    /* Colors */
    --color-primary: ${colors.primary.main};
    --color-primary-light: ${colors.primary.light};
    --color-primary-dark: ${colors.primary.dark};
    --color-primary-contrast: ${colors.primary.contrast};
    
    --color-secondary: ${colors.secondary.main};
    --color-secondary-light: ${colors.secondary.light};
    --color-secondary-dark: ${colors.secondary.dark};
    --color-secondary-contrast: ${colors.secondary.contrast};
    
    --color-success: ${colors.accent.success};
    --color-warning: ${colors.accent.warning};
    --color-error: ${colors.accent.error};
    --color-info: ${colors.accent.info};
    
    --color-bg-primary: ${colors.neutral[5]};
    --color-bg-secondary: ${colors.neutral[10]};
    --color-bg-tertiary: ${colors.neutral[15]};
    
    --color-text-primary: ${colors.neutral[90]};
    --color-text-secondary: ${colors.neutral[70]};
    --color-text-tertiary: ${colors.neutral[50]};
    
    --color-border: ${colors.neutral[30]};
    
    /* Typography */
    --font-family: ${typography.fontFamily.primary};
    --font-family-mono: ${typography.fontFamily.mono};
    
    /* Misc */
    --transition-default: ${transitions.default};
    --shadow-sm: ${shadows.sm};
    --shadow-md: ${shadows.md};
    --shadow-lg: ${shadows.lg};
  }
`;

// Export the complete theme
const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  keyframes,
  breakpoints,
  cssVariables,
};

export default theme;