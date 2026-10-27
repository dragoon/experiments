import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, PALETTES, ICINGS, TOPPINGS, surpriseConfig, seededRandom, tierGeometry, candlePositions } from "../js/config.js";
import { messageLines } from "../js/renderer.js";

test("surprise cakes stay within every control's range and preserve the message", () => {
  const original = { ...DEFAULT_CONFIG, message: "For you, birthday star!" };
  const random = seededRandom(493);
  const seen = { tiers: new Set(), palette: new Set(), icing: new Set(), topping: new Set(), candles: new Set() };
  for (let i = 0; i < 1000; i += 1) {
    const config = surpriseConfig(original, random);
    assert.ok([1, 2, 3].includes(config.tiers));
    assert.ok(PALETTES.some(({ id }) => id === config.palette));
    assert.ok(ICINGS.includes(config.icing));
    assert.ok(TOPPINGS.includes(config.topping));
    assert.ok(Number.isInteger(config.candles) && config.candles >= 1 && config.candles <= 12);
    assert.equal(config.message, original.message);
    for (const key of Object.keys(seen)) seen[key].add(config[key]);
  }
  assert.deepEqual(Object.values(seen).map((values) => values.size), [3, 6, 3, 4, 12]);
  assert.equal(original.tiers, DEFAULT_CONFIG.tiers);
});

test("all candle counts fit on every top tier without obscuring each other", () => {
  for (const tiers of [1, 2, 3]) {
    const geometry = tierGeometry(tiers);
    const top = geometry.at(-1);
    assert.equal(geometry.length, tiers);
    for (let i = 1; i < geometry.length; i += 1) {
      assert.ok(geometry[i].rx < geometry[i - 1].rx);
      assert.equal(geometry[i].y + geometry[i].height, geometry[i - 1].y);
    }
    for (let candles = 1; candles <= 12; candles += 1) {
      const positions = candlePositions({ ...DEFAULT_CONFIG, tiers, candles });
      assert.equal(positions.length, candles);
      for (const { x, y, height } of positions) {
        assert.ok(((x - top.cx) / top.rx) ** 2 + ((y - top.y) / top.ry) ** 2 < 1, "Candle base must be on the top ellipse");
        assert.ok(y - height - 26 > 0, "Flame must remain inside the drawing");
      }
      const xs = positions.map(({ x }) => x).sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i += 1) assert.ok(xs[i] - xs[i - 1] > 9, "Candle silhouettes must not overlap");
    }
  }
});

test("seeded decoration positions are repeatable", () => {
  const a = seededRandom(1234), b = seededRandom(1234), c = seededRandom(4567);
  const values = () => Array.from({ length: 40 }, () => [a(), b(), c()]);
  for (const [first, second, third] of values()) {
    assert.equal(first, second);
    assert.notEqual(first, third);
    assert.ok(first >= 0 && first < 1);
  }
});

test("long messages wrap into two bounded lines without losing characters", () => {
  for (const message of ["", "Happy Birthday!", "W".repeat(40), "W".repeat(10) + " " + "W".repeat(29), "Happy birthday to our very favorite human", "🎂".repeat(25)]) {
    const lines = messageLines(message);
    assert.ok(lines.length <= 2);
    assert.ok(lines.every((line) => Array.from(line).length <= 24));
    assert.equal(lines.join("").replaceAll(" ", ""), message.trim().replaceAll(" ", ""));
    assert.ok(lines.every((line) => !/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(line)));
  }
});
