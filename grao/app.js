// =====================================================================
// GRÃO · app de finanças pessoais
// Site estático (GitHub Pages) + Supabase (login, banco, funções).
// Lança gasto à mão, pelo QR code do cupom fiscal, pela notificação do
// banco (MacroDroid) e pelo Open Finance (Pluggy).
// =====================================================================
const SUPA_URL = 'https://ldyhowltfjyabvaaybqj.supabase.co';
const SUPA_KEY = 'sb_publishable_YaO-QESn3A1yPjube1ALiA_WGrmN1hy';
const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);

// ---------- categorias ----------
const CATS = [
  ['Alimentação','Custos Fixos','Mercado'],['Moradia (luz)','Custos Fixos','Luz'],['Moradia','Custos Fixos','Casa (contas)'],
  ['Internet de casa','Custos Fixos','Internet de casa'],['Celular e internet','Custos Fixos','Celular'],['Faculdade (Uninter)','Custos Fixos','Faculdade'],
  ['Educação','Custos Fixos','Cursos'],['Transporte','Custos Fixos','Transporte'],['Saúde','Custos Fixos','Saúde'],
  ['Impostos (DAS/Receita)','Custos Fixos','Impostos'],['Impostos e tarifas','Custos Fixos','Tarifas'],['Juros e tarifas','Custos Fixos','Juros e taxas'],
  ['Restaurantes e lanches','Estilo de Vida','Lanches'],['Compras','Estilo de Vida','Compras'],['Lazer','Estilo de Vida','Lazer'],
  ['Viagens','Estilo de Vida','Viagens'],['Assinaturas e apps','Estilo de Vida','Assinaturas'],['Pix para pessoas','Estilo de Vida','Pix p/ pessoas'],
  ['Casa e utensílios','Estilo de Vida','Casa e utensílios'],['Cuidado pessoal','Estilo de Vida','Cuidado pessoal'],['Reserva de Emergência','Investimentos','Reserva']
];
const CAT = Object.fromEntries(CATS.map(([c,p,n])=>[c,{pilar:p,nome:n}]));
const RAPIDAS = ['Alimentação','Restaurantes e lanches','Transporte','Compras','Lazer','Assinaturas e apps','Saúde','Pix para pessoas'];
const FORMAS = ['Pix','Débito','Crédito','Boleto','Dinheiro'];
const TETOS_PADRAO = {'Alimentação':450,'Restaurantes e lanches':120,'Assinaturas e apps':80,'Compras':0,'Lazer':0,'Viagens':0};

// ---------- utilidades ----------
const brl = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const R = v => brl.format(v||0);
const ym = d => d.slice(0,7);
const hoje = () => { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const addMes = (m,k) => { let [y,mm]=m.split('-').map(Number); mm+=k; y+=Math.floor((mm-1)/12); mm=((mm-1)%12+12)%12+1; return `${y}-${String(mm).padStart(2,'0')}`; };
const nomeMes = (m,c) => new Date(m+'-15T12:00').toLocaleDateString('pt-BR',c?{month:'short',year:'2-digit'}:{month:'long',year:'numeric'}).replace('.','').replace(' de ',' ');
const addDiaMes = (iso,k) => { const [y,m,d]=iso.split('-').map(Number); const t=new Date(Date.UTC(y,m-1+k,1)); const last=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0)).getUTCDate(); t.setUTCDate(Math.min(d,last)); return t.toISOString().slice(0,10); };
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nomeCat = c => CAT[c]?.nome || c;
const r2 = v => Math.round(v*100)/100;
const numBR = s => { const t=String(s??'').trim().replace(/\s/g,''); if(!t) return NaN; return parseFloat(t.includes(',')?t.replace(/\./g,'').replace(',','.'):t); };
const $ = s => document.querySelector(s);

const ICON = {
  manual:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  nfce:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2"/></svg>',
  notificacao:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21h4"/></svg>',
  pluggy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10l9-6 9 6M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18"/></svg>',
  importado:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
};
const LOGO = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d4e38a"/><stop offset="1" stop-color="#7d8a4e"/></linearGradient></defs><path d="M32 6c11 9 15 20 13 32-2 11-8 19-13 20-5-1-11-9-13-20C17 26 21 15 32 6z" fill="url(#g)"/><path d="M32 14v40" stroke="#1b1d1c" stroke-width="2.4" stroke-linecap="round" opacity=".55"/></svg>';
const RATO = '<svg viewBox="0 0 96 56"><ellipse cx="44" cy="34" rx="30" ry="17" fill="#cfd2c8"/><circle cx="72" cy="26" r="13" fill="#cfd2c8"/><circle cx="74" cy="13" r="7" fill="#e8b4b8" stroke="#cfd2c8" stroke-width="3"/><circle cx="78" cy="25" r="2.2" fill="#1b1d1c"/><circle cx="85" cy="29" r="2" fill="#e8b4b8"/><path d="M14 36c-10 2-12 12-4 14" stroke="#e8b4b8" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="58" cy="40" rx="5" ry="3" fill="#d4e38a"/></svg>';

// ---------- estado ----------
const S = {
  sessao:null, perfil:null, lanc:[], regras:[], itensPluggy:[], carregou:false,
  tab:'mes', mes:ym(hoje()), busca:'', base:'media', modoLogin:'entrar',
  novo:{valor:'',desc:'',cat:'Alimentação',data:hoje(),forma:'Pix',parcelado:false,n:2},
  sim:{valor:'',n:1,inicio:addMes(ym(hoje()),1)},
};
const renda = () => Number(S.perfil?.renda||0);
const tetos = () => S.perfil?.tetos || {};

// ---------- carregar ----------
async function carregar(){
  const uid=S.sessao.user.id;
  let { data:p } = await sb.from('perfis').select('*').eq('user_id',uid).maybeSingle();
  if(!p){ const ins=await sb.from('perfis').insert({user_id:uid,tetos:TETOS_PADRAO}).select().single(); p=ins.data; }
  S.perfil=p;
  const todos=[]; for(let i=0;;i+=1000){ const {data,error}=await sb.from('lancamentos').select('*').order('data',{ascending:true}).range(i,i+999); if(error) throw error; todos.push(...data); if(data.length<1000) break; }
  S.lanc=todos.map(l=>({...l, valor:Number(l.valor), desc:l.descricao}));
  S.regras=(await sb.from('regras').select('*').order('id')).data||[];
  S.itensPluggy=(await sb.from('pluggy_itens').select('*').order('id')).data||[];
  S.carregou=true;
}
async function recarregar(){ try{ await carregar(); render(); }catch(e){ toast('Não deu para atualizar agora.'); } }

// ---------- cálculos ----------
const doMes = m => S.lanc.filter(l=>ym(l.data)===m);
function resumo(m){
  const ls=doMes(m).filter(l=>l.pilar!=='Investimentos');
  const total=ls.reduce((a,l)=>a+l.valor,0), parcelas=ls.filter(l=>l.pt).reduce((a,l)=>a+l.valor,0);
  const porCat={}; ls.filter(l=>!l.pt).forEach(l=>{porCat[l.cat]=(porCat[l.cat]||0)+l.valor;});
  return {total,parcelas,novos:total-parcelas,porCat,ls};
}
const mesesFechados = () => [...new Set(S.lanc.map(l=>ym(l.data)))].sort().filter(m=>m<ym(hoje())).slice(-3);
// gastos marcados como "fora do normal" (viagem, show, festa) não entram na média da previsão
function mediaDiaADia(){ const ms=mesesFechados(); return ms.length? ms.reduce((a,m)=>a+resumo(m).ls.filter(l=>!l.pt&&!l.fora_normal).reduce((x,l)=>x+l.valor,0),0)/ms.length : 0; }
function basePlano(){ const ms=mesesFechados(), t=tetos();
  const fixos=ms.length? ms.reduce((a,m)=>a+doMes(m).filter(l=>!l.pt&&l.pilar==='Custos Fixos'&&!(l.cat in t)).reduce((x,l)=>x+l.valor,0),0)/ms.length : 0;
  return fixos+Object.values(t).reduce((a,v)=>a+(Number(v)||0),0); }
const baseDiaADia = () => S.base==='plano'? basePlano() : mediaDiaADia();
function projecao(n){ const b=baseDiaADia(), at=ym(hoje()), out=[];
  for(let k=0;k<n;k++){ const m=addMes(at,k), r=resumo(m), novos=k===0?Math.max(r.novos,b):b; out.push({m,parcelas:r.parcelas,novos,total:r.parcelas+novos}); }
  return out; }

// ---------- telas ----------
const raiz=document.getElementById('raiz');
function render(){
  if(!S.sessao){ rLogin(); return; }
  if(!S.carregou){ raiz.innerHTML=`<div class="login"><div class="logo-big">${LOGO}<p class="muted">Carregando os seus lançamentos…</p></div></div>`; return; }
  const titulos={mes:'',lancar:'Lançar gasto',extrato:'Extrato',futuro:'Futuro',ajustes:'Ajustes'};
  const comMes = S.tab==='mes'||S.tab==='extrato';
  raiz.innerHTML=`<div class="wrap">
    <div class="top">
      ${S.tab==='mes'?`<button class="brand" id="brand" aria-label="Grão">${LOGO}<h1>Grão</h1></button>`:`<h1>${titulos[S.tab]}</h1>`}
      ${comMes?`<div class="mnav"><button class="ib" data-mes="-1" aria-label="Mês anterior">‹</button><span class="mlabel">${esc(nomeMes(S.mes))}</span><button class="ib" data-mes="1" aria-label="Próximo mês">›</button></div>`:''}
    </div>
    <main id="view"></main></div>
  <nav class="tabs" aria-label="Seções"><div>
    ${tabBtn('mes','Mês','<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 9 9h-9z"/>')}
    ${tabBtn('lancar','Lançar','<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>')}
    ${tabBtn('extrato','Extrato','<path d="M5 6h14M5 12h14M5 18h9"/>')}
    ${tabBtn('futuro','Futuro','<path d="M4 18l5-6 4 3 7-9"/>')}
    ${tabBtn('ajustes','Ajustes','<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>')}
  </div></nav>`;
  ({mes:rMes,lancar:rLancar,extrato:rExtrato,futuro:rFuturo,ajustes:rAjustes})[S.tab]();
}
const tabBtn=(id,t,p)=>`<button class="tab" data-tab="${id}" aria-current="${S.tab===id?'page':'false'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${p}</svg>${t}</button>`;
const V = () => document.getElementById('view');

function rLogin(){
  const cria=S.modoLogin==='criar';
  raiz.innerHTML=`<div class="login"><div style="width:100%;max-width:400px">
    <div class="logo-big">${LOGO}<h1>Grão</h1><p class="muted" style="margin:0">Cada grão conta. Seus gastos lançados sozinhos.</p></div>
    <form class="card stack" id="flogin">
      ${cria?`<div class="field"><label for="ln">Seu nome</label><input id="ln" type="text" autocomplete="name"></div>`:''}
      <div class="field"><label for="le">E-mail</label><input id="le" type="email" autocomplete="email" required></div>
      <div class="field"><label for="ls">Senha</label><input id="ls" type="password" autocomplete="${cria?'new-password':'current-password'}" minlength="6" required></div>
      <div id="lmsg"></div>
      <button class="btn" type="submit">${cria?'Criar conta':'Entrar'}</button>
      <div class="row"><button type="button" class="linkbtn" id="ltroca">${cria?'Já tenho conta':'Criar conta'}</button>${cria?'':'<button type="button" class="linkbtn" id="lesq">Esqueci a senha</button>'}</div>
    </form></div></div>`;
  $('#ltroca').onclick=()=>{ S.modoLogin=cria?'entrar':'criar'; rLogin(); };
  $('#lesq')?.addEventListener('click',async()=>{ const e=$('#le').value.trim(); if(!e){ msgLogin('Digite o seu e-mail primeiro.','warn'); return; }
    const {error}=await sb.auth.resetPasswordForEmail(e,{redirectTo:location.href.split('#')[0]}); msgLogin(error?'Não consegui mandar o e-mail agora.':'Mandei um link para trocar a senha no seu e-mail.', error?'bad':'ok'); });
  $('#flogin').onsubmit=async ev=>{ ev.preventDefault(); const b=ev.target.querySelector('button[type=submit]'); b.disabled=true;
    const email=$('#le').value.trim(), senha=$('#ls').value;
    if(cria){ const {data,error}=await sb.auth.signUp({email,password:senha,options:{data:{nome:$('#ln').value.trim()},emailRedirectTo:location.href.split('#')[0]}});
      if(error) msgLogin(traduz(error.message),'bad'); else if(!data.session) msgLogin('Conta criada. Abra o e-mail de confirmação, clique no link e volte aqui para entrar.','ok'); }
    else { const {error}=await sb.auth.signInWithPassword({email,password:senha}); if(error) msgLogin(traduz(error.message),'bad'); }
    b.disabled=false; };
}
function msgLogin(t,tipo){ $('#lmsg').innerHTML=`<p class="notice ${tipo}" style="margin:0">${esc(t)}</p>`; }
function traduz(m){ if(/invalid login/i.test(m)) return 'E-mail ou senha errados.'; if(/not confirmed/i.test(m)) return 'Confirme o e-mail antes: abra o link que mandamos.'; if(/already registered/i.test(m)) return 'Esse e-mail já tem conta. Use Entrar.'; if(/password/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.'; return 'Não deu certo: '+m; }

function rMes(){
  const r=resumo(S.mes), ren=renda(), sobra=ren-r.total, pct=ren? r.total/ren : 0, t=tetos();
  const est = !ren ? ['warn','Informe o salário'] : sobra>=ren*0.1 ? ['ok','Dentro do salário'] : sobra>=0 ? ['warn','No limite'] : ['bad','Passou do salário'];
  const cats=Object.keys({...r.porCat,...t}).filter(k=>(r.porCat[k]||0)>0||k in t).sort((a,b)=>((b in t)-(a in t))||((r.porCat[b]||0)-(r.porCat[a]||0)));
  const parcelas=r.ls.filter(l=>l.pt).sort((a,b)=>b.valor-a.valor);
  const rev=S.lanc.filter(l=>l.revisar);
  V().innerHTML=`<div class="stack">
    ${rev.length?`<section class="card"><div class="row"><h2>Para conferir</h2><span class="pill warn">${rev.length}</span></div>
      <p class="small muted" style="margin:6px 0 0">Gastos que chegaram sozinhos e eu não soube a categoria. Toque para ajustar.</p>
      <div class="list" style="margin-top:6px">${rev.slice(0,5).map(item).join('')}</div></section>`:''}
    <section class="card hero">
      <div class="row"><span class="muted">${sobra>=0?'Sobra do mês':'Passou do salário em'}</span><span class="pill ${est[0]}">${est[1]}</span></div>
      <div class="big num ${sobra<0?'neg':''}">${R(Math.abs(sobra))}</div>
      <div class="meter sunk ${pct>1?'over':''}" role="img" aria-label="Gasto é ${Math.round(pct*100)}% do salário"><span style="width:${Math.min(pct,1)*100}%"></span></div>
      <p class="small muted" style="margin:0">Você usou <b class="num">${Math.round(pct*100)}%</b> do salário neste mês.</p>
      <dl class="kv"><dt>Salário</dt><dd>${R(ren)}</dd><dt>Parcelas de compras antigas</dt><dd>${R(r.parcelas)}</dd><dt>Gastos novos</dt><dd>${R(r.novos)}</dd><dt><b>Total gasto</b></dt><dd><b>${R(r.total)}</b></dd></dl>
    </section>
    <section class="card"><div class="row"><h2>Gastos novos por categoria</h2><button class="linkbtn" data-ir="ajustes">Ajustar tetos</button></div>
      <div style="margin-top:6px">${cats.length?cats.map(k=>{const v=r.porCat[k]||0, tt=t[k], has=tt!=null, over=has&&v>tt, w=has?(tt>0?Math.min(v/tt,1)*100:(v>0?100:0)):0;
        return `<div class="cat ${over?'over':''}"><span>${esc(nomeCat(k))}</span><span class="val num">${R(v)}${has?` <span class="dim small">/ ${R(tt)}</span>`:''}</span>${has?`<div class="bar sunk"><span style="width:${w}%"></span></div>`:''}</div>`;}).join(''):'<p class="muted">Nenhum gasto novo neste mês. Use a aba Lançar.</p>'}</div></section>
    <section class="card"><div class="row"><h2>Parcelas deste mês</h2><span class="num muted">${R(r.parcelas)}</span></div>
      <div class="list" style="margin-top:6px">${parcelas.length?parcelas.map(item).join(''):'<p class="muted">Nenhuma parcela neste mês.</p>'}</div></section>
  </div>`;
}

function item(l){
  const meta=`${esc(nomeCat(l.cat))} · ${esc(l.forma||'')}${l.pt?` · parcela ${l.pa}/${l.pt}`:''}${l.fora_normal?' · fora do normal':''}${l.revisar?' · conferir':''}`;
  return `<button class="item ${l.revisar?'rev':''}" data-edit="${esc(l.id)}"><span class="ic">${ICON[l.origem]||ICON.manual}</span><span class="d">${esc(l.desc)}</span><span class="v">${R(l.valor)}</span><span class="m">${meta}</span></button>`;
}

function rLancar(){
  const n=S.novo, v=numBR(n.valor)||0;
  V().innerHTML=`<div class="stack">
    <button class="btn big" id="qr">${ICON.nfce}Ler o QR code do cupom fiscal</button>
    <form class="card stack" id="fnovo" autocomplete="off">
      <h2>Ou lance à mão</h2>
      <div class="field"><label for="nv">Valor ${n.parcelado?'total da compra':''}</label><input id="nv" class="money num" type="text" inputmode="decimal" placeholder="0,00" value="${esc(n.valor)}"></div>
      <div class="field"><label for="nd">O que foi</label><input id="nd" type="text" placeholder="Ex.: mercado, lanche, Uber" value="${esc(n.desc)}"></div>
      <div class="field"><span class="lbl">Categoria</span><div class="chips">${RAPIDAS.map(c=>`<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${n.cat===c}">${esc(nomeCat(c))}</button>`).join('')}</div>
        <select id="ncat" aria-label="Todas as categorias">${CATS.map(([c])=>`<option value="${esc(c)}" ${n.cat===c?'selected':''}>${esc(nomeCat(c))}</option>`).join('')}</select></div>
      <div class="grid2"><div class="field"><label for="ndt">Data</label><input id="ndt" type="date" value="${esc(n.data)}"></div>
        <div class="field"><label for="nf">Pagamento</label><select id="nf">${FORMAS.map(f=>`<option ${n.forma===f?'selected':''}>${f}</option>`).join('')}</select></div></div>
      <div class="field"><span class="lbl">Parcelado?</span><div class="chips"><button type="button" class="chip" data-parc="0" aria-pressed="${!n.parcelado}">À vista</button><button type="button" class="chip" data-parc="1" aria-pressed="${n.parcelado}">Parcelado</button></div></div>
      ${n.parcelado?`<div class="field"><label for="nn">Número de parcelas</label><input id="nn" type="number" min="2" max="48" value="${n.n}"><span class="small muted num" id="nninfo">${n.n} × ${R(v/(n.n||1))} por mês, a partir de ${esc(nomeMes(ym(n.data)))}</span></div>`:''}
      <button class="btn" type="submit">Salvar gasto</button>
    </form></div>`;
  $('#qr').onclick=abrirCamera;
}

function rExtrato(){
  const q=S.busca.trim().toLowerCase();
  const ls=doMes(S.mes).filter(l=>!q||(l.desc+' '+nomeCat(l.cat)).toLowerCase().includes(q)).sort((a,b)=>b.data.localeCompare(a.data)||a.desc.localeCompare(b.desc));
  let html='',dia=''; ls.forEach(l=>{ if(l.data!==dia){ dia=l.data; html+=`<div class="daysep">${new Date(dia+'T12:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})}</div>`; } html+=item(l); });
  V().innerHTML=`<div class="stack"><input id="busca" type="search" placeholder="Buscar neste mês" value="${esc(S.busca)}" aria-label="Buscar">
    <div class="card"><div class="row"><span class="muted">${ls.length} lançamentos</span><b class="num">${R(ls.reduce((a,l)=>a+l.valor,0))}</b></div>
    <div class="list">${html||'<p class="muted">Nada lançado aqui. Use a aba Lançar.</p>'}</div></div></div>`;
}

function grafico(pro,ren){
  const W=520,H=190,pl=8,pr=8,pt=16,pb=26,n=pro.length,max=Math.max(ren,...pro.map(p=>p.total))*1.1||1,bw=(W-pl-pr)/n,y=v=>pt+(H-pt-pb)*(1-v/max);
  let s=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gasto previsto por mês comparado ao salário">`;
  pro.forEach((p,i)=>{ const x=pl+i*bw+bw*.18,w=bw*.64;
    s+=`<rect x="${x}" y="${y(p.parcelas)}" width="${w}" height="${y(0)-y(p.parcelas)}" fill="#6d726a" rx="3"/>`;
    s+=`<rect x="${x}" y="${y(p.total)}" width="${w}" height="${Math.max(0,y(p.parcelas)-y(p.total))}" fill="${p.total>ren?'#ef6f6f':'#97a65e'}" rx="3"/>`;
    s+=`<text x="${x+w/2}" y="${H-8}" text-anchor="middle" font-size="11" fill="#9aa095">${esc(nomeMes(p.m,true))}</text>`; });
  s+=`<line x1="${pl}" x2="${W-pr}" y1="${y(ren)}" y2="${y(ren)}" stroke="#d4e38a" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${W-pr}" y="${y(ren)-5}" text-anchor="end" font-size="11" fill="#d4e38a">salário ${esc(R(ren))}</text></svg>`;
  return s;
}
function rFuturo(){
  const ren=renda(), pro=projecao(12), sim=S.sim, val=numBR(sim.valor)||0, n=Math.max(1,parseInt(sim.n)||1), parc=val/n;
  let ver='';
  if(val>0){ const so=pro.filter(p=>p.m>=sim.inicio&&p.m<addMes(sim.inicio,n)).map(p=>({m:p.m,s:ren-p.total-parc}));
    if(so.length){ const neg=so.filter(x=>x.s<0), pior=so.reduce((a,b)=>a.s<b.s?a:b);
      const [c,t,txt]=neg.length?['bad','Ainda não cabe',`Com ${n>1?n+' parcelas de '+R(parc):R(val)}, ${neg.length===1?'o mês de '+nomeMes(neg[0].m)+' fecha':neg.length+' meses fecham'} no negativo. O pior é ${nomeMes(pior.m)}: ${R(pior.s)}.`]
        : pior.s<ren*.1?['warn','Cabe, mas aperta',`No mês mais apertado (${nomeMes(pior.m)}) sobram só ${R(pior.s)}.`]:['ok','Cabe',`Mesmo no mês mais apertado (${nomeMes(pior.m)}) sobram ${R(pior.s)}.`];
      ver=`<div class="verdict ${c}" role="status"><b>${t}</b>${esc(txt)}</div>`; } }
  V().innerHTML=`<div class="stack">
    <section class="card stack"><h2>Próximos 12 meses</h2>${grafico(pro,ren)}
      <div class="chips"><button type="button" class="chip" data-base="media" aria-pressed="${S.base==='media'}">Como venho gastando</button><button type="button" class="chip" data-base="plano" aria-pressed="${S.base==='plano'}">Seguindo os tetos</button></div>
      <p class="small muted" style="margin:0">Cinza: parcelas que você já tem. Verde: dia a dia ${S.base==='plano'?'com as contas fixas e os tetos':'pela média dos últimos 3 meses, sem os gastos fora do normal'} (${R(baseDiaADia())} por mês). Vermelho quando passa do salário.</p>
      <div class="proj"><table><thead><tr><th>Mês</th><th>Parcelas</th><th>Dia a dia</th><th>Sobra</th></tr></thead><tbody>
      ${pro.map(p=>{const s=ren-p.total;return `<tr><td>${esc(nomeMes(p.m,true))}</td><td>${R(p.parcelas)}</td><td>${R(p.novos)}</td><td class="${s<0?'neg':'pos'}">${R(s)}</td></tr>`;}).join('')}</tbody></table></div></section>
    <section class="card stack"><h2>Posso comprar?</h2>
      <div class="field"><label for="sv">Valor da compra</label><input id="sv" class="money num" type="text" inputmode="decimal" placeholder="0,00" value="${esc(sim.valor)}"></div>
      <div class="grid2"><div class="field"><label for="sn">Parcelas</label><input id="sn" type="number" min="1" max="48" value="${n}"></div>
        <div class="field"><label for="si">Primeira parcela</label><select id="si">${pro.map(p=>`<option value="${p.m}" ${p.m===sim.inicio?'selected':''}>${esc(nomeMes(p.m))}</option>`).join('')}</select></div></div>
      ${ver||'<p class="muted small" style="margin:0">Digite o valor para ver se cabe no salário.</p>'}</section></div>`;
}

function rAjustes(){
  const p=S.perfil, url=`${SUPA_URL}/functions/v1/notificacao?token=${p.token_notif}`, t=tetos();
  const lista=['Alimentação','Restaurantes e lanches','Assinaturas e apps','Compras','Lazer','Viagens','Transporte','Pix para pessoas'];
  V().innerHTML=`<div class="stack">
    <form class="card stack" id="frenda"><h2>Salário</h2>
      <div class="field"><label for="rv">Quanto entra por mês</label><input id="rv" class="money num" type="text" inputmode="decimal" value="${String(p.renda||'').replace('.',',')}"></div>
      <button class="btn line" type="submit">Salvar salário</button></form>
    <form class="card stack" id="ftetos"><h2>Tetos por mês</h2>
      <p class="small muted" style="margin:0">Limite para gastos novos de cada categoria. Parcelas antigas não entram. Em branco = sem teto.</p>
      ${lista.map((c,i)=>`<div class="grid2" style="align-items:center"><label for="t${i}">${esc(nomeCat(c))}</label><input id="t${i}" data-cat="${esc(c)}" type="text" inputmode="decimal" placeholder="sem teto" value="${t[c]!=null?String(t[c]).replace('.',','):''}"></div>`).join('')}
      <button class="btn line" type="submit">Salvar tetos</button></form>
    <section class="card stack"><h2>Lançar sozinho pela notificação do banco</h2>
      <p class="small muted" style="margin:0">O celular lê a notificação de compra do banco e manda para cá. Funciona com qualquer banco que avise as compras.</p>
      <ol class="passos small">
        <li>Instale o <b>MacroDroid</b> (Play Store) e dê a permissão de ler notificações.</li>
        <li>Crie uma macro. Gatilho: <b>Notificação recebida</b>, escolha os apps do BB, Mercado Pago e outros bancos.</li>
        <li>Ação: <b>Requisição HTTP</b>, método <b>POST</b>, no endereço abaixo, corpo <b>JSON</b>:<br><code>{"titulo":"[notification_title]","texto":"[notification]","app":"[app_name]"}</code></li>
        <li>Faça uma compra pequena ou toque em <b>Testar</b> aqui embaixo.</li>
      </ol>
      <span class="lbl">Seu endereço (não compartilhe)</span><span class="code sunk" id="urlnotif">${esc(url)}</span>
      <div class="grid2"><button class="btn ghost" id="copiar" type="button">Copiar endereço</button><button class="btn ghost" id="testar" type="button">Testar</button></div>
      <button class="linkbtn" id="novotoken" type="button" style="align-self:flex-start">Gerar um endereço novo (se vazou)</button></section>
    <section class="card stack"><h2>Banco pelo Open Finance</h2>
      <p class="small muted" style="margin:0">Uma vez por dia o Grão busca no banco tudo o que saiu da conta e do cartão. Precisa de uma conexão no Meu Pluggy (grátis).</p>
      ${S.itensPluggy.length?`<div class="list">${S.itensPluggy.map(i=>`<div class="row" style="padding:8px 0;border-top:1px solid var(--line)"><span>${esc(i.nome||'Banco')}<br><span class="dim small">${i.ultima_sync?'Última busca '+new Date(i.ultima_sync).toLocaleString('pt-BR'):'Ainda não buscou'}</span></span><button class="linkbtn" data-delpluggy="${i.id}" type="button">Remover</button></div>`).join('')}</div>`:''}
      <form class="grid2" id="fpluggy"><input id="pid" type="text" placeholder="Item ID do Pluggy" aria-label="Item ID do Pluggy"><input id="pnome" type="text" placeholder="Nome (ex.: BB)" aria-label="Nome do banco"></form>
      <div class="grid2"><button class="btn ghost" id="addpluggy" type="button">Adicionar banco</button><button class="btn line" id="sync" type="button" ${S.itensPluggy.length?'':'disabled'}>Buscar agora</button></div></section>
    <section class="card stack"><h2>Regras de categoria</h2>
      <p class="small muted" style="margin:0">Quando o nome tiver o texto, o gasto vai para a categoria. "Ignorar" não lança (use para Pix para você mesmo).</p>
      ${S.regras.length?`<div class="list">${S.regras.map(g=>`<div class="row" style="padding:8px 0;border-top:1px solid var(--line)"><span>"${esc(g.contem)}" → ${esc(g.cat==='Ignorar'?'Ignorar':nomeCat(g.cat))}</span><button class="linkbtn" data-delregra="${g.id}" type="button">Apagar</button></div>`).join('')}</div>`:'<p class="dim small" style="margin:0">Nenhuma regra ainda. Ao corrigir um gasto, marque "sempre assim".</p>'}
      <form class="grid2" id="fregra"><input id="gc" type="text" placeholder="Contém (ex.: max fibra)" aria-label="Texto"><select id="gcat" aria-label="Categoria"><option value="Ignorar">Ignorar</option>${CATS.map(([c])=>`<option value="${esc(c)}">${esc(nomeCat(c))}</option>`).join('')}</select></form>
      <button class="btn ghost" id="addregra" type="button">Adicionar regra</button></section>
    <form class="card stack" id="fsenha"><div class="row"><span class="muted">${esc(S.sessao.user.email)}</span><button class="linkbtn" id="sair" type="button">Sair</button></div>
      <div class="field"><label for="ns">Nova senha</label><input id="ns" type="password" autocomplete="new-password" minlength="6" placeholder="pelo menos 6 caracteres"></div>
      <button class="btn ghost" type="submit">Trocar senha</button></form>
  </div>`;
  $('#frenda').onsubmit=async e=>{ e.preventDefault(); const v=numBR($('#rv').value); if(!(v>=0)){ toast('Digite um valor'); return; } await salvarPerfil({renda:r2(v)},'Salário salvo'); };
  $('#ftetos').onsubmit=async e=>{ e.preventDefault(); const nt={}; document.querySelectorAll('#ftetos input[data-cat]').forEach(i=>{ const v=numBR(i.value); if(!isNaN(v)) nt[i.dataset.cat]=r2(v); }); await salvarPerfil({tetos:nt},'Tetos salvos'); };
  $('#copiar').onclick=async()=>{ try{ await navigator.clipboard.writeText(url); toast('Endereço copiado'); }catch{ const r=document.createRange(); r.selectNodeContents($('#urlnotif')); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Selecionei o endereço: copie'); } };
  $('#testar').onclick=async()=>{ try{ const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({titulo:'Compra aprovada',texto:'Compra aprovada de R$ 1,00 em TESTE GRAO no cartão final 0000',app:'Teste'})}); const j=await r.json();
      if(j.lancado){ toast('Chegou! Lancei R$ 1,00 de teste. Apague no Extrato.'); recarregar(); } else toast(j.erro||'Já tinha recebido esse teste.'); }catch{ toast('Não consegui testar agora.'); } };
  $('#novotoken').onclick=async()=>{ const {data,error}=await sb.rpc('novo_token_notif'); if(error){ toast('Não deu agora.'); return; } S.perfil.token_notif=data; render(); toast('Endereço novo criado. Atualize no MacroDroid.'); };
  $('#addpluggy').onclick=async()=>{ const id=$('#pid').value.trim(); if(!/^[0-9a-f-]{20,}$/i.test(id)){ toast('Cole o Item ID que aparece no Pluggy.'); return; }
    const {error}=await sb.from('pluggy_itens').insert({item_id:id,nome:$('#pnome').value.trim()||null}); if(error){ toast('Esse banco já está aqui.'); return; } toast('Banco adicionado'); recarregar(); };
  $('#sync').onclick=async e=>{ e.target.disabled=true; e.target.textContent='Buscando…'; const {data,error}=await sb.functions.invoke('pluggy-sync',{body:{}});
    if(error){ let m='Não consegui buscar agora.'; try{ m=(await error.context.json()).erro||m; }catch{} toast(m); } else { toast(data.novos?`${data.novos} gastos novos lançados`:'Nada novo no banco.'); } recarregar(); };
  $('#addregra').onclick=async()=>{ const c=$('#gc').value.trim().toLowerCase(); if(c.length<3){ toast('Digite pelo menos 3 letras.'); return; } await sb.from('regras').insert({contem:c,cat:$('#gcat').value}); toast('Regra salva'); recarregar(); };
  document.querySelectorAll('[data-delregra]').forEach(b=>b.onclick=async()=>{ await sb.from('regras').delete().eq('id',b.dataset.delregra); recarregar(); });
  document.querySelectorAll('[data-delpluggy]').forEach(b=>b.onclick=async()=>{ await sb.from('pluggy_itens').delete().eq('id',b.dataset.delpluggy); recarregar(); });
  $('#sair').onclick=()=>sb.auth.signOut();
  $('#fsenha').onsubmit=async e=>{ e.preventDefault(); const v=$('#ns').value; if(v.length<6){ toast('A senha precisa ter pelo menos 6 caracteres.'); return; }
    const {error}=await sb.auth.updateUser({password:v}); toast(error?'Não consegui trocar a senha.':'Senha trocada'); if(!error) $('#ns').value=''; };
}
async function salvarPerfil(campos,msg){ const {error}=await sb.from('perfis').update(campos).eq('user_id',S.sessao.user.id); if(error){ toast('Não consegui salvar.'); return; } Object.assign(S.perfil,campos); toast(msg); render(); }

// ---------- folha ----------
let folha=null;
function abrirFolha(html,montar){ fecharFolha(); folha=document.createElement('div'); folha.className='back'; folha.innerHTML=`<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  folha.addEventListener('click',e=>{ if(e.target===folha) fecharFolha(); }); document.body.appendChild(folha); montar&&montar(folha.firstElementChild); }
function fecharFolha(){ folha?.remove(); folha=null; }

function editar(id){
  const l=S.lanc.find(x=>x.id===id); if(!l) return;
  const irmaos=l.grupo?S.lanc.filter(x=>x.grupo===l.grupo):[l];
  abrirFolha(`<form class="stack" id="fed"><h2>${l.revisar?'Conferir gasto':'Editar gasto'}</h2>
    <div class="field"><label for="ed">Descrição</label><input id="ed" type="text" value="${esc(l.desc)}"></div>
    <div class="grid2"><div class="field"><label for="ev">Valor</label><input id="ev" type="text" inputmode="decimal" value="${String(l.valor).replace('.',',')}"></div>
      <div class="field"><label for="edt">Data</label><input id="edt" type="date" value="${esc(l.data)}"></div></div>
    <div class="grid2"><div class="field"><label for="ec">Categoria</label><select id="ec">${CATS.map(([c])=>`<option value="${esc(c)}" ${l.cat===c?'selected':''}>${esc(nomeCat(c))}</option>`).join('')}</select></div>
      <div class="field"><label for="ef">Pagamento</label><select id="ef">${FORMAS.map(f=>`<option ${l.forma===f?'selected':''}>${f}</option>`).join('')}</select></div></div>
    ${l.pt?'':`<label class="row small" style="justify-content:flex-start;gap:8px"><input type="checkbox" id="efora" ${l.fora_normal?'checked':''}> Fora do normal (não se repete, não entra na previsão)</label>`}
    ${l.origem!=='manual'?`<label class="row small" style="justify-content:flex-start;gap:8px"><input type="checkbox" id="esempre"> Sempre colocar "${esc(l.desc.slice(0,30))}" nessa categoria</label>`:''}
    ${l.itens?.length?`<details><summary class="small muted">${l.itens.length} itens do cupom</summary><div class="small" style="margin-top:6px">${l.itens.map(i=>`<div class="row"><span>${esc(i.descricao)}</span><span class="num">${R(i.total)}</span></div>`).join('')}</div></details>`:''}
    ${l.pt?`<p class="small muted" style="margin:0">Parcela ${l.pa} de ${l.pt}. Mudar a categoria muda todas as ${irmaos.length} parcelas.</p>`:''}
    <button class="btn" type="submit">Salvar</button>
    <button class="btn danger" type="button" id="edel">${l.pt?`Excluir as ${irmaos.length} parcelas`:'Excluir gasto'}</button>
    <button class="btn ghost" type="button" id="ecan">Cancelar</button></form>`, root=>{
    root.querySelector('#ecan').onclick=fecharFolha;
    let armado=false; const del=root.querySelector('#edel');
    del.onclick=async()=>{ if(!armado){ armado=true; del.textContent='Toque de novo para confirmar'; return; } del.disabled=true;
      const {error}=await sb.from('lancamentos').delete().in('id',irmaos.map(x=>x.id)); if(error){ toast('Não consegui excluir.'); del.disabled=false; return; } fecharFolha(); toast('Excluído'); recarregar(); };
    root.querySelector('#fed').onsubmit=async e=>{ e.preventDefault(); const v=numBR(root.querySelector('#ev').value); if(!(v>0)){ toast('Digite um valor maior que zero'); return; }
      const cat=root.querySelector('#ec').value;
      const {error}=await sb.from('lancamentos').update({descricao:root.querySelector('#ed').value.trim()||l.desc,valor:r2(v),data:root.querySelector('#edt').value||l.data,cat,pilar:CAT[cat].pilar,forma:root.querySelector('#ef').value,revisar:false,fora_normal:Boolean(root.querySelector('#efora')?.checked)}).eq('id',l.id);
      if(error){ toast('Não consegui salvar.'); return; }
      if(cat!==l.cat&&irmaos.length>1) await sb.from('lancamentos').update({cat,pilar:CAT[cat].pilar}).in('id',irmaos.filter(x=>x.id!==l.id).map(x=>x.id));
      if(root.querySelector('#esempre')?.checked) await sb.from('regras').insert({contem:l.desc.toLowerCase().slice(0,40),cat});
      fecharFolha(); toast('Salvo'); recarregar(); };
  });
}

// ---------- câmera e cupom fiscal ----------
let cam=null;
async function abrirCamera(){
  const el=document.createElement('div'); el.className='cam';
  el.innerHTML=`<video playsinline muted></video><div class="mira"></div>
    <div class="camtools"><button type="button" class="camb" id="camzoom" hidden>Zoom 2x</button><button type="button" class="camb" id="camluz" hidden>Lanterna</button></div>
    <div class="bar"><p class="small muted" style="margin:0;text-align:center" id="camdica">Segure o celular a um palmo do cupom, com o QR dentro do quadro. Toque na tela para focar.</p>
      <div class="grid2"><button class="btn" id="camfoto" type="button">Tirar foto</button><button class="btn ghost" id="camchave" type="button">Digitar a chave</button></div>
      <button class="btn ghost" id="camsai" type="button">Cancelar</button>
      <input type="file" accept="image/*" capture="environment" id="camarq" hidden></div>`;
  document.body.appendChild(el);
  const video=el.querySelector('video'); let parar=false, stream=null, track=null;
  const fechar=()=>{ parar=true; stream?.getTracks().forEach(t=>t.stop()); el.remove(); cam=null; };
  const achou=txt=>{ if(navigator.vibrate) navigator.vibrate(60); fechar(); lerCupom(txt); };
  cam={fechar}; el.querySelector('#camsai').onclick=fechar;
  // foto pela câmera do próprio celular: foca melhor e tem resolução bem maior que o vídeo
  const arq=el.querySelector('#camarq');
  el.querySelector('#camfoto').onclick=()=>arq.click();
  arq.onchange=async()=>{ const f=arq.files?.[0]; if(!f) return; const dica=el.querySelector('#camdica'); dica.textContent='Procurando o QR code na foto…';
    const txt=await qrDaFoto(f); arq.value='';
    if(txt) achou(txt); else dica.textContent='Não achei o QR code nessa foto. Tire de novo, com o QR inteiro, reto e sem reflexo.'; };
  el.querySelector('#camchave').onclick=()=>{ fechar(); digitarChave(); };
  try{ stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080},focusMode:{ideal:'continuous'}},audio:false}); }
  catch{ el.querySelector('#camdica').textContent='Não consegui abrir a câmera ao vivo. Use "Tirar foto" ou libere a permissão do navegador.'; return; }
  video.srcObject=stream; await video.play().catch(()=>{});
  track=stream.getVideoTracks()[0];
  const cap=track?.getCapabilities?.()||{};
  try{ if(cap.focusMode?.includes('continuous')) await track.applyConstraints({advanced:[{focusMode:'continuous'}]}); }catch{}
  // zoom deixa segurar o celular mais longe, onde a câmera consegue focar
  if(cap.zoom&&cap.zoom.max>=2){ const zb=el.querySelector('#camzoom'); let z=false; zb.hidden=false;
    zb.onclick=async()=>{ z=!z; try{ await track.applyConstraints({advanced:[{zoom:z?Math.min(2,cap.zoom.max):cap.zoom.min||1}]}); zb.setAttribute('aria-pressed',z); zb.textContent=z?'Zoom 1x':'Zoom 2x'; }catch{} }; }
  if(cap.torch){ const lb=el.querySelector('#camluz'); let on=false; lb.hidden=false;
    lb.onclick=async()=>{ on=!on; try{ await track.applyConstraints({advanced:[{torch:on}]}); lb.setAttribute('aria-pressed',on); }catch{} }; }
  video.onclick=async()=>{ try{ if(cap.focusMode?.includes('single-shot')){ await track.applyConstraints({advanced:[{focusMode:'single-shot'}]}); setTimeout(()=>track.applyConstraints({advanced:[{focusMode:'continuous'}]}).catch(()=>{}),1500); } }catch{} };
  const det=await detectorQR();
  const cv=document.createElement('canvas'), cx=cv.getContext('2d',{willReadFrequently:true});
  let volta=0;
  const tick=async()=>{ if(parar) return; let txt=null;
    try{ if(video.readyState>=2){
      if(det){ const r=await det.detect(video); if(r[0]) txt=r[0].rawValue; }
      if(!txt&&window.jsQR){ // QR do cupom é denso: lê o centro em resolução alta, alternando dois recortes
        const w=video.videoWidth, h=video.videoHeight, s=Math.min(w,h)*(volta++%2?.95:.7), k=Math.min(1,1000/s);
        cv.width=Math.round(s*k); cv.height=Math.round(s*k);
        cx.drawImage(video,(w-s)/2,(h-s)/2,s,s,0,0,cv.width,cv.height); const im=cx.getImageData(0,0,cv.width,cv.height);
        const r=jsQR(im.data,im.width,im.height,{inversionAttempts:'dontInvert'}); if(r) txt=r.data; } } }catch{}
    if(txt){ achou(txt); return; }
    setTimeout(tick, det?120:250); };
  tick();
}
async function detectorQR(){
  if(!('BarcodeDetector' in window)) return null;
  try{ const f=await BarcodeDetector.getSupportedFormats(); return f.includes('qr_code')? new BarcodeDetector({formats:['qr_code']}) : null; }catch{ return null; }
}
// lê o QR de uma foto tentando vários tamanhos e recortes (foto de celular é grande e o QR pode estar pequeno)
async function qrDaFoto(file){
  let img; try{ img=await createImageBitmap(file); }catch{ return null; }
  const det=await detectorQR();
  if(det){ try{ const r=await det.detect(img); if(r[0]) return r[0].rawValue; }catch{} }
  if(!window.jsQR) return null;
  const cv=document.createElement('canvas'), cx=cv.getContext('2d',{willReadFrequently:true});
  const W=img.width, H=img.height;
  const tentativas=[[0,0,W,H,1600],[0,0,W,H,1000],[W*.15,H*.15,W*.7,H*.7,1400],[W*.25,H*.25,W*.5,H*.5,1600],[W*.32,H*.32,W*.36,H*.36,1600]];
  for(const [x,y,w,h,max] of tentativas){ const k=Math.min(1,max/Math.max(w,h)); cv.width=Math.round(w*k); cv.height=Math.round(h*k);
    cx.drawImage(img,x,y,w,h,0,0,cv.width,cv.height); const im=cx.getImageData(0,0,cv.width,cv.height);
    const r=jsQR(im.data,im.width,im.height,{inversionAttempts:'attemptBoth'}); if(r) return r.data; }
  return null;
}
function digitarChave(){
  abrirFolha(`<form class="stack" id="fch"><h2>Digitar a chave do cupom</h2>
    <p class="small muted" style="margin:0">São os 44 números embaixo do QR code, em "Chave de acesso". Pode digitar com ou sem espaços.</p>
    <div class="field"><label for="chv">Chave de acesso</label><input id="chv" type="text" inputmode="numeric" autocomplete="off" placeholder="3126 1100 0000 ..."></div>
    <p class="small dim" id="chvn" style="margin:0">0 de 44 números</p>
    <button class="btn" type="submit">Buscar cupom</button><button class="btn ghost" type="button" id="chvc">Cancelar</button></form>`, root=>{
    const i=root.querySelector('#chv'), n=root.querySelector('#chvn');
    i.oninput=()=>{ n.textContent=`${i.value.replace(/\D/g,'').length} de 44 números`; };
    root.querySelector('#chvc').onclick=fecharFolha;
    root.querySelector('#fch').onsubmit=e=>{ e.preventDefault(); const c=i.value.replace(/\D/g,''); if(c.length!==44){ toast('A chave tem 44 números.'); return; } fecharFolha(); lerCupom(c); };
    setTimeout(()=>i.focus(),50);
  });
}
async function lerCupom(qr){
  abrirFolha(`<div class="stack"><h2>Lendo o cupom na SEFAZ…</h2><p class="muted small" style="margin:0">Leva alguns segundos.</p></div>`);
  const {data,error}=await sb.functions.invoke('nfce',{body:{qr}});
  if(error||!data){ let m='Não consegui ler esse QR code.'; try{ m=(await error.context.json()).erro||m; }catch{} fecharFolha(); toast(m); return; }
  if(S.lanc.some(l=>l.origem==='nfce'&&l.ref_externa===data.chave)){ fecharFolha(); toast('Esse cupom já foi lançado.'); return; }
  const d=data, itens=d.itens||[], data_=d.data||hoje();
  abrirFolha(`<form class="stack" id="fcupom"><h2>Cupom fiscal</h2>
    ${d.aviso?`<p class="notice warn" style="margin:0">${esc(d.aviso)}</p>`:''}
    <div class="field"><label for="cl">Loja</label><input id="cl" type="text" value="${esc(d.loja||('CNPJ '+d.cnpj))}"></div>
    <div class="grid2"><div class="field"><label for="cv">Total</label><input id="cv" class="num" type="text" inputmode="decimal" value="${d.total!=null?String(d.total).replace('.',','):''}" placeholder="0,00"></div>
      <div class="field"><label for="cd">Data</label><input id="cd" type="date" value="${esc(data_)}"></div></div>
    <div class="grid2"><div class="field"><label for="cc">Categoria</label><select id="cc">${CATS.map(([c])=>`<option value="${esc(c)}" ${c==='Alimentação'?'selected':''}>${esc(nomeCat(c))}</option>`).join('')}</select></div>
      <div class="field"><label for="cf">Pagamento</label><select id="cf">${FORMAS.map(f=>`<option ${f===(d.forma||'Débito')?'selected':''}>${f}</option>`).join('')}</select></div></div>
    ${itens.length?`<details open><summary class="small muted">${itens.length} itens</summary><div class="small" style="margin-top:6px;max-height:34vh;overflow:auto">${itens.map(i=>`<div class="row" style="padding:4px 0;border-top:1px solid var(--line)"><span>${esc(i.descricao)}${i.quantidade?` <span class="dim">× ${String(i.quantidade).replace('.',',')}</span>`:''}</span><span class="num">${R(i.total)}</span></div>`).join('')}</div></details>`:''}
    <button class="btn" type="submit">Lançar cupom</button><button class="btn ghost" type="button" id="ccan">Cancelar</button></form>`, root=>{
    root.querySelector('#ccan').onclick=fecharFolha;
    root.querySelector('#fcupom').onsubmit=async e=>{ e.preventDefault(); const v=numBR(root.querySelector('#cv').value); if(!(v>0)){ toast('Digite o total do cupom'); return; }
      const cat=root.querySelector('#cc').value;
      const {error}=await sb.from('lancamentos').insert({data:root.querySelector('#cd').value||hoje(),descricao:root.querySelector('#cl').value.trim().slice(0,80)||'Cupom fiscal',cat,pilar:CAT[cat].pilar,valor:r2(v),forma:root.querySelector('#cf').value,origem:'nfce',ref_externa:d.chave,itens:itens.length?itens:null});
      if(error){ toast(/duplicate|unique/i.test(error.message)?'Esse cupom já foi lançado.':'Não consegui lançar.'); return; }
      fecharFolha(); toast('Cupom lançado'); S.tab='extrato'; S.mes=ym(root.querySelector('#cd').value||hoje()); recarregar(); };
  });
}

// ---------- lançar à mão ----------
async function salvarNovo(){
  const n=S.novo, v=numBR(n.valor); if(!(v>0)){ toast('Digite o valor do gasto'); $('#nv')?.focus(); return; }
  const desc=n.desc.trim()||nomeCat(n.cat), base={cat:n.cat,pilar:CAT[n.cat].pilar,forma:n.forma,origem:'manual'};
  const b=V().querySelector('#fnovo button[type=submit]'); if(b) b.disabled=true;
  let linhas;
  if(n.parcelado&&n.n>1){ const k=Math.min(48,Math.max(2,parseInt(n.n)||2)), p=r2(v/k), g='g'+Date.now().toString(36);
    linhas=Array.from({length:k},(_,i)=>({...base,data:addDiaMes(n.data,i),descricao:`${desc} (${i+1}/${k})`,valor:i===k-1?r2(v-p*(k-1)):p,pa:i+1,pt:k,grupo:g})); }
  else linhas=[{...base,data:n.data,descricao:desc,valor:r2(v)}];
  const {error}=await sb.from('lancamentos').insert(linhas);
  if(error){ toast('Não consegui salvar.'); if(b) b.disabled=false; return; }
  toast(linhas.length>1?`${linhas.length} parcelas salvas`:'Gasto salvo'); S.novo={...S.novo,valor:'',desc:'',parcelado:false,n:2}; S.mes=ym(n.data); recarregar();
}

// ---------- eventos ----------
let toques=0, toqueT=null;
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-tab],[data-cat],[data-parc],[data-edit],[data-mes],[data-base],[data-ir],#brand'); if(!t) return;
  if(t.id==='brand'){ toques++; clearTimeout(toqueT); toqueT=setTimeout(()=>toques=0,1500); if(toques>=5){ toques=0; ratinho(); } return; }
  if(t.dataset.tab){ S.tab=t.dataset.tab; scrollTo(0,0); render(); return; }
  if(t.dataset.ir){ S.tab=t.dataset.ir; scrollTo(0,0); render(); return; }
  if(t.dataset.mes){ S.mes=addMes(S.mes,+t.dataset.mes); render(); return; }
  if(t.dataset.edit){ editar(t.dataset.edit); return; }
  if(t.dataset.base){ S.base=t.dataset.base; rFuturo(); return; }
  if(t.closest('#fnovo')){ if(t.dataset.cat){ S.novo.cat=t.dataset.cat; rLancar(); } else if(t.dataset.parc){ S.novo.parcelado=t.dataset.parc==='1'; rLancar(); } }
});
document.addEventListener('input',e=>{ const id=e.target.id;
  if(id==='nv'){ S.novo.valor=e.target.value; const i=$('#nninfo'); if(i) i.textContent=`${S.novo.n} × ${R((numBR(S.novo.valor)||0)/(S.novo.n||1))} por mês, a partir de ${nomeMes(ym(S.novo.data))}`; }
  else if(id==='nd') S.novo.desc=e.target.value;
  else if(id==='busca'){ S.busca=e.target.value; const p=e.target.selectionStart; rExtrato(); const b=$('#busca'); b.focus(); b.setSelectionRange(p,p); }
  else if(id==='sv'||id==='sn'){ S.sim[id==='sv'?'valor':'n']=e.target.value; const p=e.target.selectionStart; rFuturo(); const n=$('#'+id); n.focus(); try{ n.setSelectionRange(p,p);}catch{} }
});
document.addEventListener('change',e=>{ const id=e.target.id;
  if(id==='ncat'){ S.novo.cat=e.target.value; rLancar(); } else if(id==='ndt'){ S.novo.data=e.target.value||hoje(); rLancar(); }
  else if(id==='nf') S.novo.forma=e.target.value; else if(id==='nn'){ S.novo.n=Math.min(48,Math.max(2,parseInt(e.target.value)||2)); rLancar(); }
  else if(id==='si'){ S.sim.inicio=e.target.value; rFuturo(); }
});
document.addEventListener('submit',e=>{ if(e.target.id==='fnovo'){ e.preventDefault(); salvarNovo(); } });
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&S.sessao&&S.carregou&&!folha&&!cam) recarregar(); });

let toastT=null;
function toast(m){ document.querySelector('.toast')?.remove(); const t=document.createElement('div'); t.className='toast'; t.setAttribute('role','status'); t.textContent=m; document.body.appendChild(t); clearTimeout(toastT); toastT=setTimeout(()=>t.remove(),2800); }
function ratinho(){ const r=document.createElement('div'); r.className='rato corre'; r.innerHTML=RATO; document.body.appendChild(r);
  const s=renda()-resumo(ym(hoje())).total; toast(s>0?`O ratinho guardou ${R(s)} este mês.`:'O ratinho está sem migalhas este mês.'); setTimeout(()=>r.remove(),3400); }

// ---------- início ----------
sb.auth.onAuthStateChange(async (_ev,sess)=>{
  const mudou=(sess?.user?.id)!==(S.sessao?.user?.id); S.sessao=sess;
  if(!sess){ S.carregou=false; S.lanc=[]; render(); return; }
  if(mudou){ S.carregou=false; render(); setTimeout(async()=>{ try{ await carregar(); }catch{ toast('Não consegui carregar os dados.'); } render(); },0); }
});
render();
