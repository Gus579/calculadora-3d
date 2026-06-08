// ========================
//   DOM HELPERS
// ========================

const $ = (id) => document.getElementById(id);

function val(id) {
  return parseFloat($(id).value) || 0;
}

function formatPesos(n) {
  return '$' + n.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function setResult(id, valor) {
  const el = $(id);
  const nuevo = formatPesos(valor);
  if (el.textContent !== nuevo) {
    el.textContent = nuevo;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }
}

// ========================
//   FORMATO DE MILES
// ========================

function formatMiles(input) {
  const pos = input.selectionStart;
  const prevLen = input.value.length;
  const raw = input.value.replace(/\D/g, '');
  const formatted = raw ? parseInt(raw).toLocaleString('es-AR') : '';
  input.value = formatted;
  const diff = formatted.length - prevLen;
  input.setSelectionRange(pos + diff, pos + diff);
}

function precioFilamentoVal(id) {
  const raw = $(id).value.replace(/\./g, '').replace(/,/g, '.');
  return parseFloat(raw) || 0;
}

// ========================
//   CÁLCULO PRINCIPAL
// ========================

function calcular() {
  const precioKwh      = val('precio-kwh');
  const consumoW       = val('consumo-impresora');
  const vidaUtilHs     = val('vida-util');
  const costoRepuestos = val('costo-repuestos');
  const margenError    = val('margen-error');
  const horas          = val('horas-impresion');
  const minExtra       = val('minutos-adicionales');
  const insumoExtra    = val('insumo-extra');
  const mult           = val('margen-ganancia');

  const tiempoTotal = horas + minExtra / 60;

  let costoFilamento = 0;
  for (let i = 1; i <= 4; i++) {
    const precio = precioFilamentoVal(`precio-filamento-${i}`);
    const gramos = val(`gramos-filamento-${i}`);
    costoFilamento += (gramos / 1000) * precio;
  }

  const electricidad = (consumoW / 1000) * tiempoTotal * precioKwh;
  const costoHora    = vidaUtilHs > 0 ? costoRepuestos / vidaUtilHs : 0;
  const maquina      = costoHora * tiempoTotal;

  const subtotal    = costoFilamento + electricidad + maquina + insumoExtra;
  const ajusteError = subtotal * (margenError / 100);
  const costoTotal  = subtotal + ajusteError;
  const precioVenta = mult > 0 ? costoTotal * mult : 0;
  const ganancia    = precioVenta - costoTotal;

  setResult('res-filamento',    costoFilamento);
  setResult('res-electricidad', electricidad);
  setResult('res-maquina',      maquina);
  setResult('res-insumo',       insumoExtra);
  setResult('res-subtotal',     subtotal);
  setResult('res-error',        ajusteError);
  setResult('res-costo-total',  costoTotal);
  setResult('res-precio-venta', precioVenta);
  setResult('res-ganancia',     ganancia);

  $('res-ganancia').classList.toggle('negative', ganancia < 0);

  guardarValores();
}

// ========================
//   LOCALSTORAGE
// ========================

const STORAGE_IDS = [
  'precio-filamento-1', 'precio-filamento-2', 'precio-filamento-3', 'precio-filamento-4',
  'gramos-filamento-1', 'gramos-filamento-2', 'gramos-filamento-3', 'gramos-filamento-4',
  'precio-kwh', 'consumo-impresora', 'vida-util', 'costo-repuestos',
  'margen-error', 'horas-impresion', 'minutos-adicionales', 'insumo-extra', 'margen-ganancia',
];

function guardarValores() {
  try {
    STORAGE_IDS.forEach(id => {
      const el = $(id);
      if (!el) return;
      localStorage.setItem(id,
        id.startsWith('precio-filamento')
          ? String(precioFilamentoVal(id))
          : el.value
      );
    });
  } catch (e) {
    /* localStorage lleno o deshabilitado */
  }
}

function cargarValores() {
  STORAGE_IDS.forEach(id => {
    const saved = localStorage.getItem(id);
    if (saved === null || saved === '') return;
    const el = $(id);
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
//   PERFILES
// ========================

function listarPerfiles() {
  const select = $('select-perfil');
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
  const nombre = $('nombre-perfil').value.trim();
  if (!nombre) return;

  try {
    let nombres = JSON.parse(localStorage.getItem('perfiles_nombres') || '[]');
    if (!nombres.includes(nombre)) nombres.push(nombre);
    localStorage.setItem('perfiles_nombres', JSON.stringify(nombres));

    const valores = {};
    STORAGE_IDS.forEach(id => {
      const el = $(id);
      if (!el) return;
      valores[id] = id.startsWith('precio-filamento')
        ? String(precioFilamentoVal(id))
        : el.value;
    });
    localStorage.setItem('perfil_' + nombre, JSON.stringify(valores));
  } catch (e) {
    return;
  }

  listarPerfiles();
  $('select-perfil').value = nombre;
  $('nombre-perfil').value = '';
}

function cargarPerfil() {
  const nombre = $('select-perfil').value;
  if (!nombre) return;
  const valores = JSON.parse(localStorage.getItem('perfil_' + nombre));
  if (!valores) return;

  STORAGE_IDS.forEach(id => {
    if (valores[id] === undefined) return;
    const el = $(id);
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
  const nombre = $('select-perfil').value;
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
    const el = $(id);
    if (!el) return;
    const v = defaults[id] !== undefined ? defaults[id] : '';
    if (id.startsWith('precio-filamento')) {
      el.value = v;
      formatMiles(el);
    } else {
      el.value = v;
    }
  });
  calcular();
}

// ========================
//   EVENTOS
// ========================

document.querySelectorAll('.mult-ref').forEach(el => {
  el.addEventListener('click', function () {
    const mult = parseFloat(this.querySelector('.mult-val').textContent.replace('×', ''));
    $('margen-ganancia').value = mult;
    calcular();
  });
});

for (let i = 1; i <= 4; i++) {
  $(`precio-filamento-${i}`).addEventListener('input', function () {
    formatMiles(this);
    calcular();
  });
}

document.querySelectorAll('input[type="number"]').forEach(input => {
  input.addEventListener('input', calcular);
});

$('btn-guardar-perfil').addEventListener('click', guardarPerfil);
$('btn-eliminar-perfil').addEventListener('click', eliminarPerfil);
$('btn-reiniciar').addEventListener('click', reiniciarTodo);
$('select-perfil').addEventListener('change', cargarPerfil);

// ========================
//   INIT
// ========================

cargarValores();
listarPerfiles();
calcular();
