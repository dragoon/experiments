(function main(window) {
  "use strict";

  const { STRINGS, CHORDS, RIFFS, KEY_CHORDS } = window.GuitarConfig;
  const canvas = document.getElementById("guitar");
  const statusEl = document.getElementById("status");
  const flashEl = document.getElementById("flash");
  const chordButtons = [...document.querySelectorAll("[data-chord]")];
  const riffButtons = [...document.querySelectorAll("[data-riff]")];
  const stopButton = document.querySelector("[data-stop]");

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    stringY: [],
    plucks: STRINGS.map(() => []),
    ripples: [],
    noteBursts: [],
    selectedChord: "G",
    activeRiff: null,
    riffTimers: [],
    pointerDown: false,
    lastPointerString: -1,
    audioContext: null,
    master: null,
    compressor: null,
    audioUnlocked: false,
    flashTimer: 0
  };

  const renderer = window.GuitarRenderer.createRenderer({ canvas, state, strings: STRINGS });
  const audio = window.GuitarAudio.createAudioEngine({
    state,
    strings: STRINGS,
    notify: showFlash
  });

  function showFlash(message) {
    flashEl.textContent = message;
    flashEl.classList.add("show");
    window.clearTimeout(state.flashTimer);
    state.flashTimer = window.setTimeout(() => flashEl.classList.remove("show"), 950);
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function setSelectedChord(chordName) {
    state.selectedChord = chordName;
    chordButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.chord === chordName));
    });
  }

  function pluckString(stringIndex, fret = 0, velocity = 1, x = state.width * 0.5, scheduled = false) {
    if (stringIndex < 0 || stringIndex >= STRINGS.length) return;

    const now = performance.now();
    const y = state.stringY[stringIndex] || state.height * 0.5;
    const color = renderer.colorForString(stringIndex);
    const amplitude = (18 + stringIndex * 1.45) * velocity;

    state.plucks[stringIndex].push({ time: now, x, amplitude, velocity });
    state.ripples.push({ time: now, x, y, color, velocity });
    state.noteBursts.push({ time: now, x, y, color, velocity, stringIndex });
    audio.playTone(stringIndex, fret, velocity, x);

    if (!scheduled) {
      setStatus(`Plucked ${STRINGS[stringIndex].name}`);
    }
  }

  function stopRiffStatusOnly() {
    if (!state.activeRiff) return;
    state.activeRiff = null;
    state.riffTimers.forEach((timer) => window.clearTimeout(timer));
    state.riffTimers = [];
    riffButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
  }

  function stopRiff() {
    const hadRiff = Boolean(state.activeRiff);
    stopRiffStatusOnly();
    setStatus(hadRiff ? "Riff stopped" : `Selected: ${state.selectedChord}`);
  }

  function strumChord(chordName = state.selectedChord, direction = 1, velocity = 0.9) {
    audio.ensureAudio();
    stopRiffStatusOnly();
    const chord = CHORDS[chordName];
    if (!chord) return;

    setSelectedChord(chordName);
    setStatus(`Strumming ${chordName}`);

    const ordered = direction > 0 ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];
    let step = 0;
    ordered.forEach((stringIndex) => {
      const fret = chord[stringIndex];
      if (fret === null) return;
      const x = state.width * (0.27 + step * 0.084);
      window.setTimeout(() => pluckString(stringIndex, fret, velocity, x, true), step * 38);
      step += 1;
    });
  }

  function playChordEvent(chordName, direction = 1, velocity = 0.8, riffName = null) {
    const chord = CHORDS[chordName];
    if (!chord) return;

    setSelectedChord(chordName);
    const ordered = direction > 0 ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];
    let step = 0;

    ordered.forEach((stringIndex) => {
      const fret = chord[stringIndex];
      if (fret === null) return;
      const x = state.width * (0.32 + step * 0.075);
      const timer = window.setTimeout(() => {
        if (riffName && state.activeRiff !== riffName) return;
        pluckString(stringIndex, fret, velocity, x, true);
      }, step * 34);
      if (riffName) state.riffTimers.push(timer);
      step += 1;
    });
  }

  function playRiff(riffName) {
    const riff = RIFFS[riffName];
    if (!riff) return;

    audio.ensureAudio();
    stopRiffStatusOnly();
    state.activeRiff = riffName;
    setStatus(`Playing ${riff.label}`);
    riffButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.riff === riffName));
    });

    riff.events.forEach((event) => {
      const timer = window.setTimeout(() => {
        if (state.activeRiff !== riffName) return;
        if (event.chord) {
          playChordEvent(event.chord, event.direction, event.velocity, riffName);
        } else {
          const x = state.width * (0.34 + (event.string / 7) * 0.44);
          pluckString(event.string, event.fret || 0, event.velocity || 0.75, x, true);
        }
      }, event.delay);
      state.riffTimers.push(timer);
    });

    const endDelay = Math.max(...riff.events.map((event) => event.delay)) + 900;
    const endTimer = window.setTimeout(() => {
      if (state.activeRiff === riffName) {
        stopRiffStatusOnly();
        setStatus(`Finished ${riff.label}`);
      }
    }, endDelay);
    state.riffTimers.push(endTimer);
  }

  function nearestString(y) {
    let nearest = 0;
    let distance = Infinity;
    state.stringY.forEach((stringY, index) => {
      const current = Math.abs(y - stringY);
      if (current < distance) {
        nearest = index;
        distance = current;
      }
    });
    return { index: nearest, distance };
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function handlePointerPluck(event, force = false) {
    const point = pointerPosition(event);
    const nearest = nearestString(point.y);
    const threshold = Math.max(34, state.height * 0.055);
    if (!force && nearest.distance > threshold) return;
    if (!force && nearest.index === state.lastPointerString) return;
    state.lastPointerString = nearest.index;
    const velocity = Math.min(1.15, 0.58 + nearest.distance / threshold);
    pluckString(nearest.index, 0, velocity, point.x);
  }

  function bindEvents() {
    chordButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        const chordName = button.dataset.chord;
        const direction = index % 2 === 0 ? 1 : -1;
        strumChord(chordName, direction, 0.9);
      });
    });

    riffButtons.forEach((button) => {
      button.addEventListener("click", () => playRiff(button.dataset.riff));
    });

    stopButton.addEventListener("click", stopRiff);

    canvas.addEventListener("pointerdown", (event) => {
      canvas.setPointerCapture(event.pointerId);
      state.pointerDown = true;
      state.lastPointerString = -1;
      handlePointerPluck(event, true);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!state.pointerDown) return;
      handlePointerPluck(event);
    });

    function endPointer() {
      state.pointerDown = false;
      state.lastPointerString = -1;
    }

    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);
    canvas.addEventListener("pointerleave", endPointer);

    window.addEventListener("keydown", (event) => {
      if (event.repeat) return;

      if (/^[1-6]$/.test(event.key)) {
        event.preventDefault();
        const stringIndex = Number(event.key) - 1;
        const x = state.width * (0.3 + Math.random() * 0.4);
        pluckString(stringIndex, 0, 0.85, x);
        return;
      }

      if (KEY_CHORDS[event.code]) {
        event.preventDefault();
        const chordName = KEY_CHORDS[event.code];
        strumChord(chordName, event.code.charCodeAt(3) % 2 === 0 ? 1 : -1, 0.9);
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        strumChord(state.selectedChord, 1, 0.94);
        return;
      }

      if (event.code === "Escape") {
        event.preventDefault();
        stopRiff();
      }
    });

    window.addEventListener("resize", renderer.resize);
    window.addEventListener("blur", () => {
      state.pointerDown = false;
    });
  }

  function draw() {
    renderer.drawFrame();
    requestAnimationFrame(draw);
  }

  bindEvents();
  renderer.resize();
  setSelectedChord(state.selectedChord);
  requestAnimationFrame(draw);
})(window);
