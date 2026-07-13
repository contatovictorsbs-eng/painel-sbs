/* Indicadores do Painel do Vendedor (SBS Brasil) — PROXY seguro (contrato v2).
   Traz para a aba "Resultados das ações" os números da equipe de campo
   (carteira de clientes e PROSPECÇÃO) que vivem no sistema SBS Brasil:
   Estados ativos, Clientes, Prospects, Rotas/visitas, Visitas agendadas,
   Rotas validadas, Cotações e Vendas (R$).

   O segredo (INTEG_KEY) e a URL do Worker ficam em variáveis de ambiente do
   Cloudflare Pages — NUNCA no navegador.

   Front do Painel:   GET /api/parceiro-indicadores
   Busca no SBS Brasil (v2):
     GET <SBS_BRASIL_URL>/api/integ/v1/indicadores
     Authorization: Bearer <INTEG_KEY>   (+ x-integ-key e ?key= como compat v1)
   Timeout 5s. Erro/timeout → modo DEMONSTRAÇÃO (a tela nunca quebra).

   Devolve { ok, data:{ configurado, online, versao, periodo, atualizadoEm, indicadores:{...} } }
   Regra (handoff §5): "online / TEMPO REAL" só quando o worker devolve `atualizadoEm`.

   NOTA DE DEPLOY: o roteador functions/api/[[path]].js roda uma cópia EMBUTIDA
   deste handler (hParceiroIndicadores), porque o upload web do GitHub não adiciona
   arquivos novos em subpasta de forma confiável. Mantenha os dois em sincronia.

   Variáveis de ambiente (Pages → Settings → Variables):
   - SBS_BRASIL_URL     ex.: https://nameless-wood-e371.contato-victor-sbs.workers.dev
   - INTEG_KEY          a mesma chave secreta combinada com o SBS Brasil
   - INTEG_TIMEOUT_MS   opcional (default 5000)
   ============================================================ */

function normaliza(src) {
  const d = (src && (src.indicadores || src.data || src)) || {};
  const num = (...ks) => { for (const k of ks) { if (d[k] != null && !isNaN(Number(d[k]))) return Number(d[k]); } return 0; };
  return {
    estados:   num('estados', 'estadosAtivos', 'estados_ativos'),
    clientes:  num('clientes', 'carteira'),
    prospects: num('prospects', 'prospeccao'),
    rotas:     num('rotas', 'rotasVisitas', 'rotas_visitas'),
    agendadas: num('agendadas', 'visitasAgendadas', 'visitas_agendadas'),
    validadas: num('validadas', 'rotasValidadas', 'rotas_validadas'),
    cotacoes:  num('cotacoes', 'cotacoesAbertas'),
    vendasRS:  num('vendasRS', 'vendas', 'vendas_rs', 'faturamento')
  };
}

exports.handler = async (event) => {
  const H = { 'content-type': 'application/json', 'cache-control': 'no-store' };
  const base = (process.env.SBS_BRASIL_URL || '').replace(/\/+$/, '');
  const key = process.env.INTEG_KEY || '';

  // Sem configuração ainda → o front cai no fallback de demonstração.
  if (!base || !key) {
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, data: { configurado: false, online: false, indicadores: null } }) };
  }

  const timeout = Number(process.env.INTEG_TIMEOUT_MS || 5000);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const url = base + '/api/integ/v1/indicadores?key=' + encodeURIComponent(key);
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'authorization': 'Bearer ' + key,   // v2 — chave no header (não vaza em log)
        'x-integ-key': key,                  // compat v1
        'accept': 'application/json'
      }
    });
    if (!r.ok) throw new Error('HTTP_' + r.status);
    const txt = await r.text();
    let raw = {};
    try { raw = JSON.parse(txt); } catch (e) { raw = {}; }
    const atualizadoEm = raw && raw.atualizadoEm ? String(raw.atualizadoEm) : null;
    const periodo = raw && raw.periodo ? String(raw.periodo) : null;
    const versao = raw && raw.versao != null ? raw.versao : null;
    const online = !!atualizadoEm; // TEMPO REAL só quando vem atualizadoEm (handoff §5)
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, data: { configurado: true, online, versao, periodo, atualizadoEm, indicadores: normaliza(raw) } }) };
  } catch (e) {
    const motivo = e && e.name === 'AbortError' ? 'TIMEOUT' : (e && e.message) || 'ERRO';
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, data: { configurado: true, online: false, erro: motivo, indicadores: null } }) };
  } finally {
    clearTimeout(t);
  }
};
