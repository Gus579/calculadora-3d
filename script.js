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
  if (!el) return;
  const nuevo = formatPesos(valor);
  if (el.textContent !== nuevo) {
    el.textContent = nuevo;
    el.classList.remove('result-flash');
    void el.offsetWidth;
    el.classList.add('result-flash');
    if (id === 'res-precio-venta') {
      el.classList.remove('sale-pulse');
      void el.offsetWidth;
      el.classList.add('sale-pulse');
    }
  }
}

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
  const comisionPct    = val('comision-venta');

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
  const comision    = precioVenta * (comisionPct / 100);
  const precioFinal = precioVenta - comision;
  const ganancia    = precioFinal - costoTotal;

  setResult('res-filamento',    costoFilamento);
  setResult('res-electricidad', electricidad);
  setResult('res-maquina',      maquina);
  setResult('res-insumo',       insumoExtra);
  setResult('res-subtotal',     subtotal);
  setResult('res-error',        ajusteError);
  setResult('res-costo-total',  costoTotal);
  setResult('res-precio-venta', precioVenta);
  setResult('res-comision',     comision);
  setResult('res-ganancia',     ganancia);

  $('res-ganancia').classList.toggle('negative', ganancia < 0);

  guardarValores();
}

const STORAGE_IDS = [
  'precio-filamento-1', 'precio-filamento-2', 'precio-filamento-3', 'precio-filamento-4',
  'gramos-filamento-1', 'gramos-filamento-2', 'gramos-filamento-3', 'gramos-filamento-4',
  'precio-kwh', 'consumo-impresora', 'vida-util', 'costo-repuestos',
  'margen-error', 'horas-impresion', 'minutos-adicionales', 'insumo-extra', 'margen-ganancia', 'comision-venta',
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
  } catch (e) {}
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

  const btn = $('btn-guardar-perfil');
  btn.classList.remove('btn-saved');
  void btn.offsetWidth;
  btn.classList.add('btn-saved');
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
    'comision-venta': '10',
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

/*
  ======================
  SPOTLIGHT EFFECT
  ======================
*/
const spotlightEl = document.querySelector('[data-spotlight]');
if (spotlightEl) {
  spotlightEl.addEventListener('mousemove', (e) => {
    const rect = spotlightEl.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(0);
    const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(0);
    spotlightEl.style.setProperty('--mouse-x', x + '%');
    spotlightEl.style.setProperty('--mouse-y', y + '%');
  });
}

/*
  ======================
  HOLD-TO-DELETE
  ======================
*/
const HOLD_DURATION = 1200;
let holdTimer = null;
let holdActive = false;

document.querySelectorAll('.hold-to-delete').forEach(btn => {
  const indicator = btn.querySelector('.btn-hold-indicator');
  if (!indicator) return;

  const startHold = () => {
    holdActive = true;
    indicator.classList.add('active');

    holdTimer = setTimeout(() => {
      indicator.classList.remove('active');
      holdActive = false;
      eliminarPerfil();
    }, HOLD_DURATION);
  };

  const cancelHold = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    if (holdActive) {
      indicator.classList.remove('active');
      holdActive = false;
    }
  };

  btn.addEventListener('mousedown', startHold);
  btn.addEventListener('mouseup', cancelHold);
  btn.addEventListener('mouseleave', cancelHold);
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startHold();
  }, { passive: false });
  btn.addEventListener('touchend', cancelHold);
  btn.addEventListener('touchcancel', cancelHold);
});

/*
  ======================
  EVENTS
  ======================
*/
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
$('btn-reiniciar').addEventListener('click', reiniciarTodo);
$('select-perfil').addEventListener('change', cargarPerfil);

/*
  ======================
  PREVENT WHEEL ON NUMBER INPUTS
  ======================
*/
document.querySelectorAll('input[type="number"]').forEach(input => {
  input.addEventListener('wheel', (e) => {
    e.preventDefault();
  }, { passive: false });
});

/*
  ======================
  MULTIPLES PLACAS
  ======================
*/
let plateIdCounter = 0;
let plates = [];

function createPlate() {
  return { id: plateIdCounter++, hours: 0, minutes: 0, grams: [0, 0, 0, 0] };
}

function getPlateTotals() {
  let totalHours = 0, totalMinutes = 0, totalGrams = [0, 0, 0, 0];
  plates.forEach(p => {
    totalHours += p.hours;
    totalMinutes += p.minutes;
    for (let i = 0; i < 4; i++) totalGrams[i] += p.grams[i];
  });
  return { totalHours, totalMinutes, totalGrams };
}

function updatePlatesTotals() {
  const { totalHours, totalMinutes, totalGrams } = getPlateTotals();
  const gramsStr = totalGrams.map((g, i) => `C${i + 1}: ${g}g`).join(' · ');
  $('plates-totals-text').textContent = `${totalHours}h ${totalMinutes}min · ${gramsStr}`;
}

function renderPlates() {
  const container = $('plates-container');
  container.innerHTML = '';
  plates.forEach(p => {
    const div = document.createElement('div');
    div.className = 'plate-row';
    div.dataset.plateId = p.id;

    div.innerHTML = `
      <div class="plate-header">
        <span class="plate-name">Placa ${plates.indexOf(p) + 1}</span>
        <button class="plate-remove" aria-label="Eliminar placa">✕</button>
      </div>
      <div class="plate-fields">
        <div class="plate-field">
          <label>Horas</label>
          <input type="number" class="plate-hours" value="${p.hours || ''}" placeholder="0" min="0" />
        </div>
        <div class="plate-field">
          <label>Min</label>
          <input type="number" class="plate-minutes" value="${p.minutes || ''}" placeholder="0" min="0" />
        </div>
      </div>
      <div class="plate-grams">
        <span class="plate-grams-label">Filamento:</span>
        <div class="plate-gram-grid">
          ${[0, 1, 2, 3].map(i => `
            <span class="plate-gram-color">C${i + 1}</span>
            <input type="number" class="plate-gram" data-color="${i}" value="${p.grams[i] || ''}" placeholder="0" min="0" />
          `).join('')}
          <span class="plate-gram-unit">g</span>
        </div>
      </div>
    `;

    const removeBtn = div.querySelector('.plate-remove');
    removeBtn.addEventListener('click', () => removePlate(p.id));

    div.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        const idx = plates.findIndex(x => x.id === p.id);
        if (idx === -1) return;
        plates[idx].hours = parseFloat(div.querySelector('.plate-hours').value) || 0;
        plates[idx].minutes = parseFloat(div.querySelector('.plate-minutes').value) || 0;
        div.querySelectorAll('.plate-gram').forEach(g => {
          const ci = parseInt(g.dataset.color);
          plates[idx].grams[ci] = parseFloat(g.value) || 0;
        });
        updatePlatesTotals();
      });
    });

    container.appendChild(div);
  });
  updatePlatesTotals();
}

function addPlate() {
  plates.push(createPlate());
  renderPlates();
}

function removePlate(id) {
  plates = plates.filter(p => p.id !== id);
  if (plates.length === 0) plates.push(createPlate());
  renderPlates();
}

function aplicarPlacas() {
  const { totalHours, totalMinutes, totalGrams } = getPlateTotals();
  $('horas-impresion').value = totalHours || '';
  $('minutos-adicionales').value = totalMinutes || '';
  for (let i = 0; i < 4; i++) {
    const el = $(`gramos-filamento-${i + 1}`);
    if (el) el.value = totalGrams[i] || '';
  }
  calcular();
}

$('btn-agregar-placa').addEventListener('click', addPlate);
$('btn-aplicar-placas').addEventListener('click', aplicarPlacas);

plates.push(createPlate());
renderPlates();

/*
  ======================
  INIT
  ======================
*/
cargarValores();
listarPerfiles();
calcular();
