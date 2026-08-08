(function rendererModule(window) {
  "use strict";

  function ensureRoundRect() {
    if (CanvasRenderingContext2D.prototype.roundRect) return;

    CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, width, height, radius) {
      const r = Math.min(radius, width / 2, height / 2);
      this.moveTo(x + r, y);
      this.arcTo(x + width, y, x + width, y + height, r);
      this.arcTo(x + width, y + height, x, y + height, r);
      this.arcTo(x, y + height, x, y, r);
      this.arcTo(x, y, x + width, y, r);
      this.closePath();
    };
  }

  function createRenderer({ canvas, state, keys }) {
    ensureRoundRect();

    const ctx = canvas.getContext("2d");
    const whiteKeys = keys.filter((key) => key.color === "white");
    const keyByNote = keys.reduce((map, key) => {
      map[key.note] = key;
      return map;
    }, {});

    function resize() {
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.width = window.innerWidth;
      state.height = window.innerHeight;
      canvas.width = Math.round(state.width * state.dpr);
      canvas.height = Math.round(state.height * state.dpr);
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      layoutKeys();
    }

    function layoutKeys() {
      const compact = state.width < 760 || state.height < 540;
      const keyboardWidth = Math.min(state.width - 24, compact ? state.width - 18 : 1120);
      const left = (state.width - keyboardWidth) * 0.5;
      const top = compact ? Math.max(128, state.height * 0.34) : Math.max(144, state.height * 0.36);
      const height = Math.min(compact ? state.height * 0.52 : state.height * 0.48, compact ? 310 : 360);
      const whiteWidth = keyboardWidth / whiteKeys.length;
      const blackWidth = Math.max(18, whiteWidth * 0.62);
      const blackHeight = height * 0.62;
      let whiteIndex = 0;

      state.keyRects = {};
      whiteKeys.forEach((key) => {
        state.keyRects[key.note] = {
          x: left + whiteIndex * whiteWidth,
          y: top,
          width: whiteWidth,
          height,
          layer: 0
        };
        whiteIndex += 1;
      });

      whiteIndex = 0;
      keys.forEach((key) => {
        if (key.color === "white") {
          whiteIndex += 1;
          return;
        }

        const x = left + whiteIndex * whiteWidth - blackWidth * 0.5;
        state.keyRects[key.note] = {
          x,
          y: top,
          width: blackWidth,
          height: blackHeight,
          layer: 1
        };
      });
    }

    function colorForNote(noteName) {
      const hueMap = {
        C: "82,221,189",
        D: "126,183,255",
        E: "243,193,95",
        F: "240,122,150",
        G: "156,218,108",
        A: "226,139,255",
        B: "255,156,111"
      };
      return hueMap[noteName.charAt(0)] || "248,242,230";
    }

    function drawBackground(now) {
      const w = state.width;
      const h = state.height;
      ctx.clearRect(0, 0, w, h);

      const base = ctx.createLinearGradient(0, 0, 0, h);
      base.addColorStop(0, "#070911");
      base.addColorStop(0.45, "#12111a");
      base.addColorStop(1, "#050609");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = "rgba(255,255,255,0.085)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 14; i += 1) {
        const x = w * (0.04 + i * 0.074);
        ctx.beginPath();
        ctx.moveTo(x, h * 0.13);
        ctx.lineTo(x, h * 0.92);
        ctx.stroke();
      }
      ctx.restore();

      let energy = 0;
      for (let i = state.noteBursts.length - 1; i >= 0; i -= 1) {
        const burst = state.noteBursts[i];
        const age = now - burst.time;
        if (age > 1500) {
          state.noteBursts.splice(i, 1);
          continue;
        }

        const t = age / 1500;
        const fade = Math.pow(1 - t, 1.55) * burst.velocity;
        energy += fade;
        const wash = ctx.createRadialGradient(burst.x, burst.y, 0, burst.x, burst.y, 190 + t * 320);
        wash.addColorStop(0, `rgba(${burst.color}, ${0.16 * fade})`);
        wash.addColorStop(0.5, `rgba(${burst.color}, ${0.055 * fade})`);
        wash.addColorStop(1, `rgba(${burst.color}, 0)`);
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.globalAlpha = 0.22 * fade;
        ctx.strokeStyle = `rgba(${burst.color}, 1)`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        const y = burst.y - t * 95;
        for (let x = 0; x <= w; x += 34) {
          const waveY = y + Math.sin(x * 0.015 + t * 8 + burst.noteIndex) * 10 * (1 - t);
          if (x === 0) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }
        ctx.stroke();
        ctx.restore();
      }

      const glow = ctx.createRadialGradient(w * 0.5, h * 0.62, 40, w * 0.5, h * 0.62, Math.min(w, h) * 0.88);
      glow.addColorStop(0, `rgba(243,193,95, ${0.09 + Math.min(energy, 2.2) * 0.018})`);
      glow.addColorStop(0.48, "rgba(82,221,189, 0.045)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    }

    function activeAmount(noteName, now) {
      const pressed = state.activeNotes[noteName];
      if (!pressed) return 0;
      const age = now - pressed.time;
      if (age > pressed.duration + 900) {
        delete state.activeNotes[noteName];
        return 0;
      }
      if (age <= 150) return 1;
      return Math.max(0, Math.exp(-(age - 150) / 520));
    }

    function drawWhiteKey(key, rect, now) {
      const active = activeAmount(key.note, now);
      const top = rect.y + active * 5;
      const height = rect.height - active * 5;
      const noteColor = colorForNote(key.note);
      const gradient = ctx.createLinearGradient(0, top, 0, top + height);
      gradient.addColorStop(0, active ? `rgb(${noteColor})` : "#fffaf0");
      gradient.addColorStop(0.18, active ? "#fff8d8" : "#f6ead8");
      gradient.addColorStop(1, active ? "#d9edf0" : "#c8c7be");

      ctx.save();
      ctx.shadowColor = active ? `rgba(${noteColor}, 0.76)` : "rgba(0,0,0,0.34)";
      ctx.shadowBlur = active ? 24 : 11;
      ctx.shadowOffsetY = active ? 0 : 8;
      ctx.beginPath();
      ctx.roundRect(rect.x + 1.5, top, rect.width - 3, height, 7);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = active ? `rgba(${noteColor}, 0.7)` : "rgba(25, 25, 28, 0.42)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = active ? "rgba(6, 11, 14, 0.72)" : "rgba(18, 20, 23, 0.72)";
      ctx.font = "800 12px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(key.name, rect.x + rect.width * 0.5, rect.y + rect.height - 14);
      ctx.restore();
    }

    function drawBlackKey(key, rect, now) {
      const active = activeAmount(key.note, now);
      const top = rect.y + active * 4;
      const height = rect.height - active * 4;
      const noteColor = colorForNote(key.note);
      const gradient = ctx.createLinearGradient(0, top, 0, top + height);
      gradient.addColorStop(0, active ? `rgb(${noteColor})` : "#28242b");
      gradient.addColorStop(0.18, active ? "#4b3942" : "#12131a");
      gradient.addColorStop(1, active ? "#12151d" : "#050609");

      ctx.save();
      ctx.shadowColor = active ? `rgba(${noteColor}, 0.82)` : "rgba(0,0,0,0.55)";
      ctx.shadowBlur = active ? 22 : 14;
      ctx.shadowOffsetY = active ? 0 : 10;
      ctx.beginPath();
      ctx.roundRect(rect.x, top, rect.width, height, 6);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = active ? `rgba(${noteColor}, 0.76)` : "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = active ? "rgba(255, 250, 236, 0.88)" : "rgba(255, 250, 236, 0.68)";
      ctx.font = "800 10px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(key.name, rect.x + rect.width * 0.5, rect.y + rect.height - 10);
      ctx.restore();
    }

    function drawKeyboardDeck() {
      const rects = Object.values(state.keyRects);
      if (!rects.length) return;

      const left = Math.min(...rects.map((rect) => rect.x));
      const top = Math.min(...rects.map((rect) => rect.y));
      const right = Math.max(...rects.map((rect) => rect.x + rect.width));
      const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));

      ctx.save();
      ctx.fillStyle = "rgba(6, 7, 10, 0.86)";
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 1;
      ctx.shadowColor = "rgba(0,0,0,0.46)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 16;
      ctx.beginPath();
      ctx.roundRect(left - 10, top - 18, right - left + 20, bottom - top + 28, 8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    function drawRipples(now) {
      for (let i = state.ripples.length - 1; i >= 0; i -= 1) {
        const ripple = state.ripples[i];
        const age = now - ripple.time;
        if (age > 980) {
          state.ripples.splice(i, 1);
          continue;
        }

        const t = age / 980;
        const alpha = (1 - t) * 0.52 * ripple.velocity;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = `rgba(${ripple.color}, 1)`;
        ctx.lineWidth = 2.3 * (1 - t) + 0.8;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, 10 + t * 112, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = alpha * 0.58;
        ctx.fillStyle = `rgba(${ripple.color}, 0.2)`;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, 5 + t * 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawKeys(now) {
      keys
        .filter((key) => key.color === "white")
        .forEach((key) => drawWhiteKey(key, state.keyRects[key.note], now));

      keys
        .filter((key) => key.color === "black")
        .forEach((key) => drawBlackKey(key, state.keyRects[key.note], now));
    }

    function hitTest(x, y) {
      const blackHit = keys
        .filter((key) => key.color === "black")
        .find((key) => {
          const rect = state.keyRects[key.note];
          return rect && x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
        });
      if (blackHit) return blackHit;

      return keys
        .filter((key) => key.color === "white")
        .find((key) => {
          const rect = state.keyRects[key.note];
          return rect && x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
        }) || null;
    }

    function keyCenter(noteName) {
      const rect = state.keyRects[noteName];
      const key = keyByNote[noteName];
      if (!rect || !key) return { x: state.width * 0.5, y: state.height * 0.62 };
      return {
        x: rect.x + rect.width * 0.5,
        y: rect.y + rect.height * (key.color === "black" ? 0.72 : 0.84)
      };
    }

    function drawFrame() {
      const now = performance.now();
      drawBackground(now);
      drawKeyboardDeck();
      drawKeys(now);
      drawRipples(now);
    }

    return { resize, drawFrame, hitTest, keyCenter, colorForNote };
  }

  window.PianoRenderer = { createRenderer };
})(window);
