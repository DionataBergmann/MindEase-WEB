/**
 * Design tokens – cores do projeto (HEX).
 * Única fonte da verdade: edite aqui. Depois rode: pnpm run tokens:css
 *
 * Uso no código: import { colors } from '@/design-tokens/colors'
 * No CSS/Tailwind: as variáveis são geradas em _colors.css (HSL) a partir destes hex.
 */
const light = {
  background: "#f7f5f0",
  foreground: "#2d3a36",
  card: "#fcfbf9",
  cardForeground: "#2d3a36",
  popover: "#fcfbf9",
  popoverForeground: "#2d3a36",
  primary: "#2d7a5e",
  primaryForeground: "#f7f5f0",
  secondary: "#d4e8e0",
  secondaryForeground: "#3d4a45",
  muted: "#ebe8e3",
  mutedForeground: "#2d3a36",
  accent: "#c98b4a",
  accentForeground: "#2d1f0a",
  border: "#dde8e3",
  input: "#dde8e3",
  ring: "#2d7a5e",
  destructive: "#c73e3e",
  destructiveForeground: "#ffffff",
  success: "#2d8a5e",
  successForeground: "#ffffff",
  warning: "#c98b2a",
  warningForeground: "#2d1f0a",
  info: "#3b82c6",
  infoForeground: "#ffffff",
};

const dark = {
  background: "#141c19",
  foreground: "#e0e6e3",
  card: "#1a231f",
  cardForeground: "#e0e6e3",
  popover: "#1a231f",
  popoverForeground: "#e0e6e3",
  primary: "#4a9a76",
  primaryForeground: "#141c19",
  secondary: "#24302a",
  secondaryForeground: "#e0e6e3",
  muted: "#24302a",
  mutedForeground: "#8a9a94",
  accent: "#4a9a76",
  accentForeground: "#e0e6e3",
  border: "#2d3a36",
  input: "#2d3a36",
  ring: "#4a9a76",
  destructive: "#c73e3e",
  destructiveForeground: "#ffffff",
  success: "#2d8a5e",
  successForeground: "#ffffff",
  warning: "#c98b2a",
  warningForeground: "#2d1f0a",
  info: "#3b82c6",
  infoForeground: "#ffffff",
};

/** Tokens que não são cor (não convertidos para HSL) */
const other = {
  radius: "0.75rem",
  fontDisplay: '"Nunito", sans-serif',
  fontBody: '"DM Sans", sans-serif',
};

/** Cores em HEX – fonte única para design e código */
const colors = { light, dark, other };

/** Mapeamento nome CSS var -> chave em light/dark (camelCase) */
const varToKey = {
  background: "background",
  foreground: "foreground",
  card: "card",
  "card-foreground": "cardForeground",
  popover: "popover",
  "popover-foreground": "popoverForeground",
  primary: "primary",
  "primary-foreground": "primaryForeground",
  secondary: "secondary",
  "secondary-foreground": "secondaryForeground",
  muted: "muted",
  "muted-foreground": "mutedForeground",
  accent: "accent",
  "accent-foreground": "accentForeground",
  border: "border",
  input: "input",
  ring: "ring",
  destructive: "destructive",
  "destructive-foreground": "destructiveForeground",
  success: "success",
  "success-foreground": "successForeground",
  warning: "warning",
  "warning-foreground": "warningForeground",
  info: "info",
  "info-foreground": "infoForeground",
};

module.exports = { colors, varToKey };
