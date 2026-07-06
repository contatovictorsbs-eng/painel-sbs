/* ===========================================================
   SBS Painel de Inteligência de Mercado — módulos
   =========================================================== */
(function(){
  const M = MI.Modules, S = MI.S, esc = MI.esc, num = MI.num, money = MI.money, dateBR = MI.dateBR;

  const IMPACTO = { alto:{l:"Alto",c:"#b3261e",bg:"#FDE8E6"}, medio:{l:"Médio",c:"#C0710F",bg:"#FBEFE0"}, baixo:{l:"Baixo",c:"#69756f",bg:"#EEF1F0"} };
  const POT = { Alto:{c:"#0B8A5E",bg:"#E4F5EC"}, "Médio":{c:"#C0710F",bg:"#FBEFE0"}, Baixo:{c:"#69756f",bg:"#EEF1F0"} };

  function cotacoes(){ return S.getCol("mi_cotacoes")||[]; }
  function concorrentes(){ return S.getCol("mi_concorrentes")||[]; }
  function movimentos(ccId){ return (S.getCol("mi_cc_movimentos")||[]).filter(m=>!ccId||m.ccId===ccId).sort((a,b)=>(b.ts||0)-(a.ts||0)); }
  var MOV_TIPOS = { preco:{l:"Preço",ic:"tag",c:"#C0710F"}, lancamento:{l:"Lançamento",ic:"sparkles",c:"#0B8A5E"}, promo:{l:"Promoção",ic:"badge-percent",c:"#2A6FDB"}, avanco:{l:"Avanço regional",ic:"map-pin",c:"#b3261e"}, campo:{l:"Campo/visita",ic:"eye",c:"#69756f"}, outro:{l:"Outro",ic:"info",c:"#69756f"} };
  function regioes(){ return S.getCol("mi_regioes")||[]; }
  function tendencias(){ return S.getCol("mi_tendencias")||[]; }
  function who(){ return (MI.session&&MI.session.nome)||"Mercado"; }

  function kpi(ic,v,l,tone){ return `<div class="mc-kpi ${tone||''}"><span class="mc-kpi-ic"><i data-lucide="${ic}"></i></span><div><div class="mc-kpi-v">${v}</div><div class="mc-kpi-l">${l}</div></div></div>`; }
  function badge(map,st){ const s=map[st]||Object.values(map)[0]; return `<span class="mc-badge" style="color:${s.c};background:${s.bg}">${s.l||st}</span>`; }
  function variacao(at,ant){ const d=(+at||0)-(+ant||0); const pct=ant?((d/ant)*100):0; const up=d>=0; return `<span class="mi-var ${up?'up':'down'}"><i data-lucide="${up?'trending-up':'trending-down'}"></i> ${up?'+':''}${pct.toFixed(1)}%</span>`; }

  /* =================== VISÃO GERAL =================== */
  M.visao = {
    label:"Visão Geral",
    render(){
      const ct=cotacoes(), cc=concorrentes(), td=tendencias();
      const soja=ct.find(c=>/soja \(/i.test(c.produto));
      const milho=ct.find(c=>/milho/i.test(c.produto));
      const altoImpacto=td.filter(t=>t.impacto==="alto").length;
      return `
      <div id="mi-live-fx"></div>
      <div class="mc-kpis">
        ${kpi("sprout", soja?money(soja.preco):"—", "Soja "+(soja?soja.praca:""), "ok")}
        ${kpi("wheat", milho?money(milho.preco):"—", "Milho "+(milho?milho.praca:""), "")}
        ${kpi("swords", cc.filter(c=>c.monitorar).length, "Concorrentes monitorados", "")}
        ${kpi("radar", altoImpacto, "Tendências de alto impacto", altoImpacto?"warn":"")}
      </div>
      <div class="mc-cols">
        <div class="mc-card">
          <div class="mc-card-h"><i data-lucide="trending-up"></i> Cotações em destaque</div>
          ${ct.slice(0,4).map(c=>`
            <div class="mc-row" data-nav-to="cotacoes">
              <div class="mc-row-main"><div class="mc-row-t">${esc(c.produto)}</div><div class="mc-row-s">${esc(c.praca)} · ${esc(c.fonte||"")}</div></div>
              <div class="mc-row-r">${money(c.preco)} ${variacao(c.preco,c.anterior)}</div>
            </div>`).join("")}
          <button class="mc-btn ghost" data-nav-to="cotacoes" style="margin-top:12px"><i data-lucide="arrow-right"></i> Ver todas</button>
        </div>
        <div class="mc-side">
          <div class="mc-mini"><div class="mc-mini-h"><i data-lucide="radar"></i> Alertas de mercado</div>
            ${td.slice(0,3).map(t=>`<div class="mc-mini-row"><span>${esc(t.titulo)}</span>${badge(IMPACTO,t.impacto)}</div>`).join("")||'<div class="mc-mini-row"><span>Nenhum</span></div>'}
            <a class="mc-mini-link" data-nav-to="tendencias">Ver tendências →</a>
          </div>
        </div>
      </div>
      <div class="mc-note"><i data-lucide="eye"></i> Leitura de mercado para apoiar decisões comerciais e de P&D. Os alertas de alto impacto também aparecem para a Diretoria no Painel do CEO.</div>`;
    },
    mount(c){ c.querySelectorAll("[data-nav-to]").forEach(b=>b.addEventListener("click",()=>MI.go(b.dataset.navTo))); window.MI_LIVE && MI_LIVE.mount("#mi-live-fx"); }
  };

  /* =================== COTAÇÕES =================== */
  M.cotacoes = {
    label:"Cotações & Commodities",
    render(){
      const ct=cotacoes();
      return `
      <div class="mc-toolbar"><div class="mc-sub">${ct.length} cotação(ões) acompanhada(s)</div>
        <div style="display:flex;gap:8px"><button class="mc-btn ghost" id="ct-cfg"><i data-lucide="settings-2"></i> Fontes ao vivo</button><button class="mc-btn primary" id="ct-new"><i data-lucide="plus"></i> Nova cotação</button></div></div>
      <div class="mc-card-h" style="margin:4px 2px 10px;display:flex;align-items:center;gap:8px"><i data-lucide="globe-2"></i> Indicadores globais <span class="mi-livetag">ao vivo</span></div>
      <div id="mi-comm-live"></div>
      <div class="mc-card-h" style="margin:18px 2px 10px;display:flex;align-items:center;gap:8px"><i data-lucide="map-pin"></i> Cotações nacionais (saca/praça)</div>
      <div class="mc-card"><div class="mc-table">
        <div class="mi-ctrow head"><span>Produto</span><span>Praça</span><span class="r">Preço</span><span class="r">Variação</span><span>Atualizado</span><span></span></div>
        ${ct.map(c=>`<div class="mi-ctrow" data-ct="${c.id}">
          <span class="strong">${esc(c.produto)}</span>
          <span class="mi-dim">${esc(c.praca||"—")}</span>
          <span class="r strong">${money(c.preco)}<br><small class="mi-dim">${esc(c.unidade||"")}</small></span>
          <span class="r">${variacao(c.preco,c.anterior)}</span>
          <span class="mi-dim">${dateBR(c.atualizado)}<br><small>${esc(c.fonte||"")}</small></span>
          <span class="r"><i data-lucide="chevron-right" class="mc-ic"></i></span>
        </div>`).join("")}
      </div></div>
      <div class="mc-note"><i data-lucide="info"></i> Câmbio e indicadores globais são ao vivo. As cotações nacionais em saca (CEPEA/B3) são atualizadas automaticamente pelo servidor quando o site está publicado no Netlify (marcadas com <b>auto</b>); fora dele, seguem o cadastro manual.</div>`;
    },
    mount(c){
      c.querySelector("#ct-new").addEventListener("click",()=>formCt());
      c.querySelectorAll("[data-ct]").forEach(r=>r.addEventListener("click",()=>formCt(cotacoes().find(x=>x.id===r.dataset.ct))));
      const cfg=c.querySelector("#ct-cfg"); if(cfg) cfg.addEventListener("click",cfgFontes);
      // CEPEA via backend (Netlify Function) — atualiza a tabela nacional sozinho
      if(window.MI_LIVE && MI_LIVE.syncBackend){
        MI_LIVE.syncBackend().then(res=>{ if(res && res.updated && document.body.contains(c)) MI.refresh(); });
      }
      const box=c.querySelector("#mi-comm-live");
      if(box && window.MI_LIVE){
        box.innerHTML = MI_LIVE.commHtml(null); window.lucide&&lucide.createIcons();
        const op=box.querySelector("#mi-cfg-open"); if(op) op.addEventListener("click",cfgFontes);
        MI_LIVE.fetchCommodities().then(p=>{ if(!document.body.contains(box))return; box.innerHTML=MI_LIVE.commHtml(p); window.lucide&&lucide.createIcons(); const o2=box.querySelector("#mi-cfg-open"); if(o2)o2.addEventListener("click",cfgFontes); });
      }
    }
  };
  function cfgFontes(){
    const cur = window.MI_LIVE ? MI_LIVE.avKey() : "";
    MI.modal("Configurar fontes ao vivo",`
      <p style="font-size:12.5px;color:var(--muted);margin:0 0 14px;line-height:1.5">O <b>câmbio (dólar/euro)</b> já é automático e gratuito. Para ligar as <b>commodities globais</b> (milho, trigo, café, açúcar, algodão, petróleo) ao vivo, cole uma chave gratuita da Alpha Vantage.</p>
      <div class="fld"><label>Chave Alpha Vantage</label><input id="av-key" value="${esc(cur||'')}" placeholder="Ex.: AB12CD34EF56GH78"></div>
      <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener" style="font-size:12px;color:var(--brand,#0B6B61);font-weight:700;text-decoration:none"><i data-lucide="external-link"></i> Gerar chave gratuita (1 minuto) →</a>
      <p style="font-size:11.5px;color:var(--muted);margin:14px 0 0">A chave fica salva na nuvem e vale para todo o painel. Plano grátis: ~25 consultas/dia (atualizamos a cada 6h). Soja e boi em saca (CEPEA) seguem manuais até a integração com backend.</p>`,
      `<button class="mc-btn ghost" id="av-cancel">Cancelar</button><button class="mc-btn primary" id="av-save"><i data-lucide="save"></i> Salvar e ativar</button>`);
    document.getElementById("av-cancel").addEventListener("click",MI.closeModal);
    document.getElementById("av-save").addEventListener("click",()=>{
      const k=(document.getElementById("av-key").value||"").trim();
      if(window.MI_LIVE) MI_LIVE.setAvKey(k);
      MI.toast(k?"Fontes ao vivo ativadas!":"Chave removida"); MI.closeModal(); MI.refresh();
    });
    window.lucide&&lucide.createIcons();
  }
  function formCt(ed){
    ed=ed||{};
    MI.modal(ed.id?"Editar cotação":"Nova cotação",`
      <div class="fld"><label>Produto</label><input id="cf-prod" value="${esc(ed.produto||'')}" placeholder="Ex.: Soja (saca 60kg)"></div>
      <div class="fld-row">
        <div class="fld"><label>Praça</label><input id="cf-praca" value="${esc(ed.praca||'')}" placeholder="Mato Grosso"></div>
        <div class="fld"><label>Unidade</label><input id="cf-un" value="${esc(ed.unidade||'')}" placeholder="R$/sc"></div>
      </div>
      <div class="fld-row">
        <div class="fld"><label>Preço atual</label><input id="cf-preco" type="number" step="0.01" value="${ed.preco||''}"></div>
        <div class="fld"><label>Preço anterior</label><input id="cf-ant" type="number" step="0.01" value="${ed.anterior||''}"></div>
      </div>
      <div class="fld-row">
        <div class="fld"><label>Atualizado em</label><input id="cf-data" type="date" value="${esc(ed.atualizado||'')}"></div>
        <div class="fld"><label>Fonte</label><input id="cf-fonte" value="${esc(ed.fonte||'')}" placeholder="CEPEA / B3 / Interno"></div>
      </div>`,
      `${ed.id?'<button class="mc-btn ghost danger" id="cf-del">Remover</button>':''}<button class="mc-btn ghost" id="cf-cancel">Cancelar</button><button class="mc-btn primary" id="cf-save"><i data-lucide="save"></i> Salvar</button>`);
    document.getElementById("cf-cancel").addEventListener("click",MI.closeModal);
    const del=document.getElementById("cf-del"); if(del) del.addEventListener("click",()=>{ S.remove("mi_cotacoes",ed.id); MI.toast("Removida"); MI.closeModal(); MI.refresh(); });
    document.getElementById("cf-save").addEventListener("click",()=>{
      const v=id=>{ const e=document.getElementById(id); return e?e.value.trim():""; };
      const prod=v("cf-prod"); if(!prod){ MI.toast("Informe o produto"); return; }
      const data={ produto:prod, praca:v("cf-praca"), unidade:v("cf-un"), preco:+v("cf-preco")||0, anterior:+v("cf-ant")||0, atualizado:v("cf-data"), fonte:v("cf-fonte") };
      if(ed.id) S.update("mi_cotacoes",ed.id,data); else S.add("mi_cotacoes",Object.assign({id:"ct"+Date.now()},data));
      MI.toast("Cotação salva"); MI.closeModal(); MI.refresh();
    });
  }

  /* =================== CONCORRENTES =================== */
  M.concorrentes = {
    label:"Concorrentes",
    render(){
      const cc=concorrentes();
      const totMov=movimentos().length;
      return `
      <div class="mc-toolbar"><div class="mc-sub">${cc.length} concorrente(s) mapeado(s) · ${totMov} movimento(s) rastreado(s)</div>
        <button class="mc-btn primary" id="cc-new"><i data-lucide="plus"></i> Novo concorrente</button></div>
      <div class="mc-note" style="margin:0 0 14px"><i data-lucide="radar"></i> O que rastreamos: <b>preço praticado</b>, <b>lançamentos</b>, <b>promoções/condições</b>, <b>avanço por região</b> e o que os consultores veem em <b>campo</b>. Registre cada movimento para alimentar os insights de venda.</div>
      <div class="mc-cards">${cc.map(c=>{
        const mv=movimentos(c.id), last=mv[0];
        return `
        <div class="mc-ccard">
          <div class="mc-ccard-top"><span class="mi-pos">${esc(c.posicao||"")}</span>${c.monitorar?'<span class="mi-mon"><i data-lucide="eye"></i> Monitorando</span>':''}</div>
          <div class="mc-ccard-t">${esc(c.nome)}</div>
          <div class="mc-ccard-d">${esc(c.segmento||"")} · ${esc(c.regiao||"")}</div>
          <div class="mi-sw"><div class="mi-sw-f"><i data-lucide="plus-circle"></i> ${esc(c.forca||"—")}</div><div class="mi-sw-w"><i data-lucide="minus-circle"></i> ${esc(c.fraqueza||"—")}</div></div>
          <div class="cc-mov">
            ${last?`<div class="cc-mov-last"><span class="cc-mov-tag" style="color:${(MOV_TIPOS[last.tipo]||MOV_TIPOS.outro).c}"><i data-lucide="${(MOV_TIPOS[last.tipo]||MOV_TIPOS.outro).ic}"></i> ${(MOV_TIPOS[last.tipo]||MOV_TIPOS.outro).l}</span> <span class="cc-mov-x">${esc((last.texto||"").slice(0,70))}</span><span class="cc-mov-dt">${esc(last.data||"")}</span></div>`:`<div class="cc-mov-empty">Sem movimentos registrados.</div>`}
            <div class="cc-mov-acts"><button class="mc-link" data-mov="${c.id}"><i data-lucide="plus"></i> Registrar movimento</button>${mv.length>1?`<button class="mc-link" data-hist="${c.id}">ver ${mv.length} →</button>`:""}<button class="mc-link" data-cc="${c.id}">editar</button></div>
          </div>
        </div>`;
      }).join("")}</div>`;
    },
    mount(c){
      c.querySelector("#cc-new").addEventListener("click",()=>formCc());
      c.querySelectorAll("[data-cc]").forEach(b=>b.addEventListener("click",()=>formCc(concorrentes().find(x=>x.id===b.dataset.cc))));
      c.querySelectorAll("[data-mov]").forEach(b=>b.addEventListener("click",()=>formMov(concorrentes().find(x=>x.id===b.dataset.mov))));
      c.querySelectorAll("[data-hist]").forEach(b=>b.addEventListener("click",()=>histMov(concorrentes().find(x=>x.id===b.dataset.hist))));
    }
  };

  function formMov(cc){
    if(!cc) return;
    MI.modal("Registrar movimento · "+esc(cc.nome),
      `<div class="fld"><label>Tipo de movimento</label><select id="mv-tipo">${Object.keys(MOV_TIPOS).map(k=>`<option value="${k}">${MOV_TIPOS[k].l}</option>`).join("")}</select></div>
       <div class="fld"><label>Região (opcional)</label><input id="mv-reg" value="${esc(cc.regiao||'')}" placeholder="MT/MS"></div>
       <div class="fld"><label>O que foi observado</label><textarea id="mv-tx" placeholder="Ex.: baixou preço da soja para R$ 125 em Sorriso; bonificação de 3%..."></textarea></div>
       <label class="mi-check"><input type="checkbox" id="mv-not" checked> Avisar a equipe de vendas</label>`,
      `<button class="mc-btn ghost" id="mv-cancel">Cancelar</button><button class="mc-btn primary" id="mv-save"><i data-lucide="save"></i> Registrar</button>`);
    document.getElementById("mv-cancel").addEventListener("click",MI.closeModal);
    document.getElementById("mv-save").addEventListener("click",()=>{
      const tipo=document.getElementById("mv-tipo").value;
      const tx=(document.getElementById("mv-tx").value||"").trim(); if(!tx){ MI.toast("Descreva o movimento"); return; }
      const reg=(document.getElementById("mv-reg").value||"").trim();
      S.add("mi_cc_movimentos",{ id:"mov"+Date.now(), ccId:cc.id, ccNome:cc.nome, tipo:tipo, regiao:reg, texto:tx, data:S.today?S.today():new Date().toLocaleDateString("pt-BR"), ts:Date.now(), por:who() });
      if(document.getElementById("mv-not").checked){
        S.add("notificacoes",{ title:"Concorrente: "+cc.nome+" · "+(MOV_TIPOS[tipo]||MOV_TIPOS.outro).l, text:tx+(reg?(" ("+reg+")"):""), tipo:"aviso", icon:"swords", destino:"grp:vendas", destinoLabel:"Vendas", data:S.today?S.today():"", ts:Date.now(), de:"mercado@sbsgreen.com.br" });
      }
      MI.toast("Movimento registrado"); MI.closeModal(); MI.refresh();
    });
  }
  function histMov(cc){
    if(!cc) return;
    const mv=movimentos(cc.id);
    MI.modal("Movimentos · "+esc(cc.nome),
      `<div class="cc-tl">${mv.map(m=>{ const t=MOV_TIPOS[m.tipo]||MOV_TIPOS.outro; return `<div class="cc-tl-row"><span class="cc-tl-ic" style="background:${t.c}1a;color:${t.c}"><i data-lucide="${t.ic}"></i></span><div><div class="cc-tl-t">${t.l}${m.regiao?` · ${esc(m.regiao)}`:""}</div><div class="cc-tl-x">${esc(m.texto)}</div><div class="cc-tl-dt">${esc(m.data||"")} · ${esc(m.por||"")}</div></div></div>`; }).join("")||'<div class="mc-empty">Nenhum movimento.</div>'}</div>`,
      `<button class="mc-btn primary" onclick="MI.closeModal()">Fechar</button>`);
  }
  function formCc(ed){
    ed=ed||{};
    MI.modal(ed.id?"Editar concorrente":"Novo concorrente",`
      <div class="fld"><label>Nome</label><input id="kf-nome" value="${esc(ed.nome||'')}" placeholder="Nome do concorrente"></div>
      <div class="fld-row">
        <div class="fld"><label>Segmento</label><input id="kf-seg" value="${esc(ed.segmento||'')}" placeholder="Sementes de soja"></div>
        <div class="fld"><label>Região</label><input id="kf-reg" value="${esc(ed.regiao||'')}" placeholder="MT/MS"></div>
      </div>
      <div class="fld"><label>Posição no mercado</label><input id="kf-pos" value="${esc(ed.posicao||'')}" placeholder="Líder / Desafiante / Nicho"></div>
      <div class="fld-row">
        <div class="fld"><label>Força</label><input id="kf-forca" value="${esc(ed.forca||'')}" placeholder="Principal força"></div>
        <div class="fld"><label>Fraqueza</label><input id="kf-fraq" value="${esc(ed.fraqueza||'')}" placeholder="Principal fraqueza"></div>
      </div>
      <div class="fld"><label>Observações / movimentos recentes</label><textarea id="kf-obs" placeholder="Lançamentos, preços, ações...">${esc(ed.obs||'')}</textarea></div>
      <label class="mi-check"><input type="checkbox" id="kf-mon" ${ed.monitorar?'checked':''}> Monitorar ativamente</label>`,
      `${ed.id?'<button class="mc-btn ghost danger" id="kf-del">Remover</button>':''}<button class="mc-btn ghost" id="kf-cancel">Cancelar</button><button class="mc-btn primary" id="kf-save"><i data-lucide="save"></i> Salvar</button>`);
    document.getElementById("kf-cancel").addEventListener("click",MI.closeModal);
    const del=document.getElementById("kf-del"); if(del) del.addEventListener("click",()=>{ S.remove("mi_concorrentes",ed.id); MI.toast("Removido"); MI.closeModal(); MI.refresh(); });
    document.getElementById("kf-save").addEventListener("click",()=>{
      const v=id=>{ const e=document.getElementById(id); return e?e.value.trim():""; };
      const nome=v("kf-nome"); if(!nome){ MI.toast("Informe o nome"); return; }
      const data={ nome, segmento:v("kf-seg"), regiao:v("kf-reg"), posicao:v("kf-pos"), forca:v("kf-forca"), fraqueza:v("kf-fraq"), obs:v("kf-obs"), monitorar:document.getElementById("kf-mon").checked };
      if(ed.id) S.update("mi_concorrentes",ed.id,data); else S.add("mi_concorrentes",Object.assign({id:"cc"+Date.now()},data));
      MI.toast("Concorrente salvo"); MI.closeModal(); MI.refresh();
    });
  }

  /* =================== REGIÕES =================== */
  M.regioes = {
    label:"Regiões & Mercado",
    render(){
      const rg=regioes();
      const maxP=Math.max(1,...rg.map(r=>+r.participacao||0));
      return `
      <div class="mc-toolbar"><div class="mc-sub">${rg.length} região(ões) analisada(s)</div>
        <button class="mc-btn primary" id="rg-new"><i data-lucide="plus"></i> Nova região</button></div>
      <div class="mc-cards">${rg.map(r=>`
        <div class="mc-ccard" data-rg="${r.id}">
          <div class="mc-ccard-top">${badge(POT,r.potencial)}<span class="mi-trend ${r.tendencia}"><i data-lucide="${r.tendencia==='alta'?'trending-up':(r.tendencia==='baixa'?'trending-down':'minus')}"></i></span></div>
          <div class="mc-ccard-t">${esc(r.regiao)}</div>
          <div class="mc-ccard-d">${esc(r.cultura||"")}</div>
          <div class="mi-part"><div class="mi-part-l">Participação SBS</div><div class="mi-part-bar"><span style="width:${Math.max(4,Math.round((+r.participacao||0)/maxP*100))}%"></span></div><div class="mi-part-v">${r.participacao||0}%</div></div>
          ${r.obs?`<div class="mi-obs">${esc(r.obs)}</div>`:""}
        </div>`).join("")}</div>`;
    },
    mount(c){
      c.querySelector("#rg-new").addEventListener("click",()=>formRg());
      c.querySelectorAll("[data-rg]").forEach(card=>card.addEventListener("click",()=>formRg(regioes().find(x=>x.id===card.dataset.rg))));
    }
  };
  function formRg(ed){
    ed=ed||{};
    const popt=["Alto","Médio","Baixo"].map(k=>`<option value="${k}" ${ed.potencial===k?"selected":""}>${k}</option>`).join("");
    const topt=[["alta","Em alta"],["estavel","Estável"],["baixa","Em queda"]].map(k=>`<option value="${k[0]}" ${ed.tendencia===k[0]?"selected":""}>${k[1]}</option>`).join("");
    MI.modal(ed.id?"Editar região":"Nova região",`
      <div class="fld-row">
        <div class="fld"><label>Região</label><input id="rf-reg" value="${esc(ed.regiao||'')}" placeholder="Estado / microrregião"></div>
        <div class="fld"><label>Cultura</label><input id="rf-cult" value="${esc(ed.cultura||'')}" placeholder="Soja / Milho"></div>
      </div>
      <div class="fld-row">
        <div class="fld"><label>Potencial</label><select id="rf-pot">${popt}</select></div>
        <div class="fld"><label>Tendência</label><select id="rf-trend">${topt}</select></div>
      </div>
      <div class="fld"><label>Participação SBS (%)</label><input id="rf-part" type="number" min="0" max="100" value="${ed.participacao||0}"></div>
      <div class="fld"><label>Observações</label><textarea id="rf-obs" placeholder="Contexto da região...">${esc(ed.obs||'')}</textarea></div>`,
      `${ed.id?'<button class="mc-btn ghost danger" id="rf-del">Remover</button>':''}<button class="mc-btn ghost" id="rf-cancel">Cancelar</button><button class="mc-btn primary" id="rf-save"><i data-lucide="save"></i> Salvar</button>`);
    document.getElementById("rf-cancel").addEventListener("click",MI.closeModal);
    const del=document.getElementById("rf-del"); if(del) del.addEventListener("click",()=>{ S.remove("mi_regioes",ed.id); MI.toast("Removida"); MI.closeModal(); MI.refresh(); });
    document.getElementById("rf-save").addEventListener("click",()=>{
      const v=id=>{ const e=document.getElementById(id); return e?e.value.trim():""; };
      const reg=v("rf-reg"); if(!reg){ MI.toast("Informe a região"); return; }
      const data={ regiao:reg, cultura:v("rf-cult"), potencial:v("rf-pot"), tendencia:v("rf-trend"), participacao:+v("rf-part")||0, obs:v("rf-obs") };
      if(ed.id) S.update("mi_regioes",ed.id,data); else S.add("mi_regioes",Object.assign({id:"rg"+Date.now()},data));
      MI.toast("Região salva"); MI.closeModal(); MI.refresh();
    });
  }

  /* =================== TENDÊNCIAS =================== */
  M.tendencias = {
    label:"Tendências & Alertas",
    render(){
      const td=tendencias().slice().sort((a,b)=>(a.data<b.data?1:-1));
      return `
      <div class="mc-toolbar"><div class="mc-sub">${td.length} tendência(s) acompanhada(s)</div>
        <button class="mc-btn primary" id="td-new"><i data-lucide="plus"></i> Nova tendência</button></div>
      ${td.map(t=>`
        <div class="mc-card mi-td" data-td="${t.id}">
          <div class="mi-td-h"><span class="mi-td-cat">${esc(t.categoria||"")}</span>${badge(IMPACTO,t.impacto)}<span class="mi-td-hz">${esc(t.horizonte||"")}</span><span class="mi-td-date">${dateBR(t.data)}</span></div>
          <div class="mi-td-t">${esc(t.titulo)}</div>
          <div class="mi-td-x">${esc(t.descricao||"")}</div>
        </div>`).join("")||'<div class="mc-empty">Nenhuma tendência registrada.</div>'}`;
    },
    mount(c){
      c.querySelector("#td-new").addEventListener("click",()=>formTd());
      c.querySelectorAll("[data-td]").forEach(card=>card.addEventListener("click",()=>formTd(tendencias().find(x=>x.id===card.dataset.td))));
    }
  };
  function formTd(ed){
    ed=ed||{};
    const iopt=["alto","medio","baixo"].map(k=>`<option value="${k}" ${ed.impacto===k?"selected":""}>${IMPACTO[k].l}</option>`).join("");
    MI.modal(ed.id?"Editar tendência":"Nova tendência",`
      <div class="fld"><label>Título</label><input id="tf-tit" value="${esc(ed.titulo||'')}" placeholder="Resumo da tendência"></div>
      <div class="fld"><label>Descrição</label><textarea id="tf-desc" placeholder="O que está acontecendo e o impacto para a SBS...">${esc(ed.descricao||'')}</textarea></div>
      <div class="fld-row">
        <div class="fld"><label>Categoria</label><input id="tf-cat" value="${esc(ed.categoria||'')}" placeholder="Produto / Macroeconomia / Clima"></div>
        <div class="fld"><label>Impacto</label><select id="tf-imp">${iopt}</select></div>
      </div>
      <div class="fld-row">
        <div class="fld"><label>Horizonte</label><input id="tf-hz" value="${esc(ed.horizonte||'')}" placeholder="Curto prazo / 2026/27"></div>
        <div class="fld"><label>Data</label><input id="tf-data" type="date" value="${esc(ed.data||'')}"></div>
      </div>`,
      `${ed.id?'<button class="mc-btn ghost danger" id="tf-del">Remover</button>':''}<button class="mc-btn ghost" id="tf-cancel">Cancelar</button><button class="mc-btn primary" id="tf-save"><i data-lucide="save"></i> Salvar</button>`);
    document.getElementById("tf-cancel").addEventListener("click",MI.closeModal);
    const del=document.getElementById("tf-del"); if(del) del.addEventListener("click",()=>{ S.remove("mi_tendencias",ed.id); MI.toast("Removida"); MI.closeModal(); MI.refresh(); });
    document.getElementById("tf-save").addEventListener("click",()=>{
      const v=id=>{ const e=document.getElementById(id); return e?e.value.trim():""; };
      const tit=v("tf-tit"); if(!tit){ MI.toast("Informe o título"); return; }
      const data={ titulo:tit, descricao:v("tf-desc"), categoria:v("tf-cat"), impacto:document.getElementById("tf-imp").value, horizonte:v("tf-hz"), data:v("tf-data") };
      if(ed.id) S.update("mi_tendencias",ed.id,data); else S.add("mi_tendencias",Object.assign({id:"td"+Date.now()},data));
      MI.toast("Tendência salva"); MI.closeModal(); MI.refresh();
    });
  }

  /* =================== AJUDA =================== */
  M.ajuda = {
    label:"Central de Ajuda",
    render(){ return window.SBS_DOCS_HELP ? window.SBS_DOCS_HELP.html("mercado") : '<div class="mc-card">Documentação indisponível.</div>'; },
    mount(c){ window.SBS_DOCS_HELP && window.SBS_DOCS_HELP.mount(c,"mercado"); }
  };
})();
