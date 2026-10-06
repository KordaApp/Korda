export function initServersCarousel(trackId, containerId, servers) {
  const track = document.getElementById(trackId);
  const container = document.getElementById(containerId);

  if (!track || !container || !servers.length) return;

  // -------- Render base --------
  const itemHTML = (s) => `
    <div class="server-item" data-id="${s.id}" title="${s.name}">
      ${s.icon
        ? `<img src="${s.icon}" alt="${s.name}" draggable="false">`
        : s.name.slice(0, 2).toUpperCase()}
    </div>
  `;

  // Repete o suficiente pra encher 3x a largura do container
  const placeholder = servers.map(itemHTML).join("");
  track.innerHTML = placeholder; // 1 cópia pra medir

  requestAnimationFrame(() => {
    const sampleItem = track.querySelector(".server-item");
    if (!sampleItem) return;

    const gap = 10;
    const itemW = sampleItem.offsetWidth + gap;
    const setW = itemW * servers.length;
    const containerW = container.offsetWidth;

    const copies = Math.max(3, Math.ceil((containerW * 3) / setW) + 1);
    track.innerHTML = Array(copies).fill(placeholder).join("");

    // -------- Estado --------
    // Começa no meio (segunda cópia) pra poder arrastar pros dois lados
    let offset = -setW * Math.floor(copies / 2);
    let velocity = 0;
    let isDragging = false;
    let startX = 0;
    let startOffset = 0;
    let moved = 0;
    let rafId = null;

    function render() {
      track.style.transform = `translate3d(${offset}px, 0, 0)`;
    }

    function normalize() {
      // Mantém o offset dentro de [-(copies-1)*setW, 0]
      const totalW = setW * copies;
      const minOffset = -(totalW - setW); // deixa pelo menos 1 cópia visível à direita
      if (offset > 0) offset -= setW;
      if (offset < minOffset) offset += setW;
    }

    function applyInertia() {
      if (Math.abs(velocity) < 0.4) { velocity = 0; return; }
      offset += velocity;
      velocity *= 0.92;
      normalize();
      render();
      rafId = requestAnimationFrame(applyInertia);
    }

    // -------- Pointer Events --------
    container.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return; // só botão esquerdo
      isDragging = true;
      moved = 0;
      startX = e.clientX;
      startOffset = offset;
      velocity = 0;
      container.classList.add("dragging");
      container.setPointerCapture(e.pointerId);
      if (rafId) cancelAnimationFrame(rafId);
    });

    container.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      moved = Math.abs(dx);
      offset = startOffset + dx;
      normalize();
      render();
    });

    container.addEventListener("pointerup", (e) => {
      if (!isDragging) return;
      isDragging = false;
      container.classList.remove("dragging");

      // Inércia baseada na velocidade do último movimento
      const dx = e.clientX - startX;
      velocity = dx * 0.4;
      rafId = requestAnimationFrame(applyInertia);
    });

    container.addEventListener("pointercancel", () => {
      isDragging = false;
      container.classList.remove("dragging");
    });

    // -------- Clique nos servidores --------
    track.addEventListener("click", (e) => {
      // Se o usuário arrastou, ignora o clique
      if (moved > 6) return;

      const item = e.target.closest(".server-item");
      if (!item) return;

      // Atualiza visual
      track.querySelectorAll(".server-item.active")
        .forEach(el => el.classList.remove("active"));
      item.classList.add("active");

      const id = item.dataset.id;
      const server = servers.find(s => s.id === id);
      console.log("Servidor selecionado:", server);

      // Centraliza o servidor clicado
      centerOn(item);
    });

    function centerOn(item) {
      const itemLeft = item.offsetLeft; // dentro do track
      const itemCenter = itemLeft + item.offsetWidth / 2;
      const containerCenter = container.offsetWidth / 2;
      const target = containerCenter - itemCenter;

      // Anima suavemente até o alvo
      animateTo(target);
    }

    function animateTo(target) {
      if (rafId) cancelAnimationFrame(rafId);
      const step = () => {
        const diff = target - offset;
        if (Math.abs(diff) < 0.5) { offset = target; render(); return; }
        offset += diff * 0.18;
        normalize();
        render();
        rafId = requestAnimationFrame(step);
      };
      step();
    }

    // Scroll horizontal com a roda do mouse (opcional, ajuda no desktop)
    container.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        offset -= e.deltaX;
        normalize();
        render();
      }
    }, { passive: false });

    render();
  });
        }
