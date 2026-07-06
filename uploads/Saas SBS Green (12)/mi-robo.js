/* ===========================================================
   SBS Painel de Inteligência de Mercado — Robô de Monitoramento
   Vigia as cotações/commodities e, quando o preço de referência de
   um produto se move além do limite, registra AUTOMATICAMENTE um
   movimento de preço nos concorrentes monitorados daquele segmento
   e avisa as vendas. Roda sozinho (boot + intervalo).
   Obs.: monitoramento de fontes externas reais (sites/portais) exige
   um conector de backend; aqui o robô usa as cotações já no sistema.
   =========================================================== */
(function(){
  const M = MI.Modules, S = MI.S, esc = MI.esc, money = MI.money;
  const DEDUPE_H = 20;

  // palavra-chave do produto -> casa com segmento do concorrente
  function keyProduto(p){ p=(p||"").toLowerCase();
    if(/soja/.test(p)) return "soja"; if(/milho/.test(p)) return "milho";
    if(/algod/.test(p)) return "algod"; if(/sorgo/.test(p)) return "sorgo";
    if(/pasta|forrage|braqui/.test(p)) return "pasta"; if(/feij/.test(p)) return "feij"; return ""; }

  function cfg(){ return S.get("mi_robo_cfg") || { ativo:true, limite:3, disparos:{}, log:[], total:0 }; }
  function save(c){ S.set("mi_robo_cfg", c); }

  function run(){
    const c=cfg(); if(!c.ativo) { c.ultimoRun=Date.now(); save(c); return {n:0}; }
    const cot=S.getCol("mi_cotacoes")||[], cc=(S.getCol("mi_concorrentes")||[]).filter(x=>x.monitorar);
    const now=Date.now(); c.disparos=c.disparos||{}; let n=0;
    cot.forEach(ct=>{
      if(!ct.anterior) return; const pct=((ct.preco-ct.anterior)/ct.anterior)*100;
      if(Math.abs(pct)<c.limite) return;
      const key=keyProduto(ct.produto); if(!key) return;
      cc.forEach(k=>{
        const seg=((k.segmento||"")+" "+(k.nome||"")).toLowerCase();
        if(seg.indexOf(key)<0) return;
        const dk="robo:"+k.id+":"+key+":"+(ct.praca||"");
        if(now-(c.disparos[dk]||0) < DEDUPE_H*3600000) return;
        c.disparos[dk]=now; n++;
        const dir=pct>=0?"alta":"queda";
        const txt="Robô: "+ct.produto+" em "+dir+" de "+Math.abs(pct).toFixed(1)+"% ("+esc(ct.praca||"")+", "+money(ct.preco)+"). Provável reação de preço de "+k.nome+".";
        S.add("mi_cc_movimentos",{ id:"mov"+Date.now()+Math.floor(Math.random()*999), ccId:k.id, ccNome:k.nome, tipo:"preco", regiao:ct.praca||k.regiao||"", texto:txt, data:S.today?S.today():"", ts:Date.now(), por:"Robô", auto:true });
        S.add("notificacoes",{ title:"Robô · "+k.nome+" (preço)", text:txt, tipo:"aviso", icon:"bot", destino:"grp:vendas", destinoLabel:"Vendas", data:S.today?S.today():"", ts:Date.now(), de:"robo@sbsgreen.com.br" });
      });
    });
    if(n){ c.total=(c.total||0)+n; c.log=([{quando:now,n:n}].concat(c.log||[])).slice(0,12); }
    c.ultimoRun=now; save(c);
    return {n:n};
  }

  M.robo = {
    label:"Robô de Monitoramento",
    render(){
      const c=cfg(), cc=(S.getCol("mi_concorrentes")||[]).filter(x=>x.monitorar);
      const autos=(S.getCol("mi_cc_movimentos")||[]).filter(m=>m.auto).sort((a,b)=>(b.ts||0)-(a.ts||0));
      const last=c.ultimoRun?new Date(c.ultimoRun).toLocaleString("pt-BR"):"—";
      const kpi=(ic,v,l,t)=>`<div class="mc-kpi ${t||''}"><span class="mc-kpi-ic"><i data-lucide="${ic}"></i></span><div><div class="mc-kpi-v">${v}</div><div class="mc-kpi-l">${l}</div></div></div>`;
      return `
      <div class="mc-toolbar"><div class="mc-sub">Vigilância automática de preços dos concorrentes monitorados</div>
        <div style="display:flex;gap:8px;align-items:center">
          <label class="mi-check" style="margin:0"><input type="checkbox" id="rb-on" ${c.ativo?"checked":""}> Robô ${c.ativo?"ligado":"desligado"}</label>
          <button class="mc-btn primary" id="rb-run"><i data-lucide="play"></i> Rodar agora</button></div></div>
      <div class="mc-kpis">
        ${kpi("bot", c.ativo?"Ativo":"Pausado", "Status do robô", c.ativo?"ok":"warn")}
        ${kpi("swords", cc.length, "Concorrentes vigiados", "")}
        ${kpi("bell-ring", c.total||0, "Sinais gerados", "")}
        ${kpi("history", last.split(" ")[1]||last, "Última verificação", "")}
      </div>
      <div class="mc-card">
        <div class="mc-card-h"><i data-lucide="sliders-horizontal"></i> Sensibilidade</div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span class="mc-sub">Gerar sinal quando o preço de referência variar</span>
          <input class="mc-select" id="rb-lim" type="number" min="1" step="1" value="${c.limite}" style="width:80px"> <span class="mc-sub">% ou mais</span>
        </div>
      </div>
      <div class="mc-card-h" style="margin:18px 2px 10px"><i data-lucide="radar"></i> Sinais automáticos recentes</div>
      <div class="mc-card">${autos.length? autos.slice(0,20).map(m=>`<div class="ti-int" style="display:flex;gap:11px;padding:9px 0;border-bottom:1px solid var(--line,#eef1f0)"><span class="cc-tl-ic" style="background:#0E9B8E1a;color:#0E9B8E;width:32px;height:32px;border-radius:9px;display:grid;place-items:center;flex:0 0 auto"><i data-lucide="bot"></i></span><div><div style="font-size:13.5px;font-weight:700">${esc(m.ccNome)}</div><div style="font-size:12.5px;color:var(--ink-2,#3a4a44);line-height:1.5">${esc(m.texto)}</div><div style="font-size:11px;color:var(--muted,#8b968f);margin-top:2px">${esc(m.data||"")}</div></div></div>`).join("") : '<div class="mc-empty">Nenhum sinal automático ainda. O robô avisa aqui quando detectar movimento de preço.</div>'}</div>
      <div class="mc-note" style="margin-top:14px"><i data-lucide="info"></i> O robô usa as cotações cadastradas em <b>Cotações &amp; Commodities</b>. Para puxar preços direto de sites/portais dos concorrentes, é preciso conectar um serviço externo (backend) — posso preparar quando você tiver as fontes.</div>`;
    },
    mount(c){
      c.querySelector("#rb-on").addEventListener("change",e=>{ const cf=cfg(); cf.ativo=e.target.checked; save(cf); MI.toast("Robô "+(cf.ativo?"ligado":"desligado")); MI.go("robo"); });
      c.querySelector("#rb-run").addEventListener("click",()=>{ const r=run(); MI.toast(r.n+" sinal(is) gerado(s)"); MI.go("robo"); });
      c.querySelector("#rb-lim").addEventListener("change",e=>{ const cf=cfg(); cf.limite=Math.max(1,+e.target.value||3); save(cf); MI.toast("Sensibilidade atualizada"); });
    }
  };

  window.MI_ROBO = { run:run };
  // roda sozinho
  setTimeout(function(){ try{ if(MI.session) run(); }catch(e){} }, 1800);
  setInterval(function(){ try{ if(MI.session) run(); }catch(e){} }, 10*60000);
})();
