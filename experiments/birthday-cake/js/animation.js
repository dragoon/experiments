import { candlePositions, seededRandom } from "./config.js";
import { svgNode } from "./renderer.js";

export function createAnimator(svg) {
  const active = new Set();
  let paused = false;
  let reduced = false;

  function animate(node, frames, options, removeWhenFinished = false) {
    if (paused || reduced || !node.animate) return;
    const animation = node.animate(frames, options);
    active.add(animation);
    animation.finished.then(() => {
      active.delete(animation);
      if (removeWhenFinished) node.remove();
      animation.cancel();
    }).catch(() => active.delete(animation));
    return animation;
  }

  function cancel() {
    for (const animation of active) animation.cancel();
    active.clear();
    svg.querySelector("#cake-effects")?.replaceChildren();
  }

  function assemble() {
    cancel();
    if (paused || reduced) return;
    svg.querySelectorAll("[data-assemble]").forEach((node) => {
      const tier = Number(node.closest("[data-tier]")?.dataset.tier ?? svg.querySelectorAll(".cake-tier").length);
      const kind = node.dataset.assemble;
      const offset = { body: 0, icing: 140, toppings: 260, candles: 60 }[kind];
      animate(node, [
        { opacity: 0, transform: `translateY(${kind === "body" ? -35 : -14}px)` },
        { opacity: 1, transform: "translateY(3px)", offset: .72 },
        { opacity: 1, transform: "translateY(0)" }
      ], { duration: 560, delay: tier * 160 + offset, easing: "cubic-bezier(.2,.7,.25,1)", fill: "backwards" });
    });
  }

  function celebrate(config) {
    cancel();
    if (paused || reduced) return;
    const effects = svg.querySelector("#cake-effects");
    const random = seededRandom(config.seed + 108);
    candlePositions(config).forEach(({ x, y, height }, index) => {
      const smoke = svgNode("path", { d: `M${x} ${y - height - 5} c-8-9 10-15 0-25 s4-18 0-25`, fill: "none", stroke: "#a69e95", "stroke-width": 2.5, "stroke-linecap": "round", opacity: 0 });
      effects.append(smoke);
      animate(smoke, [{ opacity: 0, transform: "translate(0, 5px)" }, { opacity: .48, offset: .2 }, { opacity: 0, transform: "translate(12px, -30px)" }], { duration: 1500, delay: index * 25, easing: "ease-out", fill: "both" }, true);
    });
    const colors = ["#ca8d9b", "#d4b16b", "#9aaa88", "#b7a1c5", "#88a9b5"];
    for (let i = 0; i < 56; i += 1) {
      const x = 160 + random() * 440, y = 110 + random() * 120;
      const confetti = svgNode("g", { transform: `translate(${x} ${y})` });
      const piece = svgNode(i % 4 === 0 ? "circle" : "rect", i % 4 === 0 ? { r: 3, fill: colors[i % colors.length] } : { x: -3, y: -5, width: 6, height: 10, rx: 1, fill: colors[i % colors.length] });
      confetti.append(piece);
      effects.append(confetti);
      const animation = animate(piece, [
        { opacity: 0, transform: "translate(0, 25px) rotate(0deg)" },
        { opacity: .9, transform: `translate(${(random() - .5) * 40}px, -25px) rotate(80deg)`, offset: .18 },
        { opacity: 0, transform: `translate(${(random() - .5) * 180}px, ${180 + random() * 110}px) rotate(${random() * 600 - 300}deg)` }
      ], { duration: 2200 + random() * 700, delay: random() * 220, easing: "cubic-bezier(.2,.55,.5,1)", fill: "both" });
      // Remove the wrapper as well, including after cancellation through cancel().
      animation?.finished.then(() => confetti.remove()).catch(() => {});
    }
  }

  function setMotion(nextPaused, nextReduced) {
    paused = nextPaused;
    reduced = nextReduced;
    svg.classList.toggle("motion-paused", paused);
    svg.classList.toggle("motion-reduced", reduced);
    if (reduced) cancel();
    else for (const animation of active) paused ? animation.pause() : animation.play();
  }

  return { assemble, celebrate, cancel, setMotion };
}
