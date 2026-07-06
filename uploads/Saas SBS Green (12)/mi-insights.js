/* ===========================================================
   SBS Painel de Inteligência de Mercado — Insights de Vendas
   Cruza pedidos, metas, recompra, calendário agrícola, cotações e
   movimentos de concorrentes para gerar recomendações por papel:
   Gerente Nacional · Gerente Regional · Consultor.
   =========================================================== */
(function(){
  const M = MI.Modules, S = MI.S, esc = MI.esc, money = MI.money;

  function parseData(d){ if(!d) return null; const m=String(d).trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/); if(!m) return null; let a=m[3]?+m[3]:new Date().getFullYear(); if(a<100)a+=2000; return new Date(a,(+m[2])-1,+m[1]); }
  function dias(a,b){ return Math.round((b-a)/86400000); }
  function vendMap(){ const m={}; (S.getCol("vendedores")||[]).forEach(v=>{ if(v.nome) m[v.nome.trim().toLowerCase()]={regiao:(v.regiao||"").trim(),email:(v.email||"").toLowerCase()}; }); return m; }
  // texto de região -> id do calendário agrícola
  function calRegId(txt){ txt=(txt||"").toUpperCase();
    if(/\b(BA|MA|TO|PI)\b|MATOPIBA|BAHIA/.test(txt)) return "mat";
    if(/\b(MT|GO|MS)\b|MATO GROSSO|GOI/.test(txt)) return "co";
    if(/\b(SP|MG)\b|PAULO|MINAS/.test(txt)) return "se";
    if(/\b(PR|RS|SC)\b|PARAN|SUL/.test(txt)) return "sul";
    return "co";
  }
  function janelaVenda(regId){
    const CAL=window.SBS_CALENDARIO; if(!CAL) return [];
    const mes=new Date().getMonth()+1;
    return CAL.CULTURAS.filter(c=>c.janelas[regId] && c.janelas[regId].venda.includes(mes)).map(c=>c.nome);
  }

  /* carteira: clientes com recompra vencida (por vendedor/região) */
  function carteira(){
    const peds=(S.getCol("pedidos")||[]).map(p=>({...p,_d:parseData(p.data)})).filter(p=>p._d);
    const mapa=vendMap(), ag=new Date(), grp={};
    peds.forEach(p=>{ const k=(p.cliente||"").trim(); if(!k)return; (grp[k]=grp[k]||{datas:[],vend:p.vendedor,total:0}); grp[k].datas.push(p._d); if(p.status==="faturado")grp[k].total+=(p.valor||0); if(p._d>(grp[k]._u||0)){grp[k]._u=p._d;grp[k].vend=p.vendedor;} });
    const out=[];
    Object.keys(grp).forEach(cli=>{ const c=grp[cli]; c.datas.sort((a,b)=>a-b); const ult=c.datas[c.datas.length-1];
      let soma=0,n=0; for(let i=1;i<c.datas.length;i++){soma+=dias(c.datas[i-1],c.datas[i]);n++;} const intervalo=n?Math.round(soma/n):null; if(!intervalo)return;
      const prox=new Date(ult.getTime()+intervalo*86400000); if(prox>ag) return;
      const v=mapa[(c.vend||"").trim().toLowerCase()];
      out.push({cliente:cli, vend:c.vend, regiao:v?v.regiao:"", total:c.total, dias:dias(ult,ag)});
    });
    return out.sort((a,b)=>b.total-a.total);
  }
  function realizadoRegiao(){ const mapa=vendMap(), o={}; (S.getCol("pedidos")||[]).forEach(p=>{ if(p.status!=="faturado")return; const v=mapa[(p.vendedor||"").trim().toLowerCase()]; const r=v&&v.regiao?v.regiao:"Outras"; o[r]=(o[r]||0)+(p.valor||0); }); return o; }
  function cotaAlta(){ return (S.getCol("mi_cotacoes")||[]).filter(c=>c.anterior&&c.preco>c.anterior).map(c=>({nome:c.produto, praca:c.praca, pct:((c.preco-c.anterior)/c.anterior*100)})).sort((a,b)=>b.pct-a.pct); }
  function movsRecentes(regTxt){ const ag=Date.now(); return (S.getCol("mi_cc_movimentos")||[]).filter(m=>(ag-(m.ts||0))<45*86400000).filter(m=>!regTxt||!m.regiao||m.regiao.toLowerCase().includes((regTxt||"").toLowerCase())||(regTxt||"").toLowerCase().includes((m.regiao||"").toLowerCase())); }

  /* ---------- geração de insights ---------- */
  function card(sev, ic, titulo, texto, acao){ return {sev,ic,titulo,texto,acao}; }
  function gerar(papel, alvo){
    const cfg=S.get("metas_safra"); const real=realizadoRegiao(); const cart=carteira();
    const out=[];
    if(papel==="nacional"){
      // regiões abaixo da meta
      if(cfg&&cfg.regioes){ cfg.regioes.filter(r=>r.meta).map(r=>({nome:r.nome,pct:Math.round((real[r.nome]||0)/r.meta*100)})).sort((a,b)=>a.pct-b.pct).slice(0,3).forEach(r=>{
        out.push(card(r.pct<50?"alta":"media","trending-down","Meta em risco · "+r.nome, "Região em "+r.pct+"% da meta da safra.","Acionar o gerente regional e priorizar recompra/visitas na região.")); }); }
      // recompra consolidada
      const valorCart=cart.reduce((s,c)=>s+c.total,0);
      if(cart.length) out.push(card("oportunidade","repeat","Recompra: "+cart.length+" clientes parados","Carteira adormecida de "+money(valorCart)+" pronta para reativação.","Distribuir a lista de recompra por região para os consultores."));
      // concorrente
      const mv=movsRecentes(""); const precoMov=mv.filter(m=>m.tipo==="preco"||m.tipo==="avanco");
      if(precoMov.length) out.push(card("alta","swords",precoMov.length+" movimento(s) de concorrente","Recentes: "+precoMov.slice(0,2).map(m=>m.ccNome+" — "+(m.texto||"").slice(0,40)).join(" · "),"Avaliar resposta de preço/condição nas regiões afetadas."));
      // cotação
      const ca=cotaAlta(); if(ca.length) out.push(card("oportunidade","trending-up","Commodity em alta: "+ca[0].nome, ca[0].nome+" subiu "+ca[0].pct.toFixed(1)+"% ("+esc(ca[0].praca||"")+").","Janela boa para fechar negócio — produtor com mais caixa."));
      // janelas (consolidado por região)
      (window.SBS_CALENDARIO?SBS_CALENDARIO.REGIOES:[]).forEach(rg=>{ const j=janelaVenda(rg.id); if(j.length) out.push(card("oportunidade","calendar-check","Janela de venda · "+rg.nome, "Abriu a venda de: "+j.join(", ")+".","Direcionar oferta dessas culturas na região agora.")); });
    }
    else if(papel==="regional"){
      const regTxt=alvo||"";
      if(cfg&&cfg.regioes){ const r=cfg.regioes.find(x=>x.nome===regTxt); if(r&&r.meta){ const pct=Math.round((real[regTxt]||0)/r.meta*100); out.push(card(pct<50?"alta":pct<80?"media":"oportunidade","gauge","Sua meta: "+pct+"% da safra", "Realizado "+money(real[regTxt]||0)+" de "+money(r.meta)+". Gap "+money(Math.max(0,r.meta-(real[regTxt]||0)))+".", pct<80?"Acelerar com recompra e janela de venda abaixo.":"No ritmo — sustentar o esforço.")); } }
      const cR=cart.filter(c=>(c.regiao||"").toLowerCase()===regTxt.toLowerCase()).slice(0,6);
      if(cR.length) out.push(card("oportunidade","repeat", cR.length+" clientes a recuperar", "Maiores: "+cR.slice(0,3).map(c=>c.cliente+" ("+money(c.total)+")").join(" · "),"Montar plano de recompra com os consultores."));
      const j=janelaVenda(calRegId(regTxt)); if(j.length) out.push(card("oportunidade","calendar-check","Janela de venda aberta","É hora de vender semente de: "+j.join(", ")+".","Empurrar essas culturas com os consultores esta semana."));
      const mv=movsRecentes(regTxt); if(mv.length) out.push(card("media","swords","Concorrência ativa na região", mv.slice(0,2).map(m=>m.ccNome+": "+(m.texto||"").slice(0,40)).join(" · "),"Repassar aos consultores e ajustar argumentação."));
    }
    else if(papel==="consultor"){
      const mapa=vendMap(); const v=mapa[(alvo||"").trim().toLowerCase()]; const regTxt=v?v.regiao:"";
      const cV=cart.filter(c=>(c.vend||"").trim().toLowerCase()===(alvo||"").trim().toLowerCase()).slice(0,8);
      if(cV.length) out.push(card("alta","phone-call", cV.length+" clientes para ligar hoje", "Comece por: "+cV.slice(0,3).map(c=>c.cliente+" ("+c.dias+"d sem comprar)").join(" · "),"Contato de recompra — priorize os de maior histórico."));
      else out.push(card("oportunidade","check-circle-2","Carteira em dia","Nenhum cliente seu vencido para recompra agora.","Aproveite para prospectar na janela de venda."));
      const j=janelaVenda(calRegId(regTxt)); if(j.length) out.push(card("oportunidade","calendar-check","Ofereça agora: "+j.slice(0,3).join(", "), "Janela de venda de semente aberta na sua região.","Leve essas culturas nas próximas visitas."));
      const mv=movsRecentes(regTxt); if(mv.length) out.push(card("media","swords","Concorrente na sua área", mv.slice(0,2).map(m=>m.ccNome+": "+(m.texto||"").slice(0,45)).join(" · "),"Use as fraquezas dele no seu discurso."));
      const ca=cotaAlta(); if(ca.length) out.push(card("oportunidade","trending-up",ca[0].nome+" em alta", "Subiu "+ca[0].pct.toFixed(1)+"% — produtor com mais caixa.","Momento bom para fechar pedido."));
    }
    return out;
  }

  const SEV = { alta:{l:"Prioridade alta",c:"#b3261e",bg:"#FDE8E6"}, media:{l:"Atenção",c:"#C0710F",bg:"#FBEFE0"}, oportunidade:{l:"Oportunidade",c:"#0B8A5E",bg:"#E4F5EC"} };

  M.insights = {
    label:"Insights de Vendas",
    _papel:"nacional", _alvo:"",
    render(){
      const regioes=(S.get("metas_safra")&&S.get("metas_safra").regioes||[]).map(r=>r.nome);
      const regSet=[...new Set(regioes.concat((S.getCol("vendedores")||[]).map(v=>(v.regiao||"").trim()).filter(Boolean)))];
      const vends=(S.getCol("vendedores")||[]).map(v=>v.nome).filter(Boolean);
      if(this._papel==="regional" && !this._alvo) this._alvo=regSet[0]||"";
      if(this._papel==="consultor" && !this._alvo) this._alvo=vends[0]||"";
      const cards=gerar(this._papel,this._alvo);
      const sub = this._papel==="regional"
        ? `<select class="mc-select" id="in-alvo">${regSet.map(r=>`<option ${r===this._alvo?'selected':''}>${esc(r)}</option>`).join("")||'<option>—</option>'}</select>`
        : this._papel==="consultor"
        ? `<select class="mc-select" id="in-alvo">${vends.map(r=>`<option ${r===this._alvo?'selected':''}>${esc(r)}</option>`).join("")||'<option>—</option>'}</select>` : "";
      return `
      <div class="mc-toolbar" style="align-items:center;flex-wrap:wrap;gap:10px">
        <div class="in-seg" id="in-papel">
          <button class="${this._papel==='nacional'?'on':''}" data-p="nacional"><i data-lucide="globe-2"></i> Gerente Nacional</button>
          <button class="${this._papel==='regional'?'on':''}" data-p="regional"><i data-lucide="map"></i> Gerente Regional</button>
          <button class="${this._papel==='consultor'?'on':''}" data-p="consultor"><i data-lucide="user-round"></i> Consultor</button>
        </div>
        ${sub}
      </div>
      <div class="mc-note" style="margin:0 0 16px"><i data-lucide="sparkles"></i> Recomendações geradas dos seus próprios dados (pedidos, metas, recompra, calendário agrícola, cotações e movimentos de concorrentes). Atualizam sozinhas conforme os dados mudam.</div>
      <div class="in-cards">
        ${cards.length?cards.map(c=>{ const s=SEV[c.sev]||SEV.media; return `
          <div class="in-card" style="border-left:4px solid ${s.c}">
            <div class="in-card-h"><span class="in-ic" style="background:${s.bg};color:${s.c}"><i data-lucide="${c.ic}"></i></span>
              <div class="in-card-tt">${esc(c.titulo)}</div>
              <span class="in-sev" style="color:${s.c};background:${s.bg}">${s.l}</span></div>
            <div class="in-card-x">${esc(c.texto)}</div>
            <div class="in-card-a"><i data-lucide="arrow-right-circle"></i> ${esc(c.acao)}</div>
          </div>`; }).join(""):'<div class="mc-empty">Sem insights no momento — cadastre metas, pedidos e movimentos para começar.</div>'}
      </div>`;
    },
    mount(c){
      c.querySelectorAll("#in-papel button").forEach(b=>b.addEventListener("click",()=>{ this._papel=b.dataset.p; this._alvo=""; MI.go("insights"); }));
      const sel=c.querySelector("#in-alvo"); sel && sel.addEventListener("change",()=>{ this._alvo=sel.value; MI.go("insights"); });
    }
  };
})();
