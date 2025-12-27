(function(){
  const $ = (id)=>document.getElementById(id);
  const money = (n)=>Number(n||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const isoToday = ()=> new Date().toISOString().slice(0,10);

  function st(){ return dpLoad() || dpDefaultState(); }
  function save(s){ dpSave(s); }

  function ensureArrays(s){
    s.expenses = Array.isArray(s.expenses) ? s.expenses : [];
    s.expenseCategories = Array.isArray(s.expenseCategories) && s.expenseCategories.length ? s.expenseCategories
      : ['servicios','renta','sueldos','insumos','mantenimiento','otros'];
    return s;
  }

  function openModal(){ $('g-catModal').setAttribute('aria-hidden','false'); renderCatChips(); $('g-newCat').value=''; $('g-newCat').focus(); }
  function closeModal(){ $('g-catModal').setAttribute('aria-hidden','true'); }

  function renderCategories(){
    const s = ensureArrays(st());
    const sel = $('g-categoria');
    sel.innerHTML = '';
    s.expenseCategories.forEach(c=>{
      const o=document.createElement('option');
      o.value=c; o.textContent=c;
      sel.appendChild(o);
    });
  }

  function renderCatChips(){
    const s = ensureArrays(st());
    const wrap = $('g-catChips');
    wrap.innerHTML = '';
    s.expenseCategories.forEach(c=>{
      const chip=document.createElement('div');
      chip.className='chip';
      chip.innerHTML = `${c} <button class="btn btn--ghost btn--mini" data-del="${c}" type="button">✕</button>`;
      wrap.appendChild(chip);
    });
    wrap.querySelectorAll('button[data-del]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const cat = btn.getAttribute('data-del');
        const s2 = ensureArrays(st());
        s2.expenseCategories = s2.expenseCategories.filter(x=>x!==cat);
        if(!s2.expenseCategories.length) s2.expenseCategories=['otros'];
        save(s2);
        renderCategories();
        renderCatChips();
      });
    });
  }

  function addCategory(){
    const name = ($('g-newCat').value||'').trim().toLowerCase();
    if(!name) return;
    const s = ensureArrays(st());
    if(!s.expenseCategories.includes(name)) s.expenseCategories.push(name);
    save(s);
    $('g-newCat').value='';
    renderCategories();
    renderCatChips();
  }

  function clearForm(){
    $('g-fecha').value = isoToday();
    $('g-categoria').value = $('g-categoria').options[0]?.value || 'otros';
    $('g-desc').value = '';
    $('g-monto').value = '';
    $('g-pago').value = 'efectivo';
    $('g-notas').value = '';
    $('g-desc').focus();
  }

  function saveExpense(){
    const fecha = $('g-fecha').value || isoToday();
    const categoria = $('g-categoria').value || 'otros';
    const desc = ($('g-desc').value||'').trim();
    const monto = Number($('g-monto').value||0);
    const pago = $('g-pago').value || 'efectivo';
    const notas = ($('g-notas').value||'').trim();

    if(!desc){ alert('Escribe una descripción.'); $('g-desc').focus(); return; }
    if(!(monto>0)){ alert('Ingresa un monto mayor a 0.'); $('g-monto').focus(); return; }

    const s = ensureArrays(st());
    s.expenses.unshift({
      id: dpId('G'),
      date: fecha,
      category: categoria,
      description: desc,
      amount: monto,
      payment: pago,
      notes: notas,
      createdAt: dpNowISO()
    });
    save(s);
    clearForm();
    renderTable();
    renderKPIs();
  }

  function inRange(d, desde, hasta){
    if(desde && d < desde) return false;
    if(hasta && d > hasta) return false;
    return true;
  }

  function pill(p){
    const cls = (p||'otro').toLowerCase();
    return `<span class="pillPay ${cls}">${cls}</span>`;
  }

  function renderTable(){
    const s = ensureArrays(st());
    const q = ($('g-q').value||'').trim().toLowerCase();
    const desde = $('g-desde').value || '';
    const hasta = $('g-hasta').value || '';

    const rows = s.expenses.filter(e=>{
      const hay = `${e.description||''} ${e.category||''} ${e.payment||''}`.toLowerCase();
      const qok = !q || hay.includes(q);
      const rok = inRange(e.date||'', desde, hasta);
      return qok && rok;
    });

    const tb = $('g-tbody');
    tb.innerHTML = '';
    let sum=0;

    rows.forEach(e=>{
      sum += Number(e.amount||0);
      const tr=document.createElement('tr');
      tr.innerHTML = `
        <td>${e.date||''}</td>
        <td>${e.category||''}</td>
        <td>${e.description||''}${e.notes?`<div class="muted" style="margin-top:4px;">${e.notes}</div>`:''}</td>
        <td>${pill(e.payment||'otro')}</td>
        <td class="right"><strong>${money(e.amount||0)}</strong></td>
        <td class="right"><button class="btn btn--ghost btn--mini" data-del="${e.id}" type="button">Borrar</button></td>
      `;
      tb.appendChild(tr);
    });

    $('g-count').textContent = `${rows.length} registro(s)`;
    $('g-sum').textContent = money(sum);

    tb.querySelectorAll('button[data-del]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const id = btn.getAttribute('data-del');
        if(!confirm('¿Borrar este gasto?')) return;
        const s2 = ensureArrays(st());
        s2.expenses = s2.expenses.filter(x=>x.id!==id);
        save(s2);
        renderTable();
        renderKPIs();
      });
    });
  }

  function renderKPIs(){
    const s = ensureArrays(st());
    const today = isoToday();
    const month = today.slice(0,7); // YYYY-MM
    const hoy = s.expenses.filter(e=>String(e.date||'')===today).reduce((a,b)=>a+Number(b.amount||0),0);
    const mes = s.expenses.filter(e=>String(e.date||'').slice(0,7)===month).reduce((a,b)=>a+Number(b.amount||0),0);
    const total = s.expenses.reduce((a,b)=>a+Number(b.amount||0),0);
    $('g-kpi-hoy').textContent = money(hoy);
    $('g-kpi-mes').textContent = money(mes);
    $('g-kpi-total').textContent = money(total);
  }

  function setDefaultFilters(){
    const today = isoToday();
    $('g-fecha').value = today;
    $('g-desde').value = today.slice(0,7) + "-01";
    $('g-hasta').value = today;
  }

  function wire(){
    $('g-guardar').addEventListener('click', saveExpense);
    $('g-limpiar').addEventListener('click', clearForm);
    $('g-aplicar').addEventListener('click', renderTable);
    $('g-reset').addEventListener('click', ()=>{
      $('g-q').value='';
      setDefaultFilters();
      renderTable();
    });
    $('g-q').addEventListener('input', ()=>{ renderTable(); });

    $('g-catManage').addEventListener('click', openModal);
    $('g-addCat').addEventListener('click', addCategory);
    $('g-newCat').addEventListener('keydown', (e)=>{ if(e.key==='Enter') addCategory(); });

    $('g-catModal').addEventListener('click',(e)=>{
      const t=e.target;
      if(t?.getAttribute?.('data-close')==='1') closeModal();
    });
    window.addEventListener('keydown',(e)=>{ if(e.key==='Escape') closeModal(); });
  }

  // init
  const s0 = ensureArrays(st()); save(s0);
  renderCategories();
  setDefaultFilters();
  clearForm();
  renderTable();
  renderKPIs();
  wire();
})();