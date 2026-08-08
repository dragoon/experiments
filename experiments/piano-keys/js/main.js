(function main(window) {
  "use strict";

  const { KEYS, CHORDS, SONGS, KEYBOARD_MAP } = window.PianoConfig;
  const canvas = document.getElementById("piano");
  const statusEl = document.getElementById("status");
  const flashEl = document.getElementById("flash");
  const chordButtons = [...document.querySelectorAll("[data-chord]")];
  const songButtons = [...document.querySelectorAll("[data-song]")];
  const stopButton = document.querySelector("[data-stop]");
  const keyByNote = KEYS.reduce((map, key, index) => {
    map[key.note] = { ...key, index };
    return map;
  }, {});

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    keyRects: {},
    activeNotes: {},
    ripples: [],
    noteBursts: [],
    selectedChord: "C",
    activeSong: null,
    songTimers: [],
    pointerDown: false,
    lastPointerNote: null,
    audioContext: null,
    master: null,
    compressor: null,
    audioUnlocked: false,
    flashTimer: 0
  };

  const renderer = window.PianoRenderer.createRenderer({ canvas, state, keys: KEYS });
  const audio = window.PianoAudio.createAudioEngine({
    state,
    keys: KEYS,
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

  function clearSongStatus() {
    if (!state.activeSong) return;
    state.activeSong = null;
    state.songTimers.forEach((timer) => window.clearTimeout(timer));
    state.songTimers = [];
    songButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
  }

  function stopSong() {
    const hadSong = Boolean(state.activeSong);
    clearSongStatus();
    setStatus(hadSong ? "Demo stopped" : `Selected: ${state.selectedChord}`);
  }

  function markNote(noteName, velocity, duration, scheduled) {
    const key = keyByNote[noteName];
    if (!key) return;

    const center = renderer.keyCenter(noteName);
    const color = renderer.colorForNote(noteName);
    state.activeNotes[noteName] = {
      time: performance.now(),
      duration,
      velocity
    };
    state.ripples.push({ time: performance.now(), x: center.x, y: center.y, color, velocity });
    state.noteBursts.push({
      time: performance.now(),
      x: center.x,
      y: center.y,
      color,
      velocity,
      noteIndex: key.index
    });

    if (!scheduled) {
      setStatus(`Played ${noteName}`);
    }
  }

  function playNote(noteName, velocity = 0.84, duration = 620, scheduled = false) {
    if (!keyByNote[noteName]) return;
    clearSongStatus();
    markNote(noteName, velocity, duration, scheduled);
    const center = renderer.keyCenter(noteName);
    audio.playNote(noteName, velocity, duration, center.x);
  }

  function playNoteForSong(noteName, velocity = 0.82, duration = 560, songName = null) {
    if (songName && state.activeSong !== songName) return;
    if (!keyByNote[noteName]) return;
    markNote(noteName, velocity, duration, true);
    const center = renderer.keyCenter(noteName);
    audio.playNote(noteName, velocity, duration, center.x);
  }

  function playChord(chordName = state.selectedChord, velocity = 0.82) {
    const chord = CHORDS[chordName];
    if (!chord) return;

    audio.ensureAudio();
    clearSongStatus();
    setSelectedChord(chordName);
    setStatus(`Playing ${chordName}`);
    chord.forEach((noteName, index) => {
      window.setTimeout(() => playNoteForSong(noteName, velocity, 820, null), index * 42);
    });
  }

  function playSong(songName) {
    const song = SONGS[songName];
    if (!song) return;

    audio.ensureAudio();
    clearSongStatus();
    state.activeSong = songName;
    setStatus(`Playing ${song.label}`);
    songButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.song === songName));
    });

    song.events.forEach((event) => {
      const timer = window.setTimeout(() => {
        if (state.activeSong !== songName) return;
        event.notes.forEach((noteName) => {
          playNoteForSong(noteName, event.velocity || 0.82, event.duration || 560, songName);
        });
      }, event.delay);
      state.songTimers.push(timer);
    });

    const endDelay = Math.max(...song.events.map((event) => event.delay + (event.duration || 0))) + 850;
    const endTimer = window.setTimeout(() => {
      if (state.activeSong === songName) {
        clearSongStatus();
        setStatus(`Finished ${song.label}`);
      }
    }, endDelay);
    state.songTimers.push(endTimer);
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function handlePointerPlay(event, force = false) {
    const point = pointerPosition(event);
    const key = renderer.hitTest(point.x, point.y);
    if (!key) return;
    if (!force && key.note === state.lastPointerNote) return;

    state.lastPointerNote = key.note;
    const rect = state.keyRects[key.note];
    const depth = rect ? Math.max(0, Math.min(1, (point.y - rect.y) / rect.height)) : 0.7;
    const velocity = Math.min(1.1, 0.62 + depth * 0.42);
    playNote(key.note, velocity, 680);
  }

  function bindEvents() {
    chordButtons.forEach((button) => {
      button.addEventListener("click", () => playChord(button.dataset.chord, 0.84));
    });

    songButtons.forEach((button) => {
      button.addEventListener("click", () => playSong(button.dataset.song));
    });

    stopButton.addEventListener("click", stopSong);

    canvas.addEventListener("pointerdown", (event) => {
      canvas.setPointerCapture(event.pointerId);
      state.pointerDown = true;
      state.lastPointerNote = null;
      handlePointerPlay(event, true);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!state.pointerDown) return;
      handlePointerPlay(event);
    });

    function endPointer() {
      state.pointerDown = false;
      state.lastPointerNote = null;
    }

    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);
    canvas.addEventListener("pointerleave", endPointer);

    window.addEventListener("keydown", (event) => {
      if (event.repeat) return;

      if (KEYBOARD_MAP[event.code]) {
        event.preventDefault();
        playNote(KEYBOARD_MAP[event.code], 0.86, 700);
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        playChord(state.selectedChord, 0.88);
        return;
      }

      if (event.code === "Escape") {
        event.preventDefault();
        stopSong();
      }
    });

    window.addEventListener("resize", renderer.resize);
    window.addEventListener("blur", () => {
      state.pointerDown = false;
      state.lastPointerNote = null;
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
