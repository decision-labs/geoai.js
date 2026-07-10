/** CarbonPlan-inspired palette (https://carbonplan.org/design/color) */
export const carbon = {
  carbon: '#212529',
  chalk: '#f0f0f0',
  white: '#ffffff',
  primary: '#f0f0f0',
  secondary: '#a3a3a3',
  muted: '#6b7280',
  hinted: '#2d3339',
  border: '#3a4249',
  accent: '#2ba99a',
  accentHover: '#239e90',
  warm: '#f46d43',
  teal: '#2ba99a',
  pink: '#ee5a94',
  yellow: '#ecc94b',
  blue: '#4a9eff',
  purple: '#9b7bff',
  success: '#3ecf8e',
  warning: '#f6ad55',
  error: '#fc8181',
} as const;

export const carbonAccents = [
  carbon.teal,
  carbon.warm,
  carbon.blue,
  carbon.pink,
  carbon.yellow,
  carbon.purple,
  carbon.success,
] as const;
