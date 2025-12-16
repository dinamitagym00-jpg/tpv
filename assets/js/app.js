/* Dinamita POS v0 - App Loader
   Versión: v0.1.0
   Fecha: 2025-12-15
*/
const content = document.getElementById('content');

function dpClearModuleAssets(){
  document.querySelectorAll('link[data-dp-module-css]').forEach(el => el.remove());
  document.querySelectorAll('script[data-dp-module-js]').forEach(el => el.remove());
}

async function loadModule(name){
  dpClearModuleAssets();

  const html = await fetch(`modules/${name}/${name}.html`, { cache:"no-store" }).then(r=>r.text());
  content.innerHTML = html;

  const cssLink = document.createElement('link');
  cssLink.rel = "stylesheet";
  cssLink.href = `modules/${name}/${name}.css`;
  cssLink.setAttribute("data-dp-module-css","1");
  document.head.appendChild(cssLink);

  const script = document.createElement('script');
  script.src = `modules/${name}/${name}.js`;
  script.setAttribute("data-dp-module-js","1");
  document.body.appendChild(script);
}

document.querySelectorAll('#menu button').forEach(b=>{
  b.addEventListener('click', ()=>loadModule(b.dataset.module));
});

loadModule('ventas');
