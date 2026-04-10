window.addEventListener("DOMContentLoaded", () => {
  renderDashboard();
  renderProyectos();
  renderModulos();
  initBitacora();
  initTabs();
});

function renderDashboard() {
  const grid = document.getElementById("dashboardGrid");
  if (!grid || typeof obtenerDashboard !== "function") return;

  const data = obtenerDashboard();
  grid.innerHTML = "";

  const items = [
    { label: "Total proyectos", valor: data.totalProyectos },
    { label: "Total módulos", valor: data.totalModulos },
    { label: "Última actividad", valor: data.ultimaActividad },
    { label: "Estado general", valor: data.estadoGeneral }
  ];

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "kpi";
    card.innerHTML = `
      <span class="badge">${item.label}</span>
      <strong>${item.valor}</strong>
    `;
    grid.appendChild(card);
  });
}

function renderProyectos() {
  const grid = document.getElementById("proyectosGrid");
  if (!grid || !Array.isArray(PROYECTOS)) return;

  grid.innerHTML = "";
  PROYECTOS.forEach((p) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <h3>${p.nombre}</h3>
      <p>${p.descripcion}</p>
      <a class="btn" href="${p.ruta}">Abrir</a>
    `;
    grid.appendChild(card);
  });
}

function renderModulos() {
  const grid = document.getElementById("modulosGrid");
  if (!grid || !Array.isArray(MODULOS)) return;

  grid.innerHTML = "";
  MODULOS.forEach((m) => {
    const card = document.createElement("article");
    card.className = "card";
    const estado = m.estado ? `<span class="badge">${m.estado}</span>` : "";
    const boton = m.ruta && m.ruta !== "#"
      ? `<a class="btn" href="${m.ruta}">Abrir</a>`
      : `<span class="badge">Próximamente</span>`;

    card.innerHTML = `
      <h3>${m.nombre}</h3>
      <p>${m.descripcion}</p>
      <div class="button-row">${estado} ${boton}</div>
    `;
    grid.appendChild(card);
  });
}

function initTabs() {
  const links = document.querySelectorAll(".tabs a[href^='#']");
  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}
