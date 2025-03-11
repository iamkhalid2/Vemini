/**
 * Theme constants for consistent styling across the application
 */

export const theme = {
  colors: {
    // Base colors
    background: {
      primary: 'var(--Neutral-5)',
      secondary: 'var(--Neutral-10)',
      tertiary: 'var(--Neutral-15)',
    },
    text: {
      primary: 'var(--Neutral-90)',
      secondary: 'var(--Neutral-60)',
      accent: 'var(--Blue-500)',
    },
    accent: {
      blue: 'var(--Blue-500)',
      red: 'var(--Red-500)',
      green: 'var(--Green-500)',
    },
    border: 'var(--Neutral-30)',
  },
  
  // Animation presets
  animation: {
    transition: {
      default: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] },
      hover: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0] },
      spring: { type: 'spring', stiffness: 300, damping: 30 },
      bounce: { type: 'spring', stiffness: 400, damping: 10 },
    },
  },
  
  // Responsive breakpoints
  breakpoints: {
    xs: '480px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
    md: '0 4px 6px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.4)',
  }
};

// Useful media queries for responsive design
export const media = {
  xs: `@media (max-width: ${theme.breakpoints.xs})`,
  sm: `@media (max-width: ${theme.breakpoints.sm})`,
  md: `@media (max-width: ${theme.breakpoints.md})`,
  lg: `@media (max-width: ${theme.breakpoints.lg})`,
  xl: `@media (max-width: ${theme.breakpoints.xl})`,
};