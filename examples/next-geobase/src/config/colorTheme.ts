/**
 * Standard Color Theme for GeoBase AI Application
 * 
 * This theme provides consistent colors for different UI elements and button types
 * across all pages of the application.
 */

export const colorTheme = {
  // Primary Actions (main actions like "Start", "Process", "Extract")
  primary: {
    bg: 'bg-blue-600',
    hover: 'hover:bg-blue-700',
    border: 'border-blue-500',
    text: 'text-white',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed'
  },

  // Success Actions (positive actions like "Extract Features", "Download")
  success: {
    bg: 'bg-teal-600',
    hover: 'hover:bg-teal-700',
    border: 'border-teal-500',
    text: 'text-white',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed'
  },

  // Danger Actions (destructive actions like "Reset", "Delete", "Clear")
  danger: {
    bg: 'bg-rose-600',
    hover: 'hover:bg-rose-700',
    border: 'border-rose-500',
    text: 'text-white',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed'
  },

  // Warning Actions (cautionary actions)
  warning: {
    bg: 'bg-yellow-600',
    hover: 'hover:bg-yellow-700',
    border: 'border-yellow-500',
    text: 'text-white',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed'
  },

  // Secondary Actions (less prominent actions)
  secondary: {
    bg: 'bg-gray-600',
    hover: 'hover:bg-gray-700',
    border: 'border-gray-500',
    text: 'text-white',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed'
  },

  // Disabled State
  disabled: {
    bg: 'bg-gray-400',
    border: 'border-gray-300',
    text: 'text-white',
    cursor: 'cursor-not-allowed'
  },

  // Status Indicators
  status: {
    ready: 'bg-green-500',
    processing: 'bg-yellow-500',
    error: 'bg-red-500',
    initializing: 'bg-blue-500'
  },

  // Common button base classes
  buttonBase: 'px-4 py-2 rounded-md shadow-lg backdrop-blur-sm font-medium text-sm transition-all duration-200 flex items-center space-x-2 border'
};

/**
 * Helper function to get complete button classes for a specific type
 */
export function getButtonClasses(type: keyof typeof colorTheme, disabled = false): string {
  if (disabled) {
    return `${colorTheme.buttonBase} ${colorTheme.disabled.bg} ${colorTheme.disabled.border} ${colorTheme.disabled.text} ${colorTheme.disabled.cursor}`;
  }

  const theme = colorTheme[type];
  
  // Check if theme is an object with bg property (button themes)
  if (typeof theme === 'object' && 'bg' in theme && 'hover' in theme) {
    return `${colorTheme.buttonBase} ${theme.bg} ${theme.hover} ${theme.border} ${theme.text} ${theme.disabled}`;
  }
  
  // If theme is a string (like status indicators), return it as is
  if (typeof theme === 'string') {
    return theme;
  }
  
  // Fallback
  return '';
}

/**
 * Usage examples:
 * 
 * // Primary button (Start Drawing, Process)
 * className={getButtonClasses('primary')}
 * 
 * // Success button (Extract Features, Download)
 * className={getButtonClasses('success')}
 * 
 * // Danger button (Reset, Delete)
 * className={getButtonClasses('danger')}
 * 
 * // Secondary button (Settings, Info)
 * className={getButtonClasses('secondary')}
 * 
 * // Disabled button
 * className={getButtonClasses('primary', true)}
 */
