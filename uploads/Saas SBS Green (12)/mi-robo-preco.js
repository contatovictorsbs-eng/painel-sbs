/* ===========================================================
   SBS Painel de Inteligência — Robô de Preços dos Concorrentes
   Acompanha o PREÇO DE VENDA dos concorrentes por produto e mantém
   um histórico. Um modelo de teste já vem configurado (Sementes
   Oeste Paulista · Soja). A coleta real de sites exige um conector
   de backend (functions/preco-concorrente.js); sem ele, o robô
   registra uma leitura simulada para você ver o fluxo.
   Coleções: mi_preco_alvos, mi_preco_hist
   =========================================================== */
(function(){
  const M = MI.Modules, S = MI.S, esc = MI.esc, money = MI.money;

  function seed(){
    if((S.getCol("mi_preco_alvos")||[]).length) return;
    S.setCol("mi_preco_alvos",[
      { id:"alvo-teste", concorrente:"Sementes Oeste Paulista", produto:"Soja (saca)", url:"https://sementesoesp.com.br/", unidade:"R$/sc", ativo:true, teste:true }
    ]);
    S.setCol("mi_preco_hist",[
      { id:"ph1", alvo:"alvo-teste", concorrente:"Sementes Oeste Paulista", produto:"Soja (saca)", preco:132, data:S.today?S.today():"", ts:Date.now()-86400000*2, fonte:"modelo de teste" },
      { id:"ph2", alvo:"alvo-teste", concorrente:"Sementes Oeste Paulista", produto:"Soja (saca)", preco:129, data:S.today?S.today():"", ts:Date.now()-86400000, fonte:"modelo de teste" }
    ]);
  }

  function alvos(){ return S.getCol("mi_preco_alvos")||[]; }
  function hist(alvo){ return (S.getCol("mi_preco_hist")||[]).filter(h=>h.alvo===alvo).sort((a,b)=>(b.ts||0)-(a.ts||0)); }

  async function pesquisarPreco(a){
    var preco=null, fonte="";
    // tenta backend real
    try{
      var r=await fetch("/.netlify/functions/preco-concorrente",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:a.url,produto:a.produto})});
      if(r.ok){ var j=await r.json(); if(j&&j.preco){ preco=+j.preco; fonte="coleta web"; } }
    }catch(e){}
    if(preco==null){
      // simulação (modelo de teste): varia ±4% do último preço conhecido
      var h=hist(a.id); var base=h.length?h[0].preco:130;
      preco=Math.round(base*(1+(Math.random()*0.08-0.04)));
      fonte="modelo de teste (simulado)";
    }
    var ult=hist(a.id)[0];
    S.add("mi_preco_hist",{ id:"ph"+Date.now(), alvo:a.id, concorrente:a.concorrente, produto:a.produto, preco:preco, data:S.today?S.today():"", ts:Date.now(), fonte:fonte });
    // se variou além de 3%, registra movimento + avisa vendas
    if(ult){ var pct=((preco-ult.preco)/ult.preco)*100;
      if(Math.abs(pct)>=3){
        var dir=pct>=0?"alta":"queda";
        var txt="Preço de venda de "+a.concorrente+" ("+a.produto+") em "+dir+" de "+Math.abs(pct).toFixed(1)+"%: "+money(preco)+".";
        S.add("notificacoes",{ title:"Robô de Preços · "+a.concorrente, text:txt, tipo:"aviso", icon:"tag", destino:"grp:vendas", destinoLabel:"Vendas", data:S.today?S.today():"", ts:Date.now(), de:"robo@sbsgreen.com.br" });
      }
    }
    MI.toast("Preço registrado: "+money(preco)); MI.refresh();
  }

  M.precorobo = {
    label:"Robô de Preços",
    render(){
      seed();
      const as=alvos();
      return `
      <div class="mc-toolbar"><div class="mc-sub">Acompanhe o preço de venda dos concorrentes por produto</div>
        <button class="mc-btn primary" id="pr-new"><i data-lucide="plus"></i> Novo alvo</button></div>
      ${as.map(a=>{ const h=hist(a.id); const ult=h[0]; const ant=h[1];
        const pct=ult&&ant?(((ult.preco-ant.preco)/ant.preco)*100):0;
        return `<div class="mc-card" style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
            <div><div style="font-size:15px;font-weight:800">${esc(a.concorrente)} ${a.teste?'<span class="pr-tag">modelo de teste</span>':''}</div>
              <div class="mc-sub">${esc(a.produto)} · <a href="${esc(a.url||'#')}" target="_blank" style="color:#0E7E72">fonte</a></div></div>
            <div style="text-align:right">
              <div style="font-size:22px;font-weight:800;color:#0B6B61">${ult?money(ult.preco):"—"}</div>
              ${ult&&ant?`<div style="font-size:12px;font-weight:800;color:${pct>=0?'#1f8a5b':'#b3261e'}">${pct>=0?'▲':'▼'} ${Math.abs(pct).toFixed(1)}%</div>`:''}
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
            <button class="mc-btn primary" data-go="${a.id}"><i data-lucide="search"></i> Pesquisar preço agora</button>
            <button class="mc-btn ghost" data-del="${a.id}"><i data-lucide="trash-2"></i></button>
          </div>
          ${h.length?`<div class="pr-hist"><div class="pr-hist-h">Histórico</div>
            ${h.slice(0,6).map(x=>`<div class="pr-hist-row"><span>${esc(x.data||"")}</span><b>${money(x.preco)}</b><span class="mc-sub">${esc(x.fonte||"")}</span></div>`).join("")}
          </div>`:''}
        </div>`; }).join("")}
      <div class="mc-note"><i data-lucide="info"></i> Para coletar o preço direto do site do concorrente, conecte a função <b>functions/preco-concorrente.js</b> (já incluída) a um serviço de coleta. Sem ela, o robô usa o <b>modelo de teste</b> (leitura simulada) para você validar o fluxo.</div>`;
    },
    mount(c){
      c.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>{ var a=alvos().find(x=>x.id===b.dataset.go); if(a) pesquisarPreco(a); }));
      c.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",()=>{ if(confirm("Remover este alvo de preço?")){ S.remove("mi_preco_alvos",b.dataset.del); MI.toast("Alvo removido"); MI.refresh(); } }));
      var nw=c.querySelector("#pr-new"); if(nw) nw.addEventListener("click",()=>{
        MI.modal("Novo alvo de preço",
          '<div class="fld"><label>Concorrente</label><input id="pa-c" placeholder="Ex.: Sementes Oeste Paulista"></div>'+
          '<div class="fld"><label>Produto</label><input id="pa-p" placeholder="Ex.: Soja (saca)"></div>'+
          '<div class="fld"><label>Site (fonte)</label><input id="pa-u" placeholder="https://..."></div>',
          '<button class="mc-btn ghost" id="pa-x">Cancelar</button><button class="mc-btn primary" id="pa-s"><i data-lucide="save"></i> Salvar</button>');
        document.getElementById("pa-x").onclick=MI.closeModal;
        document.getElementById("pa-s").onclick=function(){
          var cc=(document.getElementById("pa-c").value||"").trim(), pp=(document.getElementById("pa-p").value||"").trim();
          if(!cc||!pp){ MI.toast("Preencha concorrente e produto"); return; }
          S.add("mi_preco_alvos",{ id:"alvo"+Date.now(), concorrente:cc, produto:pp, url:(document.getElementById("pa-u").value||"").trim(), unidade:"R$", ativo:true });
          MI.toast("Alvo criado"); MI.closeModal(); MI.refresh();
        };
      });
    }
  };
})();
