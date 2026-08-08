(function configureGuitar(window) {
  "use strict";

  window.GuitarConfig = {
    STRINGS: [
      { name: "E2", frequency: 82.41, thickness: 3.9, color: "#f5d98e", rgb: "245,217,142" },
      { name: "A2", frequency: 110.00, thickness: 3.4, color: "#e8c576", rgb: "232,197,118" },
      { name: "D3", frequency: 146.83, thickness: 2.9, color: "#d8d9cf", rgb: "216,217,207" },
      { name: "G3", frequency: 196.00, thickness: 2.35, color: "#c0eee0", rgb: "192,238,224" },
      { name: "B3", frequency: 246.94, thickness: 1.95, color: "#86efe1", rgb: "134,239,225" },
      { name: "E4", frequency: 329.63, thickness: 1.55, color: "#d8fff9", rgb: "216,255,249" }
    ],

    CHORDS: {
      C: [null, 3, 2, 0, 1, 0],
      G: [3, 2, 0, 0, 0, 3],
      D: [null, null, 0, 2, 3, 2],
      Em: [0, 2, 2, 0, 0, 0],
      Am: [null, 0, 2, 2, 1, 0],
      F: [1, 3, 3, 2, 1, 1]
    },

    RIFFS: {
      sunrise: {
        label: "Sunrise",
        events: [
          { delay: 0, string: 5, fret: 0, velocity: 0.76 },
          { delay: 130, string: 4, fret: 1, velocity: 0.62 },
          { delay: 260, string: 3, fret: 0, velocity: 0.68 },
          { delay: 430, chord: "C", direction: 1, velocity: 0.78 },
          { delay: 1040, string: 2, fret: 0, velocity: 0.64 },
          { delay: 1180, string: 1, fret: 2, velocity: 0.68 },
          { delay: 1330, chord: "G", direction: -1, velocity: 0.82 },
          { delay: 2060, string: 0, fret: 0, velocity: 0.56 },
          { delay: 2200, string: 2, fret: 2, velocity: 0.66 },
          { delay: 2360, chord: "Am", direction: 1, velocity: 0.76 },
          { delay: 3000, chord: "F", direction: -1, velocity: 0.72 },
          { delay: 3720, chord: "G", direction: 1, velocity: 0.86 }
        ]
      },
      drift: {
        label: "Drift",
        events: [
          { delay: 0, chord: "Em", direction: -1, velocity: 0.72 },
          { delay: 520, string: 5, fret: 3, velocity: 0.54 },
          { delay: 720, string: 3, fret: 0, velocity: 0.58 },
          { delay: 960, chord: "D", direction: 1, velocity: 0.72 },
          { delay: 1530, string: 2, fret: 0, velocity: 0.56 },
          { delay: 1710, string: 4, fret: 3, velocity: 0.62 },
          { delay: 1920, chord: "C", direction: -1, velocity: 0.76 },
          { delay: 2520, string: 1, fret: 3, velocity: 0.56 },
          { delay: 2710, string: 5, fret: 0, velocity: 0.58 },
          { delay: 2920, chord: "G", direction: 1, velocity: 0.84 },
          { delay: 3610, string: 0, fret: 3, velocity: 0.62 },
          { delay: 3820, chord: "Em", direction: -1, velocity: 0.78 }
        ]
      }
    },

    KEY_CHORDS: {
      KeyQ: "C",
      KeyW: "G",
      KeyE: "D",
      KeyR: "Em",
      KeyT: "Am",
      KeyY: "F"
    }
  };
})(window);
