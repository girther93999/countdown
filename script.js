(() => {
  "use strict";

  const REAL_DROP_AT = new Date("2026-10-16T00:00:00-10:00");
  // Real-world SFX (BigSoundBank CC0 + firecrackers) — not UI/computer clicks
  const TICK_VOL = 0.18;
  const SFX_VOL = 0.28;
  const FINAL_VOL = 0.42;

  const site = document.getElementById("site");
  const countdown = document.getElementById("countdown");
  const muteBtn = document.getElementById("muteBtn");
  const finalStage = document.getElementById("finalStage");
  const finalNum = document.getElementById("finalNum");
  const finalLabel = document.getElementById("finalLabel");
  const finalBarFill = document.getElementById("finalBarFill");
  const finalBar = finalBarFill ? finalBarFill.parentElement : null;
  const liveStage = document.getElementById("liveStage");
  const fwHost = document.getElementById("fwHost");
  let dropAt = new Date(REAL_DROP_AT.getTime());
  let muted = localStorage.getItem("emotohi-muted") === "1";
  let soundOn = false;
  let lastDisplaySec = null;
  let lastTotalSec = null;
  let phase = "waiting";
  let goldStarted = false;
  let celebrateTimer = null;
  let confettiBurst = null;
  let fireworks = null;
  let soundTimers = [];
  const firedMarks = new Set();

  const sounds = {
    tick: load("sounds/tick.mp3", TICK_VOL), // BigSoundBank real clock
    mild: load("sounds/mild.mp3", SFX_VOL),
    party: load("sounds/party.mp3", 0.4),
    gold: load("sounds/gold.mp3", 0.55), // deep hit for last 10
    impact: load("sounds/impact.mp3", 0.6), // cinematic boom at 10
    boom: load("sounds/boom.mp3", 0.5),
    champagne: load("sounds/champagne.mp3", 0.5),
    cheer: load("sounds/cheer.mp3", 0.4),
    crowd: load("sounds/crowd.mp3", 0.45),
    applause: load("sounds/applause.mp3", 0.42),
    fwSky: load("sounds/fw-sky.mp3", 0.55),
    fwMulti: load("sounds/fw-multi.mp3", 0.55),
    fwBang: load("sounds/fw-bang.mp3", 0.55),
    fwWhoosh: load("sounds/fw-whoosh.mp3", 0.5),
    fwClear: load("sounds/fw-clear.mp3", 0.52),
  };

  const fwFiles = [
    "sounds/fw-sky.mp3",
    "sounds/fw-multi.mp3",
    "sounds/fw-bang.mp3",
    "sounds/fw-whoosh.mp3",
    "sounds/fw-clear.mp3",
    "sounds/boom.mp3",
  ];

  function load(src, volume) {
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = volume;
    return a;
  }

  function pad(n) {
    return String(Math.max(0, n)).padStart(2, "0");
  }

  function canFx() {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function canConfetti() {
    return typeof confetti === "function" && canFx();
  }

  function stopAllSounds() {
    soundTimers.forEach(clearTimeout);
    soundTimers = [];
    Object.values(sounds).forEach((a) => {
      try {
        a.pause();
        a.currentTime = 0;
      } catch (_) {}
    });
  }

  function later(fn, ms) {
    const id = setTimeout(fn, ms);
    soundTimers.push(id);
    return id;
  }

  function play(audio, volume) {
    if (!soundOn || muted) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      if (typeof volume === "number") audio.volume = volume;
      const p = audio.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (_) {}
  }

  function unlockSound() {
    if (soundOn) return;
    soundOn = true;
    const a = sounds.tick;
    const prev = a.volume;
    a.volume = 0;
    const p = a.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        a.pause();
        a.currentTime = 0;
        a.volume = prev;
      }).catch(() => {
        a.volume = prev;
      });
    } else {
      a.volume = prev;
    }
  }

  function syncMute() {
    muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    muteBtn.setAttribute("aria-label", muted ? "Unmute" : "Mute");
    muteBtn.title = muted ? "Unmute" : "Mute";
    if (fireworks && fireworks.updateOptions) {
      fireworks.updateOptions({
        sound: { enabled: soundOn && !muted, files: fwFiles, volume: { min: 18, max: 55 } },
      });
    }
  }

  function getFireworksClass() {
    if (!window.Fireworks) return null;
    return window.Fireworks.Fireworks || window.Fireworks.default || null;
  }

  function ensureFireworks() {
    const FW = getFireworksClass();
    if (!FW || fireworks) return fireworks;
    fireworks = new FW(fwHost, {
      autoresize: true,
      opacity: 0.92,
      acceleration: 1.05,
      friction: 0.97,
      gravity: 1.4,
      particles: 95,
      traceLength: 4,
      traceSpeed: 12,
      explosion: 9,
      intensity: 48,
      flickering: 55,
      lineStyle: "round",
      hue: { min: 35, max: 55 },
      rocketsPoint: { min: 15, max: 85 },
      lineWidth: { explosion: { min: 1, max: 4 }, trace: { min: 1, max: 2 } },
      brightness: { min: 55, max: 90 },
      decay: { min: 0.012, max: 0.028 },
      mouse: { click: false, move: false, max: 1 },
      sound: {
        enabled: soundOn && !muted,
        files: fwFiles,
        volume: { min: 18, max: 55 },
      },
    });
    return fireworks;
  }

  function stopFireworks() {
    if (fireworks) {
      try {
        fireworks.stop();
        fireworks.clear();
      } catch (_) {}
    }
    fwHost.classList.remove("is-on");
  }

  // Side confetti for waiting milestones
  function mildEffect() {
    play(sounds.mild, 0.32); // real glass / cork clink
    if (!canConfetti()) return;
    confetti({
      particleCount: 34,
      angle: 55,
      spread: 46,
      startVelocity: 30,
      gravity: 0.85,
      ticks: 200,
      origin: { x: 0, y: 0.88 },
      colors: ["#ffffff", "#d0d0d0", "#a8a8a8"],
    });
    confetti({
      particleCount: 34,
      angle: 125,
      spread: 46,
      startVelocity: 30,
      gravity: 0.85,
      ticks: 200,
      origin: { x: 1, y: 0.88 },
      colors: ["#ffffff", "#d0d0d0", "#a8a8a8"],
    });
  }

  function partyEffect() {
    play(sounds.party, 0.4); // real crowd applause (BigSoundBank)
    play(sounds.champagne, 0.45);
    if (!canConfetti()) return;
    const end = Date.now() + 2400;
    (function frame() {
      confetti({
        particleCount: 14,
        angle: 60,
        spread: 62,
        startVelocity: 46,
        gravity: 0.8,
        ticks: 240,
        origin: { x: 0, y: 0.82 },
        colors: ["#ffffff", "#c2a24a", "#cfcfcf"],
      });
      confetti({
        particleCount: 14,
        angle: 120,
        spread: 62,
        startVelocity: 46,
        gravity: 0.8,
        ticks: 240,
        origin: { x: 1, y: 0.82 },
        colors: ["#ffffff", "#c2a24a", "#cfcfcf"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  // Final countdown pulse (visual)
  function pulseFinalNum() {
    finalNum.classList.remove("is-tick");
    void finalNum.offsetWidth;
    finalNum.classList.add("is-tick");
    setTimeout(() => finalNum.classList.remove("is-tick"), 150);
  }

  // Seconds 30 → 11: keep the real clock tick going
  function finalTickFx(n) {
    play(sounds.tick, 0.22);
    pulseFinalNum();
  }

  // Seconds 10 → 1: heavy hits (not a weak pop)
  function goldTickFx(n) {
    const vol = 0.42 + (11 - n) * 0.03; // gets louder as it nears 0
    if (n === 10) play(sounds.impact, 0.65);
    else play(sounds.gold, Math.min(0.72, vol));
    if (n <= 5) play(sounds.fwBang, 0.28);

    if (canConfetti()) {
      confetti({
        particleCount: n <= 5 ? 36 : 22,
        angle: 70,
        spread: 34,
        startVelocity: n <= 5 ? 32 : 24,
        gravity: 1,
        origin: { x: 0.06, y: 0.78 },
        colors: ["#c2a24a", "#e8d48b", "#ffffff"],
      });
      confetti({
        particleCount: n <= 5 ? 36 : 22,
        angle: 110,
        spread: 34,
        startVelocity: n <= 5 ? 32 : 24,
        gravity: 1,
        origin: { x: 0.94, y: 0.78 },
        colors: ["#c2a24a", "#e8d48b", "#ffffff"],
      });
    }
    pulseFinalNum();
  }

  function startConfettiFountains() {
    if (!canConfetti()) return;
    const end = Date.now() + 10000;
    confettiBurst = setInterval(() => {
      if (Date.now() >= end) {
        clearInterval(confettiBurst);
        confettiBurst = null;
        return;
      }
      confetti({
        particleCount: 28,
        angle: 90,
        spread: 75,
        startVelocity: 58,
        gravity: 0.85,
        ticks: 280,
        origin: { x: 0.2, y: 1 },
        colors: ["#c2a24a", "#ffffff", "#e8d48b"],
      });
      confetti({
        particleCount: 28,
        angle: 90,
        spread: 75,
        startVelocity: 58,
        gravity: 0.85,
        ticks: 280,
        origin: { x: 0.8, y: 1 },
        colors: ["#c2a24a", "#ffffff", "#e8d48b"],
      });
      confetti({
        particleCount: 20,
        angle: 90,
        spread: 60,
        startVelocity: 50,
        gravity: 0.9,
        ticks: 260,
        origin: { x: 0.5, y: 1 },
        colors: ["#ffffff", "#c2a24a"],
      });
    }, 260);
  }

  function startFinal() {
    if (phase !== "waiting") return;
    phase = "final";
    goldStarted = false;
    lastDisplaySec = null;
    site.classList.add("is-exiting");
    finalStage.hidden = false;
    requestAnimationFrame(() => finalStage.classList.add("is-on"));
    setTimeout(() => site.classList.add("is-hidden"), 900);
    finalLabel.textContent = "Dropping in";
    finalNum.classList.remove("is-gold");
    finalStage.classList.remove("is-gold-bg");
    if (finalBar) finalBar.classList.remove("is-gold");
  }

  function startCelebrate() {
    if (phase === "celebrate" || phase === "live") return;
    phase = "celebrate";

    stopAllSounds();

    finalNum.textContent = "0";
    finalLabel.textContent = "Live";
    if (finalBarFill) finalBarFill.style.transform = "scaleX(0)";

    // Drop is live: fireworks-forward bed ~10s, then hard stop
    play(sounds.impact, 0.7);
    later(() => play(sounds.fwWhoosh, 0.55), 100);
    later(() => play(sounds.fwBang, 0.6), 180);
    later(() => play(sounds.crowd, 0.5), 250);
    later(() => play(sounds.fwSky, 0.58), 400);
    later(() => play(sounds.fwMulti, 0.58), 650);
    later(() => play(sounds.applause, 0.45), 800);
    later(() => play(sounds.fwClear, 0.55), 1100);
    later(() => play(sounds.fwBang, 0.55), 1500);
    later(() => play(sounds.champagne, 0.4), 1700);
    later(() => play(sounds.fwSky, 0.52), 2100);
    later(() => play(sounds.fwWhoosh, 0.5), 2600);
    later(() => play(sounds.fwMulti, 0.55), 3100);
    later(() => play(sounds.cheer, 0.4), 3400);
    later(() => play(sounds.fwBang, 0.52), 3900);
    later(() => play(sounds.fwClear, 0.5), 4500);
    later(() => play(sounds.crowd, 0.35), 5000);
    later(() => play(sounds.fwSky, 0.48), 5600);
    later(() => play(sounds.fwMulti, 0.5), 6200);
    later(() => play(sounds.fwBang, 0.48), 6900);
    later(() => play(sounds.fwWhoosh, 0.42), 7600);
    later(() => play(sounds.fwClear, 0.42), 8400);
    later(() => play(sounds.fwSky, 0.38), 9200);

    // Real fireworks-js + confetti fountains
    fwHost.classList.add("is-on");
    const fw = ensureFireworks();
    if (fw) {
      try {
        fw.updateOptions({
          sound: { enabled: soundOn && !muted, files: fwFiles, volume: { min: 22, max: 60 } },
          intensity: 55,
          particles: 110,
        });
        fw.start();
      } catch (_) {}
    }
    startConfettiFountains();

    clearTimeout(celebrateTimer);
    celebrateTimer = setTimeout(() => {
      stopAllSounds();
      stopFireworks();
      if (confettiBurst) {
        clearInterval(confettiBurst);
        confettiBurst = null;
      }
      showLive();
    }, 10000);
  }

  function showLive() {
    phase = "live";
    stopAllSounds();
    stopFireworks();
    if (confettiBurst) {
      clearInterval(confettiBurst);
      confettiBurst = null;
    }
    finalStage.classList.remove("is-on");
    liveStage.hidden = false;
    requestAnimationFrame(() => liveStage.classList.add("is-on"));
    setTimeout(() => {
      finalStage.hidden = true;
    }, 900);
  }

  /**
   * Natural timer milestones while people watch:
   * 2:45 → 2:40 fires the 10-min cue
   * 2:35 → 2:30 fires the 30-min celebration
   * Same pattern for 50, 40, 20, 10… and 90, 60, 30…
   */
  function checkMilestones(totalSecs) {
    if (phase !== "waiting" || lastTotalSec === null) return;
    if (lastTotalSec <= totalSecs) return;

    const highestMin = Math.floor(lastTotalSec / 60);
    for (let m = highestMin - (highestMin % 10); m >= 10; m -= 10) {
      const threshold = m * 60;
      if (lastTotalSec > threshold && totalSecs <= threshold) {
        const key = `t-${threshold}`;
        if (firedMarks.has(key)) break;
        firedMarks.add(key);
        if (m % 30 === 0) partyEffect();
        else mildEffect();
        break;
      }
    }
  }

  function updateFinalBar(secondsLeftFloat) {
    if (!finalBarFill) return;
    const t = Math.max(0, Math.min(1, secondsLeftFloat / 30));
    finalBarFill.style.transform = `scaleX(${t})`;
  }

  function update() {
    const diff = dropAt.getTime() - Date.now();
    if (phase === "live") return;

    if (diff <= 0) {
      if (phase === "waiting") startFinal();
      if (phase === "waiting" || phase === "final") {
        finalNum.textContent = "0";
        lastDisplaySec = 0;
        startCelebrate();
      }
      lastTotalSec = 0;
      return;
    }

    const totalSecs = Math.ceil(diff / 1000);

    if (totalSecs <= 30) {
      if (phase === "waiting") startFinal();

      if (phase === "final") {
        const n = totalSecs;
        finalNum.textContent = String(n);
        updateFinalBar(diff / 1000);

        if (n <= 10 && !goldStarted) {
          goldStarted = true;
          finalNum.classList.add("is-gold");
          if (finalBar) finalBar.classList.add("is-gold");
          finalStage.classList.add("is-gold-bg");
        }

        // Keep ticking 30→11; switch to heavy hits 10→1
        if (n > 0 && lastDisplaySec !== n) {
          if (n <= 10) goldTickFx(n);
          else finalTickFx(n);
        }

        lastDisplaySec = n;
      }
    } else if (phase === "waiting") {
      checkMilestones(totalSecs);

      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      if (lastDisplaySec !== null && totalSecs !== lastDisplaySec) {
        play(sounds.tick);
      }

      const map = { days, hours, mins, secs };
      Object.entries(map).forEach(([unit, value]) => {
        const el = countdown.querySelector(`[data-unit="${unit}"]`);
        if (el) el.textContent = pad(value);
      });

      countdown.setAttribute(
        "aria-label",
        `${days} days, ${hours} hours, ${mins} minutes, ${secs} seconds until drop`
      );
      lastDisplaySec = totalSecs;
    }

    lastTotalSec = totalSecs;
  }

  function setSecondsLeft(seconds) {
    const s = Math.max(0, Number(seconds) || 0);
    stopAllSounds();
    stopFireworks();
    if (confettiBurst) {
      clearInterval(confettiBurst);
      confettiBurst = null;
    }
    clearTimeout(celebrateTimer);

    dropAt = new Date(Date.now() + s * 1000);
    phase = "waiting";
    goldStarted = false;
    lastDisplaySec = null;
    lastTotalSec = null;
    firedMarks.clear();

    site.classList.remove("is-exiting", "is-hidden");
    finalStage.hidden = true;
    finalStage.classList.remove("is-on", "is-gold-bg");
    finalNum.classList.remove("is-gold", "is-tick");
    if (finalBar) finalBar.classList.remove("is-gold");
    if (finalBarFill) finalBarFill.style.transform = "scaleX(1)";
    liveStage.hidden = true;
    liveStage.classList.remove("is-on");
    update();
  }

  syncMute();
  update();
  setInterval(update, 100);

  document.addEventListener("pointerdown", unlockSound, { once: true, passive: true });

  muteBtn.addEventListener("click", () => {
    unlockSound();
    muted = !muted;
    localStorage.setItem("emotohi-muted", muted ? "1" : "0");
    syncMute();
    if (muted) {
      stopAllSounds();
      if (fireworks && fireworks.updateOptions) {
        fireworks.updateOptions({ sound: { enabled: false, files: fwFiles } });
      }
    }
  });
})();
