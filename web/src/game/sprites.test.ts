import { describe, expect, it } from "vitest";
import { PALETTE } from "./raster";
import { SPRITE_KINDS, spriteRows } from "./sprites";

describe("pixel sprites", () => {
  it("paints every creature on an even grid with known colors", () => {
    for (const kind of SPRITE_KINDS) {
      const rows = spriteRows(kind, false);
      expect(rows.length).toBeGreaterThan(4);
      for (const row of rows) {
        expect(row.length).toBe(rows[0].length);
        for (const ch of row) {
          if (ch !== ".") expect(PALETTE[ch]).toBeTruthy();
        }
      }
    }
  });

  it("keeps the night-garden palette on the guide, pine, and butterfly", () => {
    const bramble = spriteRows("bramble").join("");
    const pine = spriteRows("pine").join("");
    const butterfly = spriteRows("butterfly").join("");
    expect(bramble).toMatch(/[cC]/);
    expect(bramble).toMatch(/[lGf]/);
    expect(pine).toMatch(/[lGf]/);
    expect(pine).toMatch(/[tT]/);
    expect(butterfly).toMatch(/[aAU]/);
    expect(butterfly.split("k").length).toBeGreaterThan(2);
  });
});
