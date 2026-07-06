/* ===========================================================
   SBS Painel de Inteligência de Mercado — Fontes de Monitoramento
   Cadastro de concorrentes e seus CANAIS de coleta (site, portal de
   preço, RSS/notícias, LinkedIn, Instagram, marketplace). É o
   registro que o coletor (backend) vai usar para puxar os dados.
   Coleções: mi_concorrentes (reuso) + mi_fontes.
   =========================================================== */
(function(){
  const M = MI.Modules, S = MI.S, esc = MI.esc;

  const CANAIS = {
    site:      { l:"Site oficial",     ic:"globe-2",        c:"#0B6B61", dica:"Catálogo, cultivares, novidades" },
    preco:     { l:"Portal de preço",  ic:"tag",            c:"#C0710F", dica:"CEPEA, IMEA, Agrolink, tabela pública" },
    rss:       { l:"Notícias / RSS",   ic:"rss",            c:"#2A6FDB", dica:"Releases e notícias do concorrente" },
    linkedin:  { l:"LinkedIn",         ic:"linkedin",       c:"#0A66C2", dica:"Vagas = expansão; posts institucionais" },
    instagram: { l:"Instagram",        ic:"instagram",      c:"#E1306C", dica:"Campanhas, lançamentos, eventos" },
    facebook:  { l:"Facebook",         ic:"facebook",       c:"#1877F2", dica:"Posts, promoções e eventos" },
    youtube:   { l:"YouTube",          ic:"youtube",        c:"#FF0000", dica:"Vídeos de produto, dias de campo, depoimentos" },
    marketplace:{ l:"Marketplace/e-commerce", ic:"shopping-cart", c:"#7A52C0", dica:"Preço de venda quando disponível" }
  };

  function fontes(){ return S.getCol("mi_fontes")||[]; }
  function concorrentes(){ return S.getCol("mi_concorrentes")||[]; }

  // preenche os perfis sociais da Oeste Paulista para quem já tinha o seed antigo
  function reconcileOesp(){
    if(S.get("mi_fontes_oesp_v2")) return;
    const URLS={ instagram:"https://www.instagram.com/sementesoesp/", facebook:"https://www.facebook.com/soespsementes", youtube:"https://www.youtube.com/channel/UChMiFFlsdRAFleWnL69wvwg", linkedin:"https://www.linkedin.com/company/sementes-oeste-paulista/" };
    let fs=S.getCol("mi_fontes")||[];
    const oesp=concorrentes().find(c=>/oeste paulista|oesp/i.test(c.nome||""));
    if(oesp){
      const has=can=>fs.some(f=>f.ccId===oesp.id&&f.canal===can);
      fs.forEach(f=>{ if(f.ccId===oesp.id && !f.url && URLS[f.canal]) f.url=URLS[f.canal]; });
      ["facebook","youtube","linkedin"].forEach(can=>{ if(!has(can)) fs.push({ id:"f"+can+Date.now(), ccId:oesp.id, ccNome:oesp.nome, canal:can, url:URLS[can], freq:can==="youtube"||can==="linkedin"?"mensal":"semanal", ativo:true, ultima:"" }); });
      S.setCol("mi_fontes", fs);
    }
    S.set("mi_fontes_oesp_v2", true);
  }

  function seed(){
    if((S.getCol("mi_fontes")||[]).length){ reconcileOesp(); return; }
    // garante o concorrente principal
    let cc=concorrentes();
    let oesp=cc.find(c=>/oeste paulista|sementes oesp|oesp/i.test(c.nome||""));
    if(!oesp){ oesp={ id:"cc-oesp", nome:"Sementes Oeste Paulista", segmento:"Sementes de pastagem/forrageiras", regiao:"SP / Nacional", posicao:"Principal concorrente", forca:"Marca forte em forrageiras", fraqueza:"", monitorar:true };
      S.add("mi_concorrentes", oesp); }
    S.setCol("mi_fontes", [
      { id:"f1", ccId:oesp.id, ccNome:oesp.nome, canal:"site",      url:"https://sementesoesp.com.br/", freq:"semanal", ativo:true, ultima:"" },
      { id:"f2", ccId:oesp.id, ccNome:oesp.nome, canal:"instagram", url:"https://www.instagram.com/sementesoesp/", freq:"semanal", ativo:true, ultima:"" },
      { id:"f3", ccId:oesp.id, ccNome:oesp.nome, canal:"facebook",  url:"https://www.facebook.com/soespsementes", freq:"semanal", ativo:true, ultima:"" },
      { id:"f4", ccId:oesp.id, ccNome:oesp.nome, canal:"youtube",   url:"https://www.youtube.com/channel/UChMiFFlsdRAFleWnL69wvwg", freq:"mensal", ativo:true, ultima:"" },
      { id:"f5", ccId:oesp.id, ccNome:oesp.nome, canal:"linkedin",  url:"https://www.linkedin.com/company/sementes-oeste-paulista/", freq:"mensal",  ativo:true, ultima:"" }
    ]);
  }

  M.fontes = {
    label:"Fontes de Monitoramento",
    render(){
      seed();
      const fs=fontes(), cc=concorrentes();
      // agrupa por concorrente
      const grupos={}; fs.forEach(f=>{ (grupos[f.ccNome]=grupos[f.ccNome]||[]).push(f); });
      const nomes=Object.keys(grupos);
      const kpi=(ic,v,l,t)=>`<div class="mc-kpi ${t||''}"><span class="mc-kpi-ic"><i data-lucide="${ic}"></i></span><div><div class="mc-kpi-v">${v}</div><div class="mc-kpi-l">${l}</div></div></div>`;
      return `
      <div class="mc-kpis">
        ${kpi("swords", nomes.length, "Concorrentes com fontes", "")}
        ${kpi("radio", fs.filter(f=>f.ativo).length, "Canais ativos", "ok")}
        ${kpi("link", fs.filter(f=>f.url).length, "Com link cadastrado", "")}
      </div>
      <div class="mc-toolbar"><div class="mc-sub">Cadastre os canais de cada concorrente para o coletor monitorar</div>
        <button class="mc-btn primary" id="ft-new"><i data-lucide="plus"></i> Adicionar fonte</button></div>
      <div class="mc-note" style="margin:0 0 14px"><i data-lucide="info"></i> Estes são os <b>canais que vamos monitorar</b>. A coleta automática roda num serviço externo (backend); aqui você define <b>de onde</b> e <b>com que frequência</b> puxar. Comece pelo <b>site oficial</b> de cada concorrente.</div>
      ${nomes.length? nomes.map(nome=>`
        <div class="mc-card" style="margin-bottom:14px">
          <div class="mc-card-h" style="justify-content:space-between;display:flex"><span><i data-lucide="building-2"></i> ${esc(nome)}</span><button class="mc-link" data-addto="${esc(nome)}"><i data-lucide="plus"></i> canal</button></div>
          ${grupos[nome].map(f=>{ const ch=CANAIS[f.canal]||CANAIS.site; return `
            <div class="ft-row ${f.ativo?'':'off'}">
              <span class="ft-ic" style="background:${ch.c}1a;color:${ch.c}"><i data-lucide="${ch.ic}"></i></span>
              <div class="ft-main">
                <div class="ft-t">${ch.l}${f.url?` · <a href="${esc(f.url)}" target="_blank" rel="noopener" class="ft-url">${esc(f.url.replace(/^https?:\/\//,'').slice(0,42))}</a>`:` · <span class="mc-sub">sem link</span>`}</div>
                <div class="ft-s">${esc(ch.dica)} · coleta ${esc(f.freq)}${f.ultima?` · última ${esc(f.ultima)}`:" · aguardando coletor"}</div>
              </div>
              <label class="mi-check" style="margin:0"><input type="checkbox" data-tog="${f.id}" ${f.ativo?'checked':''}><span></span></label>
              <button class="mc-link" data-edit="${f.id}"><i data-lucide="pencil"></i></button>
              <button class="mc-link" data-del="${f.id}" style="color:#b3261e"><i data-lucide="trash-2"></i></button>
            </div>`; }).join("")}
        </div>`).join("") : `<div class="mc-empty">Nenhuma fonte cadastrada.</div>`}
      <div class="mc-note"><i data-lucide="bot"></i> Quando o coletor estiver ligado (Netlify/Supabase Functions), cada canal vira movimento automático na linha do tempo do concorrente e alerta para Vendas — como o robô já faz com as cotações.</div>`;
    },
    mount(c){
      c.querySelector("#ft-new") && (c.querySelector("#ft-new").onclick=()=>form(null,""));
      c.querySelectorAll("[data-addto]").forEach(b=>b.onclick=()=>form(null,b.dataset.addto));
      c.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>form(fontes().find(x=>x.id===b.dataset.edit)));
      c.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{ if(confirm("Remover esta fonte?")){ S.remove("mi_fontes",b.dataset.del); MI.toast("Removida"); MI.refresh(); } });
      c.querySelectorAll("[data-tog]").forEach(inp=>inp.onchange=()=>{ const f=fontes().find(x=>x.id===inp.dataset.tog); if(f){ S.update("mi_fontes",f.id,{ativo:inp.checked}); MI.toast(inp.checked?"Canal ativado":"Canal pausado"); } });
    }
  };

  function form(ed, presetNome){
    ed=ed||{};
    const cc=concorrentes();
    const nomeOpts=[...new Set(cc.map(c=>c.nome).concat(fontes().map(f=>f.ccNome)).filter(Boolean))];
    MI.modal(ed.id?"Editar fonte":"Adicionar fonte de monitoramento",
      '<div class="fld"><label>Concorrente</label><input id="ft-cc" list="ft-cclist" value="'+esc(ed.ccNome||presetNome||"")+'" placeholder="Nome do concorrente"><datalist id="ft-cclist">'+nomeOpts.map(n=>'<option value="'+esc(n)+'">').join("")+'</datalist></div>'+
      '<div class="fld"><label>Canal</label><select id="ft-canal">'+Object.keys(CANAIS).map(k=>'<option value="'+k+'" '+(ed.canal===k?'selected':'')+'>'+CANAIS[k].l+'</option>').join("")+'</select></div>'+
      '<div class="fld"><label>Link / URL</label><input id="ft-url" value="'+esc(ed.url||"")+'" placeholder="https://..."></div>'+
      '<div class="fld"><label>Frequência de coleta</label><select id="ft-freq"><option '+(ed.freq==="diaria"?'selected':'')+' value="diaria">Diária</option><option '+(!ed.freq||ed.freq==="semanal"?'selected':'')+' value="semanal">Semanal</option><option '+(ed.freq==="mensal"?'selected':'')+' value="mensal">Mensal</option></select></div>',
      (ed.id?'':'')+'<button class="mc-btn ghost" id="ft-cancel">Cancelar</button><button class="mc-btn primary" id="ft-save"><i data-lucide="save"></i> Salvar</button>');
    document.getElementById("ft-cancel").onclick=MI.closeModal;
    document.getElementById("ft-save").onclick=()=>{
      const nome=(document.getElementById("ft-cc").value||"").trim(); if(!nome){ MI.toast("Informe o concorrente"); return; }
      let cref=concorrentes().find(c=>(c.nome||"").trim().toLowerCase()===nome.toLowerCase());
      if(!cref){ cref=S.add("mi_concorrentes",{ id:"cc"+Date.now(), nome:nome, segmento:"", regiao:"", posicao:"", monitorar:true }); }
      const data={ ccId:cref.id, ccNome:nome, canal:document.getElementById("ft-canal").value, url:(document.getElementById("ft-url").value||"").trim(), freq:document.getElementById("ft-freq").value };
      if(ed.id) S.update("mi_fontes",ed.id,data); else S.add("mi_fontes",Object.assign({id:"f"+Date.now(),ativo:true,ultima:""},data));
      MI.toast("Fonte salva"); MI.closeModal(); MI.refresh();
    };
  }
})();
