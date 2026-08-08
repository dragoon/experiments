(function audioModule(window) {
  "use strict";

  function createAudioEngine({ state, strings, notify }) {
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
        state.master.gain.value = 0.72;
        state.compressor.threshold.value = -20;
        state.compressor.knee.value = 24;
        state.compressor.ratio.value = 8;
        state.compressor.attack.value = 0.004;
        state.compressor.release.value = 0.18;
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

    function noteFrequency(stringIndex, fret) {
      return strings[stringIndex].frequency * Math.pow(2, fret / 12);
    }

    function createPickClick(audio, destination, when, velocity) {
      const sampleRate = audio.sampleRate;
      const length = Math.floor(sampleRate * 0.025);
      const buffer = audio.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
      }

      const source = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();
      filter.type = "highpass";
      filter.frequency.value = 1800;
      gain.gain.setValueAtTime(0.03 * velocity, when);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.025);
      source.buffer = buffer;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      source.start(when);
      source.stop(when + 0.03);
    }

    function playTone(stringIndex, fret, velocity, x) {
      const audio = ensureAudio();
      if (!audio || !state.master) return;

      const when = audio.currentTime;
      const frequency = noteFrequency(stringIndex, fret);
      const panValue = ((x / Math.max(1, state.width)) - 0.5) * 0.5;
      const output = audio.createGain();
      const filter = audio.createBiquadFilter();
      const pan = typeof audio.createStereoPanner === "function" ? audio.createStereoPanner() : null;

      output.gain.setValueAtTime(0.0001, when);
      output.gain.exponentialRampToValueAtTime(0.18 * velocity, when + 0.008);
      output.gain.exponentialRampToValueAtTime(0.06 * velocity, when + 0.12);
      output.gain.exponentialRampToValueAtTime(0.0001, when + 2.15);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(3400 + frequency * 2, when);
      filter.frequency.exponentialRampToValueAtTime(520 + frequency * 0.9, when + 1.65);
      filter.Q.value = 0.78;

      [
        { type: "triangle", ratio: 1, gain: 0.72, detune: -2 },
        { type: "sine", ratio: 2, gain: 0.21, detune: 3 },
        { type: "sine", ratio: 3, gain: 0.10, detune: -5 }
      ].forEach((voice) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = voice.type;
        oscillator.frequency.setValueAtTime(frequency * voice.ratio, when);
        oscillator.detune.setValueAtTime(voice.detune, when);
        oscillator.detune.linearRampToValueAtTime(voice.detune * 0.25, when + 0.3);
        gain.gain.value = voice.gain;
        oscillator.connect(gain);
        gain.connect(filter);
        oscillator.start(when);
        oscillator.stop(when + 2.2);
      });

      if (pan) {
        pan.pan.value = panValue;
        filter.connect(output);
        output.connect(pan);
        pan.connect(state.master);
        createPickClick(audio, pan, when, velocity);
      } else {
        filter.connect(output);
        output.connect(state.master);
        createPickClick(audio, state.master, when, velocity);
      }
    }

    return { ensureAudio, noteFrequency, playTone };
  }

  window.GuitarAudio = { createAudioEngine };
})(window);
