/* ===========================================================
   SBS Inteligência de Mercado — ESTUDOS & APRESENTAÇÕES
   Monta um estudo de mercado escolhendo blocos (cotações, câmbio,
   clima, concorrentes, regiões, tendências, alertas e textos) e
   gera uma apresentação navegável, pronta para projetar ou exportar
   em PDF (imprimir). Coleção: mi_estudos.
   =========================================================== */
window.MI_ESTUDOS = (function(){

  var CATALOGO = [
    { tipo:"resumo",       nome:"Objetivo / Resumo",      icon:"text",          desc:"O objetivo do estudo em destaque." },
    { tipo:"cambio",       nome:"Câmbio (ao vivo)",       icon:"dollar-sign",   desc:"Dólar e euro no momento da apresentação." },
    { tipo:"cotacoes",     nome:"Cotações & Commodities", icon:"trending-up",   desc:"Tabela de preços acompanhados." },
    { tipo:"clima",        nome:"Clima & Safra",          icon:"cloud-sun",     desc:"Situação climática das praças agrícolas." },
    { tipo:"concorrentes", nome:"Concorrentes",           icon:"swords",        desc:"Mapa da concorrência monitorada." },
    { tipo:"regioes",      nome:"Regiões & Mercado",      icon:"map",           desc:"Potencial e participação por região." },
    { tipo:"tendencias",   nome:"Tendências & Alertas",   icon:"radar",         desc:"Movimentos de mercado relevantes." },
    { tipo:"alertas",      nome:"Alertas automáticos",    icon:"bell-ring",     desc:"Alertas gerados pelas automações." },
    { tipo:"imagem",       nome:"Imagem",                icon:"image",        desc:"Foto, mapa ou print — por link ou upload." },
    { tipo:"grafico",      nome:"Gráfico de barras",      icon:"bar-chart-3",   desc:"Compare valores num gráfico simples." },
    { tipo:"texto",        nome:"Texto livre",            icon:"pencil",        desc:"Análise com links e formatação." }
  ];
  function catOf(t){ return CATALOGO.find(function(c){return c.tipo===t;})||{}; }

  function estudos(){ return window.SBSStore ? (window.SBSStore.getCol("mi_estudos")||[]) : []; }

  var draft=null, editId=null;

  function ensureRow(i,ri){ var b=draft.blocos[i]; b.dados=b.dados||[]; while(b.dados.length<=ri) b.dados.push({l:"",v:""}); return b.dados[ri]; }
  function readImg(file, cb){
    var fr=new FileReader();
    fr.onload=function(){
      var img=new Image();
      img.onload=function(){
        var max=1280, w=img.width, h=img.height;
        if(w>max){ h=Math.round(h*max/w); w=max; }
        var cv=document.createElement("canvas"); cv.width=w; cv.height=h;
        cv.getContext("2d").drawImage(img,0,0,w,h);
        try{ cb(cv.toDataURL("image/jpeg",0.85)); }catch(e){ cb(fr.result); }
      };
      img.onerror=function(){ cb(fr.result); };
      img.src=fr.result;
    };
    fr.readAsDataURL(file);
  }

  /* =================== SLIDES =================== */
  function esc(s){ return MI.esc(s); }
  function money(n){ return "R$ "+Number(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function varPct(at,ant){ var d=(+at||0)-(+ant||0); var p=ant?(d/ant*100):0; return { up:d>=0, txt:(d>=0?"+":"")+p.toFixed(1)+"%" }; }

  function shell(eyebrow,title,body,pageNo,total){
    return '<div class="es-slide">'+
      '<div class="es-band"></div>'+
      '<div class="es-head"><div><div class="es-eye">'+esc(eyebrow||"")+'</div><h2>'+esc(title||"")+'</h2></div>'+
        '<img class="es-logo" src="logo-sbs-white.png" alt="SBS"></div>'+
      '<div class="es-body">'+body+'</div>'+
      '<div class="es-foot"><span>SBS Green Seeds · Inteligência de Mercado</span><span>'+(pageNo||"")+(total?(" / "+total):"")+'</span></div>'+
    '</div>';
  }

  function slideCapa(st){
    return '<div class="es-slide es-cover">'+
      '<div class="es-band"></div>'+
      '<img class="es-cover-logo" src="logo-sbs-white.png" alt="SBS Green Seeds">'+
      '<div class="es-cover-eye">Estudo de Inteligência de Mercado</div>'+
      '<h1 class="es-cover-t">'+esc(st.titulo||"Estudo de Mercado")+'</h1>'+
      (st.objetivo?'<p class="es-cover-o">'+esc(st.objetivo)+'</p>':'')+
      '<div class="es-cover-m">'+(st.autor?('<span><i data-lucide="user"></i> '+esc(st.autor)+'</span>'):'')+
        '<span><i data-lucide="calendar"></i> '+MI.dateBR(st.data||new Date().toISOString().slice(0,10))+'</span></div>'+
    '</div>';
  }

  function bodyResumo(st){
    return '<div class="es-resumo"><i data-lucide="target"></i><p>'+esc(st.objetivo||"—")+'</p></div>';
  }
  function bodyCambio(){
    var fx=window.MI_LIVE&&MI_LIVE.data;
    if(!fx||fx.error) return '<div class="es-empty">Câmbio indisponível no momento.</div>';
    function card(l,o,extra){ var up=o.pct>=0; return '<div class="es-fxc"><div class="es-fxc-l">'+l+'</div><div class="es-fxc-v">'+money(o.v)+'</div>'+
      '<div class="es-fxc-p '+(up?'up':'down')+'">'+(up?'▲ +':'▼ ')+o.pct.toFixed(2)+'%</div>'+(extra||'')+'</div>'; }
    return '<div class="es-fx">'+card("Dólar comercial",fx.usd,'<div class="es-fxc-s">máx '+money(fx.usd.high)+' · mín '+money(fx.usd.low)+'</div>')+
      card("Euro",fx.eur,'')+'</div><div class="es-src">Fonte: AwesomeAPI · cotação ao vivo</div>';
  }
  function bodyCotacoes(){
    var ct=window.SBSStore?(window.SBSStore.getCol("mi_cotacoes")||[]):[];
    if(!ct.length) return '<div class="es-empty">Sem cotações cadastradas.</div>';
    return '<table class="es-tbl"><thead><tr><th>Produto</th><th>Praça</th><th class="r">Preço</th><th class="r">Variação</th><th>Fonte</th></tr></thead><tbody>'+
      ct.slice(0,9).map(function(c){ var v=varPct(c.preco,c.anterior); return '<tr><td class="b">'+esc(c.produto)+'</td><td>'+esc(c.praca||"—")+'</td><td class="r b">'+money(c.preco)+'</td><td class="r '+(v.up?'up':'down')+'">'+v.txt+'</td><td class="dim">'+esc(c.fonte||"")+'</td></tr>'; }).join("")+
      '</tbody></table>';
  }
  function bodyClima(){
    var snap=window.MI_CLIMA?MI_CLIMA.snapshot():[];
    if(!snap.length) return '<div class="es-empty">Abra a aba Clima & Safra para carregar os dados antes de gerar.</div>';
    return '<div class="es-clima">'+snap.filter(function(c){return !c.err;}).slice(0,6).map(function(c){
      var rk=MI_CLIMA.risco(c.rain7), w=MI_CLIMA.wmo(c.wmo);
      return '<div class="es-clic"><div class="es-clic-h"><i data-lucide="'+w.i+'"></i><div><b>'+esc(c.nome)+'/'+esc(c.uf||"")+'</b><span>'+esc(c.cultura||"")+'</span></div></div>'+
        '<div class="es-clic-t">'+(c.temp!=null?c.temp+'°':'—')+'</div>'+
        '<div class="es-clic-r" style="color:'+rk.c+'">'+rk.l+' · '+c.rain7+' mm/7d</div></div>';
    }).join("")+'</div>';
  }
  function bodyConcorrentes(){
    var cc=window.SBSStore?(window.SBSStore.getCol("mi_concorrentes")||[]):[];
    if(!cc.length) return '<div class="es-empty">Sem concorrentes cadastrados.</div>';
    return '<div class="es-cards2">'+cc.slice(0,4).map(function(c){
      return '<div class="es-c2"><div class="es-c2-t">'+esc(c.nome)+' <span class="es-pos">'+esc(c.posicao||"")+'</span></div>'+
        '<div class="es-c2-s">'+esc(c.segmento||"")+' · '+esc(c.regiao||"")+'</div>'+
        '<div class="es-c2-sw"><span class="up">＋ '+esc(c.forca||"—")+'</span><span class="down">－ '+esc(c.fraqueza||"—")+'</span></div></div>';
    }).join("")+'</div>';
  }
  function bodyRegioes(){
    var rg=window.SBSStore?(window.SBSStore.getCol("mi_regioes")||[]):[];
    if(!rg.length) return '<div class="es-empty">Sem regiões cadastradas.</div>';
    var max=Math.max.apply(null,rg.map(function(r){return +r.participacao||0;}).concat([1]));
    return '<div class="es-reg">'+rg.slice(0,6).map(function(r){
      var t={alta:["▲","#0B8A5E"],baixa:["▼","#b3261e"],estavel:["▬","#69756f"]}[r.tendencia]||["▬","#69756f"];
      return '<div class="es-regr"><div class="es-regr-h"><b>'+esc(r.regiao)+'</b><span style="color:'+t[1]+'">'+t[0]+' '+esc(r.cultura||"")+'</span></div>'+
        '<div class="es-regr-bar"><span style="width:'+Math.max(4,Math.round((+r.participacao||0)/max*100))+'%"></span></div>'+
        '<div class="es-regr-v">'+(r.participacao||0)+'% participação SBS · potencial '+esc(r.potencial||"—")+'</div></div>';
    }).join("")+'</div>';
  }
  function bodyTendencias(){
    var td=window.SBSStore?(window.SBSStore.getCol("mi_tendencias")||[]):[];
    if(!td.length) return '<div class="es-empty">Sem tendências cadastradas.</div>';
    var IMP={alto:"#b3261e",medio:"#C0710F",baixo:"#69756f"};
    return '<div class="es-tend">'+td.slice(0,4).map(function(t){
      return '<div class="es-tendr"><span class="es-tend-dot" style="background:'+(IMP[t.impacto]||"#69756f")+'"></span>'+
        '<div><div class="es-tendr-t">'+esc(t.titulo)+'</div><div class="es-tendr-x">'+esc(t.descricao||"")+'</div>'+
        '<div class="es-tendr-m">'+esc(t.categoria||"")+' · '+esc(t.horizonte||"")+'</div></div></div>';
    }).join("")+'</div>';
  }
  function bodyAlertas(){
    var al=window.MI_ALERTAS?MI_ALERTAS.alertas():[];
    if(!al.length) return '<div class="es-empty">Nenhum alerta gerado pelas automações.</div>';
    return '<div class="es-tend">'+al.slice(0,5).map(function(a){
      return '<div class="es-tendr"><span class="es-tend-dot" style="background:#0B6B61"></span>'+
        '<div><div class="es-tendr-t">'+esc(a.titulo)+'</div><div class="es-tendr-x">'+esc(a.descricao||"")+'</div>'+
        '<div class="es-tendr-m"><i data-lucide="zap"></i> '+esc(a.regraNome||"Automação")+' · '+MI.dateBR(a.data)+'</div></div></div>';
    }).join("")+'</div>';
  }
  function md(t){
    if(!t) return '';
    function inline(s){ s=esc(s);
      s=s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
      s=s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
      s=s.replace(/(^|[^*])\*([^*]+)\*/g,'$1<em>$2</em>');
      return s; }
    var html='', inList=false;
    String(t).split(/\n/).forEach(function(ln){
      if(/^\s*[-\u2022]\s+/.test(ln)){ if(!inList){ html+='<ul>'; inList=true; } html+='<li>'+inline(ln.replace(/^\s*[-\u2022]\s+/,''))+'</li>'; }
      else { if(inList){ html+='</ul>'; inList=false; } if(ln.trim()==='') html+=''; else html+='<p>'+inline(ln)+'</p>'; }
    });
    if(inList) html+='</ul>';
    return html;
  }
  function bodyTexto(b){
    return '<div class="es-texto">'+(b.corpo?md(b.corpo):'<span class="es-empty">—</span>')+'</div>';
  }
  function bodyImagem(b){
    if(!b.src) return '<div class="es-empty">Adicione uma imagem por link ou upload.</div>';
    return '<figure class="es-img"><img src="'+esc(b.src)+'" alt="">'+(b.caption?'<figcaption>'+esc(b.caption)+'</figcaption>':'')+'</figure>';
  }
  function bodyGrafico(b){
    var rows=(b.dados||[]).filter(function(r){ return r && r.l!=='' && r.l!=null && r.v!=='' && r.v!=null; });
    if(!rows.length) return '<div class="es-empty">Adicione itens (rótulo e valor) ao gráfico.</div>';
    var max=Math.max.apply(null,rows.map(function(r){ return Math.abs(+r.v)||0; }).concat([1]));
    return '<div class="es-chart">'+rows.map(function(r){
      var pct=Math.max(2,Math.round((Math.abs(+r.v)||0)/max*100));
      return '<div class="es-chart-row"><div class="es-chart-l">'+esc(r.l)+'</div><div class="es-chart-track"><span style="width:'+pct+'%"></span></div><div class="es-chart-v">'+esc(Number(r.v).toLocaleString("pt-BR"))+'</div></div>';
    }).join('')+'</div>';
  }

  function slideFor(b,st){
    var c=catOf(b.tipo), eye=c.nome||"", title=b.titulo||c.nome||"";
    switch(b.tipo){
      case "resumo":       return shell("Objetivo", b.titulo||"Objetivo do estudo", bodyResumo(st));
      case "cambio":       return shell("Macroeconomia · ao vivo", title, bodyCambio());
      case "cotacoes":     return shell("Cotações", title, bodyCotacoes());
      case "clima":        return shell("Clima & Safra", title, bodyClima());
      case "concorrentes": return shell("Concorrência", title, bodyConcorrentes());
      case "regioes":      return shell("Regiões & Mercado", title, bodyRegioes());
      case "tendencias":   return shell("Tendências", title, bodyTendencias());
      case "alertas":      return shell("Alertas automáticos", title, bodyAlertas());
      case "imagem":       return shell(b.eyebrow||"Imagem", b.titulo||"Imagem", bodyImagem(b));
      case "grafico":      return shell("Gráfico", b.titulo||"Gráfico", bodyGrafico(b));
      case "texto":        return shell(b.eyebrow||"Análise", b.titulo||"Análise", bodyTexto(b));
    }
    return shell(eye,title,"");
  }

  function buildSlides(st){
    var arr=[ slideCapa(st) ];
    (st.blocos||[]).forEach(function(b){ arr.push(slideFor(b,st)); });
    return arr;
  }

  /* =================== APRESENTAÇÃO (overlay) =================== */
  function present(st){
    injectCss();
    var slides=buildSlides(st), i=0;
    var ov=document.createElement("div"); ov.id="es-overlay";
    ov.innerHTML=
      '<div class="es-stage"><div class="es-canvas" id="es-canvas"></div></div>'+
      '<div class="es-ctrl">'+
        '<button class="es-cbtn" id="es-prev"><i data-lucide="chevron-left"></i></button>'+
        '<span class="es-counter" id="es-counter"></span>'+
        '<button class="es-cbtn" id="es-next"><i data-lucide="chevron-right"></i></button>'+
        '<div class="es-ctrl-sp"></div>'+
        '<button class="es-cbtn wide" id="es-print"><i data-lucide="printer"></i> PDF</button>'+
        '<button class="es-cbtn wide" id="es-close"><i data-lucide="x"></i> Fechar</button>'+
      '</div>'+
      '<div id="es-print-area"></div>';
    document.body.appendChild(ov);
    var canvas=ov.querySelector("#es-canvas"), counter=ov.querySelector("#es-counter");
    var stage=ov.querySelector(".es-stage");
    ov.querySelector("#es-print-area").innerHTML=slides.map(function(h){ return '<div class="es-pslide">'+h+'</div>'; }).join("");
    function fit(){
      var pad=touchUI()?16:40;
      var sc=Math.min((stage.clientWidth-pad)/1280,(stage.clientHeight-pad-70)/720);
      canvas.style.transform="scale("+Math.max(.1,sc)+")";
    }
    function touchUI(){ return window.innerWidth<700; }
    function show(){ canvas.innerHTML=slides[i]; counter.textContent=(i+1)+" / "+slides.length; window.lucide&&lucide.createIcons(); fit(); }
    ov.querySelector("#es-prev").onclick=function(){ i=(i-1+slides.length)%slides.length; show(); };
    ov.querySelector("#es-next").onclick=function(){ i=(i+1)%slides.length; show(); };
    ov.querySelector("#es-close").onclick=close;
    ov.querySelector("#es-print").onclick=function(){ window.print(); };
    function key(e){ if(e.key==="ArrowRight"||e.key===" ") ov.querySelector("#es-next").click(); else if(e.key==="ArrowLeft") ov.querySelector("#es-prev").click(); else if(e.key==="Escape") close(); }
    function close(){ document.removeEventListener("keydown",key); window.removeEventListener("resize",fit); ov.remove(); }
    document.addEventListener("keydown",key); window.addEventListener("resize",fit);
    show();
  }

  /* =================== MÓDULO =================== */
  function register(){
    if(!window.MI) return;
    var M=MI.Modules, S=MI.S;

    M.estudos = {
      label:"Estudos & Apresentações",
      render(){
        if(editId) return editorHtml();
        var es=estudos();
        return ''+
        '<div class="mc-toolbar"><div class="mc-sub">'+es.length+' estudo(s) salvo(s)</div>'+
          '<button class="mc-btn primary" id="es-new"><i data-lucide="plus"></i> Novo estudo</button></div>'+
        (es.length? '<div class="mc-cards">'+es.map(function(s){
          return '<div class="mc-ccard" data-es="'+s.id+'">'+
            '<div class="mc-ccard-top"><span class="mc-ccard-verba"><i data-lucide="presentation"></i> '+((s.blocos||[]).length+1)+' slides</span><span class="mi-td-date">'+MI.dateBR(s.data)+'</span></div>'+
            '<div class="mc-ccard-t">'+esc(s.titulo||"Sem título")+'</div>'+
            '<div class="mc-ccard-d">'+esc(s.objetivo||"Sem objetivo definido.")+'</div>'+
            '<div style="display:flex;gap:8px;margin-top:4px"><button class="mc-btn primary" data-present="'+s.id+'"><i data-lucide="play"></i> Apresentar</button><button class="mc-btn ghost" data-edit="'+s.id+'"><i data-lucide="pencil"></i> Editar</button></div>'+
          '</div>';
        }).join("")+'</div>'
        : '<div class="mc-empty big"><i data-lucide="presentation"></i><div>Nenhum estudo ainda. Monte um estudo escolhendo os blocos e gere uma apresentação pronta para projetar ou exportar em PDF.</div><button class="mc-btn primary" id="es-new2"><i data-lucide="plus"></i> Criar primeiro estudo</button></div>')+
        '<div class="mc-note"><i data-lucide="lightbulb"></i> Dica: abra <b>Clima & Safra</b> uma vez antes de apresentar para que os dados de clima já estejam carregados nos slides.</div>';
      },
      mount(c){
        injectCss();
        if(editId){ mountEditor(c); return; }
        var nb=c.querySelector("#es-new")||c.querySelector("#es-new2"); if(nb) nb.addEventListener("click",function(){ openEditor(null); });
        c.querySelectorAll("[data-present]").forEach(function(b){ b.addEventListener("click",function(e){ e.stopPropagation(); var s=estudos().find(function(x){return x.id===b.dataset.present;}); if(s) present(s); }); });
        c.querySelectorAll("[data-edit]").forEach(function(b){ b.addEventListener("click",function(e){ e.stopPropagation(); openEditor(b.dataset.edit); }); });
        c.querySelectorAll("[data-es]").forEach(function(card){ card.addEventListener("click",function(){ openEditor(card.dataset.es); }); });
      }
    };

    function openEditor(id){
      if(id){ var s=estudos().find(function(x){return x.id===id;}); draft=s?JSON.parse(JSON.stringify(s)):null; editId=id; }
      else { draft={ id:null, titulo:"", objetivo:"", autor:(MI.session&&MI.session.nome)||"", data:new Date().toISOString().slice(0,10), blocos:[{tipo:"resumo"}] }; editId="new"; }
      MI.refresh();
    }
    function closeEditor(){ editId=null; draft=null; MI.refresh(); }

    function editorHtml(){
      var d=draft||{blocos:[]};
      return ''+
      '<div class="mc-toolbar"><div style="display:flex;align-items:center;gap:10px"><button class="mc-btn ghost" id="ed-back"><i data-lucide="arrow-left"></i> Voltar</button><div class="mc-sub">'+(editId==="new"?"Novo estudo":"Editando estudo")+'</div></div>'+
        '<div style="display:flex;gap:8px"><button class="mc-btn ghost" id="ed-present"><i data-lucide="play"></i> Pré-visualizar</button><button class="mc-btn primary" id="ed-save"><i data-lucide="save"></i> Salvar</button></div></div>'+
      '<div class="ed-grid">'+
        '<div class="ed-form">'+
          '<div class="mc-card"><div class="mc-card-h"><i data-lucide="file-text"></i> Capa do estudo</div>'+
            '<div class="fld"><label>Título</label><input id="ed-tit" value="'+esc(d.titulo||"")+'" placeholder="Ex.: Panorama da soja — safra 26/27"></div>'+
            '<div class="fld"><label>Objetivo</label><textarea id="ed-obj" placeholder="O que este estudo quer mostrar...">'+esc(d.objetivo||"")+'</textarea></div>'+
            '<div class="fld-row"><div class="fld"><label>Autor</label><input id="ed-aut" value="'+esc(d.autor||"")+'"></div>'+
              '<div class="fld"><label>Data</label><input id="ed-data" type="date" value="'+esc(d.data||"")+'"></div></div>'+
          '</div>'+
          '<div class="mc-card"><div class="mc-card-h"><i data-lucide="layout-list"></i> Blocos do estudo</div>'+
            '<div id="ed-blocos"></div></div>'+
        '</div>'+
        '<div class="ed-side"><div class="mc-card"><div class="mc-card-h"><i data-lucide="plus-circle"></i> Adicionar bloco</div>'+
          '<div class="ed-cat">'+CATALOGO.map(function(c){ return '<button class="ed-catb" data-add="'+c.tipo+'"><span class="ed-catb-ic"><i data-lucide="'+c.icon+'"></i></span><span><b>'+c.nome+'</b><small>'+c.desc+'</small></span><i data-lucide="plus" class="ed-catb-plus"></i></button>'; }).join("")+'</div>'+
        '</div></div>'+
      '</div>';
    }

    function blocosHtml(){
      var d=draft||{blocos:[]};
      if(!d.blocos.length) return '<div class="mc-empty">Adicione blocos pela lista ao lado →</div>';
      return d.blocos.map(function(b,idx){
        var c=catOf(b.tipo);
        var extra="";
        if(b.tipo==="texto"){
          extra='<div class="ed-bl-edit"><input class="ed-bl-tit" data-bt="'+idx+'" value="'+esc(b.titulo||"")+'" placeholder="Título do slide"><textarea class="ed-bl-body" data-bb="'+idx+'" placeholder="Escreva a análise...">'+esc(b.corpo||"")+'</textarea><div class="ed-hint"><b>Formatação:</b> **negrito** · *itálico* · [texto do link](https://...) · comece a linha com “- ” para lista.</div></div>';
        } else if(b.tipo==="imagem"){
          extra='<div class="ed-bl-edit"><input class="ed-bl-tit" data-bt="'+idx+'" value="'+esc(b.titulo||"")+'" placeholder="Título do slide (opcional)">'+
            (b.src?'<img class="ed-img-prev" src="'+esc(b.src)+'" alt="">':'')+
            '<input class="ed-bl-tit" data-img-url="'+idx+'" value="'+(b.src&&b.src.indexOf("data:")!==0?esc(b.src):"")+'" placeholder="Cole o link da imagem (https://...)">'+
            '<div class="ed-img-acts"><label class="ed-up"><i data-lucide="upload"></i> Enviar do dispositivo<input type="file" accept="image/*" data-img-file="'+idx+'" hidden></label>'+(b.src?'<button class="ed-img-clr" data-img-clr="'+idx+'">Remover imagem</button>':'')+'</div>'+
            '<input class="ed-bl-tit" data-img-cap="'+idx+'" value="'+esc(b.caption||"")+'" placeholder="Legenda (opcional)"></div>';
        } else if(b.tipo==="grafico"){
          extra='<div class="ed-bl-edit"><input class="ed-bl-tit" data-bt="'+idx+'" value="'+esc(b.titulo||"")+'" placeholder="Título do gráfico">'+
            '<div class="ed-chart-rows">'+((b.dados||[]).map(function(r,ri){ return '<div class="ed-chart-row"><input data-gl="'+idx+'-'+ri+'" value="'+esc(r.l||"")+'" placeholder="Rótulo"><input data-gv="'+idx+'-'+ri+'" type="number" value="'+(r.v!=null&&r.v!==''?esc(String(r.v)):"")+'" placeholder="Valor"><button data-grm="'+idx+'-'+ri+'" class="ed-chart-rm"><i data-lucide="x"></i></button></div>'; }).join(''))+'</div>'+
            '<div class="ed-chart-tools"><button class="mc-link" data-gadd="'+idx+'"><i data-lucide="plus"></i> Adicionar item</button><button class="mc-link" data-gcot="'+idx+'"><i data-lucide="download"></i> Puxar das cotações</button></div></div>';
        } else if(b.tipo!=="resumo"){
          extra='<div class="ed-bl-edit"><input class="ed-bl-tit" data-bt="'+idx+'" value="'+esc(b.titulo||"")+'" placeholder="Título do slide (opcional) — padrão: '+esc(c.nome)+'"></div>';
        }
        return '<div class="ed-bl"><div class="ed-bl-h"><span class="ed-bl-ic"><i data-lucide="'+(c.icon||"square")+'"></i></span>'+
          '<span class="ed-bl-n">'+esc(c.nome)+'</span>'+
          '<div class="ed-bl-acts"><button data-up="'+idx+'" '+(idx===0?'disabled':'')+'><i data-lucide="chevron-up"></i></button>'+
          '<button data-down="'+idx+'" '+(idx===d.blocos.length-1?'disabled':'')+'><i data-lucide="chevron-down"></i></button>'+
          '<button data-rm="'+idx+'" class="rm"><i data-lucide="trash-2"></i></button></div></div>'+extra+'</div>';
      }).join("");
    }

    function mountEditor(c){
      var box=c.querySelector("#ed-blocos");
      function syncCapa(){
        if(!draft) return;
        var g=function(id){ var e=c.querySelector(id); return e?e.value:""; };
        draft.titulo=g("#ed-tit"); draft.objetivo=g("#ed-obj"); draft.autor=g("#ed-aut"); draft.data=g("#ed-data");
      }
      function redraw(){ box.innerHTML=blocosHtml(); window.lucide&&lucide.createIcons(); wireBlocos(); }
      function wireBlocos(){
        box.querySelectorAll("[data-up]").forEach(function(b){ b.addEventListener("click",function(){ var i=+b.dataset.up; var a=draft.blocos; var t=a[i-1]; a[i-1]=a[i]; a[i]=t; redraw(); }); });
        box.querySelectorAll("[data-down]").forEach(function(b){ b.addEventListener("click",function(){ var i=+b.dataset.down; var a=draft.blocos; var t=a[i+1]; a[i+1]=a[i]; a[i]=t; redraw(); }); });
        box.querySelectorAll("[data-rm]").forEach(function(b){ b.addEventListener("click",function(){ draft.blocos.splice(+b.dataset.rm,1); redraw(); }); });
        box.querySelectorAll("[data-bt]").forEach(function(inp){ inp.addEventListener("input",function(){ draft.blocos[+inp.dataset.bt].titulo=inp.value; }); });
        box.querySelectorAll("[data-bb]").forEach(function(t){ t.addEventListener("input",function(){ draft.blocos[+t.dataset.bb].corpo=t.value; }); });
        box.querySelectorAll("[data-img-url]").forEach(function(inp){ inp.addEventListener("input",function(){ draft.blocos[+inp.dataset.imgUrl].src=inp.value.trim(); }); });
        box.querySelectorAll("[data-img-cap]").forEach(function(inp){ inp.addEventListener("input",function(){ draft.blocos[+inp.dataset.imgCap].caption=inp.value; }); });
        box.querySelectorAll("[data-img-clr]").forEach(function(b){ b.addEventListener("click",function(){ draft.blocos[+b.dataset.imgClr].src=""; redraw(); }); });
        box.querySelectorAll("[data-img-file]").forEach(function(inp){ inp.addEventListener("change",function(){ var f=inp.files&&inp.files[0]; if(!f) return; MI.toast("Processando imagem…"); readImg(f,function(u){ draft.blocos[+inp.dataset.imgFile].src=u; redraw(); }); }); });
        box.querySelectorAll("[data-gl]").forEach(function(inp){ inp.addEventListener("input",function(){ var p=inp.dataset.gl.split("-"); ensureRow(+p[0],+p[1]).l=inp.value; }); });
        box.querySelectorAll("[data-gv]").forEach(function(inp){ inp.addEventListener("input",function(){ var p=inp.dataset.gv.split("-"); ensureRow(+p[0],+p[1]).v=(inp.value===''?'':(+inp.value)); }); });
        box.querySelectorAll("[data-grm]").forEach(function(b){ b.addEventListener("click",function(){ var p=b.dataset.grm.split("-"); draft.blocos[+p[0]].dados.splice(+p[1],1); redraw(); }); });
        box.querySelectorAll("[data-gadd]").forEach(function(b){ b.addEventListener("click",function(){ var i=+b.dataset.gadd; draft.blocos[i].dados=draft.blocos[i].dados||[]; draft.blocos[i].dados.push({l:"",v:""}); redraw(); }); });
        box.querySelectorAll("[data-gcot]").forEach(function(b){ b.addEventListener("click",function(){ var i=+b.dataset.gcot; var ct=(window.SBSStore.getCol("mi_cotacoes")||[]).slice(0,6); draft.blocos[i].dados=ct.map(function(c){ return {l:c.produto,v:+c.preco||0}; }); MI.toast("Cotações importadas"); redraw(); }); });
      }
      redraw();
      c.querySelector("#ed-back").addEventListener("click",closeEditor);
      c.querySelectorAll("[data-add]").forEach(function(b){ b.addEventListener("click",function(){ var t=b.dataset.add; var nb = t==="texto"?{tipo:"texto",titulo:"",corpo:""} : t==="imagem"?{tipo:"imagem",titulo:"",src:"",caption:""} : t==="grafico"?{tipo:"grafico",titulo:"",dados:[{l:"",v:""},{l:"",v:""}]} : {tipo:t}; draft.blocos.push(nb); redraw(); }); });
      c.querySelector("#ed-present").addEventListener("click",function(){ syncCapa(); present(draft); });
      c.querySelector("#ed-save").addEventListener("click",function(){
        syncCapa();
        if(!draft.titulo){ MI.toast("Dê um título ao estudo"); return; }
        if(editId==="new"){ var rec=Object.assign({id:"es"+Date.now()},draft); delete rec.id_; S.add("mi_estudos",rec); }
        else S.update("mi_estudos",editId,draft);
        MI.toast("Estudo salvo"); editId=null; draft=null; MI.refresh();
      });
    }
  }

  function injectCss(){
    if(document.getElementById("mi-estudos-css")) return;
    var s=document.createElement("style"); s.id="mi-estudos-css";
    s.textContent=
      /* editor */
      '.ed-grid{display:grid;grid-template-columns:1.6fr 1fr;gap:18px;align-items:start}'+
      '.ed-cat{display:flex;flex-direction:column;gap:8px}'+
      '.ed-catb{display:flex;align-items:center;gap:11px;width:100%;text-align:left;border:1px solid var(--line,#e7ebe9);background:var(--card,#fff);border-radius:12px;padding:10px 12px;cursor:pointer;font-family:inherit}'+
      '.ed-catb:hover{border-color:#9fc4ba;background:#F4FAF8}'+
      '.ed-catb-ic{width:32px;height:32px;border-radius:9px;background:#E9F3EF;color:#0B6B61;display:grid;place-items:center;flex:0 0 auto}.ed-catb-ic i{width:16px;height:16px}'+
      '.ed-catb b{display:block;font-size:13px;font-weight:700;color:var(--ink,#16201a)}.ed-catb small{font-size:11px;color:var(--muted,#8a948f)}'+
      '.ed-catb span:nth-child(2){flex:1;min-width:0}.ed-catb-plus{width:15px;height:15px;color:#0B6B61;flex:0 0 auto}'+
      '.ed-bl{border:1px solid var(--line,#e7ebe9);border-radius:12px;padding:11px 12px;margin-bottom:10px;background:#fafdfc}'+
      '.ed-bl-h{display:flex;align-items:center;gap:10px}'+
      '.ed-bl-ic{width:30px;height:30px;border-radius:8px;background:#E9F3EF;color:#0B6B61;display:grid;place-items:center;flex:0 0 auto}.ed-bl-ic i{width:15px;height:15px}'+
      '.ed-bl-n{flex:1;font-size:13.5px;font-weight:700;color:var(--ink,#16201a)}'+
      '.ed-bl-acts{display:flex;gap:3px}'+
      '.ed-bl-acts button{border:1px solid var(--line,#e7ebe9);background:#fff;border-radius:8px;width:28px;height:28px;display:grid;place-items:center;cursor:pointer;color:#69756f}'+
      '.ed-bl-acts button:disabled{opacity:.35;cursor:default}.ed-bl-acts button.rm:hover{color:#b3261e;border-color:#e6b8b4}.ed-bl-acts i{width:14px;height:14px}'+
      '.ed-bl-edit{margin-top:9px;display:flex;flex-direction:column;gap:7px}'+
      '.ed-bl-tit{width:100%;border:1px solid var(--line,#e7ebe9);border-radius:9px;padding:8px 10px;font-family:inherit;font-size:13px}'+
      '.ed-bl-body{width:100%;border:1px solid var(--line,#e7ebe9);border-radius:9px;padding:8px 10px;font-family:inherit;font-size:13px;min-height:64px;resize:vertical}'+
      '@media(max-width:1000px){.ed-grid{grid-template-columns:1fr}}'+
      '.ed-hint{font-size:11px;color:var(--muted,#8a948f);line-height:1.5;background:#F4FAF8;border-radius:8px;padding:7px 10px}'+
      '.ed-img-prev{max-width:100%;max-height:160px;border-radius:10px;border:1px solid var(--line,#e7ebe9);object-fit:contain}'+
      '.ed-img-acts{display:flex;gap:14px;align-items:center}'+
      '.ed-up{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:#0B6B61;cursor:pointer}.ed-up i{width:14px;height:14px}'+
      '.ed-img-clr{border:0;background:none;color:#b3261e;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit}'+
      '.ed-chart-rows{display:flex;flex-direction:column;gap:6px}'+
      '.ed-chart-row{display:flex;gap:6px}'+
      '.ed-chart-row input{border:1px solid var(--line,#e7ebe9);border-radius:8px;padding:8px 10px;font-family:inherit;font-size:12.5px}'+
      '.ed-chart-row input:first-child{flex:1;min-width:0}.ed-chart-row input[type=number]{width:96px;flex:0 0 auto}'+
      '.ed-chart-rm{border:1px solid var(--line,#e7ebe9);background:#fff;border-radius:8px;width:32px;flex:0 0 auto;cursor:pointer;color:#b3261e;display:grid;place-items:center}.ed-chart-rm i{width:13px;height:13px}'+
      '.ed-chart-tools{display:flex;gap:18px;margin-top:9px}.ed-chart-tools .mc-link{display:inline-flex;align-items:center;gap:5px}.ed-chart-tools i{width:13px;height:13px}'+
      /* overlay deck */
      '#es-overlay{position:fixed;inset:0;z-index:9999;background:#0a1512;display:flex;flex-direction:column}'+
      '.es-stage{flex:1;display:grid;place-items:center;overflow:hidden}'+
      '.es-canvas{width:1280px;height:720px;flex:0 0 auto;transform-origin:center;box-shadow:0 30px 90px rgba(0,0,0,.5)}'+
      '.es-ctrl{display:flex;align-items:center;gap:10px;padding:12px 18px;background:#0a1512;border-top:1px solid rgba(255,255,255,.08)}'+
      '.es-ctrl-sp{flex:1}'+
      '.es-cbtn{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;border-radius:10px;height:40px;min-width:40px;padding:0 12px;cursor:pointer;font-family:inherit;font-size:14px;font-weight:700;justify-content:center}'+
      '.es-cbtn:hover{background:rgba(255,255,255,.14)}.es-cbtn i{width:18px;height:18px}'+
      '.es-counter{color:#cfe3dd;font-size:13px;font-weight:700;min-width:60px;text-align:center}'+
      /* slide */
      '.es-slide{width:1280px;height:720px;background:#fff;position:relative;overflow:hidden;font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#16201a;box-sizing:border-box}'+
      '.es-band{position:absolute;left:0;top:0;width:100%;height:10px;background:linear-gradient(90deg,#0B6B61,#6FA331)}'+
      '.es-head{display:flex;align-items:flex-start;justify-content:space-between;padding:48px 64px 0}'+
      '.es-eye{font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#0B6B61;margin-bottom:6px}'+
      '.es-head h2{font-size:38px;font-weight:800;line-height:1.1;max-width:920px}'+
      '.es-logo{height:34px;opacity:.9;filter:brightness(0) saturate(100%) invert(28%) sepia(18%) saturate(1600%) hue-rotate(118deg) brightness(92%) contrast(92%)}'+
      '.es-body{padding:30px 64px;height:560px;overflow:hidden}'+
      '.es-foot{position:absolute;bottom:0;left:0;width:100%;display:flex;justify-content:space-between;padding:18px 64px;font-size:13px;color:#8a948f;font-weight:600;border-top:1px solid #eef1f0}'+
      /* cover */
      '.es-cover{display:flex;flex-direction:column;justify-content:center;padding:0 90px;background:radial-gradient(circle at 80% 10%,#0E9B8E22,transparent 55%)}'+
      '.es-cover-logo{height:46px;align-self:flex-start;margin-bottom:40px;filter:brightness(0) saturate(100%) invert(28%) sepia(18%) saturate(1600%) hue-rotate(118deg) brightness(92%) contrast(92%)}'+
      '.es-cover-eye{font-size:17px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#0B6B61;margin-bottom:14px}'+
      '.es-cover-t{font-size:62px;font-weight:800;line-height:1.05;max-width:1000px;letter-spacing:-.01em}'+
      '.es-cover-o{font-size:22px;color:#46514c;line-height:1.5;max-width:840px;margin-top:22px}'+
      '.es-cover-m{display:flex;gap:26px;margin-top:46px;font-size:16px;color:#5b6b65;font-weight:700}.es-cover-m span{display:flex;align-items:center;gap:8px}.es-cover-m i{width:18px;height:18px;color:#0B6B61}'+
      /* body blocks */
      '.es-empty{font-size:18px;color:#8a948f;padding:30px 0}'+
      '.es-resumo{display:flex;gap:20px;align-items:flex-start;background:#F4FAF8;border-radius:18px;padding:34px 38px}'+
      '.es-resumo i{width:40px;height:40px;color:#0B6B61;flex:0 0 auto}.es-resumo p{font-size:27px;line-height:1.45;font-weight:600;color:#22302b}'+
      '.es-fx{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:760px}'+
      '.es-fxc{background:#F4FAF8;border-radius:18px;padding:30px 34px}'+
      '.es-fxc-l{font-size:17px;font-weight:800;color:#5b6b65;text-transform:uppercase;letter-spacing:.04em}'+
      '.es-fxc-v{font-size:50px;font-weight:800;margin-top:8px}'+
      '.es-fxc-p{font-size:20px;font-weight:800;margin-top:4px}.es-fxc-p.up{color:#0B8A5E}.es-fxc-p.down{color:#b3261e}'+
      '.es-fxc-s{font-size:15px;color:#8a948f;margin-top:10px}'+
      '.es-src{font-size:14px;color:#a4adA8;margin-top:18px}'+
      '.es-tbl{width:100%;border-collapse:collapse;font-size:19px}'+
      '.es-tbl th{text-align:left;font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#8a948f;padding:0 14px 12px;border-bottom:2px solid #eef1f0}'+
      '.es-tbl td{padding:13px 14px;border-bottom:1px solid #f0f3f2}.es-tbl .r{text-align:right}.es-tbl .b{font-weight:800}.es-tbl .dim{color:#8a948f;font-size:15px}.es-tbl .up{color:#0B8A5E;font-weight:800}.es-tbl .down{color:#b3261e;font-weight:800}'+
      '.es-clima{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}'+
      '.es-clic{background:#F4FAF8;border-radius:16px;padding:20px 22px}'+
      '.es-clic-h{display:flex;align-items:center;gap:12px}.es-clic-h i{width:30px;height:30px;color:#0B6B61}.es-clic-h b{font-size:18px;font-weight:800;display:block}.es-clic-h span{font-size:13px;color:#8a948f}'+
      '.es-clic-t{font-size:42px;font-weight:800;margin-top:8px}.es-clic-r{font-size:15px;font-weight:800;margin-top:2px}'+
      '.es-cards2{display:grid;grid-template-columns:1fr 1fr;gap:18px}'+
      '.es-c2{background:#F4FAF8;border-radius:16px;padding:22px 26px}'+
      '.es-c2-t{font-size:23px;font-weight:800;display:flex;align-items:center;gap:10px}.es-pos{font-size:13px;font-weight:800;color:#2A4A7F;background:#E5EDF7;padding:3px 10px;border-radius:20px}'+
      '.es-c2-s{font-size:15px;color:#69756f;margin-top:3px}'+
      '.es-c2-sw{display:flex;flex-direction:column;gap:5px;margin-top:14px;font-size:16px;font-weight:600}.es-c2-sw .up{color:#0B8A5E}.es-c2-sw .down{color:#b3261e}'+
      '.es-reg{display:flex;flex-direction:column;gap:16px}'+
      '.es-regr-h{display:flex;justify-content:space-between;font-size:19px}.es-regr-h b{font-weight:800}.es-regr-h span{font-weight:800}'+
      '.es-regr-bar{height:12px;background:#eef1f0;border-radius:7px;overflow:hidden;margin:7px 0 5px}.es-regr-bar span{display:block;height:100%;background:#0B6B61;border-radius:7px}'+
      '.es-regr-v{font-size:14px;color:#69756f}'+
      '.es-tend{display:flex;flex-direction:column;gap:16px}'+
      '.es-tendr{display:flex;gap:14px}.es-tend-dot{width:13px;height:13px;border-radius:50%;margin-top:7px;flex:0 0 auto}'+
      '.es-tendr-t{font-size:21px;font-weight:800}.es-tendr-x{font-size:16px;color:#46514c;line-height:1.45;margin-top:3px}.es-tendr-m{font-size:13px;color:#8a948f;font-weight:700;margin-top:5px;display:flex;align-items:center;gap:6px}.es-tendr-m i{width:13px;height:13px}'+
      '.es-texto{font-size:24px;line-height:1.6;color:#22302b}'+
      '.es-texto p{margin:0 0 12px}.es-texto ul{margin:0 0 12px 28px}.es-texto li{margin:5px 0}.es-texto a{color:#0B6B61;font-weight:700;text-decoration:underline}.es-texto strong{font-weight:800}'+
      '.es-img{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;margin:0}'+
      '.es-img img{max-width:100%;max-height:430px;object-fit:contain;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.12)}'+
      '.es-img figcaption{font-size:17px;color:#69756f;margin-top:16px;text-align:center}'+
      '.es-chart{display:flex;flex-direction:column;gap:20px;padding-top:8px}'+
      '.es-chart-row{display:flex;align-items:center;gap:18px}'+
      '.es-chart-l{width:280px;font-size:19px;font-weight:700;text-align:right;flex:0 0 auto;color:#22302b}'+
      '.es-chart-track{flex:1;height:32px;background:#eef1f0;border-radius:9px;overflow:hidden}'+
      '.es-chart-track span{display:block;height:100%;background:linear-gradient(90deg,#0B6B61,#6FA331);border-radius:9px}'+
      '.es-chart-v{width:130px;font-size:21px;font-weight:800;color:#0B6B61;flex:0 0 auto}'+
      '#es-print-area{display:none}'+
      '@media print{body>*{display:none!important}#es-overlay{display:block!important;position:static;background:#fff}.es-stage,.es-ctrl{display:none!important}#es-print-area{display:block!important}.es-pslide{page-break-after:always;break-after:page}.es-pslide .es-slide{box-shadow:none}@page{size:1280px 720px;margin:0}}';
    document.head.appendChild(s);
  }

  return { register:register, present:present, CATALOGO:CATALOGO };
})();
if(window.MI && window.MI_ESTUDOS) MI_ESTUDOS.register();
