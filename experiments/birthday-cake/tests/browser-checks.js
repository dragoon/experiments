// Run in the cake page's browser console:
// await (await import('./tests/browser-checks.js')).runBrowserChecks()
// Reload afterward to restore the initial cake.
export async function runBrowserChecks() {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const svg = document.querySelector("#cake-svg");
  const select = (name, value) => document.querySelector(`input[name="${name}"][value="${value}"]`).click();
  const input = (id, value) => {
    const element = document.getElementById(id);
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const inside = (element, name) => {
    const bounds = element.getBBox();
    assert([bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite), `${name}: finite bounds`);
    assert(bounds.x >= 0 && bounds.x + bounds.width <= 760 && bounds.y >= 0 && bounds.y + bounds.height <= 680, `${name}: inside SVG viewBox`);
  };
  let combinations = 0;
  input("candles", "12");
  for (const tiers of [1, 2, 3]) {
    select("tiers", tiers);
    for (const palette of ["strawberry", "lemon", "lavender", "pistachio", "blueberry", "cocoa"]) {
      select("palette", palette);
      for (const icing of ["smooth", "drip", "piped"]) {
        select("icing", icing);
        for (const topping of ["sprinkles", "berries", "flowers", "none"]) {
          select("topping", topping);
          assert(svg.querySelectorAll(".cake-tier").length === tiers, "Tier count matches controls");
          assert(svg.querySelectorAll(".candle").length === 12, "Candle count survives appearance edits");
          inside(svg.querySelector("#cake-tiers"), "Cake");
          inside(svg.querySelector("#cake-candles"), "Candles");
          assert(!svg.innerHTML.includes("NaN"), "No invalid geometry");
          const ids = [...svg.querySelectorAll("[id]")].map((node) => node.id);
          assert(new Set(ids).size === ids.length, "SVG references are unique");
          combinations += 1;
        }
      }
    }
  }

  input("message", "WWWWWWWWWW WWWWWWWWWWWWWWWWWWWWWWWWWWWWW");
  inside(svg.querySelector("#cake-message"), "Long message");
  input("message", '<script>alert("cake")</script> & <3');
  assert(svg.querySelectorAll("script").length === 0, "Message is rendered as text");
  assert(svg.querySelector("#cake-message").textContent.includes("<script>"), "Message text is preserved");
  input("message", "A wish just for you!");
  const beforeMessageEdit = svg.querySelector(".tier-toppings");
  input("message", "A lovely birthday to you!");
  assert(beforeMessageEdit === svg.querySelector(".tier-toppings"), "Message edits preserve decoration nodes");
  if (svg.dataset.lit !== "true") document.querySelector("#wish-button").click();
  document.querySelector("#wish-button").click();
  assert(svg.dataset.lit === "false", "Wish extinguishes candles");
  select("palette", "lavender");
  input("candles", "1");
  assert(svg.dataset.lit === "false", "Appearance and count edits preserve extinguished state");
  assert(svg.querySelector("#cake-effects").children.length === 0, "Editing clears transient effects");
  document.querySelector("#wish-button").click();
  assert(svg.dataset.lit === "true", "Relight restores candles");

  const motionButton = document.querySelector("#motion-toggle");
  if (!motionButton.disabled) {
    if (motionButton.getAttribute("aria-pressed") !== "true") motionButton.click();
    document.querySelector("#surprise-button").click();
    assert(svg.getAnimations({ subtree: true }).every((animation) => animation.playState === "paused"), "Surprise honors pause");
    document.querySelector("#wish-button").click();
    assert(svg.querySelector("#cake-effects").children.length === 0, "Paused wish has no confetti or smoke");
    motionButton.click();
  }
  for (let i = 0; i < 30; i += 1) {
    document.querySelector("#surprise-button").click();
    assert(svg.dataset.lit === "true", "Surprise relights candles");
    assert(document.querySelector("#message").value === "A lovely birthday to you!", "Surprise keeps the message");
    document.querySelector("#wish-button").click();
    input("candles", String(i % 12 + 1));
    assert(svg.querySelector("#cake-effects").children.length === 0, "Rapid edit clears effects");
  }
  document.querySelector("#wish-button").click();
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert(svg.getAnimations({ subtree: true }).every((animation) => animation.animationName === "flicker"), "No abandoned assembly or celebration animations");
  return { combinations, rapidCycles: 30, result: "passed" };
}
