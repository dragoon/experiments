(function audioModule(window) {
  "use strict";

  function createAudioEngine({ state, keys, notify }) {
    const keyByNote = keys.reduce((map, key) => {
      map[key.note] = key;
      return map;
    }, {});

    function ensureAudio() {
      if (!state.audioContext) {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) {
          notify("Audio is not supported here");
          return null;
        }

        state.audioContext = new AudioContextCtor();
        state.master = state.audioContext.createGain();
        state.compressor = state.audioContext.createDynamicsCompressor();
        state.master.gain.value = 0.62;
        state.compressor.threshold.value = -22;
        state.compressor.knee.value = 22;
        state.compressor.ratio.value = 7;
        state.compressor.attack.value = 0.004;
        state.compressor.release.value = 0.22;
        state.master.connect(state.compressor);
        state.compressor.connect(state.audioContext.destination);
      }

      if (state.audioContext.state === "suspended") {
        state.audioContext.resume();
      }

      if (!state.audioUnlocked) {
        state.audioUnlocked = true;
        notify("Audio ready");
      }

      return state.audioContext;
    }

    function createHammerNoise(audio, destination, when, velocity) {
      const sampleRate = audio.sampleRate;
      const length = Math.floor(sampleRate * 0.032);
      const buffer = audio.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 4);
      }

      const source = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();
      filter.type = "bandpass";
      filter.frequency.value = 2400;
      filter.Q.value = 0.7;
      gain.gain.setValueAtTime(0.022 * velocity, when);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.032);
      source.buffer = buffer;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      source.start(when);
      source.stop(when + 0.04);
    }

    function playNote(noteName, velocity = 0.82, duration = 580, x = state.width * 0.5) {
      const audio = ensureAudio();
      const key = keyByNote[noteName];
      if (!audio || !state.master || !key) return;

      const when = audio.currentTime;
      const release = Math.max(0.42, duration / 1000);
      const frequency = key.frequency;
      const panValue = ((x / Math.max(1, state.width)) - 0.5) * 0.52;
      const filter = audio.createBiquadFilter();
      const output = audio.createGain();
      const pan = typeof audio.createStereoPanner === "function" ? audio.createStereoPanner() : null;

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(5200 + frequency * 1.15, when);
      filter.frequency.exponentialRampToValueAtTime(1200 + frequency * 0.62, when + release * 0.82);
      filter.Q.value = 0.62;

      output.gain.setValueAtTime(0.0001, when);
      output.gain.exponentialRampToValueAtTime(0.21 * velocity, when + 0.012);
      output.gain.exponentialRampToValueAtTime(0.09 * velocity, when + 0.22);
      output.gain.exponentialRampToValueAtTime(0.0001, when + release + 0.92);

      [
        { type: "triangle", ratio: 1, gain: 0.84, detune: -1.8 },
        { type: "sine", ratio: 2, gain: 0.22, detune: 2.4 },
        { type: "sine", ratio: 3, gain: 0.09, detune: -3.8 }
      ].forEach((voice) => {
        const oscillator = audio.createOscillator();
        const voiceGain = audio.createGain();
        oscillator.type = voice.type;
        oscillator.frequency.setValueAtTime(frequency * voice.ratio, when);
        oscillator.detune.setValueAtTime(voice.detune, when);
        oscillator.detune.linearRampToValueAtTime(voice.detune * 0.22, when + 0.28);
        voiceGain.gain.value = voice.gain;
        oscillator.connect(voiceGain);
        voiceGain.connect(filter);
        oscillator.start(when);
        oscillator.stop(when + release + 1);
      });

      if (pan) {
        pan.pan.value = panValue;
        filter.connect(output);
        output.connect(pan);
        pan.connect(state.master);
        createHammerNoise(audio, pan, when, velocity);
      } else {
        filter.connect(output);
        output.connect(state.master);
        createHammerNoise(audio, state.master, when, velocity);
      }
    }

    return { ensureAudio, playNote };
  }

  window.PianoAudio = { createAudioEngine };
})(window);
