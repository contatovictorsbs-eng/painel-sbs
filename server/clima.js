/* Clima — proxy Open-Meteo (grátis, sem chave). Espelha a tela "Clima & tempo".
   GET /api/clima?lat=-12.545&lon=-55.711
   Retorna condição atual + previsão 7 dias. */
exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const lat = q.lat, lon = q.lon;
    if (!lat || !lon) return json(400, { ok:false, erro:'lat/lon obrigatórios' });
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
      + `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum`
      + `&timezone=America/Sao_Paulo&forecast_days=7`;
    const r = await fetch(url);
    const d = await r.json();
    const atual = {
      temp: d.current?.temperature_2m, umidade: d.current?.relative_humidity_2m,
      vento: d.current?.wind_speed_10m, chuva: d.current?.precipitation, code: d.current?.weather_code
    };
    const dias = (d.daily?.time||[]).map((t,i)=>({
      data: t, code: d.daily.weather_code[i],
      max: d.daily.temperature_2m_max[i], min: d.daily.temperature_2m_min[i],
      chuva: d.daily.precipitation_sum[i]
    }));
    return json(200, { ok:true, data:{ atual, dias } });
  } catch (e) { return json(500, { ok:false, erro:e.message }); }
};
function json(code, body){ return { statusCode:code, headers:{'content-type':'application/json'}, body: JSON.stringify(body) }; }
