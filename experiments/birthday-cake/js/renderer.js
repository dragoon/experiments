import { PALETTES, tierGeometry, candlePositions, seededRandom } from "./config.js";

const NS = "http://www.w3.org/2000/svg";
export function svgNode(tag, attributes = {}, children = []) {
  const element = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  for (const child of children) element.append(child);
  return element;
}
const group = (attributes = {}, children = []) => svgNode("g", attributes, children);
const ellipse = (cx, cy, rx, ry, fill, extra = {}) => svgNode("ellipse", { cx, cy, rx, ry, fill, ...extra });
const path = (d, fill, extra = {}) => svgNode("path", { d, fill, ...extra });
const circle = (cx, cy, r, fill, extra = {}) => svgNode("circle", { cx, cy, r, fill, ...extra });
const number = (value) => Number(value.toFixed(2));

function gradient(id, colors, vertical = false) {
  return svgNode("linearGradient", { id, x1: "0%", y1: "0%", x2: vertical ? "0%" : "100%", y2: vertical ? "100%" : "0%" },
    colors.map((color, i) => svgNode("stop", { offset: `${i / (colors.length - 1) * 100}%`, "stop-color": color })));
}

function createDefs(palette) {
  return svgNode("defs", {}, [
    gradient("cake-side", [palette.shade, palette.side, palette.side, palette.shade]),
    gradient("cake-top", [palette.top, palette.side], true),
    gradient("icing-shade", [palette.icing, palette.icing, "#e6d0b9"]),
    gradient("stand-shade", ["#8eaaa0", palette.plate, "#e4ece2", palette.plate, "#93b1a3"]),
    gradient("candle-shade", [palette.candle, "#fff0db", palette.candle]),
    gradient("flame-color", ["#ffda7f", "#ec9a4d"], true),
    svgNode("radialGradient", { id: "cake-halo" }, [svgNode("stop", { offset: "0%", "stop-color": "#efdfc7", "stop-opacity": ".6" }), svgNode("stop", { offset: "100%", "stop-color": "#efdfc7", "stop-opacity": "0" })]),
    svgNode("radialGradient", { id: "flame-aura" }, [svgNode("stop", { offset: "0%", "stop-color": "#ffc76a", "stop-opacity": ".7" }), svgNode("stop", { offset: "100%", "stop-color": "#ffc76a", "stop-opacity": "0" })])
  ]);
}

function backdrop() {
  const marks = group({ "aria-hidden": "true" }, [
    ellipse(380, 380, 310, 250, "url(#cake-halo)"),
    ellipse(380, 580, 222, 19, "#b9a58d", { opacity: ".07" }),
    ellipse(380, 578, 150, 11, "#b9a58d", { opacity: ".09" })
  ]);
  for (const [x, y, size, color] of [[155, 269, 10, "#c8ad82"], [603, 332, 7, "#ba8994"], [550, 198, 8, "#c8ad82"], [202, 401, 4, "#c9b3a1"]]) {
    marks.append(path(`M${x - size} ${y} Q${x} ${y} ${x} ${y - size} Q${x} ${y} ${x + size} ${y} Q${x} ${y} ${x} ${y + size} Q${x} ${y} ${x - size} ${y}`, color));
  }
  marks.append(circle(190, 333, 2, "#d1b7a4"), circle(577, 260, 2.5, "#d1b7a4"), circle(562, 408, 2, "#c3aabe"));
  return marks;
}

function stand(palette) {
  return group({ id: "cake-stand", "aria-hidden": "true" }, [
    ellipse(380, 566, 98, 19, "#94afa0"),
    ellipse(380, 561, 98, 18, "url(#stand-shade)"),
    path("M349 492 Q361 540 338 554 Q380 568 422 554 Q399 540 411 492Z", "url(#stand-shade)"),
    path("M150 481 L150 489 A230 48 0 0 0 610 489 L610 481Z", "url(#stand-shade)"),
    ellipse(380, 480, 230, 48, palette.plate, { stroke: "#acc3b7", "stroke-width": "1" }),
    ellipse(380, 477, 218, 42, "#e5ece0", { stroke: "#f8faf0", "stroke-width": "2" }),
    ellipse(380, 482, 197, 38, "#a4b7a2", { opacity: ".19" })
  ]);
}

function tierBody(tier, palette) {
  const { cx, y, rx, ry, height } = tier;
  const left = cx - rx, right = cx + rx, bottom = y + height;
  const body = group({ class: "tier-body", "data-assemble": "body" }, [
    ellipse(cx, bottom + 4, rx + 2, ry, "#785047", { opacity: ".1" }),
    path(`M${left} ${y} L${left} ${bottom} A${rx} ${ry} 0 0 0 ${right} ${bottom} L${right} ${y}Z`, "url(#cake-side)"),
    ellipse(cx, y, rx, ry, "url(#cake-top)"),
    path(`M${left + 6} ${bottom - 10} A${rx - 6} ${ry - 3} 0 0 0 ${right - 6} ${bottom - 10}`, "none", { stroke: palette.shade, "stroke-width": "1.5", opacity: ".25" })
  ]);
  // A narrow cream seam and a soft vertical highlight give the sponge some depth.
  body.append(path(`M${left + 1} ${y + height * .61} A${rx - 1} ${ry} 0 0 0 ${right - 1} ${y + height * .61}`, "none", { stroke: palette.top, "stroke-width": "3", opacity: ".48" }));
  return body;
}

function rosette(x, y, scale, palette) {
  const shell = group({ transform: `translate(${number(x)} ${number(y)}) scale(${scale})` });
  shell.append(ellipse(0, 3, 8, 4, palette.shade, { opacity: ".15" }));
  shell.append(path("M-8 2 Q-10-3-5-5 Q-5-10 0-8 Q5-10 6-5 Q11-2 7 3 Q3 7-2 5 Q-8 8-8 2Z", "url(#icing-shade)", { stroke: "#dcc5ae", "stroke-width": ".45" }));
  shell.append(path("M-5 2 Q-7-4-1-5 Q5-6 4-1 Q3 4-1 2 Q-3 0 0-1", "none", { stroke: "#dec8af", "stroke-width": ".8", opacity: ".65" }));
  return shell;
}

function icingLayer(tier, config, palette) {
  const { cx, y, rx, ry, height } = tier;
  const icing = group({ class: "tier-icing", "data-assemble": "icing" });
  if (config.icing === "smooth") {
    icing.append(path(`M${cx - rx} ${y + 2} A${rx} ${ry} 0 0 0 ${cx + rx} ${y + 2}`, "none", { stroke: palette.icing, "stroke-width": "4", "stroke-linecap": "round" }));
    return icing;
  }
  if (config.icing === "drip") {
    // Build the lower icing edge along the curved front rim, with alternating drips.
    const left = cx - rx, right = cx + rx;
    const segments = 12, step = rx * 2 / segments;
    const rimY = (x) => y + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
    let d = `M${left} ${y} A${rx} ${ry} 0 0 0 ${right} ${y} L${right} ${y + 9}`;
    for (let i = segments; i > 0; i -= 1) {
      const x1 = left + i * step, x0 = x1 - step, mid = (x0 + x1) / 2;
      const depth = i % 3 === 0 ? 28 : i % 2 === 0 ? 18 : 9;
      d += ` Q${x1 - step * .19} ${rimY(x1) + 10} ${mid + step * .22} ${rimY(mid) + depth} Q${mid} ${rimY(mid) + depth + 9} ${mid - step * .22} ${rimY(mid) + depth} Q${x0 + step * .16} ${rimY(x0) + 10} ${x0} ${rimY(x0) + 9}`;
    }
    icing.append(path(`${d}Z`, "url(#icing-shade)"), ellipse(cx, y - 1, rx, ry, palette.icing));
    icing.append(path(`M${left + 16} ${y - 2} A${rx - 16} ${ry - 8} 0 0 1 ${right - 16} ${y - 2}`, "none", { stroke: "#fffaf0", "stroke-width": "2", opacity: ".65" }));
    return icing;
  }
  const count = Math.round(rx / 5.4);
  // The rear piping is painted first and naturally occluded by the next tier.
  for (let i = 0; i < count * 2; i += 1) {
    const angle = Math.PI + i / (count * 2 - 1) * Math.PI * 2;
    icing.append(rosette(cx + Math.cos(angle) * (rx - 3), y + Math.sin(angle) * (ry - 2), .93, palette));
  }
  for (let i = 0; i <= count; i += 1) {
    const angle = i / count * Math.PI;
    icing.append(rosette(cx + Math.cos(angle) * (rx - 2), y + height + Math.sin(angle) * (ry - 2), .71, palette));
  }
  return icing;
}

function berry(x, y, size, palette) {
  const g = group({ transform: `translate(${number(x)} ${number(y)}) scale(${size})` });
  g.append(ellipse(1, 5, 12, 4, palette.shade, { opacity: ".22" }), path("M-10-6 C-14-19 14-20 11-6 Q7 5 0 8 Q-8 2-10-6Z", "#be596c"), path("M-8-10Q-8-16-2-15", "none", { stroke: "#e58d94", "stroke-width": "3", "stroke-linecap": "round" }), path("M0-12-9-18-2-17 0-23 3-17 11-18 5-12Z", "#788c5f"));
  for (const [px, py] of [[-5, -8], [3, -9], [-2, -3], [5, -3], [0, 3]]) g.append(ellipse(px, py, .8, 1.3, "#f8d7a1"));
  return g;
}

function flower(x, y, size, palette, alternate) {
  const g = group({ transform: `translate(${number(x)} ${number(y)}) scale(${size})` });
  g.append(ellipse(0, 4, 13, 4, palette.shade, { opacity: ".12" }));
  for (let i = 0; i < 6; i += 1) g.append(ellipse(0, -7, 5, 8, alternate ? "#fff1dc" : "#e3c7db", { transform: `rotate(${i * 60})`, stroke: alternate ? "#e1cbb3" : "#cba9c3", "stroke-width": ".7" }));
  g.append(circle(0, 0, 4, "#dcb568"), circle(-1, -1, 1.5, "#f7dc8d"));
  return g;
}

function toppingsLayer(tier, config, palette) {
  const toppings = group({ class: "tier-toppings", "data-assemble": "toppings" });
  if (config.topping === "none") return toppings;
  const random = seededRandom(config.seed + tier.index * 317);
  const topTier = tier.index === config.tiers - 1;
  const { cx, y, rx, ry, height } = tier;
  if (config.topping === "sprinkles") {
    const colors = [palette.accent, "#fff5de", "#c49b55", "#829d8c", "#e4979c"];
    for (let i = 0; i < 70; i += 1) {
      const angle = random() * Math.PI;
      const radius = topTier ? .6 + random() * .26 : .91 + random() * .025;
      const onSide = i > 26;
      const x = onSide ? cx + (random() - .5) * rx * 1.83 : cx + Math.cos(angle) * rx * radius;
      const curve = Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
      const py = onSide ? y + curve * ry + height * (.35 + random() * .45) : y + Math.sin(angle) * ry * radius;
      toppings.append(svgNode("rect", { x: number(x), y: number(py), width: 5.7, height: 2.1, rx: 1, fill: colors[Math.floor(random() * colors.length)], transform: `rotate(${number(random() * 160 - 80)} ${number(x)} ${number(py)})` }));
    }
    return toppings;
  }
  const count = topTier ? 5 : 7;
  for (let i = 0; i < count; i += 1) {
    const angle = .15 + (i / (count - 1)) * (Math.PI - .3);
    const x = cx + Math.cos(angle) * (rx - 11);
    const py = y + Math.sin(angle) * (ry - 3);
    const size = topTier && rx < 120 ? .69 : .84;
    toppings.append(config.topping === "berries" ? berry(x, py, size, palette) : flower(x, py - 2, size, palette, i % 2 === 0));
  }
  return toppings;
}

function candlesLayer(config) {
  const candles = group({ id: "cake-candles", "data-assemble": "candles" });
  candlePositions(config).forEach(({ x, y, height }, index) => {
    const g = group({ class: "candle", transform: `translate(${number(x)} ${number(y)})` });
    const clipId = `candle-clip-${index}`;
    g.append(svgNode("clipPath", { id: clipId }, [svgNode("rect", { x: -4.5, y: -height, width: 9, height, rx: 2 })]), ellipse(0, 1, 7, 2.6, "#825d60", { opacity: ".16" }), svgNode("rect", { x: -4.5, y: -height, width: 9, height, rx: 2, fill: "url(#candle-shade)" }));
    const stripes = group({ "clip-path": `url(#${clipId})`, stroke: "#fff6e9", "stroke-width": "3", opacity: ".8" });
    for (let stripe = 0; stripe < 6; stripe += 1) stripes.append(path(`M-7 ${-height + stripe * 10} L7 ${-height + stripe * 10 - 8}`, "none"));
    g.append(stripes, ellipse(0, -height, 4.5, 1.6, "#fff2dc"), path(`M0 ${-height} q-1-4 1-7`, "none", { stroke: "#6d5143", "stroke-width": "1.5", "stroke-linecap": "round" }), circle(0, -height - 14, 23, "url(#flame-aura)", { class: "flame-glow" }));
    const flame = group({ class: "flame", style: `--flicker-delay: ${-index * 173}ms` }, [
      path(`M0 ${-height - 5} C-12 ${-height - 9}-6 ${-height - 20} 1 ${-height - 26} C0 ${-height - 17} 11 ${-height - 10} 0 ${-height - 5}`, "url(#flame-color)"),
      path(`M0 ${-height - 6} Q-5 ${-height - 11} 0 ${-height - 17} Q5 ${-height - 10} 0 ${-height - 6}`, "#fff8cd", { class: "flame-inner" })
    ]);
    g.append(flame);
    candles.append(g);
  });
  return candles;
}

export function messageLines(message, maxLength = 24) {
  const chars = Array.from(message.trim());
  if (chars.length <= maxLength) return [chars.join("")];
  const midpoint = Math.ceil(chars.length / 2);
  let split = chars.lastIndexOf(" ", midpoint);
  if (split < Math.max(10, chars.length - maxLength)) {
    split = chars.indexOf(" ", midpoint);
    if (split < 0 || split > maxLength) split = midpoint;
  }
  return [chars.slice(0, split).join(""), chars.slice(split).join("").trim()];
}

function messageLayer(message) {
  const lines = messageLines(message);
  const text = svgNode("text", { id: "cake-message", x: 380, y: lines.length === 1 ? 637 : 626, "text-anchor": "middle", fill: "#8e5969", "font-family": '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif', "font-style": "italic", "font-size": "29" });
  for (let i = 0; i < lines.length; i += 1) {
    const span = svgNode("tspan", { x: 380, dy: i === 0 ? 0 : 33 });
    span.textContent = lines[i];
    text.append(span);
  }
  return text;
}

export function createRenderer(svg) {
  const title = svg.querySelector("title"), description = svg.querySelector("desc");
  let previous;
  function render(config, lit) {
    const palette = PALETTES.find((item) => item.id === config.palette);
    const structureChanged = !previous || previous.tiers !== config.tiers;
    const paletteChanged = !previous || previous.palette !== config.palette;
    if (!previous) {
      svg.replaceChildren(title, description, createDefs(palette), backdrop(), stand(palette), group({ id: "cake-tiers" }), candlesLayer(config), group({ id: "cake-effects", "aria-hidden": "true" }), messageLayer(config.message));
    } else if (paletteChanged) {
      svg.querySelector("defs").replaceWith(createDefs(palette));
      svg.querySelector("#cake-stand").replaceWith(stand(palette));
    }
    const geometry = tierGeometry(config.tiers);
    if (structureChanged) {
      svg.querySelector("#cake-tiers").replaceChildren(...geometry.map((tier) => group({ class: "cake-tier", "data-tier": tier.index }, [tierBody(tier, palette), icingLayer(tier, config, palette), toppingsLayer(tier, config, palette)])));
    } else {
      for (const tier of geometry) {
        const target = svg.querySelector(`[data-tier="${tier.index}"]`);
        if (paletteChanged) target.querySelector(".tier-body").replaceWith(tierBody(tier, palette));
        if (paletteChanged || previous.icing !== config.icing) target.querySelector(".tier-icing").replaceWith(icingLayer(tier, config, palette));
        if (paletteChanged || previous.topping !== config.topping || previous.seed !== config.seed) target.querySelector(".tier-toppings").replaceWith(toppingsLayer(tier, config, palette));
      }
    }
    if (structureChanged || previous?.candles !== config.candles) svg.querySelector("#cake-candles").replaceWith(candlesLayer(config));
    if (previous?.message !== config.message) svg.querySelector("#cake-message").replaceWith(messageLayer(config.message));
    svg.dataset.lit = String(lit);
    description.textContent = `${config.tiers}-tier ${palette.name.toLowerCase()} cake, ${config.icing} icing, ${config.topping === "none" ? "no toppings" : config.topping}, and ${config.candles} ${lit ? "lit" : "unlit"} ${config.candles === 1 ? "candle" : "candles"}.${config.message ? ` Message: ${config.message}` : ""}`;
    previous = { ...config };
  }
  return { render };
}
