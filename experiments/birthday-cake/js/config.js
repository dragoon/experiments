export const PALETTES = [
  { id: "strawberry", name: "Strawberry", side: "#e6a1ab", shade: "#cb7e90", top: "#f5c9ce", icing: "#fff0df", accent: "#b75c78", candle: "#be718e", plate: "#c5d8cf" },
  { id: "lemon", name: "Lemon curd", side: "#e9ca7d", shade: "#cca759", top: "#f6e4a9", icing: "#fff6da", accent: "#b88b40", candle: "#8da483", plate: "#cbdccf" },
  { id: "lavender", name: "Lavender", side: "#c4b2d5", shade: "#a18cb9", top: "#e5d9ed", icing: "#faf0e7", accent: "#9274aa", candle: "#bda268", plate: "#dad5c2" },
  { id: "pistachio", name: "Pistachio", side: "#b4c7a4", shade: "#91aa7e", top: "#dbe4c8", icing: "#fff0db", accent: "#718d64", candle: "#c88e9d", plate: "#e4ced0" },
  { id: "blueberry", name: "Blueberry", side: "#a1bdcf", shade: "#7e9fb9", top: "#d0e1e9", icing: "#fff2e1", accent: "#607f9c", candle: "#ba98b5", plate: "#dad2bf" },
  { id: "cocoa", name: "Cocoa cream", side: "#ba8d73", shade: "#946952", top: "#dbb9a0", icing: "#f9e4cc", accent: "#835a48", candle: "#c29276", plate: "#c7d8cc" }
];

export const ICINGS = ["smooth", "drip", "piped"];
export const TOPPINGS = ["sprinkles", "berries", "flowers", "none"];
export const DEFAULT_CONFIG = { tiers: 2, palette: "strawberry", icing: "piped", topping: "sprinkles", candles: 5, message: "Happy Birthday!", seed: 24681 };

export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let n = Math.imul(value ^ (value >>> 15), value | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

export function surpriseConfig(current, random = Math.random) {
  const pick = (items) => items[Math.floor(random() * items.length)];
  return {
    tiers: pick([1, 2, 3]), palette: pick(PALETTES).id,
    icing: pick(ICINGS), topping: pick(TOPPINGS), candles: 1 + Math.floor(random() * 12),
    message: current.message, seed: Math.floor(random() * 2147483647)
  };
}

export function tierGeometry(count) {
  const widths = count === 1 ? [185] : count === 2 ? [190, 132] : [196, 150, 102];
  const heights = count === 1 ? [104] : count === 2 ? [84, 80] : [84, 80, 72];
  let bottom = 459;
  return widths.map((rx, index) => {
    const tier = { index, cx: 380, y: bottom - heights[index], rx, ry: rx * 0.245, height: heights[index] };
    bottom = tier.y;
    return tier;
  });
}

export function candlePositions(config) {
  const tier = tierGeometry(config.tiers).at(-1);
  const backCount = config.candles > 6 ? Math.ceil(config.candles / 2) : 0;
  const frontCount = config.candles - backCount;
  const positions = [];
  function row(count, back) {
    for (let i = 0; i < count; i += 1) {
      // Interleave the two rows so rear candles remain visible between front candles.
      const column = backCount ? i * 2 + (back ? 0 : 1) : i;
      const fraction = config.candles === 1 ? 0 : (column / (config.candles - 1) - 0.5) * 2;
      const x = tier.cx + fraction * (tier.rx - 30);
      const y = tier.y + (back ? -9 : 5) + (1 - fraction * fraction) * (back ? -2 : 7);
      positions.push({ x, y, height: back ? 46 : 43 });
    }
  }
  if (backCount) row(backCount, true);
  row(frontCount, false);
  return positions;
}
