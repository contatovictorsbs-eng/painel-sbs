/* ===========================================================
   SBS — Inteligência de Mercado · base de dados (seed)
   Coleções: mi_cotacoes, mi_concorrentes, mi_regioes,
   mi_tendencias. Setor de sementes / agronegócio.
   =========================================================== */
window.MI_DATA = (function(){
  var cotacoes = [
    { id:"ct1", produto:"Soja (saca 60kg)", praca:"Mato Grosso", preco:128.50, anterior:125.00, unidade:"R$/sc", atualizado:"2026-06-25", fonte:"CEPEA/B3" },
    { id:"ct2", produto:"Milho (saca 60kg)", praca:"Mato Grosso", preco:62.30, anterior:64.10, unidade:"R$/sc", atualizado:"2026-06-25", fonte:"CEPEA" },
    { id:"ct3", produto:"Semente Soja (certificada)", praca:"Média MT/MS", preco:380.00, anterior:365.00, unidade:"R$/sc", atualizado:"2026-06-20", fonte:"Interno SBS" },
    { id:"ct4", produto:"Boi gordo (arroba)", praca:"Mato Grosso", preco:312.00, anterior:305.00, unidade:"R$/@", atualizado:"2026-06-25", fonte:"CEPEA" }
  ];

  var concorrentes = [
    { id:"cc1", nome:"Concorrente A", segmento:"Sementes de soja", regiao:"MT/MS", posicao:"Líder regional", forca:"Rede de distribuição ampla", fraqueza:"Preço alto", obs:"Lançou cultivar nova para o ciclo 25/26.", monitorar:true },
    { id:"cc2", nome:"Concorrente B", segmento:"Sementes de forrageiras", regiao:"GO/MT", posicao:"Desafiante", forca:"Preço competitivo", fraqueza:"Pós-venda fraco", obs:"", monitorar:true }
  ];

  var regioes = [
    { id:"rg1", regiao:"Mato Grosso", cultura:"Soja", potencial:"Alto", participacao:18, tendencia:"alta", obs:"Expansão de área plantada na região norte." },
    { id:"rg2", regiao:"Mato Grosso do Sul", cultura:"Soja/Milho", potencial:"Médio", participacao:11, tendencia:"estavel", obs:"" }
  ];

  var tendencias = [
    { id:"td1", titulo:"Demanda por cultivares tolerantes à seca", categoria:"Produto", impacto:"alto", horizonte:"2026/27", data:"2026-06-15", descricao:"Produtores buscam materiais resilientes após estiagens recentes — oportunidade para o P&D da SBS." },
    { id:"td2", titulo:"Alta do dólar pressiona custo de insumos", categoria:"Macroeconomia", impacto:"medio", horizonte:"Curto prazo", data:"2026-06-10", descricao:"Câmbio eleva preço de defensivos e fertilizantes; pode reduzir margem do produtor." }
  ];

  var clima = [
    { id:"cl1", nome:"Sorriso",      uf:"MT", cultura:"Soja/Milho",   lat:-12.5450, lon:-55.7110 },
    { id:"cl2", nome:"Rio Verde",    uf:"GO", cultura:"Soja/Milho",   lat:-17.7920, lon:-50.9190 },
    { id:"cl3", nome:"Dourados",     uf:"MS", cultura:"Soja/Milho",   lat:-22.2210, lon:-54.8060 },
    { id:"cl4", nome:"L. E. Magalhães", uf:"BA", cultura:"Soja/Algodão", lat:-12.0920, lon:-45.7940 },
    { id:"cl5", nome:"Cascavel",     uf:"PR", cultura:"Soja/Milho",   lat:-24.9550, lon:-53.4550 },
    { id:"cl6", nome:"Uberaba",      uf:"MG", cultura:"Soja/Cana",    lat:-19.7480, lon:-47.9310 }
  ];

  var regras = [
    { id:"r1", nome:"Cotação variou mais de 5%", tipo:"cotacao_var", alvo:"*", pct:5, direcao:"qualquer", impacto:"medio", gerarTendencia:false, ativo:true },
    { id:"r2", nome:"Dólar acima de R$ 5,50",   tipo:"cambio", moeda:"usd", operador:"acima", valor:5.50, impacto:"medio", gerarTendencia:true, ativo:true },
    { id:"r3", nome:"Chuva baixa nas praças (seca)", tipo:"clima_chuva", alvo:"*", operador:"abaixo", mm:10, impacto:"alto", gerarTendencia:true, ativo:true }
  ];

  return { cotacoes:cotacoes, concorrentes:concorrentes, regioes:regioes, tendencias:tendencias, clima:clima, regras:regras };
})();
