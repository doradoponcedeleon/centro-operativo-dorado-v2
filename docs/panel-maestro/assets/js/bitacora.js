const BITACORA_KEY = "centro_operativo_dorado_bitacora";

const BITACORA_BASE = [
  {
    fecha: "2026-03-10",
    titulo: "Consolidación del Panel Maestro",
    descripcion: "Se definió la estructura principal con Dashboard, Proyectos, Módulos y Bitácora."
  },
  {
    fecha: "2026-03-09",
    titulo: "Integración de V9",
    descripcion: "Se incorporó la versión V9 con panel lateral profesional."
  },
  {
    fecha: "2026-03-08",
    titulo: "Sincronización GitHub",
    descripcion: "V8 añadió sincronización de documentos con repositorios."
  }
];

function obtenerBitacora() {
  try {
    const raw = localStorage.getItem(BITACORA_KEY);
    if (!raw) return BITACORA_BASE.slice();
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : BITACORA_BASE.slice();
  } catch (e) {
    return BITACORA_BASE.slice();
  }
}

function guardarBitacora(entries) {
  localStorage.setItem(BITACORA_KEY, JSON.stringify(entries));
}

function agregarEntradaBitacora() {
  const tituloEl = document.getElementById("bitacoraTitulo");
  const descEl = document.getElementById("bitacoraDescripcion");
  if (!tituloEl) return;

  const titulo = tituloEl.value.trim();
  const descripcion = descEl ? descEl.value.trim() : "";
  if (!titulo) return;

  const entrada = {
    fecha: new Date().toISOString().split("T")[0],
    titulo,
    descripcion
  };

  const lista = obtenerBitacora();
  lista.unshift(entrada);
  guardarBitacora(lista);
  listarBitacora();

  tituloEl.value = "";
  if (descEl) descEl.value = "";
}

function eliminarEntradaBitacora(index) {
  const lista = obtenerBitacora();
  if (index < 0 || index >= lista.length) return;
  lista.splice(index, 1);
  guardarBitacora(lista);
  listarBitacora();
}

function listarBitacora() {
  const contenedor = document.getElementById("bitacoraLista");
  if (!contenedor) return;

  const lista = obtenerBitacora();
  contenedor.innerHTML = "";

  if (!lista.length) {
    contenedor.innerHTML = '<div class="muted">No hay entradas en la bitácora.</div>';
    return;
  }

  lista.forEach((entrada, index) => {
    const item = document.createElement("div");
    item.className = "bitacora-item";
    item.innerHTML = `
      <span>${entrada.fecha}</span>
      <strong>${entrada.titulo}</strong>
      <p class="muted">${entrada.descripcion || ""}</p>
      <div class="bitacora-actions">
        <button class="btn-peligro" data-index="${index}">Eliminar</button>
      </div>
    `;
    contenedor.appendChild(item);
  });

  contenedor.querySelectorAll("[data-index]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = Number(e.currentTarget.getAttribute("data-index"));
      eliminarEntradaBitacora(index);
    });
  });
}

function initBitacora() {
  listarBitacora();
  const btn = document.getElementById("btnAgregarBitacora");
  if (btn) {
    btn.addEventListener("click", agregarEntradaBitacora);
  }
}
