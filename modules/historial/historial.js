/* Historial - Dinamita POS v0
   - Lista ventas y servicios (membresías)
   - Filtro por fechas y buscador
   - Reimprimir ticket
   - Borrar venta con reversa de inventario y borrado de membresía ligada
*/
(function(){
  const $ = (id)=>document.getElementById(id);

  const hSearch = $("h-search");
  const hFrom = $("h-from");
  const hTo = $("h-to");
  const hClear = $("h-clear");

  const hStats = $("h-stats");
  const hList = $("h-list");
  const hEmpty = $("h-empty");

  const hTicketTitle = $("h-ticketTitle");
  const hTicketPreview = $("h-ticketPreview");
  const hPrint = $("h-print");

  let lastTicketHtml = "";
  let lastTicketTitle = "Ticket";

  function state(){ return dpGetState(); }
  function fmtMoney(n){ return dpFmtMoney ? dpFmtMoney(n) : ("$"+Number(n||0).toFixed(2)); }
  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

  function getConfig(){
    const biz = (typeof dpGetBizInfo === "function") ? dpGetBizInfo() : { name:"DINÁMITA GYM", address:"", phone:"", email:"", social:"", logoDataUrl:"" };
    const tcfg = (typeof dpGetTicketCfg === "function") ? dpGetTicketCfg() : { message:"Gracias por tu compra en Dinamita Gym 💥" };
    return {
      logoDataUrl: biz.logoDataUrl || "",
      name: biz.name || "DINÁMITA GYM",
      address: biz.address || "",
      phone: biz.phone || "",
      email: biz.email || "",
      social: biz.social || "",
      message: tcfg.message || "Gracias por tu compra en Dinamita Gym 💥",
      ivaLabel: "IVA: 0%"
    };
  }



  function getClientName(clientId){
    const st = state();
    const c = (st.clients||[]).find(x=>x.id===clientId);
    if(c) return c.name;
    if(clientId === "GEN") return "Cliente General";
    return clientId || "Cliente";
  }

  function getProductName(pid){
    const st = state();
    const p = (st.products||[]).find(x=>x.id===pid);
    return p ? p.name : pid;
  }

  function openPrintWindow(html, title){
    if(window.DG && typeof window.DG.printHtml === "function") {
      window.DG.printHtml(html);
      return;
    }
    const w = window.open("", "_blank", "width=420,height=700");
    if(!w){ alert("No se pudo abrir la impresión. Habilita ventanas emergentes o imprime desde PC."); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(()=>{ try{ w.focus(); w.print(); }catch(e){} }, 250);
})();
