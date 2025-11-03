import {
  auth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut,
  db, collection, doc, addDoc, setDoc, getDoc, getDocs, query, where, orderBy, limit,
  serverTimestamp, updateDoc, deleteDoc, Timestamp
} from './firebase-config.js';
import { fmtBRL, toDateInputValue, saveAttachmentSmart } from './utils.js';
import { hasFinanceAccess } from '../shared/finance-access.js';

const $ = (sel) => document.querySelector(sel);
const byId = (id) => document.getElementById(id);

const pages = ['dashboard','pagar','receber','conciliacao','centros','relatorios','config'];
const now = new Date();
byId('year').textContent = now.getFullYear();

// Nav
document.querySelectorAll('#nav button').forEach(btn=>{
  btn.addEventListener('click',()=> showPage(btn.dataset.page));
});
function showPage(page){
  pages.forEach(p=> byId(`page-${p}`).classList.add('hidden'));
  byId(`page-${page}`).classList.remove('hidden');
  window.location.hash = page;
  if(page==='dashboard') renderDashboard();
  if(page==='pagar') loadPagar();
  if(page==='receber') loadReceber();
  if(page==='centros') loadCentrosCategorias();
  if(page==='relatorios') loadRelatorios();
}
showPage(location.hash.replace('#','') || 'dashboard');

// Auth
const btnLogin = byId('btnLogin');
const btnLogout = byId('btnLogout');
const userEmail = byId('userEmail');

btnLogin.addEventListener('click', async ()=>{
  try{
    const prov = new GoogleAuthProvider();
    await signInWithPopup(auth, prov);
  }catch(e){
    // fallback
    await signInAnonymously(auth);
  }
});
btnLogout.addEventListener('click', ()=> signOut(auth));

onAuthStateChanged(auth, async (user)=>{
  if(user){
    try{
      const profileRef = doc(db,'users', user.uid);
      const profileSnap = await getDoc(profileRef);
      const data = profileSnap.exists()? profileSnap.data(): null;
      if(!data || !hasFinanceAccess(data)){
        alert('Acesso restrito. Este usuário não possui permissão para o Financeiro.');
        await signOut(auth);
        return;
      }
    }catch(err){
      console.error('Falha ao validar permissões do usuário:', err);
      alert('Não foi possível validar seu acesso ao Financeiro. Tente novamente ou contate o administrador.');
      await signOut(auth);
      return;
    }

    userEmail.textContent = user.email || 'Usuário anônimo';
    btnLogin.classList.add('hidden');
    btnLogout.classList.remove('hidden');
    renderDashboard();
    scheduleRecorrencias();
    renderAlerts();
  }else{
    userEmail.textContent = '';
    btnLogin.classList.remove('hidden');
    btnLogout.classList.add('hidden');
  }
});

// Alerts: vencendo em até 3 dias
async function renderAlerts(){
  const alerts = byId('alerts');
  alerts.innerHTML='';
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const ate = new Date(hoje); ate.setDate(ate.getDate()+3);
  const pagarRef = collection(db,'financeiro','default','contas_pagar');
  const qp = query(pagarRef, where('status','in',['pendente','atrasado']));
  const snap = await getDocs(qp);
  let cont = 0;
  snap.forEach(docu=>{
    const d = docu.data();
    const venc = d.vencimento?.toDate?.() || new Date(d.vencimento);
    if(!venc) return;
    if(venc<=ate){
      cont++;
      const dias = Math.ceil((venc-hoje)/(1000*60*60*24));
      alerts.insertAdjacentHTML('beforeend',`
        <div class="card border border-rose-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-rose-600">Conta a pagar ${dias<0?'ATRASADA':(dias===0?'vence HOJE':`vence em ${dias} dia(s)`)}</p>
              <p class="text-sm">${d.fornecedor||'Fornecedor'} — <b>${fmtBRL(d.valor)}</b></p>
            </div>
            <span class="badge" style="background:#ffe4ea;">${toDateInputValue(venc)}</span>
          </div>
        </div>`);
    }
  });
  if(cont===0){
    alerts.innerHTML = '<div class="card"><p class="text-sm">Sem vencimentos imediatos 🎉</p></div>';
  }
}

// DASHBOARD (resumo simples)
async function renderDashboard(){
  const wrap = byId('page-dashboard');
  wrap.innerHTML = '';

  const inicio = new Date(); inicio.setDate(inicio.getDate()-30);
  const pagarRef = collection(db,'financeiro','default','contas_pagar');
  const receberRef = collection(db,'financeiro','default','contas_receber');
  const sp = await getDocs(pagarRef);
  const sr = await getDocs(receberRef);

  let totalPagar=0, totalReceber=0, pagos=0, recebidos=0;
  let mesDesp=0, mesReceita=0;

  const hoje = new Date();
  sr.forEach(d=>{
    const it=d.data();
    totalReceber += Number(it.valor||0);
    if(it.status==='recebido') recebidos += Number(it.valor||0);
    const dt = it.data || it.vencimento;
    const data = dt?.toDate?.() || new Date(dt||Date.now());
    if(data.getMonth()===hoje.getMonth() && data.getFullYear()===hoje.getFullYear()){
      mesReceita += Number(it.valor||0);
    }
  });
  sp.forEach(d=>{
    const it=d.data();
    totalPagar += Number(it.valor||0);
    if(it.status==='pago') pagos += Number(it.valor||0);
    const dt = it.vencimento;
    const data = dt?.toDate?.() || new Date(dt||Date.now());
    if(data.getMonth()===hoje.getMonth() && data.getFullYear()===hoje.getFullYear()){
      mesDesp += Number(it.valor||0);
    }
  });

  const saldo = recebidos - pagos;

  wrap.insertAdjacentHTML('beforeend',`
    <div class="grid md:grid-cols-4 gap-3">
      <div class="card"><p class="text-xs text-gray-500">Recebido no mês</p><p class="text-2xl font-bold">${fmtBRL(mesReceita)}</p></div>
      <div class="card"><p class="text-xs text-gray-500">Pago no mês</p><p class="text-2xl font-bold">${fmtBRL(mesDesp)}</p></div>
      <div class="card"><p class="text-xs text-gray-500">Saldo Realizado</p><p class="text-2xl font-bold">${fmtBRL(saldo)}</p></div>
      <div class="card"><p class="text-xs text-gray-500">Títulos pendentes</p><p class="text-2xl font-bold">${fmtBRL(totalReceber-totalPagar)}</p></div>
    </div>
  `);
}

// CRUD PAGAR
byId('btnNovaDespesa').addEventListener('click', ()=> openModalDespesa());
byId('filtroPagar').addEventListener('input', ()=> loadPagar());
async function loadPagar(){
  const lista = byId('listaPagar');
  lista.innerHTML = '';

  const snap = await getDocs(collection(db,'financeiro','default','contas_pagar'));
  const filtro = byId('filtroPagar').value?.toLowerCase()||'';

  const rows = [];
  snap.forEach(s=>{
    const d=s.data(); d.id=s.id;
    const txt = [d.fornecedor,d.categoria,d.centroCusto].filter(Boolean).join(' ').toLowerCase();
    if(filtro && !txt.includes(filtro)) return;
    rows.push(d);
  });
  rows.sort((a,b)=> (a.vencimento?.seconds||0) - (b.vencimento?.seconds||0));

  lista.insertAdjacentHTML('beforeend', renderTable(rows,'pagar'));
  bindRowActions('pagar');
}

// CRUD RECEBER
byId('btnNovoReceber').addEventListener('click', ()=> openModalReceber());
byId('filtroReceber').addEventListener('input', ()=> loadReceber());
async function loadReceber(){
  const lista = byId('listaReceber');
  lista.innerHTML = '';

  const snap = await getDocs(collection(db,'financeiro','default','contas_receber'));
  const filtro = byId('filtroReceber').value?.toLowerCase()||'';

  const rows = [];
  snap.forEach(s=>{
    const d=s.data(); d.id=s.id;
    const txt = [d.cliente,d.canal,d.categoria].filter(Boolean).join(' ').toLowerCase();
    if(filtro && !txt.includes(filtro)) return;
    rows.push(d);
  });
  rows.sort((a,b)=> (a.vencimento?.seconds||0) - (b.vencimento?.seconds||0));

  lista.insertAdjacentHTML('beforeend', renderTable(rows,'receber'));
  bindRowActions('receber');
}

function renderTable(rows,tipo){
  if(tipo==='pagar'){
    const head = ['Fornecedor','Valor','Vencimento','Centro','Categoria','Status','Boleto','Comprovante','Ações'];
    const cols = head.map(h=>`<th class="px-2 py-2 text-left text-xs text-gray-500">${h}</th>`).join('');
    const trs = rows.map(r=>{
      const venc = r.vencimento?.toDate?.() || (r.vencimento? new Date(r.vencimento): null);
      const vencStr = venc? toDateInputValue(venc) : '-';
      const anexosAntigos = Array.isArray(r.anexos)? r.anexos : [];
      const boletoMeta = r.anexoBoleto || anexosAntigos[0] || null;
      const comprovanteMeta = r.anexoComprovante || anexosAntigos[1] || null;
      const boletoLink = boletoMeta? `<a class="text-brand-tiffany underline" href="${boletoMeta.url}" target="_blank">ver boleto</a>` : '-';
      const comprovanteLink = comprovanteMeta? `<a class="text-brand-tiffany underline" href="${comprovanteMeta.url}" target="_blank">ver comprovante</a>` : '-';
      return `<tr class="border-t">
        <td class="px-2 py-2">${r.fornecedor||'-'}</td>
        <td class="px-2 py-2 font-semibold">${fmtBRL(r.valor)}</td>
        <td class="px-2 py-2">${vencStr}</td>
        <td class="px-2 py-2">${r.centroCusto||'-'}</td>
        <td class="px-2 py-2">${r.categoria||'-'}</td>
        <td class="px-2 py-2"><span class="badge" style="background:#f3f4f6">${r.status||'pendente'}</span></td>
        <td class="px-2 py-2">${boletoLink}</td>
        <td class="px-2 py-2">${comprovanteLink}</td>
        <td class="px-2 py-2">
          <button class="text-brand-magenta underline" data-edit="${r.id}" data-tipo="${tipo}">editar</button> ·
          <button class="text-red-600 underline" data-del="${r.id}" data-tipo="${tipo}">excluir</button> ·
          <button class="text-brand-tiffany underline" data-addboleto="${r.id}" data-tipo="${tipo}">anexar boleto</button> ·
          <button class="text-brand-tiffany underline" data-addcomprovante="${r.id}" data-tipo="${tipo}">anexar comprovante</button>
        </td>
      </tr>`;
    }).join('');

    return `<div class="overflow-x-auto"><table class="min-w-full text-sm">
      <thead><tr>${cols}</tr></thead>
      <tbody>${trs || '<tr><td class="px-2 py-4 text-gray-500">Nenhum lançamento</td></tr>'}</tbody>
    </table></div>`;
  }

  const head = ['Cliente','Valor','Vencimento','Canal','Categoria','Status','Anexos','Ações'];
  const cols = head.map(h=>`<th class="px-2 py-2 text-left text-xs text-gray-500">${h}</th>`).join('');
  const trs = rows.map(r=>{
    const venc = r.vencimento?.toDate?.() || (r.vencimento? new Date(r.vencimento): null);
    const vencStr = venc? toDateInputValue(venc) : '-';
    const links = (r.anexos||[]).map(a=>`<a class="text-brand-tiffany underline" href="${a.url}" target="_blank">ver</a>`).join(', ');
    return `<tr class="border-t">
      <td class="px-2 py-2">${r.fornecedor||r.cliente||'-'}</td>
      <td class="px-2 py-2 font-semibold">${fmtBRL(r.valor)}</td>
      <td class="px-2 py-2">${vencStr}</td>
      <td class="px-2 py-2">${r.centroCusto||r.canal||'-'}</td>
      <td class="px-2 py-2">${r.categoria||'-'}</td>
      <td class="px-2 py-2"><span class="badge" style="background:#f3f4f6">${r.status||'pendente'}</span></td>
      <td class="px-2 py-2">${links||'-'}</td>
      <td class="px-2 py-2">
        <button class="text-brand-magenta underline" data-edit="${r.id}" data-tipo="${tipo}">editar</button> ·
        <button class="text-red-600 underline" data-del="${r.id}" data-tipo="${tipo}">excluir</button> ·
        <button class="text-brand-tiffany underline" data-addfile="${r.id}" data-tipo="${tipo}">anexar</button>
      </td>
    </tr>`;
  }).join('');

  return `<div class="overflow-x-auto"><table class="min-w-full text-sm">
    <thead><tr>${cols}</tr></thead>
    <tbody>${trs || '<tr><td class="px-2 py-4 text-gray-500">Nenhum lançamento</td></tr>'}</tbody>
  </table></div>`;
}


function bindRowActions(tipo){
  document.querySelectorAll(`[data-edit][data-tipo="${tipo}"]`).forEach(btn=>{
    btn.addEventListener('click',()=> {
      const id = btn.getAttribute('data-edit');
      (tipo==='pagar'? openModalDespesa : openModalReceber)(id);
    });
  });
  document.querySelectorAll(`[data-del][data-tipo="${tipo}"]`).forEach(btn=>{
    btn.addEventListener('click', async ()=> {
      const id = btn.getAttribute('data-del');
      if(confirm('Excluir este registro?')){
        await deleteDoc(doc(db,'financeiro','default',`contas_${tipo}`, id));
        (tipo==='pagar'? loadPagar: loadReceber)();
      }
    });
  });
  if(tipo==='pagar'){
    document.querySelectorAll(`[data-addboleto][data-tipo="${tipo}"]`).forEach(btn=>{
      btn.addEventListener('click', ()=> handleUploadPagar(btn.getAttribute('data-addboleto'), 'anexoBoleto', 'boleto'));
    });
    document.querySelectorAll(`[data-addcomprovante][data-tipo="${tipo}"]`).forEach(btn=>{
      btn.addEventListener('click', ()=> handleUploadPagar(btn.getAttribute('data-addcomprovante'), 'anexoComprovante', 'comprovante'));
    });
  }else{
    document.querySelectorAll(`[data-addfile][data-tipo="${tipo}"]`).forEach(btn=>{
      btn.addEventListener('click', async ()=> {
        const id = btn.getAttribute('data-addfile');
        const input = Object.assign(document.createElement('input'),{type:'file'});
        input.onchange = async ()=>{
          const file = input.files[0]; if(!file) return;
          const qualidade = parseFloat(document.getElementById('cfgQualidade').value || '0.8');
          const meta = await saveAttachmentSmart({file, qualidadeWebp: qualidade});
          const docRef = doc(db,'financeiro','default',`contas_${tipo}`, id);
          const snap = await getDoc(docRef);
          const data = snap.data()||{};
          const anexos = data.anexos||[];
          anexos.push(meta);
          await updateDoc(docRef, {anexos});
          (tipo==='pagar'? loadPagar: loadReceber)();
        };
        input.click();
      });
    });
  }
}

function handleUploadPagar(id, field, papel){
  const input = Object.assign(document.createElement('input'),{type:'file'});
  input.onchange = async ()=>{
    const file = input.files[0]; if(!file) return;
    const qualidade = parseFloat(document.getElementById('cfgQualidade').value || '0.8');
    const meta = await saveAttachmentSmart({file, qualidadeWebp: qualidade});
    const docRef = doc(db,'financeiro','default','contas_pagar', id);
    const payload = {};
    payload[field] = {...meta, papel};
    await updateDoc(docRef, payload);
    await loadPagar();
  };
  input.click();
}


// Modal simples (prompt-based para manter o zip compacto)
async function openModalDespesa(id){
  let data = {fornecedor:'', valor:'', vencimento: toDateInputValue(new Date()), centroCusto:'', categoria:'', status:'pendente'};
  let ref;
  if(id){
    ref = doc(db,'financeiro','default','contas_pagar', id);
    const snap = await getDoc(ref);
    if(snap.exists()){
      const d=snap.data();
      data = {...data, ...d, vencimento: toDateInputValue(d.vencimento?.toDate?.()||new Date())};
    }
  }
  data.fornecedor = prompt('Fornecedor', data.fornecedor)||data.fornecedor;
  const v = prompt('Valor (ex 123,45)', data.valor)||data.valor;
  data.valor = String(v).replace('.','').replace(',','.')||'0';
  data.vencimento = prompt('Vencimento (AAAA-MM-DD)', data.vencimento)||data.vencimento;
  data.centroCusto = prompt('Centro de Custo', data.centroCusto)||data.centroCusto;
  data.categoria = prompt('Categoria', data.categoria)||data.categoria;
  data.status = prompt('Status (pendente|pago|atrasado)', data.status)||data.status;

  const payload = {
    fornecedor: data.fornecedor,
    valor: Number(data.valor),
    vencimento: Timestamp.fromDate(new Date(data.vencimento)),
    centroCusto: data.centroCusto,
    categoria: data.categoria,
    status: data.status,
    createdAt: serverTimestamp()
  };
  if(id){
    await updateDoc(ref, payload);
  }else{
    await addDoc(collection(db,'financeiro','default','contas_pagar'), payload);
  }
  await loadPagar();
}

async function openModalReceber(id){
  let data = {cliente:'', valor:'', vencimento: toDateInputValue(new Date()), canal:'', categoria:'', status:'pendente'};
  let ref;
  if(id){
    ref = doc(db,'financeiro','default','contas_receber', id);
    const snap = await getDoc(ref);
    if(snap.exists()){
      const d=snap.data();
      data = {...data, ...d, vencimento: toDateInputValue(d.vencimento?.toDate?.()||new Date())};
    }
  }
  data.cliente = prompt('Cliente', data.cliente)||data.cliente;
  const v = prompt('Valor (ex 123,45)', data.valor)||data.valor;
  data.valor = String(v).replace('.','').replace(',','.')||'0';
  data.vencimento = prompt('Data prevista (AAAA-MM-DD)', data.vencimento)||data.vencimento;
  data.canal = prompt('Canal (Shopee, ML, Loja, etc.)', data.canal)||data.canal;
  data.categoria = prompt('Categoria', data.categoria)||data.categoria;
  data.status = prompt('Status (pendente|recebido|atrasado)', data.status)||data.status;

  const payload = {
    cliente: data.cliente,
    valor: Number(data.valor),
    vencimento: Timestamp.fromDate(new Date(data.vencimento)),
    canal: data.canal,
    categoria: data.categoria,
    status: data.status,
    createdAt: serverTimestamp()
  };
  if(id){
    await updateDoc(ref, payload);
  }else{
    await addDoc(collection(db,'financeiro','default','contas_receber'), payload);
  }
  await loadReceber();
}

// Centros & Categorias
byId('btnAddCentro').addEventListener('click', async ()=>{
  const nome = byId('novoCentro').value.trim();
  if(!nome) return;
  await addDoc(collection(db,'financeiro','default','centros_custo'), {nome, createdAt: serverTimestamp()});
  byId('novoCentro').value='';
  loadCentrosCategorias();
});
byId('btnAddCategoria').addEventListener('click', async ()=>{
  const nome = byId('novaCategoria').value.trim();
  if(!nome) return;
  await addDoc(collection(db,'financeiro','default','categorias'), {nome, createdAt: serverTimestamp()});
  byId('novaCategoria').value='';
  loadCentrosCategorias();
});
async function loadCentrosCategorias(){
  const cs = await getDocs(collection(db,'financeiro','default','centros_custo'));
  const cat = await getDocs(collection(db,'financeiro','default','categorias'));
  const ulC = byId('listaCentros'); ulC.innerHTML='';
  const ulK = byId('listaCategorias'); ulK.innerHTML='';
  cs.forEach(d=> ulC.insertAdjacentHTML('beforeend', `<li class="py-1">${d.data().nome}</li>`));
  cat.forEach(d=> ulK.insertAdjacentHTML('beforeend', `<li class="py-1">${d.data().nome}</li>`));
}

// Relatórios
async function loadRelatorios(){
  // Simple aggregated KPIs
  const pagarRef = collection(db,'financeiro','default','contas_pagar');
  const receberRef = collection(db,'financeiro','default','contas_receber');
  const sp = await getDocs(pagarRef);
  const sr = await getDocs(receberRef);

  const hoje = new Date();
  const start = new Date(); start.setDate(start.getDate()-30);

  const dias = [];
  for(let i=0;i<30;i++){
    const d = new Date(start); d.setDate(start.getDate()+i);
    dias.push(toDateInputValue(d));
  }
  const serieIn = new Array(30).fill(0);
  const serieOut = new Array(30).fill(0);

  sr.forEach(docu=>{
    const d = docu.data();
    const dt = (d.vencimento?.toDate?.() || new Date(d.vencimento));
    const key = toDateInputValue(dt);
    const idx = dias.indexOf(key);
    if(idx>=0) serieIn[idx]+=Number(d.valor||0);
  });
  sp.forEach(docu=>{
    const d = docu.data();
    const dt = (d.vencimento?.toDate?.() || new Date(d.vencimento));
    const key = toDateInputValue(dt);
    const idx = dias.indexOf(key);
    if(idx>=0) serieOut[idx]+=Number(d.valor||0);
  });

  renderChart(dias, serieIn, serieOut);

  // Top despesas/receitas do mês
  const mes = hoje.getMonth(), ano = hoje.getFullYear();
  const despesas = [];
  const receitas = [];
  sp.forEach(docu=>{
    const d=docu.data();
    const dt = d.vencimento?.toDate?.() || new Date(d.vencimento);
    if(dt.getMonth()===mes && dt.getFullYear()===ano) despesas.push(d);
  });
  sr.forEach(docu=>{
    const d=docu.data();
    const dt = d.vencimento?.toDate?.() || new Date(d.vencimento);
    if(dt.getMonth()===mes && dt.getFullYear()===ano) receitas.push(d);
  });
  despesas.sort((a,b)=> b.valor-a.valor);
  receitas.sort((a,b)=> b.valor-a.valor);

  byId('topDespesas').innerHTML = despesas.slice(0,5).map(d=>`<li class="py-1 flex justify-between"><span>${d.fornecedor||d.categoria||'-'}</span><b>${fmtBRL(d.valor)}</b></li>`).join('');
  byId('topReceitas').innerHTML = receitas.slice(0,5).map(d=>`<li class="py-1 flex justify-between"><span>${d.cliente||d.canal||'-'}</span><b>${fmtBRL(d.valor)}</b></li>`).join('');
  byId('kpis').innerHTML = `<li class="py-1">Qtd despesas: <b>${despesas.length}</b></li>
    <li class="py-1">Qtd receitas: <b>${receitas.length}</b></li>
    <li class="py-1">Ticket médio receita: <b>${fmtBRL(media(receitas.map(r=>r.valor||0)))}</b></li>`;
}

function media(arr){ return arr.length? (arr.reduce((a,b)=>a+b,0)/arr.length):0; }

function renderChart(labels, entradas, saidas){
  const ctx = document.getElementById('graficoFluxo').getContext('2d');
  if(window.__chart){ window.__chart.destroy(); }
  window.__chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label:'Entradas', data: entradas },
        { label:'Saídas', data: saidas }
      ]
    }
  });
}

// Recorrências (gera próximos lançamentos localmente quando abrir app)
async function scheduleRecorrencias(){
  const ref = collection(db,'financeiro','default','recorrencias');
  const snap = await getDocs(ref);
  const hoje = new Date();
  for(const docu of snap.docs){
    const r = docu.data();
    // r.tipo: 'pagar' | 'receber'
    // r.diaMes: 5 (dia do mês), r.valor, r.descricao, r.categoria, r.centroCusto/canal
    const prox = new Date(hoje.getFullYear(), hoje.getMonth(), r.diaMes||1);
    if(prox < hoje){ prox.setMonth(prox.getMonth()+1); }
    const coll = collection(db,'financeiro','default', `contas_${r.tipo}`);
    // Verifica se já existe lançamento do mesmo mês
    const all = await getDocs(coll);
    let exists = false;
    all.forEach(d=>{
      const it=d.data();
      const v=it.vencimento?.toDate?.()||new Date(it.vencimento);
      if(v && v.getMonth()===prox.getMonth() && v.getFullYear()===prox.getFullYear() && (it.categoria===r.categoria)){
        exists = true;
      }
    });
    if(!exists){
      const payload = {
        valor: Number(r.valor||0),
        vencimento: Timestamp.fromDate(prox),
        categoria: r.categoria||'recorrente',
        status: 'pendente',
        createdAt: serverTimestamp()
      };
      if(r.tipo==='pagar'){ payload.fornecedor = r.descricao; payload.centroCusto = r.centroCusto||''; }
      else { payload.cliente = r.descricao; payload.canal = r.canal||''; }
      await addDoc(coll, payload);
    }
  }
}

// Conciliação (CSV simples: data;descricao;valor)
byId('btnImportarExtrato').addEventListener('click', ()=> byId('fileExtrato').click());
byId('btnRodarConciliacao').addEventListener('click', conciliar);
byId('fileExtrato').addEventListener('change', async (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const text = await f.text();
  localStorage.setItem('extratoCSV', text);
  logConc('Extrato carregado.');
});

function logConc(msg){
  const el = byId('conciliacaoLog');
  el.textContent += `\n${new Date().toLocaleString()} - ${msg}`;
}

async function conciliar(){
  const csv = localStorage.getItem('extratoCSV')||'';
  if(!csv){ logConc('Nenhum extrato importado.'); return; }
  const linhas = csv.split(/\r?\n/).filter(Boolean);
  // Espera cabecalho: data;descricao;valor
  const movs = [];
  for(let i=1;i<linhas.length;i++){
    const [data, descricao, valor] = linhas[i].split(';');
    if(!data) continue;
    movs.push({ data, descricao, valor: Number(String(valor||'0').replace('.','').replace(',','.')) });
  }
  // match simples por valor e tolerância de 3 dias
  const pagarRef = collection(db,'financeiro','default','contas_pagar');
  const receberRef = collection(db,'financeiro','default','contas_receber');
  const sp = await getDocs(pagarRef);
  const sr = await getDocs(receberRef);

  let conc = 0;
  for(const m of movs){
    const dm = new Date(m.data);
    // procurar em receber
    let matched = false;
    for(const d of sr.docs){
      const it=d.data();
      const dt = it.vencimento?.toDate?.()||new Date(it.vencimento);
      const diff = Math.abs((dt - dm)/(1000*60*60*24));
      if(Math.abs(Number(it.valor||0)-m.valor) < 0.01 && diff<=3 && it.status!=='recebido'){
        await updateDoc(d.ref, {status:'recebido', conciliadoEm: serverTimestamp(), historico:(it.historico||[]).concat({tipo:'conciliacao', data:new Date().toISOString(), descricao:m.descricao})});
        conc++; matched=true; break;
      }
    }
    if(matched) continue;
    // procurar em pagar (valor negativo no extrato)
    for(const d of sp.docs){
      const it=d.data();
      const dt = it.vencimento?.toDate?.()||new Date(it.vencimento);
      const diff = Math.abs((dt - dm)/(1000*60*60*24));
      if(Math.abs(Number(it.valor||0)+m.valor) < 0.01 && diff<=3 && it.status!=='pago'){
        await updateDoc(d.ref, {status:'pago', conciliadoEm: serverTimestamp(), historico:(it.historico||[]).concat({tipo:'conciliacao', data:new Date().toISOString(), descricao:m.descricao})});
        conc++; break;
      }
    }
  }
  logConc(`Conciliação finalizada. ${conc} lançamento(s) conciliado(s).`);
}
