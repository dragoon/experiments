(function gallery() {
  "use strict";

  const grid = document.getElementById("experiment-grid");
  if (!grid || !window.fetch) return;

  function tagText(tags) {
    return Array.isArray(tags) ? tags.join(" / ") : "";
  }

  function artMarkup(experiment) {
    if (experiment.art === "cake") {
      return `
        <span class="card-art cake-art" aria-hidden="true">
          <span class="mini-cake-stand"></span>
          <span class="mini-cake-bottom"></span>
          <span class="mini-cake-top"></span>
          <span class="mini-cake-candles"><i></i><i></i><i></i></span>
        </span>
      `;
    }

    if (experiment.art === "piano") {
      return `
        <span class="card-art piano-art" aria-hidden="true">
          <span class="mini-piano">
            <span class="piano-white"></span>
            <span class="piano-white"></span>
            <span class="piano-white"></span>
            <span class="piano-white"></span>
            <span class="piano-white"></span>
            <span class="piano-white"></span>
            <span class="piano-white"></span>
            <span class="piano-black black-a"></span>
            <span class="piano-black black-b"></span>
            <span class="piano-black black-c"></span>
            <span class="piano-black black-d"></span>
            <span class="piano-black black-e"></span>
          </span>
          <span class="key-glow"></span>
        </span>
      `;
    }

    if (experiment.art === "bricks") {
      return `
        <span class="card-art bricks-art" aria-hidden="true">
          <span class="mini-wall">
            <span></span><span></span><span></span><span></span>
            <span></span><span></span><span></span><span></span>
            <span></span><span></span><span></span><span></span>
          </span>
        </span>
      `;
    }

    if (experiment.art === "lighthouse") {
      return `
        <span class="card-art lighthouse-art" aria-hidden="true">
          <span class="mini-beam"></span>
          <span class="mini-lighthouse">
            <span class="mini-roof"></span>
            <span class="mini-lantern"></span>
            <span class="mini-tower"></span>
            <span class="mini-band"></span>
          </span>
          <span class="mini-rocks"></span>
        </span>
      `;
    }

    return `
      <span class="card-art strings-art" aria-hidden="true">
        <span class="string string-a"></span>
        <span class="string string-b"></span>
        <span class="string string-c"></span>
        <span class="pulse"></span>
      </span>
    `;
  }

  function cardMarkup(experiment) {
    const accent = experiment.accent || "#45d6c5";
    return `
      <a class="experiment-card" href="${experiment.path}" style="--accent: ${accent}">
        ${artMarkup(experiment)}
        <span class="card-copy">
          <strong>${experiment.title}</strong>
          <span>${experiment.description}</span>
        </span>
        <span class="tags">${tagText(experiment.tags)}</span>
      </a>
    `;
  }

  fetch("manifest.json?v=24")
    .then((response) => {
      if (!response.ok) throw new Error("Manifest unavailable");
      return response.json();
    })
    .then((manifest) => {
      if (!Array.isArray(manifest.experiments) || manifest.experiments.length === 0) return;
      grid.innerHTML = manifest.experiments.map(cardMarkup).join("");
    })
    .catch(() => {
      // The static fallback card keeps the gallery usable when opened via file://.
    });
})();
