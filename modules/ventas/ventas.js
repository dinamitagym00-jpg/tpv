/* Ventas - Dinamita POS v0
   Versión: v0.1.1
   Fecha: 2025-12-15
   Cambios:
   - Previsualización de ticket.
   - Botón para imprimir cuando se requiera.
   - Venta puede registrarse SIN imprimir ticket.
*/
(function(){
  const $ = (id)=>document.getElementById(id);

  const elSearch = $("v-search");
  const elView = $("v-view");
  const elCatalog = $("v-catalog");
  const elEmpty = $("v-empty");

  const elClient = $("v-client");
  const elPayMethod = $("v-payMethod");
  const elIVA = $("v-iva");
  const elNote = $("v-note");

  const elCart = $("v-cart");
  const elSubtotal = $("v-subtotal");
  const elIvaAmount = $("v-ivaAmount");
  const elTotal = $("v-total");

  const elSell = $("v-sell");
  const elClear = $("v-clear");
  const elStatus = $("v-status");

  const elRequireTicket = $("v-requireTicket");
  const elPreviewBtn = $("v-previewBtn");
  const elPrintBtn = $("v-printBtn");
  const elTicketPreview = $("v-ticketPreview");

  let cart = []; // [{productId, qty, price}]
  let lastSaleId = null;

  function state(){ return dpGetState(); }

  function renderClients(){
    const st = state();
    elClient.innerHTML = "";

    // Mostrador / default option
    const gen = (st.clients||[]).find(c=>c.id==="GEN");
    const optGen = document.createElement("option");
    optGen.value = "GEN";
    optGen.textContent = gen?.name || "Mostrador";
    elClient.appendChild(optGen);

    // Other clients
    (st.clients||[]).filter(c=>c.id!=="GEN").forEach(c=>{
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name || "Cliente";
      elClient.appendChild(opt);
    });

    elClient.value = "GEN";
  }

  function productCard(p){
    const div = document.createElement("div");
    div.className = "pcard";

    const img = document.createElement("div");
    img.className = "pimg";
    if(p.image){
      const im = document.createElement("img");
      im.src = p.image;
      img.appendChild(im);
    }else{
      img.textContent = "IMG";
    }

    const meta = document.createElement("div");
    meta.className = "pmeta";
    meta.innerHTML = `
      <div class="name">${p.name}</div>
      <div class="sub">
        <span>${p.sku || "—"}</span>
        <span>Stock: ${p.stock ?? 0}</span>
        <span>${p.category || "sin categoría"}</span>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "pactions";

    const price = document.createElement("div");
    price.className = "price";
    price.textContent = dpFmtMoney(p.price);

    const add = document.createElement("button");
    add.className = "btn btn--mini";
    add.textContent = "Agregar";
    add.onclick = ()=>addToCart(p.id);

    actions.appendChild(price);
    actions.appendChild(add);

    div.appendChild(img);
    div.appendChild(meta);
    div.appendChild(actions);

    return div;
  }

  function getMostSoldList(st){
    const ms = st.analytics?.mostSold || {};
    const pairs = Object.entries(ms).sort((a,b)=>b[1]-a[1]).slice(0, 12);
    const ids = pairs.map(([id])=>id);
    const list = ids.map(id=>st.products.find(p=>p.id===id)).filter(Boolean);
    if(list.length === 0) return (st.products||[]).slice(0, 12);
    return list;
  }

  function getRecentList(st){
    const ids = st.analytics?.recentProducts || [];
    const list = ids.map(id=>st.products.find(p=>p.id===id)).filter(Boolean);
    if(list.length === 0) return (st.products||[]).slice(0, 12);
    return list.slice(0, 12);
  }

  function renderCatalog(){
    const st = state();
    const q = (elSearch.value||"").trim();
    let list = [];

    if(q){
      list = dpFindProductByQuery(st, q);
    }else{
      if(elView.value === "top") list = getMostSoldList(st);
      else if(elView.value === "recent") list = getRecentList(st);
      else list = (st.products||[]).slice(0, 50);
    }

    elCatalog.innerHTML = "";
    if(list.length === 0){
      elEmpty.style.display = "block";
    }else{
      elEmpty.style.display = "none";
      list.forEach(p => elCatalog.appendChild(productCard(p)));
    }
  }

  function findCartItem(productId){
    return cart.find(i=>i.productId === productId);
  }

  function addToCart(productId){
    const st = state();
    const p = st.products.find(x=>x.id===productId);
    if(!p) return;

    dpSetState(s=>{ dpRecordProductViewed(s, productId); return s; });

    const it = findCartItem(productId);
    if(it) it.qty += 1;
    else cart.push({ productId, qty:1, price:Number(p.price||0) });

    renderCart();
    renderTotals();

    // Barcode behavior: clear search after add
    elSearch.value = "";
    renderCatalog();
  }

  function removeFromCart(productId){
    cart = cart.filter(i=>i.productId !== productId);
    renderCart();
    renderTotals();
  }

  function changeQty(productId, delta){
    const it = findCartItem(productId);
    if(!it) return;
    it.qty += delta;
    if(it.qty <= 0) removeFromCart(it.productId);
    renderCart();
    renderTotals();
  }

  function renderCart(){
    const st = state();
    elCart.innerHTML = "";
    if(cart.length === 0){
      const div = document.createElement("div");
      div.className = "muted";
      div.textContent = "Carrito vacío.";
      elCart.appendChild(div);
      return;
    }

    cart.forEach(it=>{
      const p = st.products.find(x=>x.id===it.productId);
      const name = p?.name || it.productId;
      const sku = p?.sku || "—";
      const stock = p?.stock ?? 0;

      const row = document.createElement("div");
      row.className = "citem";

      const left = document.createElement("div");
      left.className = "cleft";
      left.innerHTML = `
        <div class="ctitle">${name}</div>
        <div class="csub">
          <span>${sku}</span>
          <span>Inv: ${stock}</span>
          <span>${dpFmtMoney(it.price)}</span>
        </div>
      `;

      const right = document.createElement("div");

      const qty = document.createElement("div");
      qty.className = "qty";

      const minus = document.createElement("button");
      minus.className = "qbtn";
      minus.textContent = "−";
      minus.onclick = ()=>changeQty(it.productId, -1);

      const num = document.createElement("div");
      num.className = "qnum";
      num.textContent = it.qty;

      const plus = document.createElement("button");
      plus.className = "qbtn";
      plus.textContent = "+";
      plus.onclick = ()=>changeQty(it.productId, +1);

      const del = document.createElement("button");
      del.className = "btn btn--mini btn--ghost";
      del.textContent = "Quitar";
      del.onclick = ()=>removeFromCart(it.productId);

      qty.appendChild(minus);
      qty.appendChild(num);
      qty.appendChild(plus);

      right.appendChild(qty);
      right.appendChild(del);

      row.appendChild(left);
      row.appendChild(right);

      elCart.appendChild(row);
    });
  }

  function calcTotals(){
    const subtotal = cart.reduce((a,b)=>a + (b.qty*b.price), 0);
    const ivaRate = Number(elIVA.value || 0);
    const ivaAmount = subtotal * (ivaRate/100);
    const total = subtotal + ivaAmount;
    return { subtotal, ivaAmount, total, ivaRate };
  }

  function renderTotals(){
    const t = calcTotals();
    elSubtotal.textContent = dpFmtMoney(t.subtotal);
    elIvaAmount.textContent = dpFmtMoney(t.ivaAmount);
    elTotal.textContent = dpFmtMoney(t.total);
  }

  function clearCart(){
    cart = [];
    elNote.value = "";
    elIVA.value = 0;
    renderCart();
    renderTotals();
    elStatus.textContent = "";
    if(elClient) elClient.value = "GEN";
    if(elPayMethod) elPayMethod.value = "efectivo";
    if(elRequireTicket) elRequireTicket.checked = false;
  }

  function canSell(){
    if(cart.length === 0) return { ok:false, msg:"Carrito vacío." };
    const st = state();
    for(const it of cart){
      const p = st.products.find(x=>x.id===it.productId);
      if(!p) return { ok:false, msg:"Producto no encontrado." };
      if(Number(p.stock||0) < Number(it.qty||0)){
        return { ok:false, msg:`Stock insuficiente: ${p.name} (stock ${p.stock})` };
      }
    }
    return { ok:true, msg:"" };
  }

  function getClientName(st, clientId){
    const c = (st.clients||[]).find(x=>x.id===clientId);
    return c?.name || "Mostrador";
  }


function makeTicketFromSale(sale){
  const st = state();
  const biz = (typeof dpGetBizInfo==='function') ? dpGetBizInfo() : (st.meta?.business || { name:'Dinamita Gym' });
  const tcfg = (typeof dpGetTicketCfg==='function') ? dpGetTicketCfg() : { ivaDefault:0, message:'Gracias por tu compra en Dinamita Gym 💥' };

  const width = 32; // ancho aprox 58mm
  const dash = '-'.repeat(width);
  const esc = (s)=> String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmtLine = (left, right)=>{
    const L = String(left??'');
    const R = String(right??'');
    const spaces = Math.max(1, width - (L.length + R.length));
    return L + ' '.repeat(spaces) + R;
  };

  const dt = sale.createdAt ? new Date(sale.createdAt) : new Date();
  const dateStr = isNaN(dt.getTime()) ? '' : dt.toISOString().replace('T',' ').substring(0,19);

  const rows = [];
  rows.push(biz.name || 'Dinamita Gym');
  if(biz.address) rows.push(biz.address);
  if(biz.phone) rows.push(biz.phone);
  if(biz.email) rows.push(biz.email);
  if(biz.social) rows.push(biz.social);
  rows.push(dash);
  rows.push('TICKET: ' + (sale.ticketId || '')); 
  if(dateStr) rows.push('Fecha:  ' + dateStr);
  rows.push('Cliente: ' + (sale.customerName || 'Cliente General'));
  rows.push('Pago:    ' + (sale.paymentMethod || 'efectivo'));
  rows.push(dash);

  const items = Array.isArray(sale.items) ? sale.items : [];
  for(const it of items){
    const name = String(it.name || it.title || 'Producto').slice(0, 18);
    const qty = Number(it.qty ?? it.quantity ?? 1) || 1;
    const unit = Number(it.unitPrice ?? it.price ?? 0) || 0;
    const lineTotal = Number(it.total ?? (unit*qty)) || 0;
    const left = `${name} x${qty}`;
    const right = formatMoney(lineTotal);
    rows.push(fmtLine(left, right));
  }

  rows.push(dash);
  rows.push(fmtLine('Subtotal:', formatMoney(sale.subtotal ?? 0)));
  rows.push(fmtLine('Total:',    formatMoney(sale.total ?? 0)));
  const ivaRate = (sale.ivaRate ?? tcfg.ivaDefault ?? 0);
  rows.push(fmtLine('IVA:', String(ivaRate) + '%'));
  rows.push(dash);
  rows.push((tcfg.message || 'Gracias por tu compra en Dinamita Gym 💥'));

  const ticketText = rows.join('\n');
  return `<pre class="ticket-pre">${esc(ticketText)}</pre>`;
}

function printTicketBySaleId(saleId){
  const st = state();
  const sale = st.sales.find(s=>s.id===saleId);
  if(!sale) return toast('No se encontró la venta');

  const ticketHTML = makeTicketFromSale(sale);
  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Ticket</title>
    <style>
      :root{ color-scheme: light; }
      body{ margin:0; padding:10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size:14px; font-weight:700; line-height:1.25; }
      pre{ margin:0; white-space:pre-wrap; word-break:break-word; }
      @media print{ body{ padding:0; } }
    </style>
  </head><body>${ticketHTML}</body></html>`;

  if(window.DP_PRINT_DOC){
    window.DP_PRINT_DOC(doc, 'Ticket');
  } else {
    // fallback
    const w = window.open('', '_blank');
    w.document.write(doc);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  }
}

  // Init
  renderClients();
  if(elView) elView.value = "all";
  if(elClient) elClient.value = "GEN";
  if(elPayMethod) elPayMethod.value = "efectivo";
  if(elRequireTicket) elRequireTicket.checked = false;
  renderCatalog();
  // Defaults on enter
  if(elClient){ elClient.value = (Array.from(elClient.options).some(o=>o.value==="GEN") ? "GEN" : (elClient.options[0]?.value||"")); }
  if(elPayMethod){ elPayMethod.value = "efectivo"; }
  if(elRequireTicket){ elRequireTicket.checked = false; }
  renderCatalog();
  renderCart();
  renderTotals();

  elSearch.addEventListener("input", handleSearchInput);
  elView.addEventListener("change", renderCatalog);
  elIVA.addEventListener("input", renderTotals);
  elClear.addEventListener("click", clearCart);
  elSell.addEventListener("click", doSell);

  elPreviewBtn.addEventListener("click", previewTicketFromCart);
  elPrintBtn.addEventListener("click", handlePrint);
    // Defaults
    if(elClient){ elClient.value = (Array.from(elClient.options).some(o=>o.value==="GEN") ? "GEN" : (elClient.options[0]?.value||"")); }
    if(elPayMethod){ elPayMethod.value = "efectivo"; }
    if(elRequireTicket){ elRequireTicket.checked = false; }
  })();
