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

    // Default / Mostrador option (GEN)
    const hasGen = (st.clients||[]).some(c=>c.id==="GEN");
    const optGen = document.createElement("option");
    optGen.value = "GEN";
    optGen.textContent = hasGen ? ((st.clients||[]).find(c=>c.id==="GEN")?.name || "Mostrador") : "Mostrador";
    elClient.appendChild(optGen);

    // Other clients
    (st.clients||[])
      .filter(c=>c.id!=="GEN")
      .forEach(c=>{
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.name || "Cliente";
        elClient.appendChild(opt);
      });

    // Force default to Mostrador every time we enter Ventas
    elClient.value = "GEN";
  })();
