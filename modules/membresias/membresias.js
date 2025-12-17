/* Membresías - Dinamita POS v0
   - "Guardar y Cobrar" crea: 1) Venta (servicio) 2) Registro de membresía ligado a ticket
   - IVA por defecto: 0
*/
(function(){
  const $ = (id)=>document.getElementById(id);

  const elId = $("m-id");
  const elMode = $("m-mode");
  const elClient = $("m-client");
  const elType = $("m-type");
  const elSubtype = $("m-subtype");
  const elDays = $("m-days");
  const elStart = $("m-start");
  const elEnd = $("m-end");
  const elPrice = $("m-price");
  const elNotes = $("m-notes");
  const elStatus = $("m-status");

  const elMakeTicket = $("m-makeTicket");
  const elPrint = $("m-print");
  const elTicketPreview = $("m-ticketPreview");

  const elClear = $("m-clear");
  const elSave = $("m-save");
  const elCharge = $("m-charge");

  const elSearch = $("m-search");
  const elFrom = $("m-from");
  const elTo = $("m-to");
  const elExportCsv = $("m-exportCsv");
  const elExportPdf = $("m-exportPdf");

  const elList = $("m-list");
  const elEmpty = $("m-empty");

  let lastTicketHtml = "";
  let lastTicketTitle = "Ticket";

  function state(){ return dpGetState(); }

  function fmtMoney(n){ return dpFmtMoney ? dpFmtMoney(n) : ("$"+Number(n||0).toFixed(2)); }

  function ensureDefaults(){
    const st = state();
    st.meta = st.meta || {};
    if(!st.meta.membershipOptions){
      st.meta.membershipOptions = {
        durations: [1,7,30,183,365],
        types: [
          { name:"Visita", subtypes:["Normal","Socio","VIP"], defaultDays:1 },
          { name:"Semana", subtypes:["Normal","Socio","VIP"], defaultDays:7 },
          { name:"Mensual", subtypes:["Normal","Socio","VIP"], defaultDays:30 },
          { name:"Medio Año", subtypes:["Normal"], defaultDays:183 },
          { name:"Anual", subtypes:["Normal"], defaultDays:365 }
        ]
      };
      dpSetState(s=> (Object.assign(s.meta, st.meta), s));
    }
  }

  function loadClients(){
    const st = state();
    const list = (st.clients && st.clients.length) ? st.clients : [{id:"GEN", name:"Cliente General"}];
    elClient.innerHTML = "";
    list.forEach(c=>{
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      elClient.appendChild(opt);
    });
  }

  function loadTypes(){
    const st = state();
    const types = st.meta?.membershipOptions?.types || [];
    elType.innerHTML = "";
    types.forEach(t=>{
      const opt = document.createElement("option");
      opt.value = t.name;
      opt.textContent = t.name;
      elType.appendChild(opt);
    });
  }

  function setSubtypesAndDefaults(){
    const st = state();
    const types = st.meta?.membershipOptions?.types || [];
    const t = types.find(x=>x.name===elType.value) || types[0];
    const subs = t?.subtypes || ["Normal"];
    elSubtype.innerHTML = "";
    subs.forEach(s=>{
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      elSubtype.appendChild(opt);
    });
    if(t?.defaultDays){
      elDays.value = String(t.defaultDays);
    }
    recalcEnd();
  }

  function recalcEnd(){
    const s = new Date(elStart.value);
    if(!elStart.value || isNaN(s.getTime())) return;
    s.setDate(s.getDate() + Number(elDays.value||0));
    elEnd.value = s.toISOString().slice(0,10);
  }

  function resetForm(){
    elId.value = "";
    elMode.textContent = "Modo: Alta";
    elDays.value = "30";
    elStart.value = new Date().toISOString().slice(0,10);
    recalcEnd();
    elPrice.value = "0";
    elNotes.value = "";
    elStatus.textContent = "";
    elTicketPreview.textContent = "Sin ticket.";
    lastTicketHtml = "";
    elPrint.disabled = true;
  }

  function getClientName(clientId){
    const st = state();
    const c = (st.clients||[]).find(x=>x.id===clientId);
    if(c) return c.name;
    if(clientId === "GEN") return "Cliente General";
    return clientId || "Cliente";
  }

  function getConfig(){
    const st = state();
    const cfg = st.config || {};
    const biz = cfg.business || {};
    const ticket = cfg.ticket || {};
    return {
      name: biz.name || "DINÁMITA GYM",
      address: biz.address || "",
      phone: biz.phone || "",
      message: ticket.message || "Gracias por tu compra en Dinamita Gym 💥",
      ivaLabel: ticket.ivaLabel || "IVA: 0%"
    };
  }

  function buildTicketHtmlFromSale(sale){
    const cfg = getConfig();
    const clientName = getClientName(sale.clientId);
    const item = sale.items?.[0];
    const concept = item?.name || "Servicio";
    const price = item?.price ?? sale.total;

    const lines = [
      cfg.name,
      cfg.address,
      cfg.phone ? ("Tel: " + cfg.phone) : "",
      "------------------------------",
      "TICKET: " + sale.id,
      "Fecha: " + (sale.at || "").replace("T"," ").slice(0,19),
      "Cliente: " + clientName,
      "------------------------------",
      concept,
      "Total: " + fmtMoney(price),
      cfg.ivaLabel,
      "------------------------------",
      cfg.message
    ].filter(Boolean);

    // Render as pre text (for preview) and also printable HTML
    const pre = lines.join("\n");

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${sale.id}</title>
<style>
  body{ font-family: ui-monospace, Menlo, Consolas, monospace; padding:12px; }
  .ticket{ max-width:320px; }
  pre{ white-space:pre-wrap; font-size:12px; line-height:1.25; margin:0; }
  .btns{ margin-top:10px; display:none; }
  @media print{ body{ padding:0; } }
</style>
</head>
<body>
<div class="ticket"><pre>${escapeHtml(pre)}</pre></div>
<script>window.focus();</script>
</body>
</html>`;

    return { pre, html, title: sale.id };
  }

  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

  function openPrintWindow(html, title){
    const w = window.open("", "_blank", "width=400,height=650");
    if(!w){ alert("Tu navegador bloqueó la ventana emergente."); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.document.title = title || "Ticket";
    w.focus();
    w.print();
  }

  function saveOnly(){
    const clientId = elClient.value;
    const type = elType.value;
    const subtype = elSubtype.value;
    const days = Number(elDays.value||0);
    const start = elStart.value;
    const notes = elNotes.value.trim();
    const price = Number(elPrice.value||0);

    dpCreateMembership({ clientId, type, subtype, days, startDate: start, notes, price, saleTicketId:"" });
    elStatus.textContent = "Membresía guardada (sin cobro).";
    renderList();
  }

  function charge(){
    const clientId = elClient.value;
    const type = elType.value;
    const subtype = elSubtype.value;
    const days = Number(elDays.value||0);
    const start = elStart.value;
    const notes = elNotes.value.trim();
    const price = Number(elPrice.value||0);

    const ticketId = dpChargeMembership({ clientId, type, subtype, days, startDate: start, notes, price });

    const st = state();
    const sale = (st.sales||[]).find(s=>s.id===ticketId) || (st.sales||[])[0];

    elStatus.textContent = "Membresía cobrada. Ticket: " + (ticketId||"");
    renderList();

    if(elMakeTicket.checked && sale){
      const t = buildTicketHtmlFromSale(sale);
      elTicketPreview.textContent = t.pre;
      lastTicketHtml = t.html;
      lastTicketTitle = t.title;
      elPrint.disabled = false;
    }else{
      elTicketPreview.textContent = "Sin ticket.";
      lastTicketHtml = "";
      elPrint.disabled = true;
    }
  }

  function pillClass(endISO){
    const now = new Date();
    const e = new Date(endISO);
    const diffDays = (e - now) / 86400000;
    if(diffDays < 0) return "red";
    if(diffDays <= 5) return "orange";
    return "green";
  }

  function renderList(){
    const st = state();
    const q = (elSearch.value||"").trim().toLowerCase();
    const from = elFrom.value ? new Date(elFrom.value) : null;
    const to = elTo.value ? new Date(elTo.value) : null;

    let list = st.memberships || [];
    if(q){
      list = list.filter(m=>{
        const name = getClientName(m.clientId).toLowerCase();
        return (m.id||"").toLowerCase().includes(q) ||
               (m.clientId||"").toLowerCase().includes(q) ||
               name.includes(q);
      });
    }
    if(from){
      list = list.filter(m=> new Date(m.start) >= from);
    }
    if(to){
      const t = new Date(to);
      t.setHours(23,59,59,999);
      list = list.filter(m=> new Date(m.start) <= t);
    }

    elList.innerHTML = "";
    if(!list.length){
      elEmpty.style.display = "block";
      return;
    }
    elEmpty.style.display = "none";

    list.slice(0, 300).forEach(m=>{
      const div = document.createElement("div");
      div.className = "mcard";

      const left = document.createElement("div");
      left.className = "mleft";
      const cls = pillClass(m.end);
      left.innerHTML = `
        <div class="mtitle">${getClientName(m.clientId)}</div>
        <div class="msub">
          <span class="pill ${cls}">${m.type} ${m.subtype}</span>
          <span class="pill">Inicio: ${m.start}</span>
          <span class="pill">Fin: ${m.end}</span>
          <span class="pill">${m.days} días</span>
          <span class="pill">${fmtMoney(m.price||0)}</span>
          ${m.saleTicketId ? `<span class="pill">Ticket: ${m.saleTicketId}</span>` : `<span class="pill">Sin cobro</span>`}
        </div>
        ${m.notes ? `<div class="msub"><span class="pill">Nota: ${escapeHtml(m.notes)}</span></div>` : ""}
      `;

      const actions = document.createElement("div");
      actions.className = "mactions";

      const reprint = document.createElement("button");
      reprint.className = "btn btn--ghost";
      reprint.textContent = "Reimprimir ticket";
      reprint.disabled = !m.saleTicketId;
      reprint.onclick = ()=>{
        const sale = (state().sales||[]).find(s=>s.id===m.saleTicketId);
        if(!sale){ alert("No se encontró la venta ligada."); return; }
        const t = buildTicketHtmlFromSale(sale);
        openPrintWindow(t.html, t.title);
      };

      const del = document.createElement("button");
      del.className = "btn";
      del.textContent = "Borrar membresía";
      del.onclick = ()=>{
        if(!confirm(`¿Borrar membresía ${m.id}? (No borra la venta ligada)`)) return;
        dpDeleteMembership(m.id);
        renderList();
      };

      actions.appendChild(reprint);
      actions.appendChild(del);

      div.appendChild(left);
      div.appendChild(actions);
      elList.appendChild(div);
    });
  }

  function exportCsv(){
    const st = state();
    const rows = [["id","clientId","clientName","type","subtype","days","start","end","price","saleTicketId","notes"]];
    (st.memberships||[]).forEach(m=>{
      rows.push([
        m.id,
        m.clientId,
        getClientName(m.clientId),
        m.type,
        m.subtype,
        m.days,
        m.start,
        m.end,
        m.price,
        m.saleTicketId,
        (m.notes||"").replaceAll("\n"," ")
      ]);
    });
    const csv = rows.map(r=>r.map(x=>`"${String(x??"").replaceAll('"','""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `membresias_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportPdf(){
    // Simple: print current list view
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Membresías</title>
<style>
  body{ font-family: Arial, sans-serif; padding:16px; }
  h1{ margin:0 0 10px 0; }
  .item{ border:1px solid #ddd; border-radius:10px; padding:10px; margin-bottom:10px; }
  .meta{ font-size:12px; color:#444; margin-top:4px; display:flex; gap:8px; flex-wrap:wrap; }
  .pill{ border:1px solid #ddd; border-radius:999px; padding:2px 8px; }
</style>
</head>
<body>
<h1>Membresías</h1>
${Array.from(elList.children).map(n=>`<div class="item">${n.querySelector(".mleft")?.innerHTML || ""}</div>`).join("")}
<script>window.focus();</script>
</body>
</html>`;
    const w = window.open("", "_blank");
    if(!w){ alert("Tu navegador bloqueó la ventana emergente."); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  // Wire up
  ensureDefaults();
  loadClients();
  loadTypes();
  setSubtypesAndDefaults();

  elStart.value = new Date().toISOString().slice(0,10);
  recalcEnd();

  elType.addEventListener("change", setSubtypesAndDefaults);
  elDays.addEventListener("input", recalcEnd);
  elStart.addEventListener("change", recalcEnd);

  elClear.addEventListener("click", ()=>{ resetForm(); renderList(); });
  elSave.addEventListener("click", (e)=>{ e.preventDefault(); saveOnly(); });
  elCharge.addEventListener("click", (e)=>{ e.preventDefault(); charge(); });

  elPrint.addEventListener("click", ()=>{
    if(!lastTicketHtml) return;
    openPrintWindow(lastTicketHtml, lastTicketTitle);
  });

  elSearch.addEventListener("input", renderList);
  elFrom.addEventListener("change", renderList);
  elTo.addEventListener("change", renderList);
  elExportCsv.addEventListener("click", exportCsv);
  elExportPdf.addEventListener("click", exportPdf);

  // Init range defaults
  const today = new Date().toISOString().slice(0,10);
  elFrom.value = "";
  elTo.value = "";

  renderList();
  resetForm();
})();
