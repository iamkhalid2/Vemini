/**
 * Shared animation variants for consistent animations
 */
import { Variants } from 'framer-motion';
import { theme } from './theme';

// Fade in animation
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: theme.animation.transition.default
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 } 
  }
};

// Slide in from bottom
export const slideUp: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: theme.animation.transition.default
  },
  exit: { 
    y: 20, 
    opacity: 0,
    transition: { duration: 0.2 } 
  }
};

// Slide in from side
export const slideInFromSide: Variants = {
  hidden: { x: -30, opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: theme.animation.transition.default
  },
  exit: { 
    x: -30, 
    opacity: 0,
    transition: { duration: 0.2 } 
  }
};

// Scale with bounce
export const scaleUp: Variants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: theme.animation.transition.spring
  },
  hover: { 
    scale: 1.05,
    transition: theme.animation.transition.hover
  },
  tap: { 
    scale: 0.95,
    transition: { duration: 0.1 }
  }
};

// Pulse animation for attention
export const pulse: Variants = {
  idle: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      repeatType: "loop"
    }
  }
};

// Stagger children
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Button hover animation
export const buttonHover: Variants = {
  idle: { 
    scale: 1,
    backgroundColor: "var(--Neutral-20)",
    transition: { duration: 0.2 }
  },
  hover: { 
    scale: 1.05,
    backgroundColor: "var(--Neutral-30)",
    transition: { duration: 0.2 }
  },
  tap: { scale: 0.95 }
};