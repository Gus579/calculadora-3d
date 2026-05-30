// ========================
//   UTILIDADES
// ========================

function val(id) {
  return parseFloat(document.getElementById(id).value) || 0;
}

function formatPesos(numero) {
  return '$' + numero.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function setResult(id, valor) {
  const el = document.getElementById(id);
  el.textContent = formatPesos(valor);
  el.classList.remove('flash');
  void el.offsetWidth; // fuerza reflow para reiniciar animación
  el.classList.add('flash');
}

// ========================
//   CÁLCULO EN TIEMPO REAL
// ========================

function calcular() {

  // --- Gastos fijos ---
  const precioKwh       = val('precio-kwh');
  const consumoW        = val('consumo-impresora');
  const vidaUtilHs      = val('vida-util');
  const costoRepuestos  = val('costo-repuestos');
  const margenError     = val('margen-error');

  // --- Pieza ---
  const horasImpresion  = val('horas-impresion');
  const minutosExtra    = val('minutos-adicionales');
  const insumoExtra     = val('insumo-extra');

  // --- Ganancia ---
  const multiplicador   = val('margen-ganancia');

  // Tiempo total en horas
  const tiempoTotal = horasImpresion + (minutosExtra / 60);

  // Costo de filamento (hasta 4 colores)
  let costoFilamento = 0;
  for (let i = 1; i <= 4; i++) {
    const precio = valTexto(`precio-filamento-${i}`);
    const gramos = val(`gramos-filamento-${i}`);
    costoFilamento += (gramos / 1000) * precio;
  }

  // Costo de electricidad
  const costoElectricidad = (consumoW / 1000) * tiempoTotal * precioKwh;

  // Amortización de la máquina
  const costoPorHora = vidaUtilHs > 0 ? costoRepuestos / vidaUtilHs : 0;
  const costoMaquina = costoPorHora * tiempoTotal;

  // Subtotal
  const subtotal = costoFilamento + costoElectricidad + costoMaquina + insumoExtra;

  // Ajuste por error
  const ajusteError = subtotal * (margenError / 100);

  // Costo total
  const costoTotal = subtotal + ajusteError;

  // Precio de venta
  const precioVenta = multiplicador > 0 ? costoTotal * multiplicador : 0;

  // --- Mostrar ---
  setResult('res-filamento',    costoFilamento);
  setResult('res-electricidad', costoElectricidad);
  setResult('res-maquina',      costoMaquina);
  setResult('res-insumo',       insumoExtra);
  setResult('res-subtotal',     subtotal);
  setResult('res-error',        ajusteError);
  setResult('res-costo-total',  costoTotal);
  setResult('res-precio-venta', precioVenta);
}

// ========================
//   EVENTOS — escucha todo input
// ========================
// ========================
//   FORMATO MILES EN FILAMENTO
// ========================

function formatMiles(input) {
  // Guardamos posición del cursor
  const pos = input.selectionStart;
  const prevLen = input.value.length;

  // Limpiamos todo lo que no sea dígito
  let raw = input.value.replace(/\D/g, '');

  // Formateamos con puntos de miles
  let formatted = raw ? parseInt(raw).toLocaleString('es-AR') : '';

  input.value = formatted;

  // Ajustamos cursor para que no salte al final
  const diff = formatted.length - prevLen;
  input.setSelectionRange(pos + diff, pos + diff);
}

function valTexto(id) {
  const raw = document.getElementById(id).value.replace(/\./g, '').replace(',', '.');
  return parseFloat(raw) || 0;
}

// Eventos para inputs de precio de filamento
for (let i = 1; i <= 4; i++) {
  const input = document.getElementById(`precio-filamento-${i}`);
  input.addEventListener('input', function() {
    formatMiles(this);
    calcular();
  });
}
document.querySelectorAll('input[type="number"]').forEach(input => {
  input.addEventListener('input', calcular);
});

// Calcular al cargar por si hay valores pre-cargados
calcular();