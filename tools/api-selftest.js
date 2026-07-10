/* SBS — Autoteste de endpoints (produção)
   Abra em: https://painel-sbs.pages.dev/tools/api-selftest.html
   Requer estar logado (usa o token salvo no navegador). Faz GET em todas as
   rotas e um POST/DELETE de ida-e-volta em coleções seguras, mostrando:
   - HTTP status, ok/erro, se veio array/objeto, contagem, e se GRAVOU no banco.
   NÃO cria lixo permanente: o que ele grava para teste, ele apaga em seguida. */
(function(){
  const base='/api';
  const out=document.getElementById('out');
  const tok=(function(){try{return localStorage.getItem('sbs_token')||localStorage.getItem('sbs_app_token')||'';}catch(e){return '';}})();
  const H={'Content-Type':'application/json'}; if(tok) H['Authorization']='Bearer '+tok;
  function row(nome,metodo,st,ok,info,cls){
    const tr=document.createElement('tr');
    tr.innerHTML='<td>'+nome+'</td><td>'+metodo+'</td><td class="'+(cls||'')+'">'+st+'</td><td>'+(ok?'✓':'—')+'</td><td>'+(info||'')+'</td>';
    out.appendChild(tr);
  }
  async function call(nome,metodo,body,qs){
    const url=base+'/'+nome+(qs||'');
    try{
      const r=await fetch(url,{method:metodo,headers:H,body:body?JSON.stringify(body):undefined});
      let j=null,txt=''; try{txt=await r.text(); j=JSON.parse(txt);}catch(e){}
      const ok=j&&j.ok!==false; const d=j?j.data:null;
      let info='';
      if(Array.isArray(d)) info='array · '+d.length+' item(s)';
      else if(d&&typeof d==='object') info='objeto · chaves: '+Object.keys(d).slice(0,6).join(',');
      else if(j&&j.erro) info='erro: '+j.erro;
      else info=(txt||'').slice(0,80);
      row(nome,metodo,r.status,ok,info, r.ok&&ok?'okc':'errc');
      return {r,j,d,ok};
    }catch(e){ row(nome,metodo,'FALHA',false,e.message,'errc'); return {ok:false}; }
  }

  const GETS=['auth','vendedores','leads','orcamentos','produtos','eventos','campanhas','vendas',
    'demandas','notificacoes','alertas','parceiros','tenants','monitoramento','canais',
    'mercado','aprovacoes','biblioteca','localizacoes',
    'integracao?de=sbs-brasil&tipo=solicitacoes','integracao?de=painel-sbs&tipo=sugestao-decisao'];

  async function run(){
    out.innerHTML='';
    row('CONFIG','—', tok?'com token':'SEM token', !!tok, tok?'autenticado':'faça login primeiro — sem token, rotas protegidas dão 401','');
    // 1) Leitura (quem BUSCA dados)
    for(const g of GETS){ const nome=g.split('?')[0]; const qs=g.indexOf('?')>=0?g.slice(g.indexOf('?')):''; await call(nome,'GET',null,qs); }
    // 2) Ida-e-volta (quem MANDA dados) — grava e apaga um registro de teste
    const stamp=Date.now();
    // produtos: POST + DELETE
    const p=await call('produtos','POST',{id:'selftest-'+stamp,nome:'AUTOTESTE '+stamp,cultura:'Teste',saco:'1 kg',preco:1});
    if(p.ok){ await call('produtos','DELETE',null,'?id=selftest-'+stamp); row('produtos','ida-e-volta','OK',true,'gravou e apagou no banco ✓','okc'); }
    // integracao: POST + DELETE (barramento)
    const i=await call('integracao','POST',{sistema:'painel-sbs',tipo:'selftest',ref:'st-'+stamp,titulo:'Autoteste',resumo:'ping',payload:{stamp}});
    if(i.ok && i.d && i.d.id){ await call('integracao','DELETE',null,'?id='+encodeURIComponent(i.d.id)); row('integracao','ida-e-volta','OK',true,'gravou e apagou no barramento ✓','okc'); }
    const done=document.createElement('p'); done.textContent='Concluído. Verde = respondeu e gravou; vermelho = revisar. 401 em rotas protegidas = faça login no painel nesta mesma aba antes de rodar.'; out.parentNode.appendChild(done);
  }
  document.getElementById('run').addEventListener('click',run);
  run();
})();
