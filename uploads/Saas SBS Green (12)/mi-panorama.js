/* ===========================================================
   SBS Painel de Inteligência — Panorama Setorial + Cultivares SBS
   Feeds de pesquisa por setor (Soja, Pecuária, Pastagem, Agricultura)
   com indicadores acompanhados + pesquisa sob demanda (IA), e o
   ranking dos cultivares SBS por faturamento.
   Coleções: mi_panorama, mi_cultivares_sbs
   =========================================================== */
(function(){
  const M = MI.Modules, S = MI.S, esc = MI.esc, money = MI.money;

  const SETORES = [
    { id:"soja",       nome:"Soja",        icon:"sprout",   cor:"#1f8a5b" },
    { id:"pecuaria",   nome:"Pecuária",    icon:"beef",     cor:"#b5651d" },
    { id:"pastagem",   nome:"Pastagem",    icon:"trees",    cor:"#2f8f4e" },
    { id:"agricultura",nome:"Agricultura", icon:"wheat",    cor:"#c79a00" }
  ];

  // seed inicial (1 panorama por setor) — editável depois
  function seed(){
    if((S.getCol("mi_panorama")||[]).length) return;
    const hoje=S.today?S.today():new Date().toISOString().slice(0,10);
    S.setCol("mi_panorama",[
      { id:"pn-soja", setor:"soja", titulo:"Soja — panorama da safra", resumo:"Preço da saca, ritmo de plantio/colheita e demanda por semente certificada.", indicadores:[{k:"Saca (média)",v:"R$ 128"},{k:"Plantio",v:"em curso"},{k:"Demanda semente",v:"alta"}], atualizado:hoje },
      { id:"pn-pec", setor:"pecuaria", titulo:"Pecuária — reposição e pasto", resumo:"Preço da arroba, reposição de boi magro e necessidade de reforma de pastagem.", indicadores:[{k:"Arroba",v:"R$ 245"},{k:"Reposição",v:"firme"},{k:"Reforma de pasto",v:"crescente"}], atualizado:hoje },
      { id:"pn-past", setor:"pastagem", titulo:"Pastagem — janela de formação", resumo:"Sementes forrageiras (braquiária/panicum), VC e melhor janela de plantio por região.", indicadores:[{k:"Forrageiras",v:"procura alta"},{k:"Janela",v:"início das chuvas"},{k:"VC médio",v:"acompanhar"}], atualizado:hoje },
      { id:"pn-agri", setor:"agricultura", titulo:"Agricultura — milho e demais", resumo:"Milho 2ª safra, sorgo e rotação; preço e clima definindo a intenção de plantio.", indicadores:[{k:"Milho saca",v:"R$ 62"},{k:"Sorgo",v:"alternativa"},{k:"Intenção plantio",v:"estável"}], atualizado:hoje }
    ]);
  }
  function seedCult(){
    if((S.getCol("mi_cultivares_sbs")||[]).length) return;
    S.setCol("mi_cultivares_sbs",[
      { id:"cv1", nome:"SBS 7110 RR", cultura:"Soja", faturamento:4200000, share:28 },
      { id:"cv2", nome:"SBS 8579 IPRO", cultura:"Soja", faturamento:3100000, share:21 },
      { id:"cv3", nome:"Brachiária BRS Paiaguás", cultura:"Pastagem", faturamento:1850000, share:12 },
      { id:"cv4", nome:"Panicum Mombaça", cultura:"Pastagem", faturamento:1450000, share:10 },
      { id:"cv5", nome:"SBS Milho 3400", cultura:"Milho", faturamento:1200000, share:8 },
      { id:"cv6", nome:"Sorgo SBS S12", cultura:"Sorgo", faturamento:680000, share:5 }
    ]);
  }

  function panorama(setor){ return (S.getCol("mi_panorama")||[]).find(p=>p.setor===setor); }

  var selSetor="soja", resPesquisa={};

  async function pesquisar(setor){
    var p=panorama(setor); if(!p) return;
    resPesquisa[setor]="...loading";
    MI.refresh();
    var prompt="Você é analista de mercado do agronegócio (sementes) na SBS Green Seeds. Faça um panorama curto e prático do setor de "+setor+
      " para orientar a força de vendas hoje no Brasil: 3-4 bullets com tendência de preço, janela de compra/plantio e oportunidade de venda de sementes/forrageiras. Linguagem de campo, sem encher. Indicadores atuais conhecidos: "+
      (p.indicadores||[]).map(i=>i.k+"="+i.v).join(", ")+".";
    var txt="";
    try{
      if(window.claude&&window.claude.complete){ txt=await window.claude.complete(prompt); }
      else { var r=await fetch("/.netlify/functions/assistente",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:prompt,big:true})}); var j=await r.json(); txt=j.text||""; }
    }catch(e){ txt=""; }
    if(!txt||/^\s*[⚠⚙]/.test(txt)) txt="Não consegui pesquisar agora (IA indisponível). Os indicadores acompanhados deste setor seguem acima; tente novamente em instantes.";
    resPesquisa[setor]=txt;
    // guarda como tendência registrada
    S.add("mi_tendencias",{ id:"tn"+Date.now(), titulo:"Panorama "+setor+" (IA)", resumo:txt.slice(0,400), setor:setor, data:S.today?S.today():"", fonte:"Assistente IA" });
    MI.refresh();
  }

  M.panorama = {
    label:"Panorama Setorial",
    render(){
      seed(); seedCult();
      const cult=(S.getCol("mi_cultivares_sbs")||[]).slice().sort((a,b)=>(b.faturamento||0)-(a.faturamento||0));
      const maxF=cult.length?Math.max.apply(null,cult.map(c=>c.faturamento||0)):1;
      const tabs=SETORES.map(s=>`<button class="pn-tab ${s.id===selSetor?'on':''}" data-setor="${s.id}"><i data-lucide="${s.icon}"></i> ${s.nome}</button>`).join("");
      const p=panorama(selSetor)||{}; const setorInfo=SETORES.find(s=>s.id===selSetor)||{};
      const res=resPesquisa[selSetor];
      return `
      <div class="mc-toolbar"><div class="mc-sub">Pesquisa automática por setor + cultivares SBS que mais faturam</div></div>
      <div class="pn-tabs">${tabs}</div>
      <div class="mc-card">
        <div class="mc-card-h" style="color:${setorInfo.cor||'#0B6B61'}"><i data-lucide="${setorInfo.icon||'leaf'}"></i> ${esc(p.titulo||setorInfo.nome)}</div>
        <p class="mc-sub" style="margin:0 0 12px">${esc(p.resumo||"")}</p>
        <div class="pn-inds">${(p.indicadores||[]).map(i=>`<div class="pn-ind"><div class="pn-ind-v">${esc(i.v)}</div><div class="pn-ind-k">${esc(i.k)}</div></div>`).join("")}</div>
        <div style="margin-top:14px"><button class="mc-btn primary" id="pn-go"><i data-lucide="sparkles"></i> Pesquisar panorama agora (IA)</button></div>
        ${res?`<div class="pn-res">${res==="...loading"?'<span class="mc-sub">Pesquisando o mercado…</span>':esc(res).replace(/^[-•]\s/gm,"• ").replace(/\n/g,"<br>")}</div>`:""}
      </div>
      <div class="mc-card-h" style="margin:18px 2px 10px"><i data-lucide="award"></i> Cultivares SBS por faturamento</div>
      <div class="mc-card">
        ${cult.map(c=>`<div class="pn-cv">
          <div class="pn-cv-top"><div><b>${esc(c.nome)}</b> <span class="pn-cv-cult">${esc(c.cultura)}</span></div><div class="pn-cv-val">${money(c.faturamento)}</div></div>
          <div class="pn-bar"><span style="width:${Math.round((c.faturamento||0)/maxF*100)}%"></span></div>
        </div>`).join("")}
        <div class="mc-note" style="margin-top:12px"><i data-lucide="info"></i> Edite os cultivares e o faturamento conforme o fechamento do TOTVS. Esta lista alimenta o foco de venda e os estudos.</div>
      </div>`;
    },
    mount(c){
      c.querySelectorAll(".pn-tab").forEach(b=>b.addEventListener("click",()=>{ selSetor=b.dataset.setor; MI.refresh(); }));
      var go=c.querySelector("#pn-go"); if(go) go.addEventListener("click",()=>pesquisar(selSetor));
    }
  };
})();
