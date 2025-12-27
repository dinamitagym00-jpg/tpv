/* Dinamita POS v0 – Módulo Membresías
   Fix: el archivo estaba truncado (SyntaxError) y por eso el súper buscador
   de clientes no funcionaba en tablet/cel.
*/

(function(){
  "use strict";

  // Helpers
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  const pad2 = (n) => String(n).padStart(2, "0");
  const toISODate = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const parseISO = (s) => {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const addDays = (isoDate, days) => {
    const d = parseISO(isoDate);
    if (!d) return "";
    d.setDate(d.getDate() + (Number(days)||0));
    return toISODate(d);
  };

  // DOM refs
  const clientQuery = $("#m-clientQuery");
  const clientPick  = $("#m-clientPick");
  const selType     = $("#m-type");
  const inpDays     = $("#m-days");
  const inpStart    = $("#m-start");
  const inpEnd      = $("#m-end");
  const inpPrice    = $("#m-price");
  const inpNotes    = $("#m-notes");
  const chkTicket   = $("#m-generateTicket");
  const ticketBox   = $("#m-ticketPreview");
  const btnClear    = $("#m-btnClear");
  const btnSave     = $("#m-btnSave");
  const btnCharge   = $("#m-btnCharge");
  const btnPrint    = $("#m-btnPrint");
  const btnCatalog  = $("#m-btnCatalog");

  let selectedClientId = null;
  let lastTicketHTML = "";

  function getClients(){
    const st = window.dpGetState?.();
    return st?.clients || [];
  }

  function getCatalog(){
    return window.dpGetMembershipCatalog?.() || [];
  }

  function setPickVisible(visible){
    if (!clientPick) return;
    clientPick.classList.toggle("hidden", !visible);
  }

  function renderClientPick(q){
    if (!clientPick) return;
    const query = (q||"").trim().toLowerCase();
    if (!query){
      clientPick.innerHTML = "";
      setPickVisible(false);
      return;
    }

    const list = getClients()
      .map(c => ({
        ...c,
        _hay: `${c.name||""} ${c.id||""} ${c.phone||""}`.toLowerCase()
      }))
      .filter(c => c._hay.includes(query))
      .slice(0, 10);

    if (!list.length){
      clientPick.innerHTML = `<div class="pickItem muted">Sin resultados</div>`;
      setPickVisible(true);
      return;
    }

    clientPick.innerHTML = list.map(c => {
      const phone = c.phone ? ` • ${c.phone}` : "";
      const id = c.id ? `<span class="muted">(${c.id})</span>` : "";
      return `
        <button type="button" class="pickItem" data-id="${c.id||""}">
          <div class="pickName">${escapeHTML(c.name||"Cliente")} ${id}</div>
          <div class="pickMeta muted">${escapeHTML(phone.replace(" • ", ""))}</div>
        </button>
      `;
    }).join("");

    // Click (pointerdown para que funcione en tablet aunque el input pierda focus)
    $$(".pickItem", clientPick).forEach(btn => {
      on(btn, "pointerdown", (ev)=>{
        ev.preventDefault();
        const id = btn.getAttribute("data-id");
        const c = getClients().find(x => String(x.id) === String(id));
        if (!c) return;
        selectedClientId = c.id;
        if (clientQuery) clientQuery.value = c.name || "";
        clientPick.innerHTML = "";
        setPickVisible(false);
        // deja el cursor listo para seguir
        setTimeout(()=> clientQuery?.focus?.(), 0);
      });
    });

    setPickVisible(true);
  }

  function escapeHTML(s){
    return String(s||"")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function fillCatalog(){
    if (!selType) return;
    const cat = getCatalog();
    selType.innerHTML = `
      <option value="">Selecciona…</option>
      ${cat.map(p => `<option value="${p.id}">${escapeHTML(p.name)} — $${Number(p.price||0).toFixed(2)}</option>`).join("")}
    `;
  }

  function onTypeChanged(){
    const cat = getCatalog();
    const plan = cat.find(p => String(p.id) === String(selType?.value||""));
    if (!plan){
      if (inpDays) inpDays.value = "";
      if (inpPrice) inpPrice.value = "";
      return;
    }
    if (inpDays) inpDays.value = String(plan.days ?? "");
    if (inpPrice) inpPrice.value = Number(plan.price||0).toFixed(2);
    // Autocompleta fin
    if (inpStart && inpStart.value){
      const end = addDays(inpStart.value, (Number(plan.days)||0)-1);
      if (inpEnd) inpEnd.value = end;
    }
  }

  function onStartOrDaysChanged(){
    const days = Number(inpDays?.value||0);
    if (!inpStart || !inpEnd) return;
    if (!inpStart.value || !days) return;
    inpEnd.value = addDays(inpStart.value, days-1);
  }

  function clearForm(){
    selectedClientId = null;
    if (clientQuery) clientQuery.value = "";
    if (selType) selType.value = "";
    if (inpDays) inpDays.value = "";
    if (inpStart) inpStart.value = "";
    if (inpEnd) inpEnd.value = "";
    if (inpPrice) inpPrice.value = "";
    if (inpNotes) inpNotes.value = "";
    if (ticketBox) ticketBox.textContent = "Sin ticket.";
    lastTicketHTML = "";
    clientPick && (clientPick.innerHTML = "");
    setPickVisible(false);
  }

  function validate(){
    const cat = getCatalog();
    const planId = selType?.value || "";
    const plan = cat.find(p => String(p.id) === String(planId));
    if (!plan) return { ok:false, msg:"Selecciona un tipo de membresía." };

    // Cliente: si no hay id seleccionado, intenta resolver por nombre exacto
    let clientId = selectedClientId;
    const q = (clientQuery?.value||"").trim();
    if (!clientId && q){
      const c = getClients().find(x => String(x.name||"").toLowerCase() === q.toLowerCase());
      if (c) clientId = c.id;
    }
    if (!clientId) return { ok:false, msg:"Selecciona un cliente del buscador." };
    if (!inpStart?.value) return { ok:false, msg:"Selecciona la fecha de inicio." };

    return { ok:true, plan, clientId };
  }

  function buildTicketHTMLFromSale(sale){
    const biz = window.dpGetBizInfo?.() || { name:"Dinamita Gym" };
    const cfg = window.dpGetTicketCfg?.() || { ivaDefault:0, message:"Gracias por tu compra en Dinamita Gym 💥" };
    const dt = sale?.createdAt ? new Date(sale.createdAt) : new Date();
    const dateStr = `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())}`;
    const items = sale?.items || [];
    const subtotal = Number(sale.subtotal||0);
    const iva = Number(sale.iva||0);
    const total = Number(sale.total||0);
    const pay = sale?.payment || "";
    const clientName = sale?.clientName || "Mostrador";

    const lines = items.map(it => {
      const qty = Number(it.qty||1);
      const price = Number(it.price||0);
      const name = it.name || "Item";
      return `
        <div class="tRow">
          <div class="tName">${escapeHTML(name)}</div>
          <div class="tQty">${qty} x</div>
          <div class="tPrice">$${(qty*price).toFixed(2)}</div>
        </div>`;
    }).join("");

    return `
      <div class="ticket">
        <div class="tCenter tBold">${escapeHTML(biz.name||"Dinamita Gym")}</div>
        ${biz.address ? `<div class="tCenter">${escapeHTML(biz.address)}</div>` : ""}
        ${biz.phone ? `<div class="tCenter">${escapeHTML(biz.phone)}</div>` : ""}
        ${biz.email ? `<div class="tCenter">${escapeHTML(biz.email)}</div>` : ""}
        ${biz.social ? `<div class="tCenter">${escapeHTML(biz.social)}</div>` : ""}
        <hr />
        <div class="tRow"><div>Ticket:</div><div class="tRight">${escapeHTML(sale.id||"")}</div></div>
        <div class="tRow"><div>Fecha:</div><div class="tRight">${escapeHTML(dateStr)}</div></div>
        <div class="tRow"><div>Cliente:</div><div class="tRight">${escapeHTML(clientName)}</div></div>
        <div class="tRow"><div>Pago:</div><div class="tRight">${escapeHTML(pay)}</div></div>
        <hr />
        ${lines}
        <hr />
        <div class="tRow tBold"><div>Subtotal:</div><div class="tRight">$${subtotal.toFixed(2)}</div></div>
        <div class="tRow tBold"><div>IVA:</div><div class="tRight">$${iva.toFixed(2)}</div></div>
        <div class="tRow tBold tBig"><div>Total:</div><div class="tRight">$${total.toFixed(2)}</div></div>
        <hr />
        <div class="tCenter">${escapeHTML(cfg.message || "Gracias por tu compra en Dinamita Gym 💥")}</div>
      </div>
    `;
  }

  function renderTicketById(ticketId){
    const st = window.dpGetState?.();
    const sale = (st?.sales || []).find(s => String(s.id) === String(ticketId));
    if (!sale){
      lastTicketHTML = "";
      if (ticketBox) ticketBox.textContent = "Sin ticket.";
      return;
    }
    const html = buildTicketHTMLFromSale(sale);
    lastTicketHTML = html;
    if (ticketBox) ticketBox.innerHTML = html;
  }

  function openPrintWindow(html){
    const w = window.open("", "PRINT", "height=650,width=420");
    if (!w) return;
    w.document.write(`
      <html><head><title>Ticket</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; margin:12px; }
          .ticket{ font-size: 15px; font-weight:700; }
          .tCenter{ text-align:center; }
          .tRight{ text-align:right; }
          .tRow{ display:flex; justify-content:space-between; gap:10px; margin:2px 0; }
          .tName{ flex:1; }
          .tQty{ width:48px; text-align:right; }
          .tPrice{ width:90px; text-align:right; }
          .tBold{ font-weight:800; }
          .tBig{ font-size:18px; }
          hr{ border:none; border-top:1px dashed #999; margin:8px 0; }
        </style>
      </head><body>
        ${html}
        <script>window.onload=function(){ window.focus(); window.print(); window.close(); };</script>
      </body></html>
    `);
    w.document.close();
  }

  function handleSaveOnly(){
    const v = validate();
    if (!v.ok){ window.dpToast?.(v.msg||"Falta información"); return; }

    const client = getClients().find(c => String(c.id) === String(v.clientId));
    const payload = {
      clientId: v.clientId,
      clientName: client?.name || (clientQuery?.value||"Mostrador"),
      planId: v.plan.id,
      planName: v.plan.name,
      days: Number(v.plan.days||inpDays?.value||0),
      startDate: inpStart.value,
      endDate: inpEnd?.value || addDays(inpStart.value, (Number(v.plan.days||0)-1)),
      price: Number(inpPrice?.value || v.plan.price || 0),
      notes: inpNotes?.value || "",
    };

    window.dpCreateMembership?.(payload);
    window.dpToast?.("Membresía guardada");
    // Sin ticket, porque no es cobro
  }

  function handleCharge(){
    const v = validate();
    if (!v.ok){ window.dpToast?.(v.msg||"Falta información"); return; }

    // Forma de pago: reutilizamos la de Ventas si existe, si no, efectivo
    const paymentSel = document.querySelector("#v-payment");
    const payment = paymentSel?.value || "efectivo";

    const client = getClients().find(c => String(c.id) === String(v.clientId));
    const res = window.dpChargeMembership?.({
      clientId: v.clientId,
      clientName: client?.name || (clientQuery?.value||"Mostrador"),
      planId: v.plan.id,
      startDate: inpStart.value,
      payment,
      note: inpNotes?.value || "",
    });

    if (res?.ticketId && chkTicket?.checked){
      renderTicketById(res.ticketId);
    } else {
      if (ticketBox) ticketBox.textContent = "Sin ticket.";
      lastTicketHTML = "";
    }

    window.dpToast?.("Membresía cobrada");
  }

  function init(){
    fillCatalog();

    // Super buscador
    on(clientQuery, "input", () => {
      // Cuando el usuario escribe, se resetea la selección (obliga a elegir)
      selectedClientId = null;
      renderClientPick(clientQuery.value);
    });

    // iOS/Android: a veces el input no dispara input al autocompletar, por eso también keyup
    on(clientQuery, "keyup", () => {
      selectedClientId = null;
      renderClientPick(clientQuery.value);
    });

    on(clientQuery, "focus", () => renderClientPick(clientQuery.value));

    // cerrar al salir del input (con delay para permitir click en lista)
    on(clientQuery, "blur", () => setTimeout(()=> setPickVisible(false), 200));

    // Tipos
    on(selType, "change", onTypeChanged);
    on(inpStart, "change", () => { onStartOrDaysChanged(); });
    on(inpDays, "input", () => { onStartOrDaysChanged(); });

    // Botones
    on(btnClear, "click", clearForm);
    on(btnSave, "click", handleSaveOnly);
    on(btnCharge, "click", handleCharge);

    on(btnPrint, "click", () => {
      if (!lastTicketHTML){ window.dpToast?.("Primero genera el ticket."); return; }
      openPrintWindow(lastTicketHTML);
    });

    on(btnCatalog, "click", () => {
      // Abre/cierra panel del catálogo (si existe)
      const panel = $("#m-catalogPanel");
      if (panel) panel.classList.toggle("hidden");
    });

    // Default: hoy
    if (inpStart && !inpStart.value){
      inpStart.value = toISODate(new Date());
    }
    onTypeChanged();
  }

  // Ejecuta init cuando el módulo esté en el DOM
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
