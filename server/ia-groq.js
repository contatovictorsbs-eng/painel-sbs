/* Assistente IA (Groq) para Marketing e Inteligência de Mercado.
   POST /.netlify/functions/ia-groq  { area, messages:[{role,content}] }
   -> { reply, contexto:{...} }
   Requer variável de ambiente GROQ_API_KEY (console.groq.com/keys).
   Modelo padrão: llama-3.1-8b-instant (rápido e no free tier).

   RESPOSTAS COM BASE NOS DADOS REAIS:
   A função lê um RESUMO agregado das coleções do painel (eventos, campanhas,
   vendas, orçamentos, leads) — respeitando o tenant do token — e injeta esse
   resumo no contexto do modelo. Assim o assistente responde sobre os números
   reais do painel, e não genericamente.

   LGPD: só enviamos AGREGADOS (contagens, somas, status). NUNCA nomes, CNPJ,
   telefone ou qualquer dado pessoal de cliente/vendedor vai para o modelo.
*/
const store = require('./_lib/store');
const { tenantFromEvent, fromEvent } = require('./_lib/auth');

function MODEL(){ return process.env.GROQ_MODEL || 'llama-3.1-8b-instant'; }

function brl(n){
  const v = Number(n) || 0;
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function contar(arr, campo){
  const m = {};
  for (const x of (arr || [])) { const k = (x && x[campo]) || '—'; m[k] = (m[k] || 0) + 1; }
  return m;
}
function mapaTxt(m){
  const ks = Object.keys(m);
  return ks.length ? ks.map(k => k + ': ' + m[k]).join(', ') : 'nenhum';
}

/* Lê as coleções (com cap de página) e devolve um resumo compacto + em texto.
   Cada leitura é isolada em try para nunca derrubar a resposta do assistente. */
async function montarContexto(event){
  const db = store.tenantStore(tenantFromEvent(event));
  const safe = async (nome) => { try { return await db.list(nome, null, { limit: 500 }); } catch (e) { return []; } };

  const [eventos, campanhas, vendas, orcamentos, leads] = await Promise.all([
    safe('eventos'), safe('campanhas'), safe('vendas'), safe('orcamentos'), safe('leads')
  ]);

  const vendaTotal = (vendas || []).reduce((s, v) => s + (Number(v.valor) || 0), 0);
  const orcPend = (orcamentos || []).filter(o => (o.status || '') === 'pendente');
  const descPend = orcPend.reduce((s, o) => s + (Number(o.descontoValor) || Number(o.desconto) || 0), 0);

  // Top produtos por receita (só nome do produto — não é dado pessoal)
  const porProduto = {};
  for (const v of (vendas || [])) {
    const p = v.produto || '—';
    porProduto[p] = (porProduto[p] || 0) + (Number(v.valor) || 0);
  }
  const topProdutos = Object.keys(porProduto)
    .sort((a, b) => porProduto[b] - porProduto[a]).slice(0, 5)
    .map(p => p + ' (' + brl(porProduto[p]) + ')');

  const resumo = {
    tenant: db.tenant,
    eventos: {
      total: eventos.length,
      porAppStatus: contar(eventos, 'appStatus'),
      proximos: (eventos || []).slice(0, 5).map(e => ({ nome: e.nome, local: e.local || e.cidade || '', appStatus: e.appStatus || 'nao_consta' }))
    },
    campanhas: {
      total: campanhas.length,
      metaSoma: campanhas.reduce((s, c) => s + (Number(c.meta) || 0), 0)
    },
    vendas: { qtd: vendas.length, receitaTotal: vendaTotal, topProdutos },
    orcamentos: {
      total: orcamentos.length,
      porStatus: contar(orcamentos, 'status'),
      descontoPendente: descPend
    },
    leads: { total: leads.length, porStatus: contar(leads, 'status') }
  };

  const linhas = [
    'DADOS REAIS DO PAINEL (agregados — tenant: ' + resumo.tenant + '):',
    '• Eventos: ' + resumo.eventos.total + ' (status do app → ' + mapaTxt(resumo.eventos.porAppStatus) + ').',
    '• Próximos eventos: ' + (resumo.eventos.proximos.map(e => e.nome + (e.local ? ' — ' + e.local : '') + ' [' + e.appStatus + ']').join('; ') || 'nenhum') + '.',
    '• Campanhas: ' + resumo.campanhas.total + ' (soma das metas ' + brl(resumo.campanhas.metaSoma) + ').',
    '• Vendas: ' + resumo.vendas.qtd + ' registros, receita total ' + brl(resumo.vendas.receitaTotal) + '.',
    '• Top produtos por receita: ' + (resumo.vendas.topProdutos.join(' | ') || 'sem vendas ainda') + '.',
    '• Orçamentos: ' + resumo.orcamentos.total + ' (por status → ' + mapaTxt(resumo.orcamentos.porStatus) + '), desconto pendente de aprovação ' + brl(resumo.orcamentos.descontoPendente) + '.',
    '• Leads: ' + resumo.leads.total + ' (por status → ' + mapaTxt(resumo.leads.porStatus) + ').'
  ];

  return { resumo, texto: linhas.join('\n') };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não suportado' };
  }
  const key = process.env.GROQ_API_KEY;

  // Monta o contexto de dados reais mesmo em modo demo (para o front poder exibir).
  let ctx = { resumo: null, texto: '' };
  try { ctx = await montarContexto(event); } catch (e) { /* segue sem contexto */ }

  if (!key) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: null, demo: true, error: 'GROQ_API_KEY não configurada', contexto: ctx.resumo }) };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const area = body.area || 'Marketing';
    const sys = {
      role: 'system',
      content: 'Você é o assistente de ' + area + ' da SBS Green Seeds (agronegócio de sementes). '
        + 'Responda em português do Brasil, de forma objetiva e prática, com foco em decisões comerciais, '
        + 'eventos, campanhas e inteligência de mercado. '
        + 'Baseie-se SEMPRE nos DADOS REAIS DO PAINEL abaixo; cite os números quando forem relevantes. '
        + 'Se a pergunta pedir algo que não está nos dados, diga exatamente qual informação falta. '
        + 'Nunca invente números além dos fornecidos.\n\n'
        + (ctx.texto || '(sem dados agregados disponíveis no momento)')
    };
    const messages = [sys].concat(Array.isArray(body.messages) ? body.messages.slice(-12) : []);
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL(), messages, temperature: 0.3, max_tokens: 800 })
    });
    if (!resp.ok) {
      const t = await resp.text();
      return { statusCode: 502, body: JSON.stringify({ error: 'Groq: ' + t.slice(0, 200) }) };
    }
    const data = await resp.json();
    const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply, contexto: ctx.resumo }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
