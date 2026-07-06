/* ===========================================================
   SBS Inteligência de Mercado — DADOS AO VIVO
   Câmbio em tempo real (USD/BRL, EUR/BRL) + histórico, direto do
   navegador via AwesomeAPI (CORS liberado, sem chave, sem servidor).
   Opcional: commodities globais via Alpha Vantage (chave gratuita,
   configurável no T.I.). Sem chave, as commodities seguem manuais.
   =========================================================== */
window.MI_LIVE = (function(){
  var FX_URL = "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL";
  var FX_HIST = "https://economia.awesomeapi.com.br/json/daily/USD-BRL/12";
  var LS = "sbs_mi_fx";
  var LS_COMM = "sbs_mi_comm";
  var KEYCFG = "mi_config"; // registro na nuvem com a chave Alpha Vantage
  var cache = null, listeners = [];

  /* ---- commodities globais via Alpha Vantage (chave grátis, CORS ok) ---- */
  var AV = "https://www.alphavantage.co/query";
  var COMMODITIES = [
    { fn:"CORN",   nome:"Milho (global)",   icon:"wheat",   unidade:"US$/ton" },
    { fn:"WHEAT",  nome:"Trigo (global)",   icon:"wheat",   unidade:"US$/ton" },
    { fn:"COFFEE", nome:"Café (global)",    icon:"coffee",  unidade:"US$/lb"  },
    { fn:"SUGAR",  nome:"Açúcar (global)",  icon:"candy",   unidade:"US$/lb"  },
    { fn:"COTTON", nome:"Algodão (global)", icon:"flower",  unidade:"US$/lb"  },
    { fn:"BRENT",  nome:"Petróleo Brent",   icon:"fuel",    unidade:"US$/bbl" }
  ];
  function avKey(){
    try{
      var st = (window.MI&&MI.S)||window.SBS_STORE;
      if(st){ var c=(st.getCol&&st.getCol(KEYCFG))||[]; if(c[0]&&c[0].alphavantage) return c[0].alphavantage; }
    }catch(e){}
    try{ return localStorage.getItem("sbs_av_key")||""; }catch(e){ return ""; }
  }
  function setAvKey(k){
    try{ localStorage.setItem("sbs_av_key", k||""); }catch(e){}
    try{ var st=(window.MI&&MI.S)||window.SBS_STORE; if(st&&st.setCol){ st.setCol(KEYCFG, [{ id:"cfg", alphavantage:k||"" }]); } }catch(e){}
    try{ localStorage.removeItem(LS_COMM); }catch(e){}
  }
  async function fetchCommodities(){
    var key = avKey(); if(!key) return null;
    var loaded = (function(){ try{ return JSON.parse(localStorage.getItem(LS_COMM)||"null"); }catch(e){ return null; } })();
    if(loaded && (Date.now()-loaded.ts) < 6*3600000) return loaded; // limite grátis: ~25 req/dia
    var res=[];
    for(var i=0;i<COMMODITIES.length;i++){
      var c=COMMODITIES[i];
      try{
        var r = await fetch(AV+"?function="+c.fn+"&interval=monthly&apikey="+encodeURIComponent(key), {cache:"no-store"});
        var j = await r.json();
        if(j.Information||j.Note){ res.push({ nome:c.nome, icon:c.icon, unidade:c.unidade, limit:true }); continue; }
        var d=(j.data||[]).filter(function(x){ return x.value && x.value!=="."; });
        if(d.length){ var v=+d[0].value, ant=d[1]?+d[1].value:v; var pct=ant?((v-ant)/ant*100):0;
          res.push({ nome:c.nome, icon:c.icon, unidade:c.unidade, v:v, pct:pct, date:d[0].date }); }
      }catch(e){ res.push({ nome:c.nome, icon:c.icon, unidade:c.unidade, err:true }); }
    }
    var pack={ list:res, ts:Date.now() };
    try{ localStorage.setItem(LS_COMM, JSON.stringify(pack)); }catch(e){}
    return pack;
  }

  function fmt(v){ return "R$ "+Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function load(){ try{ return JSON.parse(localStorage.getItem(LS)||"null"); }catch(e){ return null; } }
  function save(d){ try{ localStorage.setItem(LS, JSON.stringify(d)); }catch(e){} }

  function onUpdate(fn){ listeners.push(fn); if(cache) fn(cache); }
  function emit(){ listeners.forEach(function(fn){ try{ fn(cache); }catch(e){} }); }

  async function fetchFX(){
    try{
      var r = await fetch(FX_URL, {cache:"no-store"});
      if(!r.ok) throw new Error("HTTP "+r.status);
      var j = await r.json();
      var usd = j.USDBRL, eur = j.EURBRL;
      var hist = [];
      try{
        var rh = await fetch(FX_HIST, {cache:"no-store"});
        if(rh.ok){ hist = (await rh.json()).map(function(p){ return +p.bid; }).reverse(); }
      }catch(e){}
      cache = {
        usd: { v:+usd.bid, pct:+usd.pctChange, high:+usd.high, low:+usd.low },
        eur: { v:+eur.bid, pct:+eur.pctChange },
        hist: hist,
        ts: Date.now(),
        live: true
      };
      save(cache); emit(); return cache;
    }catch(e){
      // offline / bloqueado → usa último conhecido
      var last = load();
      if(last){ last.live=false; cache=last; emit(); return last; }
      cache = { error:true }; emit(); return cache;
    }
  }

  function spark(arr, w, h){
    if(!arr || arr.length<2) return "";
    var mn=Math.min.apply(null,arr), mx=Math.max.apply(null,arr), rng=(mx-mn)||1;
    var pts=arr.map(function(v,i){ return (i/(arr.length-1)*w).toFixed(1)+","+(h-(v-mn)/rng*h).toFixed(1); }).join(" ");
    var up = arr[arr.length-1]>=arr[0];
    return '<svg class="mi-spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><polyline points="'+pts+'" fill="none" stroke="'+(up?'#0B8A5E':'#b3261e')+'" stroke-width="2"/></svg>';
  }

  function ago(ts){ var s=Math.floor((Date.now()-ts)/1000); if(s<90) return "agora"; var m=Math.floor(s/60); if(m<60) return "há "+m+" min"; var h=Math.floor(m/60); if(h<24) return "há "+h+"h"; return "há "+Math.floor(h/24)+" d"; }

  /* HTML das commodities globais ao vivo */
  function commHtml(pack){
    if(!avKey()) return '<div class="mi-comm-cfg"><i data-lucide="plug"></i><div><b>Ative as commodities globais ao vivo</b><span>Cole uma chave gratuita da Alpha Vantage em Configurar fontes. Sem chave, as cotações seguem manuais.</span></div><button class="mc-btn primary" id="mi-cfg-open"><i data-lucide="key-round"></i> Configurar</button></div>';
    if(!pack || !pack.list){ return '<div class="mi-comm-grid"><div class="mi-comm-load"><span class="mi-live-dot"></span> Carregando commodities globais…</div></div>'; }
    var cards = pack.list.map(function(c){
      if(c.limit) return '<div class="mi-comm"><div class="mi-comm-n"><i data-lucide="'+c.icon+'"></i> '+c.nome+'</div><div class="mi-comm-x">limite diário atingido</div></div>';
      if(c.err||c.v==null) return '<div class="mi-comm"><div class="mi-comm-n"><i data-lucide="'+c.icon+'"></i> '+c.nome+'</div><div class="mi-comm-x">indisponível</div></div>';
      var up=c.pct>=0;
      return '<div class="mi-comm"><div class="mi-comm-n"><i data-lucide="'+c.icon+'"></i> '+c.nome+'</div>'+
        '<div class="mi-comm-v">'+Number(c.v).toLocaleString("pt-BR",{maximumFractionDigits:2})+' <small>'+c.unidade+'</small></div>'+
        '<div class="mi-comm-p '+(up?'up':'down')+'">'+(up?'▲ +':'▼ ')+c.pct.toFixed(2)+'% <span>no mês</span></div></div>';
    }).join("");
    return '<div class="mi-comm-grid">'+cards+'</div><div class="mi-live-src" style="opacity:.7;margin-top:6px">Fonte: Alpha Vantage · preços internacionais · '+ago(pack.ts)+'</div>';
  }

  /* HTML da faixa de câmbio ao vivo */
  function stripHtml(d){
    if(!d || d.error) return '<div class="mi-live-strip err"><i data-lucide="wifi-off"></i> Câmbio ao vivo indisponível no momento.</div>';
    var arrow=function(p){ return p>=0?'<span class="mi-fx-up">▲ '+p.toFixed(2)+'%</span>':'<span class="mi-fx-down">▼ '+Math.abs(p).toFixed(2)+'%</span>'; };
    return ''+
    '<div class="mi-live-strip">'+
      '<div class="mi-fx">'+
        '<div class="mi-fx-c"><div class="mi-fx-l"><span class="mi-live-dot"></span> Dólar comercial</div>'+
          '<div class="mi-fx-v">'+fmt(d.usd.v)+' '+arrow(d.usd.pct)+'</div>'+
          '<div class="mi-fx-s">máx '+fmt(d.usd.high)+' · mín '+fmt(d.usd.low)+'</div></div>'+
        spark(d.hist, 120, 34)+
      '</div>'+
      '<div class="mi-fx">'+
        '<div class="mi-fx-c"><div class="mi-fx-l"><span class="mi-live-dot"></span> Euro</div>'+
          '<div class="mi-fx-v">'+fmt(d.eur.v)+' '+arrow(d.eur.pct)+'</div>'+
          '<div class="mi-fx-s">câmbio comercial</div></div>'+
      '</div>'+
      '<div class="mi-live-meta">'+(d.live?'<span class="mi-live-badge"><span class="mi-live-dot"></span> AO VIVO</span>':'<span class="mi-live-badge off">último dado</span>')+
        '<div class="mi-live-src">Fonte: AwesomeAPI · '+ago(d.ts)+'</div></div>'+
    '</div>';
  }

  function injectCss(){
    if(document.getElementById("mi-live-css")) return;
    var s=document.createElement("style"); s.id="mi-live-css";
    s.textContent=
      '.mi-live-strip{display:flex;flex-wrap:wrap;gap:18px;align-items:center;background:linear-gradient(110deg,#0B6B61,#0E9B8E);color:#fff;border-radius:16px;padding:16px 20px;margin-bottom:16px}'+
      '.mi-live-strip.err{background:#7c2d2d;font-size:13px;gap:8px}'+
      '.mi-fx{display:flex;align-items:center;gap:14px}'+
      '.mi-fx-l{font-size:11.5px;font-weight:700;opacity:.92;display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:.03em}'+
      '.mi-fx-v{font-size:21px;font-weight:800;display:flex;align-items:baseline;gap:8px;margin-top:2px}'+
      '.mi-fx-s{font-size:11px;opacity:.82;margin-top:1px}'+
      '.mi-fx-up{font-size:12px;font-weight:800;color:#9af5c8}'+
      '.mi-fx-down{font-size:12px;font-weight:800;color:#ffc9c2}'+
      '.mi-spark{width:120px;height:34px}'+
      '.mi-live-meta{margin-left:auto;text-align:right}'+
      '.mi-live-badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;background:rgba(255,255,255,.18);padding:4px 10px;border-radius:20px}'+
      '.mi-live-badge.off{background:rgba(255,255,255,.12);opacity:.8}'+
      '.mi-live-dot{width:8px;height:8px;border-radius:50%;background:#7CFFB0;box-shadow:0 0 0 0 rgba(124,255,176,.7);animation:miPulse 1.8s infinite}'+
      '@keyframes miPulse{0%{box-shadow:0 0 0 0 rgba(124,255,176,.6)}70%{box-shadow:0 0 0 7px rgba(124,255,176,0)}100%{box-shadow:0 0 0 0 rgba(124,255,176,0)}}'+
      '.mi-live-src{font-size:10.5px;opacity:.8;margin-top:5px}'+
      '@media(max-width:720px){.mi-live-meta{margin-left:0;width:100%;text-align:left}}'+
      '.mi-comm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:6px}'+
      '.mi-comm{background:var(--card,#fff);border:1px solid var(--line,#e7ebe9);border-radius:13px;padding:13px 15px}'+
      '.mi-comm-n{font-size:12px;font-weight:700;color:var(--ink2,#46514c);display:flex;align-items:center;gap:7px}'+
      '.mi-comm-n i{width:15px;height:15px}'+
      '.mi-comm-v{font-size:19px;font-weight:800;margin-top:6px;color:var(--ink,#16201a)}.mi-comm-v small{font-size:11px;font-weight:600;color:var(--muted,#8a948f)}'+
      '.mi-comm-p{font-size:12px;font-weight:800;margin-top:3px}.mi-comm-p span{font-weight:600;color:var(--muted,#8a948f);font-size:10.5px}'+
      '.mi-comm-p.up{color:#0B8A5E}.mi-comm-p.down{color:#b3261e}'+
      '.mi-comm-x{font-size:11.5px;color:var(--muted,#8a948f);margin-top:6px}'+
      '.mi-comm-load{grid-column:1/-1;font-size:13px;color:var(--muted,#8a948f);display:flex;align-items:center;gap:8px;padding:6px 0}'+
      '.mi-comm-cfg{display:flex;align-items:center;gap:14px;background:#FBF6EC;border:1px solid #EAD9B0;border-radius:14px;padding:15px 18px}'+
      '.mi-comm-cfg i{width:22px;height:22px;color:#B08400;flex:0 0 auto}'+
      '.mi-comm-cfg div{flex:1}.mi-comm-cfg b{display:block;font-size:13.5px;color:#5C4A12}.mi-comm-cfg span{font-size:12px;color:#7A6A3A}'+
      '.mi-livetag{font-size:10px;font-weight:800;color:#0B8A5E;background:#E4F5EC;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:.04em}';
    document.head.appendChild(s);
  }

  /* monta a faixa num container e mantém atualizando */
  var timer=null;
  function mount(sel){
    injectCss();
    var el = typeof sel==="string" ? document.querySelector(sel) : sel;
    if(!el) return;
    function paint(d){ el.innerHTML = stripHtml(d); window.lucide && lucide.createIcons(); }
    if(cache) paint(cache); else { el.innerHTML='<div class="mi-live-strip"><span class="mi-live-dot"></span> Carregando câmbio ao vivo…</div>'; }
    fetchFX().then(paint);
    var h=function(d){ if(document.body.contains(el)) paint(d); };
    listeners.push(h);
    if(timer) clearInterval(timer);
    timer=setInterval(function(){ if(document.body.contains(el)) fetchFX(); }, 180000); // 3 min
  }

  // pré-carrega cache salvo para resposta instantânea
  cache = load();

  /* tenta o backend (Netlify Function) — traz CEPEA/saca quando publicado.
     Local/sem função: falha em silêncio e mantém o cadastro manual. */
  async function syncBackend(){
    try{
      var r = await fetch("/.netlify/functions/cotacoes", {cache:"no-store"});
      if(!r.ok) return null;
      var j = await r.json();
      if(j && j.cepea && j.cepea.length){
        var st=(window.MI&&MI.S)||window.SBS_STORE;
        if(st&&st.getCol&&st.setCol){
          var atual = st.getCol("mi_cotacoes")||[];
          var keyOf=function(p){ return (p||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z ]/g," ").trim().split(/\s+/)[0]; };
          j.cepea.forEach(function(row){
            var rk = keyOf(row.produto);
            var i = atual.findIndex(function(x){ return keyOf(x.produto)===rk; });
            var preco = +row.preco||0;
            var pct = (row.pct==null?0:+row.pct);
            // o painel calcula variação por (preco vs anterior); derivamos anterior do pct do CEPEA
            var anterior = pct ? +(preco/(1+pct/100)).toFixed(2) : (i>=0?(atual[i].anterior||preco):preco);
            var rec = { produto:row.produto, praca:row.praca, unidade:row.unidade||"R$/sc", preco:preco, anterior:anterior, atualizado:row.data||"", fonte:(row.fonte||"CEPEA")+" · auto", auto:true };
            if(i>=0) atual[i]=Object.assign({},atual[i],rec); else atual.push(Object.assign({id:"ct"+Date.now()+Math.floor(Math.random()*999)},rec));
          });
          st.setCol("mi_cotacoes", atual);
          return { j:j, updated:j.cepea.length };
        }
      }
      return j;
    }catch(e){ return null; }
  }

  return { fetchFX:fetchFX, mount:mount, stripHtml:stripHtml, onUpdate:onUpdate, get data(){ return cache; }, fmt:fmt,
    fetchCommodities:fetchCommodities, avKey:avKey, setAvKey:setAvKey, COMMODITIES:COMMODITIES, commHtml:commHtml, syncBackend:syncBackend };
})();
