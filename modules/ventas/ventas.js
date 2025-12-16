/* Ventas - Dinamita POS v0
   Versión: v0.1.0
   Fecha: 2025-12-15
*/
(function(){
  const $ = (id)=>document.getElementById(id);

  const elSearch = $("v-search");
  const elView = $("v-view");
  const elCatalog = $("v-catalog");
  const elEmpty = $("v-empty");

  const elClient = $("v-client");
  const elIVA = $("v-iva");
  const elNote = $("v-note");

  const elCart = $("v-cart");
  const elSubtotal = $("v-subtotal");
  const elIvaAmount = $("v-ivaAmount");
  const elTotal = $("v-total");

  const elSell = $("v-sell");
  const elClear = $("v-clear");
  const elStatus = $("v-status");

  let cart = []; // [{productId, qty, price}]

  function state(){ return dpGetState(); }

  function renderClients(){
    const st = state();
    elClient.innerHTML = "";
    (st.clients||[]).forEach(c=>{
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name || "Cliente";
      elClient.appendChild(opt);
    });
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
    if(it){
      it.qty += 1;
    }else{
      cart.push({ productId, qty:1, price:Number(p.price||0) });
    }
    renderCart();
    renderTotals();

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
    if(it.qty <= 0) removeFromCart(productId);
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

  function doSell(){
    const v = canSell();
    if(!v.ok){
      elStatus.textContent = v.msg;
      return;
    }

    const clientId = elClient.value || "C000";
    const note = (elNote.value||"").trim();
    const { ivaRate } = calcTotals();

    dpCreateSale({ clientId, cartItems: cart, note, iva: ivaRate });

    const after = state();
    const ticket = after.sales?.[0]?.id || "TICKET";

    clearCart();
    renderCatalog();
    elStatus.textContent = `Venta realizada: ${ticket}`;
  }

  function handleSearchInput(){
    const q = (elSearch.value||"").trim();
    const st = state();

    // exact barcode match => auto add + clear
    const exact = st.products.find(p => String(p.barcode||"") === q);
    if(exact){
      addToCart(exact.id);
      return;
    }
    renderCatalog();
  }

  renderClients();
  renderCatalog();
  renderCart();
  renderTotals();

  elSearch.addEventListener("input", handleSearchInput);
  elView.addEventListener("change", renderCatalog);
  elIVA.addEventListener("input", renderTotals);
  elClear.addEventListener("click", clearCart);
  elSell.addEventListener("click", doSell);
})();
