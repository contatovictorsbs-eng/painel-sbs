/* ===========================================================
   SBS — Coleta de preço de concorrente (Netlify Function · stub)
   Recebe { url, produto } e deve devolver { preco: <número> }.
   COMO ATIVAR a coleta real (quando tiver a fonte):
     • Opção A: use uma API de scraping (ScraperAPI, Browserless,
       ScrapingBee). Guarde a chave numa variável de ambiente e
       chame-a aqui, extraindo o preço do HTML retornado.
     • Opção B: se o concorrente tiver um feed/JSON de preços,
       faça fetch direto e leia o campo.
   Sem configuração, devolve {preco:null} e o painel usa o modelo
   de teste (leitura simulada).
   =========================================================== */
exports.handler = async (event) => {
  const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"Content-Type", "Access-Control-Allow-Methods":"POST, OPTIONS", "Content-Type":"application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode:204, headers:cors, body:"" };
  if (event.httpMethod !== "POST") return { statusCode:405, headers:cors, body:JSON.stringify({error:"Use POST"}) };

  let url="", produto="";
  try { const b=JSON.parse(event.body||"{}"); url=b.url||""; produto=b.produto||""; } catch(e){}

  // ---- coleta real (exemplo via ScraperAPI) — descomente e configure ----
  // const key = process.env.SCRAPER_API_KEY;
  // if (key && url) {
  //   try {
  //     const r = await fetch("https://api.scraperapi.com?api_key="+key+"&url="+encodeURIComponent(url));
  //     const html = await r.text();
  //     // extraia o preço do HTML (regex/seletor conforme o site):
  //     const m = html.match(/R\$\s*([0-9]+[.,][0-9]{2})/);
  //     const preco = m ? parseFloat(m[1].replace(".","").replace(",",".")) : null;
  //     return { statusCode:200, headers:cors, body:JSON.stringify({ preco }) };
  //   } catch(e){}
  // }

  // sem coletor configurado → painel usa o modelo de teste
  return { statusCode:200, headers:cors, body:JSON.stringify({ preco:null, info:"coletor não configurado" }) };
};
