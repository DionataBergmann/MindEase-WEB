/**
 * Gera _colors.css a partir de design-tokens/colors.js (HEX).
 * Rode: node src/design-tokens/generate-css.js
 * Ou: pnpm run tokens:css
 */
const fs = require("fs");
const path = require("path");
const { colors, varToKey } = require("./colors.js");
const { hexToHsl } = require("./hex-to-hsl.js");

const outPath = path.join(__dirname, "../app/_colors.css");

function buildRootBlock(theme, prefix = "  ") {
  const lines = [];
  for (const [varName, key] of Object.entries(varToKey)) {
    const value = theme[key];
    if (value == null) continue;
    const isHex = typeof value === "string" && value.startsWith("#");
    const cssValue = isHex ? hexToHsl(value) : value;
    lines.push(`${prefix}--${varName}: ${cssValue};`);
  }
  return lines.join("\n");
}

function buildOtherBlock() {
  const o = colors.other;
  return `  --radius: ${o.radius};
  --font-display: ${o.fontDisplay};
  --font-body: ${o.fontBody};`;
}

const css = `/**
 * Cores e tokens – gerado a partir de design-tokens/colors.js (HEX).
 * Não edite este arquivo. Para mudar cores: edite colors.js e rode pnpm run tokens:css
 * (Sem @layer para poder ser importado antes de @tailwind base.)
 */
:root {
${buildRootBlock(colors.light)}
${buildOtherBlock()}
}

.dark {
${buildRootBlock(colors.dark, "  ")}
}
`;

fs.writeFileSync(outPath, css, "utf8");
console.log("Written:", outPath);
