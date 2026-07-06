/* ===========================================================
   SBS Inteligência de Mercado — CLIMA & SAFRA (ao vivo)
   Previsão por praça agrícola via Open-Meteo (grátis, sem chave,
   CORS liberado, direto do navegador). Alimenta o motor de alertas
   e os estudos com sinais de seca / excesso de chuva por região.
   =========================================================== */
window.MI_CLIMA = (function(){
  var API = "https://api.open-meteo.com/v1/forecast";
  var LS = "sbs_mi_clima_cache";
  var CACHE = (function(){ try{ return JSON.parse(localStorage.getItem(LS)||"null"); }catch(e){ return null; } })();

  /* ---- mapeamento de código WMO → ícone/rótulo ---- */
  function wmo(code){
    code=+code;
    if(code===0) return { i:"sun", l:"Céu limpo" };
    if(code<=2) return { i:"cloud-sun", l:"Parcialmente nublado" };
    if(code===3) return { i:"cloud", l:"Nublado" };
    if(code===45||code===48) return { i:"cloud-fog", l:"Névoa" };
    if(code>=51&&code<=57) return { i:"cloud-drizzle", l:"Garoa" };
    if(code>=61&&code<=67) return { i:"cloud-rain", l:"Chuva" };
    if(code>=71&&code<=77) return { i:"cloud-snow", l:"Neve" };
    if(code>=80&&code<=82) return { i:"cloud-rain", l:"Pancadas de chuva" };
    if(code>=95) return { i:"cloud-lightning", l:"Tempestade" };
    return { i:"cloud", l:"—" };
  }
  var DIAS=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

  function pracas(){
    var c = window.SBSStore ? (window.SBSStore.getCol("mi_clima")||[]) : [];
    return c;
  }

  /* limites de chuva acumulada (7 dias) p/ classificar risco */
  function cfg(){
    var c = window.SBSStore ? (window.SBSStore.getCol("mi_clima_cfg")||[]) : [];
    var o = c[0]||{};
    return { seca: o.seca!=null?+o.seca:10, excesso: o.excesso!=null?+o.excesso:120 };
  }
  function setCfg(seca,excesso){ if(window.SBSStore) window.SBSStore.setCol("mi_clima_cfg",[{id:"cfg",seca:+seca||10,excesso:+excesso||120}]); }

  function risco(rain7){
    var k=cfg();
    if(rain7<=k.seca) return { id:"seca", l:"Chuva baixa", c:"#C0710F", bg:"#FBEFE0", i:"sun-dim" };
    if(rain7>=k.excesso) return { id:"excesso", l:"Excesso de chuva", c:"#2A4A7F", bg:"#E5EDF7", i:"cloud-rain-wind" };
    return { id:"ok", l:"Chuva adequada", c:"#0B8A5E", bg:"#E4F5EC", i:"check-circle-2" };
  }

  async function fetchOne(p){
    var url=API+"?latitude="+p.lat+"&longitude="+p.lon+
      "&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m"+
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max"+
      "&timezone=auto&forecast_days=7";
    var r = await fetch(url,{cache:"no-store"});
    if(!r.ok) throw new Error("HTTP "+r.status);
    var j = await r.json();
    var d=j.daily||{}, cur=j.current||{};
    var rain7=(d.precipitation_sum||[]).reduce(function(a,b){ return a+(+b||0); },0);
    var dias=(d.time||[]).map(function(t,i){
      var dt=new Date(t+"T12:00:00");
      return { dia:DIAS[dt.getDay()], data:t, max:Math.round(d.temperature_2m_max[i]), min:Math.round(d.temperature_2m_min[i]),
        chuva:+(d.precipitation_sum[i]||0), prob:d.precipitation_probability_max?d.precipitation_probability_max[i]:null, wmo:d.weather_code[i] };
    });
    return { id:p.id, nome:p.nome, uf:p.uf, cultura:p.cultura, lat:p.lat, lon:p.lon,
      temp:Math.round(cur.temperature_2m), umid:Math.round(cur.relative_humidity_2m), vento:Math.round(cur.wind_speed_10m),
      wmo:cur.weather_code, rain7:Math.round(rain7), dias:dias, ts:Date.now() };
  }

  async function fetchAll(){
    var ps=pracas(); if(!ps.length){ CACHE={ list:[], ts:Date.now() }; return CACHE; }
    var out=[];
    for(var i=0;i<ps.length;i++){
      try{ out.push(await fetchOne(ps[i])); }
      catch(e){ out.push({ id:ps[i].id, nome:ps[i].nome, uf:ps[i].uf, cultura:ps[i].cultura, err:true }); }
    }
    CACHE={ list:out, ts:Date.now() };
    try{ localStorage.setItem(LS, JSON.stringify(CACHE)); }catch(e){}
    return CACHE;
  }
  /* dados em cache (para alertas/estudos sem refazer fetch) */
  function snapshot(){ return CACHE && CACHE.list ? CACHE.list : []; }

  function ago(ts){ if(!ts) return ""; var s=Math.floor((Date.now()-ts)/1000); if(s<90) return "agora"; var m=Math.floor(s/60); if(m<60) return "há "+m+" min"; var h=Math.floor(m/60); if(h<24) return "há "+h+"h"; return "há "+Math.floor(h/24)+" d"; }

  /* ---- card de uma praça ---- */
  function cardHtml(c){
    if(c.err) return '<div class="cl-card"><div class="cl-h"><div class="cl-loc"><b>'+c.nome+'</b><span>'+(c.uf||'')+' · '+(c.cultura||'')+'</span></div></div><div class="cl-err"><i data-lucide="cloud-off"></i> Clima indisponível</div></div>';
    var w=wmo(c.wmo), rk=risco(c.rain7);
    var maxT=Math.max.apply(null,c.dias.map(function(d){return d.max;}));
    var minT=Math.min.apply(null,c.dias.map(function(d){return d.min;}));
    var rng=(maxT-minT)||1;
    var fc=c.dias.map(function(d){
      var ww=wmo(d.wmo);
      var top=Math.round((maxT-d.max)/rng*22);
      var hgt=Math.round((d.max-d.min)/rng*30)+8;
      return '<div class="cl-day"><div class="cl-day-l">'+d.dia+'</div>'+
        '<i data-lucide="'+ww.i+'" class="cl-day-i"></i>'+
        '<div class="cl-bar-wrap"><div class="cl-bar" style="margin-top:'+top+'px;height:'+hgt+'px"></div></div>'+
        '<div class="cl-day-t"><b>'+d.max+'°</b><span>'+d.min+'°</span></div>'+
        '<div class="cl-day-r"><i data-lucide="droplet"></i>'+(d.chuva?d.chuva.toFixed(0):'0')+'</div></div>';
    }).join("");
    return '<div class="cl-card">'+
      '<div class="cl-h">'+
        '<div class="cl-loc"><b>'+c.nome+'</b><span>'+(c.uf||'')+' · '+(c.cultura||'')+'</span></div>'+
        '<span class="cl-risk" style="color:'+rk.c+';background:'+rk.bg+'"><i data-lucide="'+rk.i+'"></i> '+rk.l+'</span>'+
      '</div>'+
      '<div class="cl-now">'+
        '<i data-lucide="'+w.i+'" class="cl-now-i"></i>'+
        '<div class="cl-now-t">'+(c.temp!=null?c.temp+'°':'—')+'</div>'+
        '<div class="cl-now-m"><span><i data-lucide="droplets"></i> '+(c.umid!=null?c.umid+'%':'—')+'</span>'+
          '<span><i data-lucide="wind"></i> '+(c.vento!=null?c.vento+' km/h':'—')+'</span>'+
          '<span><i data-lucide="cloud-rain"></i> '+c.rain7+' mm/7d</span></div>'+
      '</div>'+
      '<div class="cl-fc">'+fc+'</div>'+
    '</div>';
  }

  function injectCss(){
    if(document.getElementById("mi-clima-css")) return;
    var s=document.createElement("style"); s.id="mi-clima-css";
    s.textContent=
      '.cl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:16px}'+
      '.cl-card{background:var(--card,#fff);border:1px solid var(--line,#e7ebe9);border-radius:16px;padding:16px 18px}'+
      '.cl-h{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px}'+
      '.cl-loc b{font-size:15px;font-weight:800;color:var(--ink,#16201a);display:block}'+
      '.cl-loc span{font-size:11.5px;color:var(--muted,#8a948f)}'+
      '.cl-risk{font-size:11px;font-weight:800;padding:4px 10px;border-radius:20px;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}'+
      '.cl-risk i{width:13px;height:13px}'+
      '.cl-now{display:flex;align-items:center;gap:14px;padding:6px 0 14px;border-bottom:1px solid var(--line,#eef1f0);margin-bottom:12px}'+
      '.cl-now-i{width:40px;height:40px;color:#0B6B61;flex:0 0 auto}'+
      '.cl-now-t{font-size:34px;font-weight:800;color:var(--ink,#16201a);line-height:1}'+
      '.cl-now-m{display:flex;flex-direction:column;gap:3px;margin-left:auto}'+
      '.cl-now-m span{font-size:11.5px;color:var(--ink-2,#46514c);display:flex;align-items:center;gap:5px;font-weight:600}'+
      '.cl-now-m i{width:13px;height:13px;color:#69a;flex:0 0 auto}'+
      '.cl-fc{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}'+
      '.cl-day{text-align:center}'+
      '.cl-day-l{font-size:10.5px;font-weight:800;color:var(--muted,#8a948f);text-transform:uppercase}'+
      '.cl-day-i{width:17px;height:17px;color:#0B6B61;margin:4px auto 2px}'+
      '.cl-bar-wrap{height:42px;display:flex;justify-content:center}'+
      '.cl-bar{width:6px;border-radius:6px;background:linear-gradient(#E8A33D,#0B8A5E)}'+
      '.cl-day-t{font-size:11px;margin-top:3px}.cl-day-t b{font-weight:800;color:var(--ink,#16201a)}.cl-day-t span{color:var(--muted,#8a948f);margin-left:2px}'+
      '.cl-day-r{font-size:9.5px;color:#3b7fb0;font-weight:700;display:flex;align-items:center;justify-content:center;gap:2px;margin-top:2px}'+
      '.cl-day-r i{width:9px;height:9px}'+
      '.cl-err{font-size:13px;color:var(--muted,#8a948f);display:flex;align-items:center;gap:8px;padding:14px 0}.cl-err i{width:18px;height:18px}'+
      '.cl-load{font-size:13px;color:var(--muted,#8a948f);display:flex;align-items:center;gap:8px;padding:8px 2px}';
    document.head.appendChild(s);
  }

  /* =================== MÓDULO =================== */
  function register(){
    if(!window.MI) return;
    var M=MI.Modules, S=MI.S, esc=MI.esc;
    M.clima = {
      label:"Clima & Safra",
      render(){
        var ps=pracas();
        return ''+
        '<div class="mc-toolbar"><div class="mc-sub">'+ps.length+' praça(s) agrícola(s) · previsão de 7 dias ao vivo</div>'+
          '<div style="display:flex;gap:8px"><button class="mc-btn ghost" id="cl-cfg"><i data-lucide="sliders-horizontal"></i> Limites de risco</button><button class="mc-btn primary" id="cl-new"><i data-lucide="plus"></i> Nova praça</button></div></div>'+
        (ps.length? '<div id="cl-grid" class="cl-grid"></div>' :
          '<div class="mc-empty big"><i data-lucide="cloud-sun"></i><div>Nenhuma praça cadastrada.</div><button class="mc-btn primary" id="cl-new2"><i data-lucide="plus"></i> Adicionar praça agrícola</button></div>')+
        '<div class="mc-note"><i data-lucide="satellite"></i> Clima ao vivo do Open-Meteo (gratuito, sem chave). Os sinais de <b>chuva baixa</b> e <b>excesso de chuva</b> alimentam automaticamente o motor de Alertas e podem entrar nos Estudos.</div>';
      },
      mount(c){
        injectCss();
        var nb=c.querySelector("#cl-new")||c.querySelector("#cl-new2"); if(nb) nb.addEventListener("click",function(){ formPraca(); });
        var cf=c.querySelector("#cl-cfg"); if(cf) cf.addEventListener("click",cfgRisco);
        var grid=c.querySelector("#cl-grid");
        if(grid){
          if(CACHE&&CACHE.list&&CACHE.list.length){ grid.innerHTML=CACHE.list.map(cardHtml).join(""); window.lucide&&lucide.createIcons(); }
          else grid.innerHTML='<div class="cl-load"><span class="mi-live-dot"></span> Carregando clima das praças…</div>';
          fetchAll().then(function(p){ if(!document.body.contains(grid)) return; grid.innerHTML=(p.list||[]).map(cardHtml).join(""); window.lucide&&lucide.createIcons();
            window.MI_ALERTAS && MI_ALERTAS.run && MI_ALERTAS.run(); });
        }
      }
    };

    function loadLeaflet(cb){
      if(window.L){ cb(); return; }
      if(!document.getElementById("leaflet-css")){ var css=document.createElement("link"); css.id="leaflet-css"; css.rel="stylesheet"; css.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(css); }
      var js=document.createElement("script"); js.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; js.onload=cb; js.onerror=function(){ MI.toast("Não consegui carregar o mapa"); }; document.head.appendChild(js);
    }
    function formPraca(ed){
      ed=ed||{};
      MI.modal(ed.id?"Editar praça":"Nova praça agrícola",
        '<div class="fld"><label>Cidade / praça</label><input id="pf-nome" value="'+esc(ed.nome||'')+'" placeholder="Ex.: Sorriso"></div>'+
        '<div class="fld-row"><div class="fld"><label>UF</label><input id="pf-uf" value="'+esc(ed.uf||'')+'" placeholder="MT"></div>'+
          '<div class="fld"><label>Cultura</label><input id="pf-cult" value="'+esc(ed.cultura||'')+'" placeholder="Soja / Milho"></div></div>'+
        '<div class="fld"><label>Localização no mapa</label>'+
          '<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">'+
            '<button type="button" class="mc-btn ghost" id="pf-geo"><i data-lucide="locate-fixed"></i> Usar minha localização</button>'+
          '</div>'+
          '<div id="pf-map" style="height:240px;border-radius:12px;overflow:hidden;border:1px solid var(--line,#e0e5e2);background:#eef2f0"></div>'+
          '<p style="font-size:11.5px;color:var(--muted);margin:6px 0 0">Toque no mapa para posicionar o pino — ou use sua localização. O pino também pode ser arrastado.</p>'+
        '</div>'+
        '<div class="fld-row"><div class="fld"><label>Latitude</label><input id="pf-lat" type="number" step="0.0001" value="'+(ed.lat!=null?ed.lat:'')+'" placeholder="-12.5450"></div>'+
          '<div class="fld"><label>Longitude</label><input id="pf-lon" type="number" step="0.0001" value="'+(ed.lon!=null?ed.lon:'')+'" placeholder="-55.7110"></div></div>',
        (ed.id?'<button class="mc-btn ghost danger" id="pf-del">Remover</button>':'')+'<button class="mc-btn ghost" id="pf-cancel">Cancelar</button><button class="mc-btn primary" id="pf-save"><i data-lucide="save"></i> Salvar</button>');
      document.getElementById("pf-cancel").addEventListener("click",MI.closeModal);
      var del=document.getElementById("pf-del"); if(del) del.addEventListener("click",function(){ S.remove("mi_clima",ed.id); MI.toast("Praça removida"); MI.closeModal(); CACHE=null; MI.refresh(); });

      // ---- mapa interativo (Leaflet / OpenStreetMap) ----
      var map=null, marker=null;
      function setLatLon(la,lo){ var a=document.getElementById("pf-lat"), b=document.getElementById("pf-lon"); if(a) a.value=(+la).toFixed(5); if(b) b.value=(+lo).toFixed(5); }
      function placeMarker(la,lo){
        if(!map||!window.L) return;
        if(marker){ marker.setLatLng([la,lo]); }
        else { marker=L.marker([la,lo],{draggable:true}).addTo(map); marker.on("dragend",function(){ var p=marker.getLatLng(); setLatLon(p.lat,p.lng); reverseGeo(p.lat,p.lng); }); }
      }
      function reverseGeo(la,lo){
        try{
          fetch("https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&accept-language=pt-BR&lat="+la+"&lon="+lo)
            .then(function(r){ return r.json(); })
            .then(function(j){ var a=(j&&j.address)||{}; var cid=a.city||a.town||a.village||a.municipality||a.county||""; var nm=document.getElementById("pf-nome"); if(nm&&!nm.value.trim()&&cid) nm.value=cid; })
            .catch(function(){});
        }catch(e){}
      }
      loadLeaflet(function(){
        if(!document.getElementById("pf-map")) return;
        var sLat=ed.lat!=null?ed.lat:-15.78, sLon=ed.lon!=null?ed.lon:-47.93, sZoom=ed.lat!=null?10:4;
        map=L.map("pf-map").setView([sLat,sLon],sZoom);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(map);
        if(ed.lat!=null) placeMarker(ed.lat,ed.lon);
        map.on("click",function(e){ placeMarker(e.latlng.lat,e.latlng.lng); setLatLon(e.latlng.lat,e.latlng.lng); reverseGeo(e.latlng.lat,e.latlng.lng); });
        setTimeout(function(){ try{ map.invalidateSize(); }catch(e){} },220);
      });
      var geoBtn=document.getElementById("pf-geo");
      if(geoBtn) geoBtn.addEventListener("click",function(){
        if(!navigator.geolocation){ MI.toast("Localização não disponível neste aparelho"); return; }
        MI.toast("Buscando sua localização…");
        navigator.geolocation.getCurrentPosition(function(pos){
          var la=pos.coords.latitude, lo=pos.coords.longitude;
          setLatLon(la,lo);
          if(map){ map.setView([la,lo],13); placeMarker(la,lo); }
          reverseGeo(la,lo);
          MI.toast("Localização marcada");
        }, function(){ MI.toast("Não consegui pegar a localização (permita o acesso no navegador)."); }, {enableHighAccuracy:true,timeout:9000,maximumAge:0});
      });

      document.getElementById("pf-save").addEventListener("click",function(){
        var v=function(id){ var e=document.getElementById(id); return e?e.value.trim():""; };
        var nome=v("pf-nome"), lat=parseFloat(v("pf-lat")), lon=parseFloat(v("pf-lon"));
        if(!nome){ MI.toast("Informe a cidade"); return; }
        if(isNaN(lat)||isNaN(lon)){ MI.toast("Marque o ponto no mapa ou use sua localização"); return; }
        var data={ nome:nome, uf:v("pf-uf"), cultura:v("pf-cult"), lat:lat, lon:lon };
        if(ed.id) S.update("mi_clima",ed.id,data); else S.add("mi_clima",Object.assign({id:"cl"+Date.now()},data));
        MI.toast("Praça salva"); MI.closeModal(); CACHE=null; MI.refresh();
      });
    }
    function cfgRisco(){
      var k=cfg();
      MI.modal("Limites de risco de chuva",
        '<p style="font-size:12.5px;color:var(--muted);margin:0 0 14px;line-height:1.5">Definem quando o painel sinaliza risco com base na <b>chuva acumulada dos próximos 7 dias</b> por praça.</p>'+
        '<div class="fld-row"><div class="fld"><label>Chuva baixa se ≤ (mm/7d)</label><input id="rk-seca" type="number" value="'+k.seca+'"></div>'+
          '<div class="fld"><label>Excesso se ≥ (mm/7d)</label><input id="rk-exc" type="number" value="'+k.excesso+'"></div></div>',
        '<button class="mc-btn ghost" id="rk-cancel">Cancelar</button><button class="mc-btn primary" id="rk-save"><i data-lucide="save"></i> Salvar</button>');
      document.getElementById("rk-cancel").addEventListener("click",MI.closeModal);
      document.getElementById("rk-save").addEventListener("click",function(){
        setCfg(document.getElementById("rk-seca").value, document.getElementById("rk-exc").value);
        MI.toast("Limites atualizados"); MI.closeModal(); MI.refresh();
      });
    }
  }

  return { pracas:pracas, fetchAll:fetchAll, snapshot:snapshot, risco:risco, wmo:wmo, cfg:cfg, register:register, cardHtml:cardHtml };
})();
if(window.MI && window.MI_CLIMA) MI_CLIMA.register();
