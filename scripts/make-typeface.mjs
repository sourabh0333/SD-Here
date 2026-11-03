// Converts a .woff font into the three.js "typeface" JSON format used by <Text3D>.
// Usage: node scripts/make-typeface.mjs <in.woff> <out.json>
import fs from "node:fs";
import opentype from "opentype.js";

const [, , input, output] = process.argv;
const font = opentype.parse(fs.readFileSync(input).buffer);
const scale = 1000 / font.unitsPerEm;
const r = (n) => Math.round(n * scale);
const glyphs = {};

const chars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@&?.,'-:# ";

for (const ch of chars) {
  const glyph = font.charToGlyph(ch);
  if (!glyph) continue;
  const parts = [];
  for (const c of glyph.path.commands) {
    if (c.type === "M") parts.push("m", r(c.x), r(c.y));
    else if (c.type === "L") parts.push("l", r(c.x), r(c.y));
    else if (c.type === "Q") parts.push("q", r(c.x), r(c.y), r(c.x1), r(c.y1));
    else if (c.type === "C")
      parts.push("b", r(c.x), r(c.y), r(c.x1), r(c.y1), r(c.x2), r(c.y2));
  }
  const bb = glyph.getBoundingBox();
  glyphs[ch] = {
    ha: r(glyph.advanceWidth),
    x_min: r(bb.x1),
    x_max: r(bb.x2),
    o: parts.join(" "),
  };
}

const json = {
  glyphs,
  familyName: font.names.fontFamily?.en ?? "Font",
  ascender: r(font.ascender),
  descender: r(font.descender),
  underlinePosition: r(font.tables.post?.underlinePosition ?? -100),
  underlineThickness: r(font.tables.post?.underlineThickness ?? 50),
  boundingBox: {
    yMin: r(font.tables.head.yMin),
    xMin: r(font.tables.head.xMin),
    yMax: r(font.tables.head.yMax),
    xMax: r(font.tables.head.xMax),
  },
  resolution: 1000,
  original_font_information: { format: 0 },
  cssFontWeight: "normal",
  cssFontStyle: "normal",
};

fs.writeFileSync(output, JSON.stringify(json));
console.log(`wrote ${output} (${Object.keys(glyphs).length} glyphs)`);
