(() => {
  "use strict";

  const DROP_AT = new Date("2026-10-16T00:00:00-10:00");
  const TICK_VOL = 0.1;

  const countdown = document.getElementById("countdown");
  const muteBtn = document.getElementById("muteBtn");
  const site = document.querySelector(".site");

  let muted = localStorage.getItem("emotohi-muted") === "1";
  let soundOn = false;
  let lastSec = null;

  const tick = new Audio("sounds/tick.mp3");
  tick.preload = "auto";
  tick.volume = TICK_VOL;

  function pad(n) {
    return String(Math.max(0, n)).padStart(2, "0");
  }

  function syncMute() {
    muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    muteBtn.setAttribute("aria-label", muted ? "Unmute" : "Mute");
    muteBtn.title = muted ? "Unmute" : "Mute";
  }

  function unlockSound() {
    if (soundOn) return;
    soundOn = true;
    tick.volume = 0;
    const p = tick.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        tick.pause();
        tick.currentTime = 0;
        tick.volume = TICK_VOL;
      }).catch(() => {
        tick.volume = TICK_VOL;
      });
    } else {
      tick.volume = TICK_VOL;
    }
  }

  function playTick() {
    if (!soundOn || muted) return;
    try {
      tick.pause();
      tick.currentTime = 0;
      tick.volume = TICK_VOL;
      const p = tick.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (_) {}
  }

  function update() {
    const diff = DROP_AT.getTime() - Date.now();

    if (diff <= 0) {
      site.classList.add("live");
      ["days", "hours", "mins", "secs"].forEach((u) => {
        const el = countdown.querySelector(`[data-unit="${u}"]`);
        if (el) el.textContent = "00";
      });
      countdown.setAttribute("aria-label", "Drop is live");
      return;
    }

    const total = Math.floor(diff / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (lastSec !== null && secs !== lastSec) playTick();
    lastSec = secs;

    const map = { days, hours, mins, secs };
    Object.entries(map).forEach(([unit, value]) => {
      const el = countdown.querySelector(`[data-unit="${unit}"]`);
      if (el) el.textContent = pad(value);
    });

    countdown.setAttribute(
      "aria-label",
      `${days} days, ${hours} hours, ${mins} minutes, ${secs} seconds until drop`
    );
  }

  syncMute();
  update();
  setInterval(update, 250);

  site.addEventListener("pointerdown", unlockSound, { once: true, passive: true });

  muteBtn.addEventListener("click", () => {
    unlockSound();
    muted = !muted;
    localStorage.setItem("emotohi-muted", muted ? "1" : "0");
    syncMute();
  });
})();
