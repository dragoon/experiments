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

  function createRenderer({ canvas, state, strings }) {
    ensureRoundRect();

    const ctx = canvas.getContext("2d");

    function resize() {
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.width = window.innerWidth;
      state.height = window.innerHeight;
      canvas.width = Math.round(state.width * state.dpr);
      canvas.height = Math.round(state.height * state.dpr);
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

      const compact = state.height < 560 || state.width < 760;
      const top = compact ? Math.max(150, state.height * 0.24) : Math.max(150, state.height * 0.28);
      const bottom = compact ? Math.max(82, state.height * 0.18) : Math.max(96, state.height * 0.19);
      const playable = Math.max(180, state.height - top - bottom);
      const gap = playable / (strings.length - 1);
      state.stringY = strings.map((_, index) => top + gap * index);
    }

    function colorForString(index) {
      if (index < 2) return "242,193,78";
      if (index < 4) return "139,214,111";
      return "69,214,197";
    }

    function drawBackground(now) {
      const w = state.width;
      const h = state.height;
      ctx.clearRect(0, 0, w, h);

      const base = ctx.createLinearGradient(0, 0, 0, h);
      base.addColorStop(0, "#020507");
      base.addColorStop(0.43, "#071218");
      base.addColorStop(1, "#020305");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i += 1) {
        const x = w * (0.08 + i * 0.076);
        ctx.beginPath();
        ctx.moveTo(x, h * 0.18);
        ctx.lineTo(x, h * 0.86);
        ctx.stroke();
      }
      ctx.restore();

      let totalEnergy = 0;
      for (let i = state.noteBursts.length - 1; i >= 0; i -= 1) {
        const burst = state.noteBursts[i];
        const age = now - burst.time;
        if (age > 1300) {
          state.noteBursts.splice(i, 1);
          continue;
        }

        const t = age / 1300;
        const fade = Math.pow(1 - t, 1.4) * burst.velocity;
        totalEnergy += fade;
        const color = burst.color;

        const wash = ctx.createRadialGradient(
          burst.x,
          burst.y,
          0,
          burst.x,
          burst.y,
          220 + t * 260
        );
        wash.addColorStop(0, `rgba(${color}, ${0.14 * fade})`);
        wash.addColorStop(0.52, `rgba(${color}, ${0.055 * fade})`);
        wash.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.globalAlpha = 0.16 * fade;
        ctx.strokeStyle = `rgba(${color}, 1)`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        const waveY = burst.y + Math.sin(t * Math.PI * 2) * 12;
        ctx.moveTo(0, waveY);
        for (let x = 0; x <= w; x += 42) {
          const y = waveY + Math.sin(x * 0.012 + t * 8 + burst.stringIndex) * 9 * (1 - t);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      const centerX = w * 0.5;
      const centerY = h * 0.52;
      const radius = Math.min(w, h) * (0.2 + Math.min(totalEnergy, 2.3) * 0.012);
      const aperture = ctx.createRadialGradient(centerX, centerY, radius * 0.12, centerX, centerY, radius * 1.85);
      aperture.addColorStop(0, `rgba(1, 2, 3, ${0.86 - Math.min(totalEnergy, 2) * 0.04})`);
      aperture.addColorStop(0.45, "rgba(4, 9, 11, 0.72)");
      aperture.addColorStop(1, "rgba(4, 18, 20, 0)");
      ctx.fillStyle = aperture;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 1.75, radius * 1.04, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.globalAlpha = 0.16 + Math.min(totalEnergy, 2) * 0.035;
      ctx.strokeStyle = "rgba(242, 193, 78, 0.52)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radius * (1.88 + i * 0.2), radius * (1.17 + i * 0.12), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    function stringDisplacement(stringIndex, x, now) {
      let total = 0;
      const plucks = state.plucks[stringIndex];
      for (let i = plucks.length - 1; i >= 0; i -= 1) {
        const pluck = plucks[i];
        const age = now - pluck.time;
        if (age > 2200) {
          plucks.splice(i, 1);
          continue;
        }

        const decay = Math.exp(-age / 720);
        const dist = Math.abs(x - pluck.x);
        const spread = 96 + age * 0.42;
        const local = Math.exp(-(dist * dist) / (2 * spread * spread));
        const travel = Math.sin(age * (0.032 + stringIndex * 0.003) - dist * 0.024);
        const body = Math.sin((x / Math.max(1, state.width)) * Math.PI) * Math.sin(age * 0.038 + stringIndex);
        total += (travel * 0.72 + body * 0.45) * local * decay * pluck.amplitude;
      }
      return total;
    }

    function stringPoints(stringIndex, now) {
      const w = state.width;
      const baseY = state.stringY[stringIndex];
      const segments = Math.max(160, Math.floor(w / 7));
      const points = [];

      for (let i = 0; i <= segments; i += 1) {
        const x = (w / segments) * i;
        points.push({ x, y: baseY + stringDisplacement(stringIndex, x, now) });
      }

      return points;
    }

    function drawSmoothPath(points) {
      if (points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i += 1) {
        const midX = (points[i].x + points[i + 1].x) * 0.5;
        const midY = (points[i].y + points[i + 1].y) * 0.5;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }
      const last = points[points.length - 1];
      const previous = points[points.length - 2];
      ctx.quadraticCurveTo(previous.x, previous.y, last.x, last.y);
    }

    function drawStrings(now) {
      const w = state.width;
      strings.forEach((string, index) => {
        const baseY = state.stringY[index];
        const points = stringPoints(index, now);
        const glow = state.plucks[index].length ? 0.42 : 0.1;

        const gradient = ctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0, "rgba(255,255,255,0.22)");
        gradient.addColorStop(0.16, string.color);
        gradient.addColorStop(0.5, "#fff8d6");
        gradient.addColorStop(0.84, string.color);
        gradient.addColorStop(1, "rgba(255,255,255,0.22)");

        ctx.save();
        ctx.shadowColor = string.color;
        ctx.shadowBlur = 10 + glow * 18;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        drawSmoothPath(points);
        ctx.strokeStyle = "rgba(0,0,0,0.42)";
        ctx.lineWidth = string.thickness + 5;
        ctx.stroke();

        drawSmoothPath(points);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = string.thickness;
        ctx.stroke();

        drawSmoothPath(points);
        ctx.strokeStyle = `rgba(${string.rgb}, ${0.28 + glow * 0.26})`;
        ctx.lineWidth = Math.max(1, string.thickness * 0.46);
        ctx.stroke();

        ctx.fillStyle = "rgba(245,240,223,0.72)";
        ctx.font = "700 12px Inter, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 0;
        ctx.fillText(string.name, 18, baseY);
        ctx.restore();
      });
    }

    function drawRipples(now) {
      for (let i = state.ripples.length - 1; i >= 0; i -= 1) {
        const ripple = state.ripples[i];
        const age = now - ripple.time;
        if (age > 1050) {
          state.ripples.splice(i, 1);
          continue;
        }

        const t = age / 1050;
        const alpha = (1 - t) * 0.58 * ripple.velocity;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = `rgba(${ripple.color}, 1)`;
        ctx.lineWidth = 2.2 * (1 - t) + 0.8;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, 12 + t * 132, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = `rgba(${ripple.color}, 0.22)`;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, 7 + t * 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawBridgeAndNut() {
      const top = state.stringY[0] - 34;
      const bottom = state.stringY[5] + 34;
      const leftX = Math.max(44, state.width * 0.06);
      const rightX = Math.min(state.width - 44, state.width * 0.94);

      ctx.save();
      ctx.fillStyle = "rgba(8, 8, 8, 0.72)";
      ctx.strokeStyle = "rgba(255,255,255,0.17)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(leftX - 13, top, 26, bottom - top, 6);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(rightX - 18, top - 6, 36, bottom - top + 12, 7);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    function drawFrame() {
      const now = performance.now();
      drawBackground(now);
      drawBridgeAndNut();
      drawRipples(now);
      drawStrings(now);
    }

    return { resize, drawFrame, colorForString };
  }

  window.GuitarRenderer = { createRenderer };
})(window);
