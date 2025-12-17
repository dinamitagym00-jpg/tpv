/* Dinamita POS v0 - Store (localStorage)
   Versión: v0.1.0
   Fecha: 2025-12-15
*/
const DP_STORE_KEY = "dp_v0_store";

function dpNowISO(){
  const d = new Date();
  const pad = n => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function dpId(prefix="T"){
  const d = new Date();
  const pad = n => String(n).padStart(2,"0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rnd = Math.random().toString(16).slice(2,6).toUpperCase();
  return `${prefix}${stamp}${rnd}`;
}

function dpLoad(){
  try{
    const raw = localStorage.getItem(DP_STORE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){
    console.error("dpLoad error", e);
    return null;
  }
}

function dpSave(state){
  localStorage.setItem(DP_STORE_KEY, JSON.stringify(state));
}

function dpDefaultState(){
  return {
    meta: { categories: ['suplemento','agua','accesorio'], version:"v0.1.0", createdAt: dpNowISO(), business:{ name:"Dinamita Gym", ivaDefault:0 ,
      membershipOptions: {
        durations: [1,7,30,183,365],
        types: [
          { name:'Visita', subtypes:['Normal','Socio','VIP'], defaultDays:1,
      membershipCatalog: [{"id": "MP001", "name": "Anualidad", "days": 365, "price": 2400}, {"id": "MP002", "name": "Medio año", "days": 182, "price": 1500}, {"id": "MP003", "name": "Mes normal", "days": 30, "price": 350}, {"id": "MP004", "name": "Mes socio", "days": 30, "price": 300}, {"id": "MP005", "name": "Mes VIP", "days": 30, "price": 250}, {"id": "MP006", "name": "Semana normal", "days": 7, "price": 150}, {"id": "MP007", "name": "Semana socio", "days": 7, "price": 130}, {"id": "MP008", "name": "Semana VIP", "days": 7, "price": 100}, {"id": "MP009", "name": "Visita normal", "days": 1, "price": 40}, {"id": "MP010", "name": "Visita socio", "days": 1, "price": 30}, {"id": "MP011", "name": "Visita VIP", "days": 1, "price": 25}]
    },
          { name:'Semana', subtypes:['Normal','Socio','VIP'], defaultDays:7 },
          { name:'Mensual', subtypes:['Normal','Socio','VIP'], defaultDays:30 },
          { name:'Medio Año', subtypes:['Normal'], defaultDays:183 },
          { name:'Anual', subtypes:['Normal'], defaultDays:365 }
        ]
      }
} },
    products: [
      { id:"P001", sku:"SKU-0001", barcode:"750000000001", name:"Agua 1L", category:"agua", price:14, cost:8, stock:50, image:"", updatedAt:dpNowISO() },
      { id:"P002", sku:"SKU-0002", barcode:"750000000002", name:"Proteína 2lb", category:"suplemento", price:650, cost:450, stock:12, image:"", updatedAt:dpNowISO() },
      { id:"P003", sku:"SKU-0003", barcode:"750000000003", name:"Creatina 300g", category:"suplemento", price:520, cost:360, stock:18, image:"", updatedAt:dpNowISO() },
      { id:"P004", sku:"SKU-0004", barcode:"750000000004", name:"Shaker Dinamita", category:"accesorio", price:120, cost:60, stock:25, image:"", updatedAt:dpNowISO() }
    ],
    clients: [
      { id:"C000", name:"Mostrador", phone:"", address:"", photo:"", createdAt:dpNowISO() }
    ],
    sales: [],
    memberships: [],
    warehouse: { movements: [], stock: {} },
    analytics: {
      mostSold: {},
      recentSearches: [],
      recentProducts: []
    }
  };
}

function dpGetState(){
  let st = dpLoad();
  if(!st){
    st = dpDefaultState();
    dpSave(st);
  }
  return st;
}

function dpSetState(mutatorFn){
  const st = dpGetState();
  const next = mutatorFn(JSON.parse(JSON.stringify(st))) || st;
  dpSave(next);
  return next;
}

function dpFmtMoney(n){
  const x = Number(n || 0);
  return x.toLocaleString("es-MX", { style:"currency", currency:"MXN" });
}

function dpFindProductByQuery(st, q){
  const qq = (q||"").trim().toLowerCase();
  if(!qq) return [];
  return st.products.filter(p => {
    return (p.name||"").toLowerCase().includes(qq) ||
           (p.sku||"").toLowerCase().includes(qq) ||
           (p.barcode||"").toLowerCase().includes(qq);
  });
}

function dpBumpMostSold(st, productId, qty){
  if(!st.analytics.mostSold) st.analytics.mostSold = {};
  st.analytics.mostSold[productId] = (st.analytics.mostSold[productId] || 0) + qty;
}

function dpPushUnique(arr, val, maxLen=24){
  const next = (arr||[]).filter(x => x !== val);
  next.unshift(val);
  return next.slice(0, maxLen);
}

function dpRecordSearch(st, q){
  if(!q) return;
  if(!st.analytics.recentSearches) st.analytics.recentSearches = [];
  st.analytics.recentSearches.unshift({ q:String(q).slice(0,80), at:dpNowISO() });
  st.analytics.recentSearches = st.analytics.recentSearches.slice(0, 25);
}

function dpRecordProductViewed(st, productId){
  st.analytics.recentProducts = dpPushUnique(st.analytics.recentProducts || [], productId, 20);
}

function dpCreateSale({clientId, cartItems, note, iva=0}){
  return dpSetState(st => {
    const ticket = dpId("T");
    const at = dpNowISO();
    const items = cartItems.map(i => ({
      productId: i.productId,
      qty: i.qty,
      price: i.price,
      total: i.qty * i.price
    }));
    const subtotal = items.reduce((a,b)=>a+b.total,0);
    const ivaRate = Number(iva||0);
    const ivaAmount = subtotal * (ivaRate/100);
    const total = subtotal + ivaAmount;

    for(const it of items){
      const p = st.products.find(x=>x.id===it.productId);
      if(p){
        p.stock = Math.max(0, Number(p.stock||0) - Number(it.qty||0));
        p.updatedAt = at;
        dpBumpMostSold(st, p.id, Number(it.qty||0));
      }
    }

    st.sales.unshift({
      id: ticket,
      type: "venta",
      at,
      clientId: clientId || "C000",
      note: note || "",
      ivaRate,
      subtotal,
      ivaAmount,
      total,
      items
    });

    return st;
  });
}



function dpCreateWarehouseEntry({productId, qty, unitCost, supplier, date, notes, imageDataUrl}){
  return dpSetState(st=>{
    const id = dpId("B");
    const at = dpNowISO();
    const entryDate = date || at.slice(0,10);
    const movement = {
      id,
      at,
      date: entryDate,
      productId,
      qty: Number(qty||0),
      unitCost: Number(unitCost||0),
      supplier: supplier || "",
      notes: notes || "",
      image: imageDataUrl || ""
    };

    st.warehouse = st.warehouse || { movements: [] };
    st.warehouse.movements = st.warehouse.movements || [];
    st.warehouse.movements.unshift(movement);

    // Affect inventory stock
    const p = (st.products||[]).find(x=>x.id===productId);
    if(p){
      p.stock = Number(p.stock||0) + Number(qty||0);
      if(Number(unitCost||0) > 0) p.cost = Number(unitCost||0);
      p.updatedAt = at;
      if(!p.image && imageDataUrl) p.image = imageDataUrl;
    }

    return st;
  });
}

function dpUpdateWarehouseEntry(entryId, updates){
  return dpSetState(st=>{
    const mv = st.warehouse?.movements?.find(x=>x.id===entryId);
    if(!mv) return st;

    const oldQty = Number(mv.qty||0);
    const newQty = updates.qty !== undefined ? Number(updates.qty||0) : oldQty;
    const diff = newQty - oldQty;

    Object.assign(mv, updates);
    mv.qty = newQty;
    mv.unitCost = updates.unitCost !== undefined ? Number(updates.unitCost||0) : Number(mv.unitCost||0);

    const p = (st.products||[]).find(x=>x.id===mv.productId);
    if(p){
      p.stock = Number(p.stock||0) + diff;
      if(Number(mv.unitCost||0) > 0) p.cost = Number(mv.unitCost||0);
      if(!p.image && mv.image) p.image = mv.image;
      p.updatedAt = dpNowISO();
    }

    return st;
  });
}

function dpDeleteWarehouseEntry(entryId){
  return dpSetState(st=>{
    const mvs = st.warehouse?.movements || [];
    const mv = mvs.find(x=>x.id===entryId);
    if(!mv) return st;

    const p = (st.products||[]).find(x=>x.id===mv.productId);
    if(p){
      p.stock = Math.max(0, Number(p.stock||0) - Number(mv.qty||0));
      p.updatedAt = dpNowISO();
    }

    st.warehouse.movements = mvs.filter(x=>x.id!==entryId);
    return st;
  });
}


function dpEnsureSeedData(){
  return dpSetState(st=>{
    st.meta = st.meta || {};
    st.meta.membershipCatalog = st.meta.membershipCatalog || [];
    if(st.meta.membershipCatalog.length===0){ st.meta.membershipCatalog = [{"id": "MP001", "name": "Anualidad", "days": 365, "price": 2400}, {"id": "MP002", "name": "Medio año", "days": 182, "price": 1500}, {"id": "MP003", "name": "Mes normal", "days": 30, "price": 350}, {"id": "MP004", "name": "Mes socio", "days": 30, "price": 300}, {"id": "MP005", "name": "Mes VIP", "days": 30, "price": 250}, {"id": "MP006", "name": "Semana normal", "days": 7, "price": 150}, {"id": "MP007", "name": "Semana socio", "days": 7, "price": 130}, {"id": "MP008", "name": "Semana VIP", "days": 7, "price": 100}, {"id": "MP009", "name": "Visita normal", "days": 1, "price": 40}, {"id": "MP010", "name": "Visita socio", "days": 1, "price": 30}, {"id": "MP011", "name": "Visita VIP", "days": 1, "price": 25}]; }

    st.meta.categories = st.meta.categories || ['suplemento','agua','accesorio'];
    st.products = st.products || [];
    if(st.products.length === 0){
      const now = dpNowISO();
      st.products = [{"id": "P100001", "sku": "DM-WATER-1L", "barcode": "750000000001", "name": "Agua Bonafont 1L", "category": "agua", "price": 14, "cost": 6, "stock": 20, "expiry": "", "lot": "", "image": "", "createdAt": "", "updatedAt": ""}, {"id": "P100002", "sku": "DM-WHEY-2LB", "barcode": "750000000002", "name": "Proteína Whey 2 lb (Demo)", "category": "suplemento", "price": 699, "cost": 480, "stock": 5, "expiry": "", "lot": "", "image": "", "createdAt": "", "updatedAt": ""}, {"id": "P100003", "sku": "DM-CREAT-300", "barcode": "750000000003", "name": "Creatina 300g (Demo)", "category": "suplemento", "price": 499, "cost": 320, "stock": 8, "expiry": "", "lot": "", "image": "", "createdAt": "", "updatedAt": ""}, {"id": "P100004", "sku": "DM-SHAKER", "barcode": "750000000004", "name": "Shaker Dinamita (Demo)", "category": "accesorio", "price": 120, "cost": 60, "stock": 12, "expiry": "", "lot": "", "image": "", "createdAt": "", "updatedAt": ""}].map(p=>({
        ...p,
        createdAt: p.createdAt || now,
        updatedAt: p.updatedAt || now
      }));
    }
    // Ensure warehouse structure exists
    st.warehouse = st.warehouse || { movements: [], stock: {} };
    st.warehouse.movements = st.warehouse.movements || [];
    st.warehouse.stock = st.warehouse.stock || {};
    return st;
  });
}


/* --- Bodega v0 (Opción A): stock separado + traspaso a inventario --- */
function dpWarehouseQty(st, productId){
  st.warehouse = st.warehouse || { movements: [], stock: {} };
  st.warehouse.stock = st.warehouse.stock || {};
  return Number(st.warehouse.stock[productId] || 0);
}

function dpCreateWarehouseEntry({productId, qty, unitCost, supplier, date, notes, imageDataUrl}){
  return dpSetState(st=>{
    const id = dpId("B");
    const at = dpNowISO();
    const entryDate = date || at.slice(0,10);

    st.warehouse = st.warehouse || { movements: [], stock: {} };
    st.warehouse.movements = st.warehouse.movements || [];
    st.warehouse.stock = st.warehouse.stock || {};

    const movement = {
      id,
      type: "in",
      at,
      date: entryDate,
      productId,
      qty: Number(qty||0),
      unitCost: Number(unitCost||0),
      supplier: supplier || "",
      notes: notes || "",
      image: imageDataUrl || ""
    };
    st.warehouse.movements.unshift(movement);

    // SOLO bodega
    st.warehouse.stock[productId] = dpWarehouseQty(st, productId) + Number(qty||0);

    // actualizar costo/imagen del producto (sin mover stock)
    const p = (st.products||[]).find(x=>x.id===productId);
    if(p){
      if(Number(unitCost||0) > 0) p.cost = Number(unitCost||0);
      if(!p.image && imageDataUrl) p.image = imageDataUrl;
      p.updatedAt = at;
    }

    return st;
  });
}

function dpUpdateWarehouseEntry(entryId, updates){
  return dpSetState(st=>{
    st.warehouse = st.warehouse || { movements: [], stock: {} };
    st.warehouse.movements = st.warehouse.movements || [];
    st.warehouse.stock = st.warehouse.stock || {};

    const mv = st.warehouse.movements.find(x=>x.id===entryId);
    if(!mv || mv.type !== "in") return st;

    const oldQty = Number(mv.qty||0);
    const newQty = updates.qty !== undefined ? Number(updates.qty||0) : oldQty;
    const diff = newQty - oldQty;

    Object.assign(mv, updates);
    mv.qty = newQty;
    if(updates.unitCost !== undefined) mv.unitCost = Number(updates.unitCost||0);

    st.warehouse.stock[mv.productId] = Math.max(0, dpWarehouseQty(st, mv.productId) + diff);

    const p = (st.products||[]).find(x=>x.id===mv.productId);
    if(p){
      if(Number(mv.unitCost||0) > 0) p.cost = Number(mv.unitCost||0);
      if(!p.image && mv.image) p.image = mv.image;
      p.updatedAt = dpNowISO();
    }
    return st;
  });
}

function dpDeleteWarehouseEntry(entryId){
  return dpSetState(st=>{
    st.warehouse = st.warehouse || { movements: [], stock: {} };
    st.warehouse.movements = st.warehouse.movements || [];
    st.warehouse.stock = st.warehouse.stock || {};

    const mv = st.warehouse.movements.find(x=>x.id===entryId);
    if(!mv || mv.type !== "in") return st;

    st.warehouse.stock[mv.productId] = Math.max(0, dpWarehouseQty(st, mv.productId) - Number(mv.qty||0));
    st.warehouse.movements = st.warehouse.movements.filter(x=>x.id!==entryId);
    return st;
  });
}

function dpTransferFromWarehouse({productId, qty, notes}){
  return dpSetState(st=>{
    st.warehouse = st.warehouse || { movements: [], stock: {} };
    st.warehouse.movements = st.warehouse.movements || [];
    st.warehouse.stock = st.warehouse.stock || {};

    const available = dpWarehouseQty(st, productId);
    const q = Number(qty||0);
    if(!Number.isFinite(q) || q<=0) return st;
    if(q > available) return st;

    st.warehouse.stock[productId] = available - q;

    const p = (st.products||[]).find(x=>x.id===productId);
    if(p){
      p.stock = Number(p.stock||0) + q;
      p.updatedAt = dpNowISO();
    }

    st.warehouse.movements.unshift({
      id: dpId("T"),
      type: "transfer",
      at: dpNowISO(),
      date: dpNowISO().slice(0,10),
      productId,
      qty: q,
      notes: notes || ""
    });

    return st;
  });
}


/* --- Ventas de Servicios (no afectan inventario) --- */
function dpCreateServiceSale({clientId, concept, price, note="", iva=0, meta={}}){
  return dpSetState(st => {
    const ticket = dpId("T");
    const at = dpNowISO();
    const qty = 1;
    const p = Number(price||0);
    const subtotal = qty * p;
    const ivaRate = Number(iva||0);
    const ivaAmount = subtotal * (ivaRate/100);
    const total = subtotal + ivaAmount;

    st.sales = st.sales || [];
    st.sales.unshift({
      id: ticket,
      type: "servicio",
      subtype: meta.subtype || "",
      at,
      clientId: clientId || "C000",
      note: note || "",
      ivaRate,
      subtotal,
      ivaAmount,
      total,
      items: [{
        productId: meta.productId || "SERV",
        name: concept || "Servicio",
        qty,
        price: p,
        total: subtotal
      }],
      meta
    });
    return st;
  });
}

/* --- Membresías --- */
function dpCalcEndDate(startISO, days){
  const d = new Date(startISO);
  d.setDate(d.getDate() + Number(days||0));
  return d.toISOString().slice(0,10);
}

function dpCreateMembership({clientId, planId, planName, days, startDate, notes, price, saleTicketId=""}){
  return dpSetState(st=>{
    st.memberships = st.memberships || [];
    const id = dpId("M");
    const start = startDate || new Date().toISOString().slice(0,10);
    const end = dpCalcEndDate(start, Number(days||0));
    st.memberships.unshift({
      id,
      clientId: clientId || "C000",
      planId: planId || "",
      planName: planName || "",
      days: Number(days||0),
      start,
      end,
      notes: notes || "",
      price: Number(price||0),
      saleTicketId: saleTicketId || "",
      createdAt: dpNowISO()
    });
    return st;
  });
}

function dpChargeMembership({clientId, planId, startDate, notes, printTag=""}){
  const plan = dpFindMembershipPlanById(planId);
  const name = plan ? plan.name : "Membresía";
  const days = plan ? Number(plan.days||0) : 0;
  const price = plan ? Number(plan.price||0) : 0;

  const concept = `${name} - ${days} días`;
  dpCreateServiceSale({
    clientId,
    concept,
    price,
    note: notes || "",
    iva: 0,
    meta: { kind:"membership", planId, planName: name, days, startDate, printTag }
  });

  const st = dpGetState();
  const sale = (st.sales||[])[0];
  const ticketId = sale ? sale.id : "";

  dpCreateMembership({
    clientId,
    planId,
    planName: name,
    days,
    startDate,
    notes,
    price,
    saleTicketId: ticketId
  });

  return ticketId;
}

function dpDeleteMembership(id){
  return dpSetState(st=>{
    st.memberships = st.memberships || [];
    st.memberships = st.memberships.filter(m=>m.id !== id);
    return st;
  });
}


/* --- Catálogo de Membresías --- */
function dpGetMembershipCatalog(){
  const st = dpGetState();
  st.meta = st.meta || {};
  st.meta.membershipCatalog = st.meta.membershipCatalog || [];
  return st.meta.membershipCatalog;
}

function dpAddMembershipPlan({name, days, price}){
  return dpSetState(st=>{
    st.meta = st.meta || {};
    st.meta.membershipCatalog = st.meta.membershipCatalog || [];
    const id = dpId("MP");
    st.meta.membershipCatalog.unshift({
      id,
      name: String(name||"").trim(),
      days: Number(days||0),
      price: Number(price||0),
      createdAt: dpNowISO()
    });
    return st;
  });
}

function dpUpdateMembershipPlan(id, updates){
  return dpSetState(st=>{
    st.meta = st.meta || {};
    st.meta.membershipCatalog = st.meta.membershipCatalog || [];
    const p = st.meta.membershipCatalog.find(x=>x.id===id);
    if(!p) return st;
    if(updates.name !== undefined) p.name = String(updates.name||"").trim();
    if(updates.days !== undefined) p.days = Number(updates.days||0);
    if(updates.price !== undefined) p.price = Number(updates.price||0);
    p.updatedAt = dpNowISO();
    return st;
  });
}

function dpDeleteMembershipPlan(id){
  return dpSetState(st=>{
    st.meta = st.meta || {};
    st.meta.membershipCatalog = st.meta.membershipCatalog || [];
    st.meta.membershipCatalog = st.meta.membershipCatalog.filter(x=>x.id!==id);
    return st;
  });
}

function dpFindMembershipPlanById(id){
  const st = dpGetState();
  const list = st.meta?.membershipCatalog || [];
  return list.find(x=>x.id===id) || null;
}
