import anthropic
import os
import json

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))


def generate_stock_analysis(stock_data: dict, news: list, macro: dict, sector_perf: dict) -> dict:
    """Generate stock recommendation with bullets using Claude."""

    news_text = "\n".join([f"- {n['title']} ({n['source']})" for n in news[:6]]) or "No hay noticias recientes."

    prompt = f"""Eres un analista financiero experto. Analiza la siguiente acción y genera una recomendación fundamentada.

## DATOS DE LA ACCIÓN: {stock_data['ticker']} - {stock_data['company_name']}
**Sector:** {stock_data['sector']} | **Industria:** {stock_data['industry']}
**Precio actual:** ${stock_data.get('price', 'N/A')} ({stock_data.get('price_change_pct', 0):+.2f}% hoy)
**Capitalización:** ${stock_data.get('market_cap', 0):,.0f}

### Valoración
- P/E Trailing: {stock_data.get('pe_ratio', 'N/A')}
- P/E Forward: {stock_data.get('forward_pe', 'N/A')}
- P/B: {stock_data.get('pb_ratio', 'N/A')}
- P/S: {stock_data.get('ps_ratio', 'N/A')}
- EV/EBITDA: {stock_data.get('ev_ebitda', 'N/A')}

### Fundamentos
- EPS: {stock_data.get('eps', 'N/A')}
- Crecimiento EPS: {_pct(stock_data.get('eps_growth'))}
- Crecimiento ingresos: {_pct(stock_data.get('revenue_growth'))}
- Margen neto: {_pct(stock_data.get('profit_margin'))}
- ROE: {_pct(stock_data.get('roe'))}
- Deuda/Patrimonio: {stock_data.get('debt_to_equity', 'N/A')}
- Ratio corriente: {stock_data.get('current_ratio', 'N/A')}
- Beta: {stock_data.get('beta', 'N/A')}

### Técnico
- RSI (14): {stock_data.get('rsi', 'N/A')}
- MACD: {stock_data.get('macd', 'N/A')} | Signal: {stock_data.get('macd_signal', 'N/A')}
- MA50: ${stock_data.get('ma50', 'N/A')} | MA200: ${stock_data.get('ma200', 'N/A')}
- Máx 52s: ${stock_data.get('52w_high', 'N/A')} | Mín 52s: ${stock_data.get('52w_low', 'N/A')}
- Precio objetivo analistas: ${stock_data.get('target_price', 'N/A')} ({stock_data.get('analyst_count', 0)} analistas)

### Sector ({stock_data.get('sector', 'N/A')})
- Rendimiento 1 mes: {sector_perf.get('perf_1m', 'N/A')}%
- Rendimiento 3 meses: {sector_perf.get('perf_3m', 'N/A')}%

### Macroeconomía
- Tasa Fed Funds: {macro.get('fed_funds_rate', 'N/A')}%
- CPI (inflación): {macro.get('cpi_yoy', 'N/A')}
- Desempleo: {macro.get('unemployment_rate', 'N/A')}%
- Bono 10 años: {macro.get('10y_treasury', 'N/A')}%
- VIX: {macro.get('vix', 'N/A')}

### Noticias recientes
{news_text}

---
Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{{
  "recommendation": "COMPRAR" | "VENDER" | "MANTENER",
  "score": <número 0-100>,
  "summary": "<una oración resumiendo la tesis>",
  "bullets": [
    "<bullet 1 con argumento concreto>",
    "<bullet 2>",
    "<bullet 3>",
    "<bullet 4>",
    "<bullet 5>",
    "<bullet 6>"
  ],
  "risks": [
    "<riesgo principal 1>",
    "<riesgo principal 2>"
  ],
  "time_horizon": "corto plazo" | "mediano plazo" | "largo plazo"
}}

Los bullets deben ser específicos, con datos concretos del análisis. No uses frases genéricas.
Score: 0-35=VENDER, 36-60=MANTENER, 61-100=COMPRAR."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def generate_portfolio_analysis(tickers: list[str], optimizations: dict, current_weights: dict | None) -> dict:
    """Generate portfolio recommendation bullets using Claude."""

    current_text = ""
    if current_weights:
        current_text = "\n### Portafolio actual\n" + "\n".join(
            [f"- {t}: {w:.1%}" for t, w in current_weights.items()]
        )

    markowitz = optimizations.get("markowitz", {})
    sharpe = optimizations.get("sharpe", {})
    correlation = optimizations.get("correlation", {})

    def fmt_weights(w: dict) -> str:
        return "\n".join([f"- {t}: {v:.1%}" for t, v in sorted(w.items(), key=lambda x: -x[1])])

    prompt = f"""Eres un gestor de portafolios experto. Analiza los resultados de optimización y genera recomendaciones claras.

## ACTIVOS ANALIZADOS
{', '.join(tickers)}
{current_text}

## RESULTADOS DE OPTIMIZACIÓN

### 1. Markowitz (Mínima Varianza)
Pesos óptimos:
{fmt_weights(markowitz.get('weights', {}))}
- Retorno esperado anual: {markowitz.get('expected_return', 0):.2%}
- Volatilidad esperada: {markowitz.get('volatility', 0):.2%}
- Sharpe Ratio: {markowitz.get('sharpe', 0):.2f}

### 2. Máximo Sharpe Ratio
Pesos óptimos:
{fmt_weights(sharpe.get('weights', {}))}
- Retorno esperado anual: {sharpe.get('expected_return', 0):.2%}
- Volatilidad esperada: {sharpe.get('volatility', 0):.2%}
- Sharpe Ratio: {sharpe.get('sharpe', 0):.2f}

### 3. Correlación / Diversificación
{json.dumps(correlation.get('correlation_matrix', {}), indent=2)}
Activos con alta correlación (>0.7): {correlation.get('high_correlation_pairs', [])}

---
Responde ÚNICAMENTE con un JSON válido:
{{
  "recommended_method": "markowitz" | "sharpe" | "blended",
  "summary": "<tesis principal del portafolio en una oración>",
  "bullets": [
    "<insight 1 con datos concretos>",
    "<insight 2>",
    "<insight 3>",
    "<insight 4>",
    "<insight 5>"
  ],
  "rebalancing_actions": [
    "<acción concreta de rebalanceo si aplica>"
  ],
  "diversification_score": <0-100>,
  "risk_level": "conservador" | "moderado" | "agresivo"
}}"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def _pct(val) -> str:
    if val is None:
        return "N/A"
    return f"{float(val):.2%}"
