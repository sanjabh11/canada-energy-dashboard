/**
 * Layout utilities and constants for consistent UI across the Canadian Energy Information Portal
 * Implements responsive grid system and standardized spacing
 */

// Grid system constants
export const GRID_BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const;

// Standard spacing scale (following Tailwind CSS spacing scale)
export const SPACING = {
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
  32: '8rem'     // 128px
} as const;

// Layout container classes
export const CONTAINER_CLASSES = {
  // Main page containers
  page: 'max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6',
  pageNarrow: 'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6',
  pageWide: 'max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6',

  // Section containers
  section: 'space-y-6',
  sectionCompact: 'space-y-4',
  sectionSpacious: 'space-y-8',

  // Card containers
  card: 'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden',
  cardHeader: 'p-6 border-b border-slate-200',
  cardBody: 'p-6',
  cardFooter: 'p-6 border-t border-slate-200 bg-slate-50',

  // Grid layouts
  grid12: 'grid grid-cols-12 gap-6',
  gridResponsive: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
  gridCards: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6',
  gridCharts: 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6',
  gridDashboard: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6',

  // Flexbox utilities
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
  flexStart: 'flex items-center justify-start',
  flexColumn: 'flex flex-col',
  flexRow: 'flex flex-row',
  flexWrap: 'flex flex-wrap',

  // Spacing utilities
  gap4: 'gap-4',
  gap6: 'gap-6',
  gap8: 'gap-8',

  // Responsive spacing
  paddingResponsive: 'px-4 sm:px-6 lg:px-8',
  marginResponsive: 'mx-4 sm:mx-6 lg:mx-8'
} as const;

// Chart container configurations
export const CHART_CONFIGS = {
  // Standard chart heights for consistency
  small: 200,
  medium: 300,
  large: 400,
  dashboard: 250,

  // Aspect ratios for responsive charts
  square: 'aspect-square',
  wide: 'aspect-[16/9]',
  tall: 'aspect-[4/3]',

  // Container classes
  container: 'w-full h-full min-h-[200px]',
  responsive: 'w-full h-full',

  // Grid areas for dashboard layouts
  dashboardGrid: {
    charts: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6',
    insights: 'grid grid-cols-1 lg:grid-cols-3 gap-6',
    metrics: 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'
  }
} as const;

// Typography and text utilities
export const TEXT_CLASSES = {
  heading1: 'text-3xl lg:text-4xl font-bold text-slate-800 mb-4',
  heading2: 'text-2xl lg:text-3xl font-semibold text-slate-800 mb-3',
  heading3: 'text-xl font-semibold text-slate-800 mb-2',
  heading4: 'text-lg font-semibold text-slate-800 mb-2',

  body: 'text-slate-700 leading-relaxed',
  bodySmall: 'text-sm text-slate-600',
  caption: 'text-xs text-slate-500',

  // Status and data text
  metric: 'text-2xl font-bold text-slate-800',
  metricLabel: 'text-sm text-slate-600 font-medium',
  status: 'text-sm font-medium',

  // Link and interactive text
  link: 'text-blue-600 hover:text-blue-800 transition-colors',
  button: 'text-sm font-medium'
} as const;

// Color schemes for consistent theming
export const COLOR_SCHEMES = {
  primary: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    accent: 'text-blue-600'
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    accent: 'text-green-600'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    accent: 'text-yellow-600'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    accent: 'text-red-600'
  },
  info: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-800',
    accent: 'text-indigo-600'
  }
} as const;

// Responsive utilities
export const RESPONSIVE_UTILS = {
  // Hide/show utilities
  hiddenMobile: 'hidden md:block',
  hiddenDesktop: 'block md:hidden',
  showMobile: 'block md:hidden',
  showDesktop: 'hidden md:block',

  // Flex responsive
  flexColMobile: 'flex-col md:flex-row',
  flexRowMobile: 'flex-row md:flex-col',

  // Grid responsive
  gridColsMobile: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  gridColsTablet: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',

  // Text responsive
  textResponsive: 'text-sm md:text-base',
  headingResponsive: 'text-xl md:text-2xl lg:text-3xl'
} as const;

// Animation utilities
export const ANIMATION_CLASSES = {
  fadeIn: 'animate-fade-in',
  fadeInDelay: 'animate-fade-in-delayed',
  fadeInSlow: 'animate-fade-in-slow',
  float: 'animate-float',
  pulseSlow: 'animate-pulse-slow',
  gradient: 'animate-gradient-xy'
} as const;

// Utility functions for dynamic class generation
export const generateGridClasses = (cols: number, responsive: boolean = true) => {
  if (responsive) {
    if (cols === 1) return 'grid grid-cols-1';
    if (cols === 2) return 'grid grid-cols-1 md:grid-cols-2';
    if (cols === 3) return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
    if (cols === 4) return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
    if (cols === 6) return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6';
  }
  return `grid grid-cols-${cols}`;
};

export const generateSpacingClasses = (size: keyof typeof SPACING, type: 'margin' | 'padding' = 'padding') => {
  return `${type === 'margin' ? 'm' : 'p'}-${size}`;
};

// Export all utilities as a single object for easy importing
export const LAYOUT_UTILS = {
  breakpoints: GRID_BREAKPOINTS,
  spacing: SPACING,
  containers: CONTAINER_CLASSES,
  charts: CHART_CONFIGS,
  text: TEXT_CLASSES,
  colors: COLOR_SCHEMES,
  responsive: RESPONSIVE_UTILS,
  animations: ANIMATION_CLASSES,
  generateGridClasses,
  generateSpacingClasses
} as const;
