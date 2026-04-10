function obtenerDashboard() {
  const totalProyectos = Array.isArray(PROYECTOS) ? PROYECTOS.length : 0;
  const totalModulos = Array.isArray(MODULOS) ? MODULOS.length : 0;

  return {
    totalProyectos,
    totalModulos,
    ultimaActividad: "Actualización V9 y panel maestro",
    estadoGeneral: "Operativo"
  };
}
