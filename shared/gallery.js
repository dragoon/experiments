(function gallery() {
  "use strict";

  const grid = document.getElementById("experiment-grid");
  if (!grid || !window.fetch) return;

  function tagText(tags) {
    return Array.isArray(tags) ? tags.join(" / ") : "";
  }

  function cardMarkup(experiment) {
    const accent = experiment.accent || "#45d6c5";
    return `
      <a class="experiment-card" href="${experiment.path}" style="--accent: ${accent}">
        <span class="card-art" aria-hidden="true">
          <span class="string string-a"></span>
          <span class="string string-b"></span>
          <span class="string string-c"></span>
          <span class="pulse"></span>
        </span>
        <span class="card-copy">
          <strong>${experiment.title}</strong>
          <span>${experiment.description}</span>
        </span>
        <span class="tags">${tagText(experiment.tags)}</span>
      </a>
    `;
  }

  fetch("manifest.json")
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
