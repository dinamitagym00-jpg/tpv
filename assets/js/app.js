
const content = document.getElementById('content');

async function loadModule(name){
  const html = await fetch(`modules/${name}/${name}.html`).then(r=>r.text());
  content.innerHTML = html;
  const script = document.createElement('script');
  script.src = `modules/${name}/${name}.js`;
  document.body.appendChild(script);
}

document.querySelectorAll('#menu button').forEach(b=>{
  b.onclick = ()=>loadModule(b.dataset.module);
});

loadModule('dashboard');
