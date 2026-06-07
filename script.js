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
  const newValue = formatPesos(valor);
  
  // Solo animar si el valor cambió
  if (el.textContent !== newValue) {
    el.textContent = newValue;
    el.classList.remove('flash');
    void el.offsetWidth; // fuerza reflow para reiniciar animación
    el.classList.add('flash');
  }
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
  const ganancia = precioVenta - costoTotal;
  setResult('res-ganancia', ganancia);
  const elGanancia = document.getElementById('res-ganancia');
  if (ganancia < 0) {
    elGanancia.classList.add('negative');
  } else {
    elGanancia.classList.remove('negative');
  }

  guardarValores();
}

// ========================
//   PERSISTENCIA LOCALSTORAGE
// ========================

const STORAGE_IDS = [
  'precio-filamento-1', 'precio-filamento-2', 'precio-filamento-3', 'precio-filamento-4',
  'gramos-filamento-1', 'gramos-filamento-2', 'gramos-filamento-3', 'gramos-filamento-4',
  'precio-kwh', 'consumo-impresora', 'vida-util', 'costo-repuestos',
  'margen-error', 'horas-impresion', 'minutos-adicionales', 'insumo-extra', 'margen-ganancia',
];

function guardarValores() {
  STORAGE_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id.startsWith('precio-filamento')) {
      localStorage.setItem(id, String(valTexto(id)));
    } else {
      localStorage.setItem(id, el.value);
    }
  });
}

function cargarValores() {
  STORAGE_IDS.forEach(id => {
    const saved = localStorage.getItem(id);
    if (saved === null || saved === '') return;
    const el = document.getElementById(id);
    if (!el) return;
    if (id.startsWith('precio-filamento')) {
      el.value = saved;
      formatMiles(el);
    } else {
      el.value = saved;
    }
  });
}

// ========================
//   MULTIPLICADORES CLICKEABLES
// ========================

document.querySelectorAll('.mult-ref').forEach(el => {
  el.addEventListener('click', function() {
    const mult = parseFloat(this.querySelector('.mult-val').textContent.replace('×', ''));
    document.getElementById('margen-ganancia').value = mult;
    calcular();
  });
});

// ========================
//   PERFILES
// ========================

function listarPerfiles() {
  const select = document.getElementById('select-perfil');
  if (!select) return;
  const nombres = JSON.parse(localStorage.getItem('perfiles_nombres') || '[]');
  select.innerHTML = '<option value="">— Seleccionar —</option>';
  nombres.forEach(nombre => {
    const opt = document.createElement('option');
    opt.value = nombre;
    opt.textContent = nombre;
    select.appendChild(opt);
  });
}

function guardarPerfil() {
  const nombre = document.getElementById('nombre-perfil').value.trim();
  if (!nombre) return;

  let nombres = JSON.parse(localStorage.getItem('perfiles_nombres') || '[]');
  if (!nombres.includes(nombre)) {
    nombres.push(nombre);
  }
  localStorage.setItem('perfiles_nombres', JSON.stringify(nombres));

  const valores = {};
  STORAGE_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id.startsWith('precio-filamento')) {
      valores[id] = String(valTexto(id));
    } else {
      valores[id] = el.value;
    }
  });
  localStorage.setItem('perfil_' + nombre, JSON.stringify(valores));

  listarPerfiles();
  document.getElementById('select-perfil').value = nombre;
  document.getElementById('nombre-perfil').value = '';
}

function cargarPerfil() {
  const nombre = document.getElementById('select-perfil').value;
  if (!nombre) return;

  const valores = JSON.parse(localStorage.getItem('perfil_' + nombre));
  if (!valores) return;

  STORAGE_IDS.forEach(id => {
    if (valores[id] === undefined) return;
    const el = document.getElementById(id);
    if (!el) return;
    if (id.startsWith('precio-filamento')) {
      el.value = valores[id];
      formatMiles(el);
    } else {
      el.value = valores[id];
    }
  });
  calcular();
}

function eliminarPerfil() {
  const nombre = document.getElementById('select-perfil').value;
  if (!nombre) return;

  let nombres = JSON.parse(localStorage.getItem('perfiles_nombres') || '[]');
  nombres = nombres.filter(n => n !== nombre);
  localStorage.setItem('perfiles_nombres', JSON.stringify(nombres));
  localStorage.removeItem('perfil_' + nombre);

  listarPerfiles();
}

function reiniciarTodo() {
  const defaults = {
    'precio-filamento-1': '',
    'precio-filamento-2': '',
    'precio-filamento-3': '',
    'precio-filamento-4': '',
    'gramos-filamento-1': '',
    'gramos-filamento-2': '',
    'gramos-filamento-3': '',
    'gramos-filamento-4': '',
    'precio-kwh': '165',
    'consumo-impresora': '170',
    'vida-util': '10000',
    'costo-repuestos': '250000',
    'margen-error': '5',
    'horas-impresion': '',
    'minutos-adicionales': '',
    'insumo-extra': '',
    'margen-ganancia': '',
  };

  STORAGE_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = defaults[id] !== undefined ? defaults[id] : '';
    if (id.startsWith('precio-filamento')) {
      el.value = val;
      formatMiles(el);
    } else {
      el.value = val;
    }
  });
  calcular();
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

// Eventos de perfiles
document.getElementById('btn-guardar-perfil').addEventListener('click', guardarPerfil);
document.getElementById('btn-eliminar-perfil').addEventListener('click', eliminarPerfil);
document.getElementById('btn-reiniciar').addEventListener('click', reiniciarTodo);
document.getElementById('select-perfil').addEventListener('change', cargarPerfil);

// Cargar valores guardados, perfiles y calcular
cargarValores();
listarPerfiles();
calcular();