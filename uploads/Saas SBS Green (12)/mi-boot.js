/* SBS Painel de Inteligência de Mercado — boot */
(function(){
  MI.seed();
  document.getElementById("nav").addEventListener("click",e=>{ const it=e.target.closest("[data-nav]"); if(it) MI.go(it.dataset.nav); });
  document.getElementById("logout").addEventListener("click",MI.logout);
  document.getElementById("scrim").addEventListener("click",MI.closeSide);
  document.getElementById("modal-x").addEventListener("click",MI.closeModal);
  document.getElementById("modal-scrim").addEventListener("click",e=>{ if(e.target.id==="modal-scrim") MI.closeModal(); });
  MI.initLogin();

  const saved=(()=>{ try{ return (localStorage.getItem("sbs_mi_user")||"").toLowerCase(); }catch(e){ return ""; } })();
  if(saved && MI.canAccess(saved)) MI.startSession(saved); else MI.showLogin();

  // motor de automações: roda assim que há sessão (cotações na hora; câmbio e clima quando carregam)
  function runAutomacoes(){
    if(!window.MI_ALERTAS || !MI.session) return;
    MI_ALERTAS.run();
    if(window.MI_LIVE && MI_LIVE.fetchFX) MI_LIVE.fetchFX().then(function(){ MI_ALERTAS.run(); });
    if(window.MI_CLIMA && MI_CLIMA.fetchAll) MI_CLIMA.fetchAll().then(function(){ MI_ALERTAS.run(); });
  }
  setTimeout(runAutomacoes, 1500);

  // tenta puxar CEPEA/saca do backend (Netlify Function); no local falha em silêncio
  if(window.MI_LIVE && MI_LIVE.syncBackend){ setTimeout(function(){ MI_LIVE.syncBackend().then(function(res){ if(res && (res.updated || (res.cepea&&res.cepea.length)) && MI.session) MI.refresh(); }); }, 1200); }

  if(window.SBSStore){
    window.SBSStore.onChange(function(d){
      if(!d || !d.remote || !MI.session) return;
      const ae=document.activeElement;
      if(ae && (ae.tagName==="INPUT"||ae.tagName==="TEXTAREA"||ae.tagName==="SELECT")) return;
      if(document.getElementById("modal-scrim").classList.contains("show")) return;
      MI.refresh();
    });
  }
  window.lucide && lucide.createIcons();
})();
