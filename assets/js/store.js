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
    meta: { version:"v0.1.0", createdAt: dpNowISO(), business:{ name:"Dinamita Gym", ivaDefault:0 } },
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



    st.warehouse.movements = mvs.filter(x=>x.id!==entryId);
    return st;
  });
}

/* --- Bodega (movimientos de entrada + traspasos) --- */
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

    // Affect warehouse stock ONLY (no suma a inventario)
    st.warehouse.stock[productId] = dpWarehouseQty(st, productId) + Number(qty||0);

    // Optional: update product cost/image reference (no stock change)
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
    if(!mv) return st;
    if(mv.type !== "in") return st; // solo se editan entradas

    const oldQty = Number(mv.qty||0);
    const newQty = updates.qty !== undefined ? Number(updates.qty||0) : oldQty;
    const diff = newQty - oldQty;

    Object.assign(mv, updates);
    mv.qty = newQty;
    mv.unitCost = updates.unitCost !== undefined ? Number(updates.unitCost||0) : Number(mv.unitCost||0);

    // Adjust warehouse stock
    st.warehouse.stock[mv.productId] = Math.max(0, dpWarehouseQty(st, mv.productId) + diff);

    // Optional update product cost/image
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
    if(!mv) return st;
    if(mv.type !== "in") return st; // solo se borran entradas

    // Revert warehouse stock
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

    // Restar bodega
    st.warehouse.stock[productId] = available - q;

    // Sumar inventario (piso)
    const p = (st.products||[]).find(x=>x.id===productId);
    if(p){
      p.stock = Number(p.stock||0) + q;
      p.updatedAt = dpNowISO();
    }

    const id = dpId("T");
    const at = dpNowISO();
    st.warehouse.movements.unshift({
      id,
      type: "transfer",
      at,
      date: at.slice(0,10),
      productId,
      qty: q,
      notes: notes || ""
    });
    return st;
  });
}

