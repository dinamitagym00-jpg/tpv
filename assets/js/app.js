
// ====== DG: impresión compatible con tablet (sin popups) ======
window.DG = window.DG || {};
window.DG.printHtml = function(html){
  try{
    const iframeId = "dg_print_iframe";
    let iframe = document.getElementById(iframeId);
    if(!iframe){
      iframe = document.createElement("iframe");
      iframe.id = iframeId;
      iframe.setAttribute("aria-hidden","true");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);
    }
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // En algunos navegadores móviles, el evento onload no siempre dispara con document.write,
    // por eso usamos un pequeño delay.
    setTimeout(()=>{
      try{
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }catch(err){
        console.warn("No se pudo imprimir desde iframe, intentando ventana nueva...", err);
        const w = window.open("", "_blank");
        if(!w){ alert("No se pudo abrir vista de impresión. Revisa permisos de ventanas emergentes."); return; }
        w.document.open(); w.document.write(html); w.document.close();
        setTimeout(()=>{ try{ w.focus(); w.print(); }catch(e){} }, 250);
      }
    }, 300);
  }catch(e){
    console.error(e);
    alert("No se pudo generar la impresión en este dispositivo.");
  }
};
// =============================================================

try{ dpEnsureSeedData(); }catch(e){ console.warn(e); }
try{ dpApplyTheme(); }catch(e){ console.warn(e); }
try{ dpRenderBranding(); }catch(e){ console.warn(e); }
/* Dinamita POS v0 - App Loader
   Versión: v0.1.1
   Fecha: 2025-12-15
   Cambio: CSS de módulos precargado (evita "brinco").
*/
const content = document.getElementById('content');

const menu = document.getElementById('menu');
const menuToggle = document.getElementById('dp-menuToggle');

function dpSetMenuCollapsed(collapsed){
  document.body.classList.toggle('dp-menu-collapsed', !!collapsed);
  try{ localStorage.setItem('dp_menu_collapsed', collapsed ? '1':'0'); }catch(e){}
  if(menuToggle){
    menuToggle.setAttribute('aria-label', collapsed ? 'Desplegar menú' : 'Plegar menú');
  }
}

(function initMenuToggle(){
  let collapsed = false;
  try{ collapsed = localStorage.getItem('dp_menu_collapsed') === '1'; }catch(e){}
  dpSetMenuCollapsed(collapsed);
  if(menuToggle){
    menuToggle.addEventListener('click', ()=> dpSetMenuCollapsed(!document.body.classList.contains('dp-menu-collapsed')));
  }
})();


function dpClearModuleAssets(){
  // Solo removemos JS de módulo (CSS ya viene precargado en index.html)
  document.querySelectorAll('script[data-dp-module-js]').forEach(el => el.remove());
}

async function loadModule(name){
  dpClearModuleAssets();

  const html = await fetch(`modules/${name}/${name}.html`, { cache:"no-store" }).then(r=>r.text());
  content.innerHTML = html;
  document.querySelectorAll('#menu button[data-module]').forEach(x=>x.classList.toggle('active', x.dataset.module===name));

  const script = document.createElement('script');
  script.src = `modules/${name}/${name}.js`;
  script.setAttribute("data-dp-module-js","1");
  document.body.appendChild(script);
}

document.querySelectorAll('#menu button[data-module]').forEach(b=>{
  b.addEventListener('click', ()=>{
    loadModule(b.dataset.module);
  });
});

loadModule('ventas');
