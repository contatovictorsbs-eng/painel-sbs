/* ===========================================================
   SBS Painel de Inteligência de Mercado — Calendário Agrícola
   Janelas de venda de sementes, plantio e colheita por região e cultura.
   Guia o time comercial sobre o que empurrar em cada época do ano.
   =========================================================== */
(function(){
  const M = MI.Modules, esc = MI.esc;

  const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  const REGIOES = [
    { id:"co",   nome:"Centro-Oeste (MT · GO · MS)" },
    { id:"mat",  nome:"MATOPIBA (BA · MA · TO · PI)" },
    { id:"se",   nome:"Sudeste (SP · MG)" },
    { id:"sul",  nome:"Sul (PR · RS · SC)" },
  ];

  // m = meses (1–12). venda = janela de venda de sementes SBS; plantio; colheita.
  const CULTURAS = [
    { nome:"Soja", icon:"sprout", janelas:{
      co:  { venda:[7,8,9],    plantio:[9,10,11],  colheita:[1,2,3] },
      mat: { venda:[8,9,10],   plantio:[10,11,12], colheita:[2,3,4] },
      se:  { venda:[8,9,10],   plantio:[10,11],    colheita:[2,3] },
      sul: { venda:[8,9,10],   plantio:[10,11,12], colheita:[3,4] },
    }},
    { nome:"Milho 1ª safra", icon:"wheat", janelas:{
      co:  { venda:[7,8],      plantio:[9,10],     colheita:[1,2] },
      se:  { venda:[8,9],      plantio:[10,11],    colheita:[2,3] },
      sul: { venda:[7,8],      plantio:[8,9,10],   colheita:[1,2,3] },
    }},
    { nome:"Milho 2ª safra (safrinha)", icon:"corn", janelas:{
      co:  { venda:[12,1],     plantio:[1,2,3],    colheita:[5,6,7] },
      mat: { venda:[12,1],     plantio:[2,3],      colheita:[6,7] },
      se:  { venda:[1,2],      plantio:[2,3],      colheita:[6,7] },
    }},
    { nome:"Algodão", icon:"flower", janelas:{
      co:  { venda:[10,11],    plantio:[12,1,2],   colheita:[6,7,8] },
      mat: { venda:[10,11],    plantio:[12,1],     colheita:[6,7,8] },
    }},
    { nome:"Sorgo", icon:"wheat", janelas:{
      co:  { venda:[12,1],     plantio:[2,3],      colheita:[6,7] },
      mat: { venda:[12,1],     plantio:[2,3,4],    colheita:[7,8] },
      se:  { venda:[1,2],      plantio:[2,3],      colheita:[6,7] },
    }},
    { nome:"Pastagem / Forrageiras", icon:"trees", janelas:{
      co:  { venda:[8,9,10],   plantio:[10,11,12], colheita:[] },
      mat: { venda:[9,10],     plantio:[11,12],    colheita:[] },
      se:  { venda:[9,10],     plantio:[10,11,12], colheita:[] },
      sul: { venda:[8,9],      plantio:[9,10],     colheita:[] },
    }},
    { nome:"Feijão", icon:"bean", janelas:{
      co:  { venda:[1,2],      plantio:[2,3],      colheita:[5,6] },
      se:  { venda:[1,2,8],    plantio:[2,3,9],    colheita:[6,12] },
      sul: { venda:[7,8],      plantio:[8,9],      colheita:[12,1] },
    }},
  ];

  const TIPOS = {
    venda:    { l:"Venda de sementes", c:"#0B6B61", bg:"#0B6B61" },
    plantio:  { l:"Plantio",           c:"#6FA331", bg:"#6FA331" },
    colheita: { l:"Colheita",          c:"#C0710F", bg:"#E1A33B" },
  };

  function regAtual(){ return M.calendario._reg; }

  M.calendario = {
    label:"Calendário Agrícola",
    _reg:"co",
    render(){
      const reg = this._reg;
      const regNome = (REGIOES.find(r=>r.id===reg)||{}).nome||"";
      const mesAtual = new Date().getMonth()+1;

      // foco do mês: culturas em janela de venda agora, nesta região
      const focoVenda = CULTURAS.filter(c=>c.janelas[reg] && c.janelas[reg].venda.includes(mesAtual)).map(c=>c.nome);
      const emColheita = CULTURAS.filter(c=>c.janelas[reg] && (c.janelas[reg].colheita||[]).includes(mesAtual)).map(c=>c.nome);

      const linhas = CULTURAS.filter(c=>c.janelas[reg]).map(c=>{
        const j = c.janelas[reg];
        const cels = MESES.map((m,i)=>{
          const mn = i+1;
          let tipo = "";
          if(j.venda.includes(mn)) tipo="venda";
          else if(j.plantio.includes(mn)) tipo="plantio";
          else if((j.colheita||[]).includes(mn)) tipo="colheita";
          const hoje = mn===mesAtual ? " cal-now" : "";
          const t = tipo ? `style="background:${TIPOS[tipo].bg}"` : "";
          return `<div class="cal-cell${hoje} ${tipo?'on':''}" ${t} title="${tipo?TIPOS[tipo].l:''}"></div>`;
        }).join("");
        return `<div class="cal-row">
          <div class="cal-cult"><i data-lucide="${c.icon}"></i><span>${esc(c.nome)}</span></div>
          <div class="cal-cells">${cels}</div>
        </div>`;
      }).join("");

      return `
      <div class="mc-toolbar">
        <div class="mc-sub">Janela de venda de sementes, plantio e colheita por cultura</div>
        <select class="mc-select" id="cal-reg">
          ${REGIOES.map(r=>`<option value="${r.id}" ${r.id===reg?'selected':''}>${esc(r.nome)}</option>`).join("")}
        </select>
      </div>

      <div class="mc-note" style="margin:2px 0 16px"><i data-lucide="info"></i>
        <b>Como usar:</b> a faixa <b style="color:#0B6B61">verde-escura</b> é a hora de vender semente (antes do plantio).
        Use o calendário para antecipar a oferta certa em cada região e não perder a janela.</div>

      ${(focoVenda.length||emColheita.length)?`<div class="cal-foco">
        <div class="cal-foco-h"><i data-lucide="megaphone"></i> Foco de ${MESES[mesAtual-1]} · ${esc(regNome)}</div>
        ${focoVenda.length?`<div class="cal-foco-row"><span class="cal-dot" style="background:#0B6B61"></span> <b>Empurre sementes agora:</b> ${focoVenda.map(esc).join(", ")}</div>`:""}
        ${emColheita.length?`<div class="cal-foco-row"><span class="cal-dot" style="background:#E1A33B"></span> Em colheita (pós-venda / fidelização): ${emColheita.map(esc).join(", ")}</div>`:""}
      </div>`:""}

      <div class="mc-card" style="overflow-x:auto">
        <div class="cal-grid">
          <div class="cal-row cal-head">
            <div class="cal-cult"></div>
            <div class="cal-cells">${MESES.map((m,i)=>`<div class="cal-mh ${i+1===mesAtual?'cal-now':''}">${m}</div>`).join("")}</div>
          </div>
          ${linhas}
        </div>
        <div class="cal-legend">
          ${Object.values(TIPOS).map(t=>`<span class="cal-leg"><span class="cal-sw" style="background:${t.bg}"></span>${t.l}</span>`).join("")}
          <span class="cal-leg"><span class="cal-sw cal-now-sw"></span>Mês atual</span>
        </div>
      </div>

      <div class="mc-note" style="margin-top:16px"><i data-lucide="lightbulb"></i>
        Quer transformar isto num material? Em <b>Estudos & Apresentações</b> você monta um estudo de oportunidade por safra e gera a apresentação.</div>`;
    },
    mount(c){
      const sel = c.querySelector("#cal-reg");
      sel && sel.addEventListener("change", ()=>{ this._reg = sel.value; MI.go("calendario"); });
    }
  };

  // expõe para o módulo de Insights de Vendas
  window.SBS_CALENDARIO = { REGIOES:REGIOES, CULTURAS:CULTURAS, MESES:MESES, TIPOS:TIPOS };
})();
