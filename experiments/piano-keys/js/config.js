(function configurePiano(window) {
  "use strict";

  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const KEYBOARD_CODES = [
    "KeyZ", "KeyS", "KeyX", "KeyD", "KeyC", "KeyV", "KeyG", "KeyB", "KeyH", "KeyN", "KeyJ", "KeyM",
    "KeyQ", "Digit2", "KeyW", "Digit3", "KeyE", "KeyR", "Digit5", "KeyT", "Digit6", "KeyY", "Digit7", "KeyU", "KeyI"
  ];
  const KEYBOARD_LABELS = [
    "Z", "S", "X", "D", "C", "V", "G", "B", "H", "N", "J", "M",
    "Q", "2", "W", "3", "E", "R", "5", "T", "6", "Y", "7", "U", "I"
  ];
  const SONG_STEP = 230;

  function frequencyFor(noteName, octave) {
    const semitone = NOTE_NAMES.indexOf(noteName);
    const midi = (octave + 1) * 12 + semitone;
    return Number((440 * Math.pow(2, (midi - 69) / 12)).toFixed(2));
  }

  function buildKeys() {
    const keys = [];
    for (let midi = 48; midi <= 72; midi += 1) {
      const noteName = NOTE_NAMES[midi % 12];
      const octave = Math.floor(midi / 12) - 1;
      const note = `${noteName}${octave}`;
      const keyboardIndex = midi - 48;
      keys.push({
        note,
        name: noteName,
        octave,
        frequency: frequencyFor(noteName, octave),
        color: noteName.includes("#") ? "black" : "white",
        keyboardCode: KEYBOARD_CODES[keyboardIndex],
        keyboardLabel: KEYBOARD_LABELS[keyboardIndex]
      });
    }
    return keys;
  }

  function notes(delay, noteList, duration = 2, velocity = 0.82) {
    const list = Array.isArray(noteList) ? noteList : [noteList];
    return {
      delay: delay * SONG_STEP,
      notes: list,
      duration: duration * SONG_STEP,
      velocity
    };
  }

  const KEYS = buildKeys();

  window.PianoConfig = {
    KEYS,

    CHORDS: {
      C: ["C4", "E4", "G4"],
      G: ["G3", "B3", "D4"],
      Am: ["A3", "C4", "E4"],
      F: ["F3", "A3", "C4"],
      Dm: ["D4", "F4", "A4"],
      Em: ["E4", "G4", "B4"]
    },

    SONGS: {
      ode: {
        label: "Ode to Joy",
        events: [
          notes(0, "E4"), notes(1, "E4"), notes(2, "F4"), notes(3, "G4"),
          notes(4, "G4"), notes(5, "F4"), notes(6, "E4"), notes(7, "D4"),
          notes(8, "C4"), notes(9, "C4"), notes(10, "D4"), notes(11, "E4"),
          notes(12, "E4", 1.5), notes(13.5, "D4", 0.75), notes(14.25, "D4", 2)
        ]
      },
      twinkle: {
        label: "Twinkle Twinkle",
        events: [
          notes(0, "C4"), notes(1, "C4"), notes(2, "G4"), notes(3, "G4"),
          notes(4, "A4"), notes(5, "A4"), notes(6, "G4", 2.4),
          notes(9, "F4"), notes(10, "F4"), notes(11, "E4"), notes(12, "E4"),
          notes(13, "D4"), notes(14, "D4"), notes(15, "C4", 2.4)
        ]
      },
      greensleeves: {
        label: "Greensleeves",
        events: [
          notes(0, "A3", 1.3), notes(1.3, "C4"), notes(2.3, "D4", 1.5),
          notes(3.8, "E4"), notes(4.8, "F4", 1.3), notes(6.1, "E4"),
          notes(7.1, "D4", 1.4), notes(8.5, "B3"), notes(9.5, "G3", 1.6),
          notes(11.1, "A3"), notes(12.1, "B3"), notes(13.1, "C4", 1.7),
          notes(14.8, "A3", 2.2)
        ]
      },
      canon: {
        label: "Canon in D",
        events: [
          notes(0, ["D3", "F#4", "A4"], 1.3, 0.72),
          notes(1.5, ["A3", "C#4", "E4"], 1.3, 0.72),
          notes(3, ["B3", "D4", "F#4"], 1.3, 0.72),
          notes(4.5, ["F#3", "C#4", "A4"], 1.3, 0.72),
          notes(6, ["G3", "B3", "D4"], 1.3, 0.72),
          notes(7.5, ["D3", "A3", "F#4"], 1.3, 0.72),
          notes(9, ["G3", "B3", "E4"], 1.3, 0.72),
          notes(10.5, ["A3", "C#4", "E4"], 2, 0.74)
        ]
      },
      furElise: {
        label: "Fur Elise",
        events: [
          notes(0, "E4", 0.55), notes(0.65, "D#4", 0.55), notes(1.3, "E4", 0.55),
          notes(1.95, "D#4", 0.55), notes(2.6, "E4", 0.55), notes(3.25, "B3", 0.75),
          notes(4.05, "D4", 0.75), notes(4.9, "C4", 0.75), notes(5.75, "A3", 1.7),
          notes(7.5, ["A3", "E4", "A4"], 1.5, 0.72),
          notes(9.1, "C4"), notes(10.1, "E4"), notes(11.1, "A4", 1.8)
        ]
      },
      minuet: {
        label: "Minuet in G",
        events: [
          notes(0, "D4"), notes(1, "G3"), notes(2, "A3"), notes(3, "B3"),
          notes(4, "C4"), notes(5, "D4"), notes(6, "G3", 1.4), notes(7.4, "G3", 1.2),
          notes(9, "E4"), notes(10, "C4"), notes(11, "D4"), notes(12, "E4"),
          notes(13, "F#4"), notes(14, "G4"), notes(15, "G3", 2)
        ]
      }
    },

    KEYBOARD_MAP: KEYBOARD_CODES.reduce((map, code, index) => {
      map[code] = KEYS[index].note;
      return map;
    }, {})
  };
})(window);
