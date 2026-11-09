
/* =====================================================
   MIS FINANZAS DOU
   Versión corregida con ingresos extralaborales
   ===================================================== */

"use strict";

const DB_NAME = "MisFinanzasDou";
const STORE = "state";
const KEY = "main";

const $ = s => document.querySelector(s);

const money = n =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(Number(n) || 0);

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const keyOf = d => d.slice(0,7);

const monthName = k => {
  const [y,m] = k.split("-").map(Number);
  return new Date(y,m-1,1).toLocaleDateString("es-CL", {
    month:"long",
    year:"numeric"
  });
};

const uid = () => Date.now() + Math.floor(Math.random()*10000);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&#39;"
}[c]));

const blank = () => ({
  income:{
    rate:3075,
    grat:25,
    deduct:17.45,
    other:0
  },
  shifts:[],
  tips:[],
  extras:[],
  expenses:[],
  saving:0,
  goal:150000,
  debt:0,
  accumulated:0
});

const initial = {
  months:{
    "2026-11":{
      income:{
        rate:3075,
        grat:25,
        deduct:17.45,
        other:0
      },

      shifts:[
        {id:1,day:"Jueves",hours:6,count:4},
        {id:2,day:"Viernes",hours:6,count:4},
        {id:3,day:"Sábado",hours:7.5,count:4},
        {id:4,day:"Domingo",hours:7.5,count:5}
      ],

      tips:[
        {id:1793941139873,amount:1000,date:"2026-11-01"},
        {id:1793941145731,amount:8100,date:"2026-11-05"},
        {id:1794112732037,amount:7500,date:"2026-11-06"},
        {id:1794112739758,amount:14700,date:"2026-11-07"},
        {id:1794191494437,amount:5750,date:"2026-11-08"}
      ],

      extras:[
        {
          id:1793940776325,
          amount:15000,
          date:"2026-11-04",
          name:"Bencina",
          category:"Reembolsos"
        },
        {
          id:1794172465919,
          amount:9000,
          date:"2026-11-08",
          name:"Bloqueadores",
          category:"Ventas"
        }
      ],

      expenses:[
        {id:1793940921385,amount:4000,date:"2026-11-04",name:"Ajuste de Sueldo",category:"Deudas",type:"Pago de deuda"},
        {id:1793940948027,amount:123000,date:"2026-11-04",name:"Pago CMR",category:"Deudas",type:"Variable"},
        {id:1793940968599,amount:10000,date:"2026-11-04",name:"Raceroom F4",category:"Entretenimiento",type:"Variable"},
        {id:1793940992795,amount:1900,date:"2026-11-04",name:"Colación",category:"Alimentación",type:"Variable"},
        {id:1793941009936,amount:7990,date:"2026-11-04",name:"Chat GPT",category:"Suscripciones",type:"Fijo"},
        {id:1793941107772,amount:1900,date:"2026-11-05",name:"Colación",category:"Alimentación",type:"Hormiga"},
        {id:1793941558147,amount:1500,date:"2026-11-06",name:"Micro Semana 1",category:"Transporte",type:"Variable"},
        {id:1794020542426,amount:4000,date:"2026-11-06",name:"Colacion",category:"Alimentación",type:"Hormiga"},
        {id:1794020574059,amount:3100,date:"2026-11-06",name:"Materiales Universidad",category:"Otros",type:"Hormiga"},
        {id:1794112790449,amount:1900,date:"2026-11-07",name:"Colación",category:"Alimentación",type:"Variable"},
        {id:1794172452458,amount:1900,date:"2026-11-08",name:"Colación",category:"Alimentación",type:"Variable"},
        {id:1794191591891,amount:3500,date:"2026-11-08",name:"Micro Semana 2",category:"Transporte",type:"Variable"}
      ],

      saving:135000,
      goal:150000,
      debt:0,
      accumulated:0
    }
  }
};

let db;
let data;
let activeMonth;
let activeTab = "summary";

const days = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo"
];


/* =====================================================
   BASE DE DATOS
   ===================================================== */

function openDB(){
  return new Promise((res,rej)=>{
    const r = indexedDB.open(DB_NAME,1);

    r.onupgradeneeded = () => {
      r.result.createObjectStore(STORE);
    };

    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function readDB(){
  return new Promise((res,rej)=>{
    const r = db.transaction(STORE)
      .objectStore(STORE)
      .get(KEY);

    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function writeDB(){
  return new Promise((res,rej)=>{
    const t = db.transaction(STORE,"readwrite");

    t.objectStore(STORE).put(data,KEY);

    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  });
}

function save(){
  writeDB()
    .then(()=>{
      const status = $("#saveStatus");
      if(status) status.textContent = "✓ Guardado en este iPhone";
    })
    .catch(()=>{
      const status = $("#saveStatus");
      if(status) status.textContent = "Error al guardar";
    });
}


/* =====================================================
   MESES Y CÁLCULOS
   ===================================================== */

function current(){
  return data.months[activeMonth];
}

function ensure(k){
  if(!data.months[k]){
    data.months[k] = blank();
  }

  const m = data.months[k];

  // Compatibilidad con registros anteriores
  if(!m.income) m.income = blank().income;
  if(!Array.isArray(m.shifts)) m.shifts = [];
  if(!Array.isArray(m.tips)) m.tips = [];
  if(!Array.isArray(m.extras)) m.extras = [];
  if(!Array.isArray(m.expenses)) m.expenses = [];

  if(m.income.other === undefined) m.income.other = 0;
  if(m.saving === undefined) m.saving = 0;
  if(m.goal === undefined) m.goal = 150000;
  if(m.debt === undefined) m.debt = 0;
  if(m.accumulated === undefined) m.accumulated = 0;
}

function shiftHours(m){
  return m.shifts.reduce((a,s)=>
    a+(Number(s.hours)||0)*(Number(s.count)||0),0);
}

function shiftCount(m){
  return m.shifts.reduce((a,s)=>
    a+(Number(s.count)||0),0);
}

function wage(m){
  const h = shiftHours(m);
  const base = h*(Number(m.income.rate)||0);

  return Math.round(
    base*
    (1+(Number(m.income.grat)||0)/100)*
    (1-(Number(m.income.deduct)||0)/100)
  );
}

function total(arr){
  return arr.reduce((a,x)=>
    a+(Number(x.amount)||0),0);
}

function totals(m){
  const wages = wage(m);
  const laborOther = Number(m.income.other)||0;
  const tips = total(m.tips);
  const extra = total(m.extras);
  const expenses = total(m.expenses);

  const income = wages+laborOther+tips+extra;

  return {
    wages,
    laborOther,
    tips,
    extra,
    expenses,
    income,
    balance:income-expenses-(Number(m.saving)||0)
  };
}


/* =====================================================
   COMPONENTES DE INTERFAZ
   ===================================================== */

function card(title,body){
  return `
    <section class="card">
      <h2>${title}</h2>
      ${body}
    </section>
  `;
}

function field(label,name,value,type="text",extra=""){
  return `
    <div class="field">
      <label>${label}</label>
      <input
        name="${name}"
        type="${type}"
        value="${esc(value)}"
        ${extra}
      >
    </div>
  `;
}

function select(label,name,opts,value){
  return `
    <div class="field">
      <label>${label}</label>
      <select name="${name}">
        ${opts.map(o=>`
          <option value="${esc(o)}"
            ${o===value?"selected":""}>
            ${esc(o)}
          </option>
        `).join("")}
      </select>
    </div>
  `;
}

function list(items,kind){
  if(!items.length){
    return `
      <div class="empty">
        Todavía no hay movimientos registrados.
      </div>
    `;
  }

  return `
    <div class="list">
      ${[...items].sort((a,b)=>
        b.date.localeCompare(a.date)
      ).map(x=>`
        <div class="item">
          <div>
            <div class="item-title">
              ${esc(x.name||(kind==="tips"?"Propina":"Ingreso"))}
            </div>

            <div class="item-sub">
              ${esc(x.date)} · ${esc(x.category||x.type||"")}
            </div>
          </div>

          <div class="row">
            <span class="item-amount ${kind==="expenses"?"negative":"positive"}">
              ${money(x.amount)}
            </span>

            <button
              data-delete="${kind}"
              data-id="${x.id}">
              ×
            </button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}


/* =====================================================
   RESUMEN
   ===================================================== */

function summary(){
  const m = current();
  const t = totals(m);

  return card("Balance del mes",`
    <div class="big ${t.balance<0?"negative":"positive"}">
      ${money(t.balance)}
    </div>

    <p class="muted small">
      Ingresos menos gastos y ahorro registrado
    </p>

    <div class="kpi-grid">

      <div class="kpi">
        <div class="label">Sueldo estimado</div>
        <div class="value">${money(t.wages)}</div>
      </div>

      <div class="kpi">
        <div class="label">Propinas</div>
        <div class="value">${money(t.tips)}</div>
      </div>

      <div class="kpi">
        <div class="label">Otros ingresos</div>
        <div class="value">${money(t.extra+t.laborOther)}</div>
      </div>

      <div class="kpi">
        <div class="label">Gastos</div>
        <div class="value negative">${money(t.expenses)}</div>
      </div>

    </div>

    <hr>

    <div class="row">
      <span class="muted small">
        Horas trabajadas este mes
      </span>

      <strong class="positive">
        ${shiftHours(m).toLocaleString("es-CL")} h
      </strong>
    </div>

    <div class="row">
      <span class="muted small">
        Jornadas registradas
      </span>

      <strong>${shiftCount(m)}</strong>
    </div>
  `);
}


/* =====================================================
   INGRESOS LABORALES Y EXTRALABORALES
   ===================================================== */

function income(){
  const m = current();
  const t = totals(m);

  const extraCats = [
    "Ventas",
    "Reembolsos",
    "Trabajos extra",
    "Comisiones",
    "Otros"
  ];

  return card("Ingresos laborales",`

    <form id="incomeForm">

      <div class="form-grid">

        ${field(
          "Valor por hora ($)",
          "rate",
          m.income.rate,
          "number",
          'min="0" step="1"'
        )}

        ${field(
          "Gratificación (%)",
          "grat",
          m.income.grat,
          "number",
          'min="0" step="0.01"'
        )}

        ${field(
          "Descuentos (%)",
          "deduct",
          m.income.deduct,
          "number",
          'min="0" max="100" step="0.01"'
        )}

        ${field(
          "Otros ingresos laborales ($)",
          "other",
          m.income.other||0,
          "number",
          'min="0" step="1"'
        )}

      </div>

      <button class="primary">
        Guardar configuración salarial
      </button>

    </form>

    <hr>

    <div class="row">
      <h3>Jornadas laborales</h3>
      <span class="muted small">
        Configuración mensual
      </span>
    </div>

    <p class="muted small">
      Cada fila indica el día, las horas por jornada
      y cuántas veces trabajaste esa jornada durante este mes.
    </p>

    <div id="shiftList" class="list">

      ${m.shifts.map(s=>`
        <div class="shift" data-shift="${s.id}">

          <div class="shift-head">
            <strong>${esc(s.day)}</strong>

            <button
              class="remove"
              data-remove-shift="${s.id}"
              aria-label="Eliminar jornada">
              ×
            </button>
          </div>

          <div class="shift-grid">

            ${select(
              "Día de la semana",
              "day",
              days,
              s.day
            )}

            ${field(
              "Horas por jornada",
              "hours",
              s.hours,
              "number",
              'min="0" step="0.5"'
            )}

            ${field(
              "Veces trabajadas este mes",
              "count",
              s.count,
              "number",
              'min="0" step="1"'
            )}

          </div>

          <div class="shift-total">
            ${(Number(s.hours)||0)*(Number(s.count)||0)}
            horas acumuladas
          </div>

        </div>
      `).join("")||`
        <div class="empty">
          Agrega tu primera jornada laboral.
        </div>
      `}

    </div>

    <button id="addShift" class="secondary">
      ＋ Agregar jornada
    </button>

    <div class="readonly" style="margin-top:14px">

      <span class="label">
        HORAS TRABAJADAS EN EL MES
      </span>

      <strong>
        ${shiftHours(m).toLocaleString("es-CL")} h
      </strong>

      <p class="muted small">
        ${shiftCount(m)} jornadas ·
        Total calculado automáticamente
      </p>

      <hr>

      <span class="label">
        SUELDO LÍQUIDO ESTIMADO
      </span>

      <strong>${money(t.wages)}</strong>

      <p class="muted small">
        Horas mensuales × valor hora +
        gratificación − descuentos.
        Es una estimación.
      </p>

    </div>

  `) + card("Ingresos extralaborales",`

    <p class="muted small">
      Registra aquí el dinero que recibes fuera
      de tu sueldo habitual y de las propinas.
    </p>

    <form id="extraForm">

      <div class="form-grid">

        ${field(
          "Descripción del ingreso",
          "name",
          "",
          "text",
          'required placeholder="Ej. Venta de un producto"'
        )}

        ${field(
          "Monto ($)",
          "amount",
          "",
          "number",
          'required min="1" step="1"'
        )}

        ${select(
          "Categoría",
          "category",
          extraCats,
          "Otros"
        )}

        ${field(
          "Fecha",
          "date",
          today(),
          "date",
          "required"
        )}

      </div>

      <button class="primary">
        ＋ Agregar ingreso extra
      </button>

    </form>

    <hr>

    <div class="row">
      <strong>Total extralaboral</strong>

      <strong class="positive">
        ${money(total(m.extras))}
      </strong>
    </div>

    ${list(m.extras,"extras")}

  `);
}


/* =====================================================
   PROP​​INAS
   ===================================================== */

function tips(){
  const m = current();

  return card("Registrar propinas",`

    <form id="tipForm">

      <div class="form-grid">

        ${field(
          "Monto ($)",
          "amount",
          "",
          "number",
          'required min="1" step="1"'
        )}

        ${field(
          "Fecha",
          "date",
          today(),
          "date",
          "required"
        )}

      </div>

      <button class="primary">
        Agregar propina
      </button>

    </form>

    <hr>

    <div class="row">
      <strong>Total de propinas</strong>

      <strong class="positive">
        ${money(total(m.tips))}
      </strong>
    </div>

    ${list(m.tips,"tips")}

  `);
}


/* =====================================================
   GASTOS
   ===================================================== */

function expenses(){
  const m = current();

  const cats = [
    "Alimentación",
    "Transporte",
    "Suscripciones",
    "Entretenimiento",
    "Deudas",
    "Universidad",
    "Salud",
    "Hogar",
    "Otros"
  ];

  const types = [
    "Fijo",
    "Variable",
    "Hormiga",
    "Pago de deuda"
  ];

  return card("Registrar gasto",`

    <form id="expenseForm">

      <div class="form-grid">

        ${field(
          "Nombre del gasto",
          "name",
          "",
          "text",
          'required placeholder="Ej. Colación"'
        )}

        ${field(
          "Monto ($)",
          "amount",
          "",
          "number",
          'required min="1" step="1"'
        )}

        ${select(
          "Categoría",
          "category",
          cats,
          "Alimentación"
        )}

        ${select(
          "Tipo de gasto",
          "type",
          types,
          "Variable"
        )}

        ${field(
          "Fecha",
          "date",
          today(),
          "date",
          "required"
        )}

      </div>

      <button class="primary">
        Agregar gasto
      </button>

    </form>

    <hr>

    <div class="row">
      <strong>Total de gastos</strong>

      <strong class="negative">
        ${money(total(m.expenses))}
      </strong>
    </div>

    ${list(m.expenses,"expenses")}

  `);
}


/* =====================================================
   AHORROS
   ===================================================== */

function savings(){
  const m = current();

  const pct = m.goal
    ? Math.min(100,m.saving/m.goal*100)
    : 0;

  return card("Ahorros y metas",`

    <form id="savingForm">

      <div class="form-grid">

        ${field(
          "Ahorro registrado ($)",
          "saving",
          m.saving,
          "number",
          'min="0" step="1"'
        )}

        ${field(
          "Meta mensual ($)",
          "goal",
          m.goal,
          "number",
          'min="0" step="1"'
        )}

        ${field(
          "Deuda pendiente ($)",
          "debt",
          m.debt||0,
          "number",
          'min="0" step="1"'
        )}

        ${field(
          "Ahorro acumulado ($)",
          "accumulated",
          m.accumulated||0,
          "number",
          'min="0" step="1"'
        )}

      </div>

      <button class="primary">
        Guardar ahorros
      </button>

    </form>

    <div class="readonly" style="margin-top:14px">

      <span class="label">
        PROGRESO DE LA META
      </span>

      <strong>${pct.toFixed(1)}%</strong>

      <div class="progress">
        <div style="width:${pct}%"></div>
      </div>

      <p class="muted small">
        ${money(m.saving)} de ${money(m.goal)}
      </p>

    </div>

  `);
}


/* =====================================================
   ESTADÍSTICAS
   ===================================================== */

function stats(){
  const m = current();
  const groups = {};

  m.expenses.forEach(x=>{
    groups[x.category] =
      (groups[x.category]||0)+Number(x.amount);
  });

  const rows = Object.entries(groups)
    .sort((a,b)=>b[1]-a[1]);

  const max = Math.max(
    1,
    ...rows.map(x=>x[1])
  );

  return card("Estadísticas de gastos",

    rows.length

    ? rows.map(([name,value])=>`
      <div class="bar-row">

        <span class="bar-label">
          ${esc(name)}
        </span>

        <div class="bar-track">
          <div
            class="bar-fill"
            style="width:${value/max*100}%">
          </div>
        </div>

        <span class="bar-value negative">
          ${money(value)}
        </span>

      </div>
    `).join("")

    : `
      <div class="empty">
        Registra gastos para ver el resumen por categoría.
      </div>
    `

  )+card("Resumen de actividad",`

    <div class="row">
      <span class="muted">Horas trabajadas</span>
      <strong>${shiftHours(m)} h</strong>
    </div>

    <div class="row">
      <span class="muted">Jornadas</span>
      <strong>${shiftCount(m)}</strong>
    </div>

    <div class="row">
      <span class="muted">Ingresos totales</span>
      <strong class="positive">
        ${money(totals(m).income)}
      </strong>
    </div>

    <div class="row">
      <span class="muted">Gastos totales</span>
      <strong class="negative">
        ${money(totals(m).expenses)}
      </strong>
    </div>

  `);
}


/* =====================================================
   RENDERIZADO
   ===================================================== */

function render(){
  const views = {
    summary,
    income,
    tips,
    expenses,
    savings,
    stats
  };

  $("#view").innerHTML = views[activeTab]();

  document.querySelectorAll(".tab").forEach(b=>{
    b.classList.toggle(
      "active",
      b.dataset.tab===activeTab
    );
  });

  bindView();
}

function refreshMonths(){
  const keys = Object.keys(data.months).sort();

  $("#monthSelect").innerHTML = keys.map(k=>`
    <option
      value="${k}"
      ${k===activeMonth?"selected":""}>
      ${monthName(k)}
    </option>
  `).join("");
}

function setMonth(k){
  activeMonth = k;
  ensure(k);
  refreshMonths();
  render();
  save();
}


/* =====================================================
   REGISTRO DE MOVIMIENTOS
   ===================================================== */

function addMovement(formId,collection,kind){
  const form = $(formId);

  if(!form) return;

  form.addEventListener("submit",e=>{
    e.preventDefault();

    const fd = new FormData(form);

    const amount = Number(fd.get("amount"));
    const date = fd.get("date");

    if(!Number.isFinite(amount)||amount<=0){
      alert("Ingresa un monto válido.");
      return;
    }

    if(!date || keyOf(date)!==activeMonth){
      alert("La fecha del movimiento debe pertenecer al mes seleccionado.");
      return;
    }

    const obj = {
      id:uid(),
      amount,
      date
    };

    if(kind==="expenses"){
      Object.assign(obj,{
        name:fd.get("name"),
        category:fd.get("category"),
        type:fd.get("type")
      });
    }

    if(kind==="extras"){
      Object.assign(obj,{
        name:fd.get("name"),
        category:fd.get("category")
      });
    }

    current()[collection].push(obj);

    save();
    render();
  });
}


/* =====================================================
   RESPALDOS
   ===================================================== */

function exportBackup(){
  const blob = new Blob(
    [
      JSON.stringify({
        app:"Mis Finanzas Dou",
        version:2,
        exportedAt:new Date().toISOString(),
        data
      },null,2)
    ],
    {type:"application/json"}
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `mis-finanzas-respaldo-${today()}.json`;

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

function importBackup(file){
  const reader = new FileReader();

  reader.onload = ()=>{
    try{
      const parsed = JSON.parse(reader.result);
      const incoming = parsed.data||parsed;

      if(!incoming.months||typeof incoming.months!=="object"){
        throw Error("Formato no reconocido");
      }

      if(!confirm(
        "Importar este respaldo reemplazará los datos actuales de la aplicación. ¿Continuar?"
      )) return;

      data = incoming;

      Object.keys(data.months).forEach(ensure);

      const keys = Object.keys(data.months).sort();

      activeMonth = keys.includes(keyOf(today()))
        ? keyOf(today())
        : keys[keys.length-1];

      save();
      refreshMonths();
      render();

      alert("Respaldo importado correctamente.");

    }catch(e){
      alert("No se pudo importar: "+e.message);
    }
  };

  reader.readAsText(file);
}


/* =====================================================
   EVENTOS DE CADA SECCIÓN
   ===================================================== */

function bindView(){

  if(activeTab==="income"){

    $("#incomeForm").addEventListener("submit",e=>{
      e.preventDefault();

      const fd = new FormData(e.currentTarget);

      ["rate","grat","deduct","other"].forEach(k=>{
        current().income[k] = Number(fd.get(k))||0;
      });

      save();
      render();
    });

    $("#addShift").addEventListener("click",()=>{
      current().shifts.push({
        id:uid(),
        day:"Lunes",
        hours:6,
        count:1
      });

      save();
      render();
    });

    $("#shiftList").addEventListener("change",e=>{
      const box = e.target.closest("[data-shift]");
      if(!box) return;

      const s = current().shifts.find(
        x=>String(x.id)===box.dataset.shift
      );

      if(!s) return;

      if(e.target.name==="day"){
        s.day = e.target.value;
      }

      if(e.target.name==="hours"){
        s.hours = Math.max(0,Number(e.target.value)||0);
      }

      if(e.target.name==="count"){
        s.count = Math.max(
          0,
          Math.floor(Number(e.target.value)||0)
        );
      }

      save();
      render();
    });

    $("#shiftList").addEventListener("click",e=>{
      const id = e.target.dataset.removeShift;
      if(!id) return;

      current().shifts = current().shifts.filter(
        s=>String(s.id)!==id
      );

      save();
      render();
    });

    // Formulario recuperado de ingresos extralaborales
    addMovement("#extraForm","extras","extras");
  }

  if(activeTab==="tips"){
    addMovement("#tipForm","tips","tips");
  }

  if(activeTab==="expenses"){
    addMovement("#expenseForm","expenses","expenses");
  }

  if(activeTab==="savings"){
    $("#savingForm").addEventListener("submit",e=>{
      e.preventDefault();

      const fd = new FormData(e.currentTarget);

      ["saving","goal","debt","accumulated"].forEach(k=>{
        current()[k] = Number(fd.get(k))||0;
      });

      save();
      render();
    });
  }

  // Delegación de eventos: un solo controlador por render.
  // Evita acumular listeners al cambiar de pantalla.
  $("#view").onclick = e=>{
    const btn = e.target.closest("[data-delete]");
    if(!btn) return;

    const kind = btn.dataset.delete;
    const id = btn.dataset.id;

    if(!["tips","extras","expenses"].includes(kind)) return;

    const m = current();

    m[kind] = m[kind].filter(
      x=>String(x.id)!==id
    );

    save();
    render();
  };
}


/* =====================================================
   NAVEGACIÓN
   ===================================================== */

function go(tab){
  activeTab = tab;
  render();
}


/* =====================================================
   INICIO DE LA APLICACIÓN
   ===================================================== */

async function start(){
  db = await openDB();
  data = await readDB();

  if(!data){
    data = initial;
    await writeDB();
  }

  const keys = Object.keys(data.months).sort();

  activeMonth = keys.includes(keyOf(today()))
    ? keyOf(today())
    : keys[keys.length-1];

  if(!activeMonth){
    activeMonth = keyOf(today());
    ensure(activeMonth);
  }

  Object.keys(data.months).forEach(ensure);

  refreshMonths();
  render();

  document.querySelectorAll(".tab").forEach(b=>{
    b.addEventListener("click",()=>go(b.dataset.tab));
  });

  $("#monthSelect").addEventListener("change",e=>{
    setMonth(e.target.value);
  });

  $("#prevMonth").addEventListener("click",()=>{
    const [y,m] = activeMonth.split("-").map(Number);
    const d = new Date(y,m-2,1);

    setMonth(
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`
    );
  });

  $("#nextMonth").addEventListener("click",()=>{
    const [y,m] = activeMonth.split("-").map(Number);
    const d = new Date(y,m,1);

    setMonth(
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`
    );
  });

  $("#quickBackup").addEventListener("click",exportBackup);

  $("#backupInfo").addEventListener("click",()=>{
    if(confirm(
      "¿Quieres exportar un respaldo JSON? Al guardarlo, iOS te permitirá elegir una ubicación en Archivos."
    )){
      exportBackup();
    }else if(confirm(
      "¿Quieres importar un respaldo existente?"
    )){
      $("#importFile").click();
    }
  });

  $("#importFile").addEventListener("change",e=>{
    if(e.target.files[0]){
      importBackup(e.target.files[0]);
    }

    e.target.value = "";
  });

  if(
    "serviceWorker" in navigator &&
    location.protocol.startsWith("http")
  ){
    navigator.serviceWorker
      .register("./sw.js")
      .catch(()=>{});
  }
}

start().catch(e=>{
  console.error(e);

  $("#view").innerHTML = `
    <section class="card">
      <h2>No se pudo iniciar</h2>

      <p class="muted">
        Abre la aplicación desde un servidor HTTPS
        o un entorno local compatible.
        IndexedDB necesita un origen seguro en iOS.
      </p>
    </section>
  `;
});
