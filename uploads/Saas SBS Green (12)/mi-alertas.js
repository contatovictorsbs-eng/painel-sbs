/* ===========================================================
   SBS Inteligência de Mercado — AUTOMAÇÕES & ALERTAS
   Motor de regras que observa cotações, câmbio (ao vivo) e clima,
   e gera alertas automaticamente. Regras de alto impacto podem
   virar Tendências sozinhas. Coleções: mi_regras, mi_alertas.
   =========================================================== */
window.MI_ALERTAS = (function(){
  var IMP = { alto:{l:"Alto",c:"#b3261e",bg:"#FDE8E6"}, medio:{l:"Médio",c:"#C0710F",bg:"#FBEFE0"}, baixo:{l:"Baixo",c:"#69756f",bg:"#EEF1F0"} };
  var TIPOS = {
    cotacao_var: { label:"Variação de cotação", icon:"trending-up-down", cat:"Cotação" },
    cambio:      { label:"Câmbio (dólar/euro)", icon:"dollar-sign",       cat:"Macroeconomia" },
    clima_chuva: { label:"Chuva por praça",      icon:"cloud-rain",        cat:"Clima" }
  };

  function regras(){ return window.SBSStore ? (window.SBSStore.getCol("mi_regras")||[]) : []; }
  function alertas(){ return window.SBSStore ? (window.SBSStore.getCol("mi_alertas")||[]) : []; }
  function hojeISO(){ return new Date().toISOString().slice(0,10); }

  /* ---------------- AVALIAÇÃO DAS REGRAS ---------------- */
  function evalRegra(r){
    // retorna {sig, titulo, descricao} se disparou, senão null
    var S=window.SBSStore; if(!S) return null;
    if(r.tipo==="cotacao_var"){
      var ct=S.getCol("mi_cotacoes")||[];
      var lim=+r.pct||5;
      var hits=ct.filter(function(c){
        if(r.alvo && r.alvo!=="*" && !(new RegExp(r.alvo,"i")).test(c.produto)) return false;
        var ant=+c.anterior||0; if(!ant) return false;
        var pct=((+c.preco-ant)/ant)*100;
        if(r.direcao==="alta") return pct>=lim;
        if(r.direcao==="baixa") return pct<=-lim;
        return Math.abs(pct)>=lim;
      }).map(function(c){
        var pct=(((+c.preco-(+c.anterior||0))/(+c.anterior||1))*100);
        return { nome:c.produto, pct:pct, preco:c.preco, praca:c.praca };
      });
      if(!hits.length) return null;
      var top=hits.sort(function(a,b){return Math.abs(b.pct)-Math.abs(a.pct);})[0];
      return {
        sig:"cot:"+top.nome+":"+(top.pct>=0?"+":"")+top.pct.toFixed(1),
        titulo:top.nome+": "+(top.pct>=0?"alta de +":"queda de ")+top.pct.toFixed(1)+"%",
        descricao:(hits.length>1?hits.length+" cotações cruzaram o limite de "+lim+"%. Destaque: ":"")+top.nome+" em "+(top.praca||"")+" a R$ "+(+top.preco).toLocaleString("pt-BR")+" ("+(top.pct>=0?"+":"")+top.pct.toFixed(1)+"% vs. anterior)."
      };
    }
    if(r.tipo==="cambio"){
      var fx=window.MI_LIVE&&MI_LIVE.data; if(!fx||fx.error) return null;
      var moeda=r.moeda==="eur"?fx.eur:fx.usd; if(!moeda) return null;
      var val=+moeda.v, lim2=+r.valor||0;
      var bate = r.operador==="acima" ? val>=lim2 : val<=lim2;
      if(!bate) return null;
      var nome=r.moeda==="eur"?"Euro":"Dólar";
      return {
        sig:"fx:"+r.moeda+":"+r.operador+":"+lim2,
        titulo:nome+" "+(r.operador==="acima"?"acima de":"abaixo de")+" R$ "+lim2.toLocaleString("pt-BR",{minimumFractionDigits:2}),
        descricao:nome+" comercial a R$ "+val.toLocaleString("pt-BR",{minimumFractionDigits:2})+" — cruzou o limite definido. Impacta custo de insumos e poder de compra do produtor."
      };
    }
    if(r.tipo==="clima_chuva"){
      var snap=window.MI_CLIMA?MI_CLIMA.snapshot():[]; if(!snap.length) return null;
      var mm=+r.mm||10;
      var hits3=snap.filter(function(c){
        if(c.err) return false;
        if(r.alvo && r.alvo!=="*" && !(new RegExp(r.alvo,"i")).test(c.nome+" "+(c.uf||""))) return false;
        return r.operador==="abaixo" ? c.rain7<=mm : c.rain7>=mm;
      });
      if(!hits3.length) return null;
      var nomes=hits3.map(function(c){return c.nome+"/"+(c.uf||"");});
      return {
        sig:"cl:"+r.operador+":"+mm+":"+nomes.join(","),
        titulo:(r.operador==="abaixo"?"Chuva baixa":"Excesso de chuva")+" em "+hits3.length+" praça(s)",
        descricao:(r.operador==="abaixo"?"Acumulado de chuva ≤ ":"Acumulado de chuva ≥ ")+mm+" mm em 7 dias: "+nomes.join(", ")+". "+(r.operador==="abaixo"?"Risco para germinação/desenvolvimento — atenção ao posicionamento de cultivares.":"Atenção a plantio e logística nessas regiões.")
      };
    }
    return null;
  }

  /* ---------------- EXECUÇÃO ---------------- */
  function run(){
    var S=window.SBSStore; if(!S) return 0;
    var rs=regras().filter(function(r){ return r.ativo!==false; });
    var al=alertas();
    var novos=0;
    rs.forEach(function(r){
      var res=evalRegra(r);
      if(!res) return;
      var key=r.id+"|"+res.sig;
      var existe=al.find(function(a){ return a.chave===key && a.data===hojeISO(); });
      if(existe) return;
      var novo={ id:"al"+Date.now()+Math.floor(Math.random()*999), chave:key, regraId:r.id, regraNome:r.nome,
        titulo:res.titulo, descricao:res.descricao, categoria:(TIPOS[r.tipo]||{}).cat||"Mercado",
        impacto:r.impacto||"medio", data:hojeISO(), ts:Date.now(), lido:false, auto:true };
      al.unshift(novo); novos++;
      // promove a tendência se a regra pedir e for alto impacto
      if(r.gerarTendencia){
        var td=S.getCol("mi_tendencias")||[];
        var jaTd=td.find(function(t){ return t.origemAlerta===key; });
        if(!jaTd){
          td.unshift({ id:"td"+Date.now()+Math.floor(Math.random()*999), titulo:res.titulo, descricao:res.descricao,
            categoria:(TIPOS[r.tipo]||{}).cat||"Mercado", impacto:r.impacto||"medio", horizonte:"Curto prazo",
            data:hojeISO(), origemAlerta:key, auto:true });
          S.setCol("mi_tendencias", td);
        }
      }
    });
    if(novos){ S.setCol("mi_alertas", al.slice(0,200)); }
    return novos;
  }
  function naoLidos(){ return alertas().filter(function(a){ return !a.lido; }).length; }
  function marcarTodosLidos(){ var S=window.SBSStore; if(!S) return; var al=alertas().map(function(a){ a.lido=true; return a; }); S.setCol("mi_alertas",al); }

  /* ---------------- MÓDULO ---------------- */
  function register(){
    if(!window.MI) return;
    var M=MI.Modules, S=MI.S, esc=MI.esc, dateBR=MI.dateBR;

    function badge(imp){ var s=IMP[imp]||IMP.medio; return '<span class="mc-badge" style="color:'+s.c+';background:'+s.bg+'">'+s.l+'</span>'; }

    M.alertas = {
      label:"Alertas & Automações",
      render(){
        var rs=regras(), al=alertas();
        var ativos=rs.filter(function(r){return r.ativo!==false;}).length;
        var nLidos=naoLidos();
        return ''+
        '<div class="mc-toolbar"><div class="mc-sub">'+rs.length+' automação(ões) · '+ativos+' ativa(s) · '+al.length+' alerta(s) gerados</div>'+
          '<div style="display:flex;gap:8px"><button class="mc-btn ghost" id="al-run"><i data-lucide="refresh-cw"></i> Rodar agora</button><button class="mc-btn primary" id="al-new"><i data-lucide="plus"></i> Nova automação</button></div></div>'+
        '<div class="al-cols">'+
          '<div>'+
            '<div class="al-sech"><i data-lucide="bell-ring"></i> Alertas recentes'+(nLidos?' <span class="al-count">'+nLidos+' novos</span>':'')+(al.length?'<button class="mc-link" id="al-read" style="margin-left:auto">Marcar como lidos</button>':'')+'</div>'+
            (al.length? al.slice(0,40).map(function(a){
              return '<div class="al-item '+(a.lido?'':'unread')+'" data-al="'+a.id+'">'+
                '<span class="al-dot"></span>'+
                '<div class="al-b"><div class="al-t">'+esc(a.titulo)+' '+badge(a.impacto)+'</div>'+
                '<div class="al-d">'+esc(a.descricao)+'</div>'+
                '<div class="al-m"><i data-lucide="zap"></i> '+esc(a.regraNome||"Automação")+' · '+esc(a.categoria||"")+' · '+dateBR(a.data)+'</div></div>'+
                '<button class="al-x" data-del="'+a.id+'" title="Descartar"><i data-lucide="x"></i></button>'+
              '</div>';
            }).join("") : '<div class="mc-empty big"><i data-lucide="bell-off"></i><div>Nenhum alerta ainda. As automações geram alertas conforme os dados mudam.</div></div>')+
          '</div>'+
          '<div class="al-side">'+
            '<div class="al-sech"><i data-lucide="zap"></i> Automações</div>'+
            (rs.length? rs.map(function(r){
              var t=TIPOS[r.tipo]||{};
              return '<div class="al-rule" data-rule="'+r.id+'">'+
                '<span class="al-rule-ic"><i data-lucide="'+(t.icon||"zap")+'"></i></span>'+
                '<div class="al-rule-b"><div class="al-rule-t">'+esc(r.nome)+'</div><div class="al-rule-s">'+esc(t.label||r.tipo)+(r.gerarTendencia?' · vira tendência':'')+'</div></div>'+
                '<label class="al-sw" onclick="event.stopPropagation()"><input type="checkbox" data-toggle="'+r.id+'" '+(r.ativo!==false?'checked':'')+'><span></span></label>'+
              '</div>';
            }).join("") : '<div class="mc-empty">Nenhuma automação. Crie a primeira.</div>')+
            '<div class="mc-note" style="margin-top:14px"><i data-lucide="info"></i> As automações observam cotações, câmbio ao vivo e clima das praças. Rodam ao abrir o painel e quando os dados mudam.</div>'+
          '</div>'+
        '</div>';
      },
      mount(c){
        injectCss();
        c.querySelector("#al-new").addEventListener("click",function(){ formRegra(); });
        c.querySelector("#al-run").addEventListener("click",function(){
          Promise.resolve(window.MI_CLIMA?MI_CLIMA.fetchAll():null).then(function(){ var n=run(); MI.toast(n?(n+" novo(s) alerta(s)"):"Nenhum alerta novo"); MI.refresh(); });
        });
        var rd=c.querySelector("#al-read"); if(rd) rd.addEventListener("click",function(){ marcarTodosLidos(); MI.refresh(); });
        c.querySelectorAll("[data-rule]").forEach(function(el){ el.addEventListener("click",function(){ formRegra(regras().find(function(x){return x.id===el.dataset.rule;})); }); });
        c.querySelectorAll("[data-toggle]").forEach(function(cb){ cb.addEventListener("change",function(){ S.update("mi_regras",cb.dataset.toggle,{ativo:cb.checked}); MI.toast(cb.checked?"Automação ativada":"Automação pausada"); if(cb.checked) run(); MI.refresh(); }); });
        c.querySelectorAll("[data-del]").forEach(function(b){ b.addEventListener("click",function(e){ e.stopPropagation(); S.remove("mi_alertas",b.dataset.del); MI.refresh(); }); });
        c.querySelectorAll("[data-al]").forEach(function(el){ el.addEventListener("click",function(){ var a=alertas().find(function(x){return x.id===el.dataset.al;}); if(a&&!a.lido){ S.update("mi_alertas",a.id,{lido:true}); MI.refresh(); } }); });
      }
    };

    function formRegra(ed){
      ed=ed||{};
      var topt=Object.keys(TIPOS).map(function(k){ return '<option value="'+k+'" '+(ed.tipo===k?'selected':'')+'>'+TIPOS[k].label+'</option>'; }).join("");
      var iopt=["alto","medio","baixo"].map(function(k){ return '<option value="'+k+'" '+(ed.impacto===k?'selected':'')+'>'+IMP[k].l+'</option>'; }).join("");
      MI.modal(ed.id?"Editar automação":"Nova automação",
        '<div class="fld"><label>Nome da automação</label><input id="rf-nome" value="'+esc(ed.nome||'')+'" placeholder="Ex.: Soja subiu mais de 5%"></div>'+
        '<div class="fld-row"><div class="fld"><label>Tipo de gatilho</label><select id="rf-tipo">'+topt+'</select></div>'+
          '<div class="fld"><label>Impacto do alerta</label><select id="rf-imp">'+iopt+'</select></div></div>'+
        '<div id="rf-params"></div>'+
        '<label class="mi-check"><input type="checkbox" id="rf-td" '+(ed.gerarTendencia?'checked':'')+'> Gerar Tendência automaticamente quando disparar</label>',
        (ed.id?'<button class="mc-btn ghost danger" id="rf-del">Remover</button>':'')+'<button class="mc-btn ghost" id="rf-cancel">Cancelar</button><button class="mc-btn primary" id="rf-save"><i data-lucide="save"></i> Salvar</button>');
      var tipoSel=document.getElementById("rf-tipo");
      function params(){
        var t=tipoSel.value, box=document.getElementById("rf-params");
        if(t==="cotacao_var"){
          var dopt=[["qualquer","Alta ou queda"],["alta","Só alta"],["baixa","Só queda"]].map(function(k){return '<option value="'+k[0]+'" '+(ed.direcao===k[0]?'selected':'')+'>'+k[1]+'</option>';}).join("");
          box.innerHTML='<div class="fld"><label>Produto (texto ou * p/ todos)</label><input id="rp-alvo" value="'+esc(ed.alvo||'*')+'" placeholder="soja  ·  *"></div>'+
            '<div class="fld-row"><div class="fld"><label>Variação mínima (%)</label><input id="rp-pct" type="number" step="0.5" value="'+(ed.pct!=null?ed.pct:5)+'"></div>'+
            '<div class="fld"><label>Direção</label><select id="rp-dir">'+dopt+'</select></div></div>';
        } else if(t==="cambio"){
          var mopt=[["usd","Dólar"],["eur","Euro"]].map(function(k){return '<option value="'+k[0]+'" '+(ed.moeda===k[0]?'selected':'')+'>'+k[1]+'</option>';}).join("");
          var oopt=[["acima","Acima de"],["abaixo","Abaixo de"]].map(function(k){return '<option value="'+k[0]+'" '+(ed.operador===k[0]?'selected':'')+'>'+k[1]+'</option>';}).join("");
          box.innerHTML='<div class="fld-row"><div class="fld"><label>Moeda</label><select id="rp-moeda">'+mopt+'</select></div>'+
            '<div class="fld"><label>Condição</label><select id="rp-op">'+oopt+'</select></div>'+
            '<div class="fld"><label>Valor (R$)</label><input id="rp-val" type="number" step="0.01" value="'+(ed.valor!=null?ed.valor:'5.50')+'"></div></div>';
        } else if(t==="clima_chuva"){
          var oopt2=[["abaixo","Chuva ≤ (seca)"],["acima","Chuva ≥ (excesso)"]].map(function(k){return '<option value="'+k[0]+'" '+(ed.operador===k[0]?'selected':'')+'>'+k[1]+'</option>';}).join("");
          box.innerHTML='<div class="fld"><label>Praça (texto ou * p/ todas)</label><input id="rp-alvo" value="'+esc(ed.alvo||'*')+'" placeholder="Sorriso  ·  MT  ·  *"></div>'+
            '<div class="fld-row"><div class="fld"><label>Condição</label><select id="rp-op">'+oopt2+'</select></div>'+
            '<div class="fld"><label>Chuva 7d (mm)</label><input id="rp-mm" type="number" value="'+(ed.mm!=null?ed.mm:10)+'"></div></div>';
        }
        window.lucide&&lucide.createIcons();
      }
      tipoSel.addEventListener("change",params); params();
      document.getElementById("rf-cancel").addEventListener("click",MI.closeModal);
      var del=document.getElementById("rf-del"); if(del) del.addEventListener("click",function(){ S.remove("mi_regras",ed.id); MI.toast("Automação removida"); MI.closeModal(); MI.refresh(); });
      document.getElementById("rf-save").addEventListener("click",function(){
        var v=function(id){ var e=document.getElementById(id); return e?e.value.trim():""; };
        var nome=v("rf-nome"); if(!nome){ MI.toast("Dê um nome à automação"); return; }
        var tipo=tipoSel.value;
        var data={ nome:nome, tipo:tipo, impacto:document.getElementById("rf-imp").value, gerarTendencia:document.getElementById("rf-td").checked, ativo:ed.ativo!==false };
        if(tipo==="cotacao_var"){ data.alvo=v("rp-alvo")||"*"; data.pct=+v("rp-pct")||5; data.direcao=document.getElementById("rp-dir").value; }
        else if(tipo==="cambio"){ data.moeda=document.getElementById("rp-moeda").value; data.operador=document.getElementById("rp-op").value; data.valor=+v("rp-val")||0; }
        else if(tipo==="clima_chuva"){ data.alvo=v("rp-alvo")||"*"; data.operador=document.getElementById("rp-op").value; data.mm=+v("rp-mm")||10; }
        if(ed.id) S.update("mi_regras",ed.id,data); else S.add("mi_regras",Object.assign({id:"rg"+Date.now()},data));
        MI.toast("Automação salva"); MI.closeModal(); run(); MI.refresh();
      });
    }
  }

  function injectCss(){
    if(document.getElementById("mi-alertas-css")) return;
    var s=document.createElement("style"); s.id="mi-alertas-css";
    s.textContent=
      '.al-cols{display:grid;grid-template-columns:1.5fr 1fr;gap:18px;align-items:start}'+
      '.al-sech{font-size:13px;font-weight:800;display:flex;align-items:center;gap:8px;margin:2px 2px 12px;color:var(--ink,#16201a)}'+
      '.al-sech i{width:17px;height:17px;color:#0B6B61}'+
      '.al-count{font-size:10.5px;font-weight:800;color:#fff;background:#b3261e;border-radius:20px;padding:2px 8px}'+
      '.al-item{display:flex;gap:11px;align-items:flex-start;background:var(--card,#fff);border:1px solid var(--line,#e7ebe9);border-radius:13px;padding:13px 14px;margin-bottom:10px;cursor:pointer;position:relative}'+
      '.al-item.unread{border-color:#0B6B61;background:#F4FAF8}'+
      '.al-dot{width:8px;height:8px;border-radius:50%;background:#cfd8d4;margin-top:6px;flex:0 0 auto}'+
      '.al-item.unread .al-dot{background:#0B6B61;box-shadow:0 0 0 3px rgba(11,107,97,.15)}'+
      '.al-b{flex:1;min-width:0}'+
      '.al-t{font-size:14px;font-weight:800;color:var(--ink,#16201a);display:flex;align-items:center;gap:8px;flex-wrap:wrap}'+
      '.al-d{font-size:12.5px;color:var(--ink-2,#46514c);line-height:1.5;margin-top:3px}'+
      '.al-m{font-size:11px;color:var(--muted,#8a948f);margin-top:7px;display:flex;align-items:center;gap:6px;font-weight:600}'+
      '.al-m i{width:12px;height:12px;color:#C0710F}'+
      '.al-x{border:0;background:none;color:#b6c0bb;cursor:pointer;padding:2px;flex:0 0 auto}.al-x:hover{color:#b3261e}.al-x i{width:15px;height:15px}'+
      '.al-side{background:var(--card,#fff);border:1px solid var(--line,#e7ebe9);border-radius:16px;padding:16px 16px 8px}'+
      '.al-rule{display:flex;align-items:center;gap:11px;padding:11px 4px;border-bottom:1px solid var(--line,#eef1f0);cursor:pointer}'+
      '.al-rule:last-of-type{border-bottom:0}'+
      '.al-rule-ic{width:34px;height:34px;border-radius:10px;background:#E9F3EF;color:#0B6B61;display:grid;place-items:center;flex:0 0 auto}.al-rule-ic i{width:16px;height:16px}'+
      '.al-rule-b{flex:1;min-width:0}.al-rule-t{font-size:13.5px;font-weight:700;color:var(--ink,#16201a)}.al-rule-s{font-size:11px;color:var(--muted,#8a948f);margin-top:1px}'+
      '.al-sw{position:relative;display:inline-block;width:38px;height:22px;flex:0 0 auto}'+
      '.al-sw input{opacity:0;width:0;height:0}'+
      '.al-sw span{position:absolute;inset:0;background:#cfd8d4;border-radius:20px;transition:.2s;cursor:pointer}'+
      '.al-sw span:before{content:"";position:absolute;width:16px;height:16px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s}'+
      '.al-sw input:checked+span{background:#0B8A5E}.al-sw input:checked+span:before{transform:translateX(16px)}'+
      '@media(max-width:1000px){.al-cols{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  return { run:run, regras:regras, alertas:alertas, naoLidos:naoLidos, register:register, TIPOS:TIPOS };
})();
if(window.MI && window.MI_ALERTAS) MI_ALERTAS.register();
