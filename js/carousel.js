export function initCarousel(trackEl, containerEl, servers, onSelect) {
  if (!servers.length) { trackEl.innerHTML = ""; return; }

  const itemHTML = (s, i) => `
    <div class="server-item" data-id="${s.id}" data-index="${i}" title="${s.name || ''}">
      ${s.icon ? `<img src="${s.icon}" alt="" draggable="false">` : (s.name || "?").slice(0, 2).toUpperCase()}
    </div>`;

  const set = servers.map(itemHTML).join("");
  trackEl.innerHTML = set + set + set;

  requestAnimationFrame(() => {
    const firstItem = trackEl.querySelector(".server-item");
    if (!firstItem) return;

    const GAP = 10;
    const itemW = firstItem.offsetWidth;
    const step = itemW + GAP;
    const setW = servers.length * step;

    let offset = 0, dragging = false, startX = 0, startOffset = 0;
    let lastX = 0, lastT = 0, velocity = 0, moved = 0, rafId = null;

    function render() { trackEl.style.transform = `translate3d(${offset}px, 0, 0)`; }
    function clampOffset() {
      while (offset > 0) offset -= setW;
      while (offset < -2 * setW) offset += setW;
    }
    function animateTo(target) {
      if (rafId) cancelAnimationFrame(rafId);
      const stepFn = () => {
        const diff = target - offset;
        if (Math.abs(diff) < 0.5) { offset = target; clampOffset(); render(); rafId = null; return; }
        offset += diff * 0.2;
        render();
        rafId = requestAnimationFrame(stepFn);
      };
      stepFn();
    }
    function inertiaLoop() {
      if (Math.abs(velocity) < 0.4) {
        const snap = Math.round(offset / step) * step;
        animateTo(snap);
        return;
      }
      offset += velocity;
      velocity *= 0.93;
      clampOffset();
      render();
      rafId = requestAnimationFrame(inertiaLoop);
    }

    containerEl.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      dragging = true; moved = 0;
      startX = e.clientX; startOffset = offset;
      lastX = e.clientX; lastT = performance.now();
      velocity = 0;
      containerEl.classList.add("dragging");
      try { containerEl.setPointerCapture(e.pointerId); } catch (_) {}
    });

    containerEl.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      offset = startOffset + dx;
      clampOffset();
      render();
      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) {
        velocity = ((e.clientX - lastX) / dt) * 16;
        lastX = e.clientX; lastT = now;
      }
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      containerEl.classList.remove("dragging");
      try { containerEl.releasePointerCapture(e.pointerId); } catch (_) {}
      if (Math.abs(velocity) > 2) rafId = requestAnimationFrame(inertiaLoop);
      else { const snap = Math.round(offset / step) * step; animateTo(snap); }
    }

    containerEl.addEventListener("pointerup", endDrag);
    containerEl.addEventListener("pointercancel", endDrag);

    trackEl.addEventListener("click", (e) => {
      if (moved > 8) return;
      const item = e.target.closest(".server-item");
      if (!item) return;
      const id = item.dataset.id;
      const idx = +item.dataset.index;
      trackEl.querySelectorAll(".server-item.active").forEach(el => el.classList.remove("active"));
      trackEl.querySelectorAll(`.server-item[data-id="${id}"]`).forEach(el => el.classList.add("active"));
      const itemX = idx * step;
      const containerCx = containerEl.offsetWidth / 2;
      const target = containerCx - itemW / 2 - itemX;
      animateTo(target);
      const server = servers.find(s => s.id === id);
      if (server) onSelect?.(server);
    });

    containerEl.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        offset -= e.deltaX * 0.5;
        clampOffset();
        render();
      }
    }, { passive: false });

    render();
  });
}