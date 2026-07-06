/* ===========================================================
   SBS Painel de Inteligência de Mercado — Coletor
   Esqueleto do coletor de fontes dos concorrentes. Roda no painel:
   - processa fontes do tipo "rss" (feeds abertos) gerando movimentos;
   - registra a última coleta de cada fonte;
   - redes (IG/FB/LinkedIn/YouTube) ficam marcadas como "via backend"
     pois exigem tokens oficiais — a função pronta está em
     functions/coletor-concorrentes.js (Netlify/Supabase).
   =========================================================== */
(function(){
  const M = MI.Modules, S = MI.S, esc = MI.esc;

  function fontes(){ return S.getCol("mi_fontes")||[]; }
  function cfg(){ return S.get("mi_coletor_cfg")||{ ativo:false, ultimaRodada:0, total:0, log:[] }; }
  function save(c){ S.set("mi_coletor_cfg", c); }

  // canais que precisam de token/backend vs. abertos
  const VIA_BACKEND = { instagram:1, facebook:1, linkedin:1, youtube:1, marketplace:1 };
  const ABERTO = { rss:1, site:1, preco:1 };

  async function coletarRSS(f){
    // feeds abertos: tenta ler e extrai os títulos mais recentes
    try{
      const r = await fetch(f.url, {headers:{}});
      if(!r.ok) throw 0;
      const xml = await r.text();
      const tits = [];
      const re = /<(title|h3)[^>]*>([\s\S]*?)<\/(title|h3)>/gi; let m, i=0;
      while((m=re.exec(xml)) && i<4){ const t=m[2].replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]+>/g,"").trim(); if(t && t.length>8){ tits.push(t); i++; } }
      return tits.slice(1,3); // pula o título do feed
    }catch(e){ return null; }
  }

  async function rodar(){
    const c=cfg(); const fs=fontes().filter(f=>f.ativo); let novos=0;
    for(const f of fs){
      if(ABERTO[f.canal] && f.url && f.canal==="rss"){
        const itens = await coletarRSS(f);
        S.update("mi_fontes", f.id, { ultima:S.today?S.today():new Date().toLocaleDateString("pt-BR") });
        if(itens && itens.length){
          itens.forEach(tx=>{
            S.add("mi_cc_movimentos",{ id:"mov"+Date.now()+Math.floor(Math.random()*999), ccId:f.ccId, ccNome:f.ccNome, tipo:"lancamento", regiao:"", texto:"Coletor (RSS): "+tx, data:S.today?S.today():"", ts:Date.now(), por:"Coletor", auto:true });
            novos++;
          });
          S.add("notificacoes",{ title:"Coletor · "+f.ccNome, text:itens[0], tipo:"aviso", icon:"rss", destino:"grp:mercado", destinoLabel:"Inteligência de Mercado", data:S.today?S.today():"", ts:Date.now(), de:"coletor@sbsgreen.com.br" });
        }
      } else {
        // canal via backend: apenas marca como pendente de coletor externo
        S.update("mi_fontes", f.id, { ultima:f.ultima||"(via backend)" });
      }
    }
    c.ultimaRodada=Date.now(); c.total=(c.total||0)+novos; c.log=([{quando:Date.now(),n:novos}].concat(c.log||[])).slice(0,10); save(c);
    return novos;
  }

  M.coletor = {
    label:"Coletor (automação)",
    render(){
      const c=cfg(), fs=fontes();
      const abertos=fs.filter(f=>ABERTO[f.canal]).length, backend=fs.filter(f=>VIA_BACKEND[f.canal]).length;
      const last=c.ultimaRodada?new Date(c.ultimaRodada).toLocaleString("pt-BR"):"—";
      const kpi=(ic,v,l,t)=>`<div class="mc-kpi ${t||''}"><span class="mc-kpi-ic"><i data-lucide="${ic}"></i></span><div><div class="mc-kpi-v">${v}</div><div class="mc-kpi-l">${l}</div></div></div>`;
      return `
      <div class="mc-kpis">
        ${kpi("bot", c.total||0, "Itens coletados", "")}
        ${kpi("rss", abertos, "Canais abertos (RSS/site)", "ok")}
        ${kpi("key-round", backend, "Canais que exigem token", backend?"warn":"")}
        ${kpi("history", last.split(" ")[1]||last, "Última rodada", "")}
      </div>
      <div class="mc-toolbar"><div class="mc-sub">Coleta o que é aberto agora; redes sociais exigem o coletor de backend</div>
        <button class="mc-btn primary" id="cl-run"><i data-lucide="play"></i> Coletar agora</button></div>

      <div class="mc-card">
        <div class="mc-card-h"><i data-lucide="check-circle-2"></i> O que já funciona aqui</div>
        <div class="ft-s" style="font-size:13px;line-height:1.6">Fontes do tipo <b>RSS / notícias</b> e <b>site</b> são lidas direto: o coletor extrai as novidades e cria movimentos automáticos na linha do tempo do concorrente, avisando a Inteligência de Mercado.</div>
      </div>
      <div class="mc-card" style="margin-top:14px">
        <div class="mc-card-h"><i data-lucide="key-round"></i> O que precisa de token (coletor de backend)</div>
        <div class="ft-s" style="font-size:13px;line-height:1.6">Instagram, Facebook, LinkedIn e YouTube <b>não permitem</b> leitura sem credencial oficial. A função pronta está em <code>functions/coletor-concorrentes.js</code> — basta subir no Netlify/Supabase e preencher os tokens. Para ligar, preciso de:</div>
        <ul class="cl-ul">
          <li><b>Meta (Instagram + Facebook):</b> App no Meta for Developers → token da Graph API + IDs das páginas/contas.</li>
          <li><b>YouTube:</b> chave da YouTube Data API v3 (Google Cloud).</li>
          <li><b>LinkedIn:</b> acesso à API de Páginas (aprovação do LinkedIn) — ou monitoramento manual.</li>
          <li><b>Hospedagem:</b> acesso ao Netlify (Functions) ou Supabase (Edge Functions) para agendar.</li>
        </ul>
      </div>
      ${(c.log&&c.log.length)?`<div class="mc-card" style="margin-top:14px"><div class="mc-card-h"><i data-lucide="list"></i> Últimas rodadas</div>${c.log.slice(0,5).map(l=>`<div class="ft-s">${l.n} item(ns) · ${esc(new Date(l.quando).toLocaleString("pt-BR"))}</div>`).join("")}</div>`:""}
      <div class="mc-note" style="margin-top:14px"><i data-lucide="info"></i> Cadastre as fontes em <b>Fontes de Monitoramento</b>. Quando você me passar os tokens, eu finalizo a integração de redes sociais — o arquivo da função já está no projeto.</div>`;
    },
    mount(c){
      c.querySelector("#cl-run") && (c.querySelector("#cl-run").onclick=async()=>{ MI.toast("Coletando..."); const n=await rodar(); MI.toast(n+" item(ns) coletado(s)"); MI.go("coletor"); });
    }
  };

  window.MI_COLETOR = { rodar:rodar };
})();
