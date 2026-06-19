import resend
import os

resend.api_key = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "recomendaciones@tudominio.com")


def send_analysis_email(to_email: str, user_name: str, analysis: dict):
    rec = analysis["recommendation"]
    color = {"COMPRAR": "#22c55e", "VENDER": "#ef4444", "MANTENER": "#f59e0b"}.get(rec, "#6b7280")
    emoji = {"COMPRAR": "🟢", "VENDER": "🔴", "MANTENER": "🟡"}.get(rec, "⚪")

    bullets_html = "".join([f"<li>{b}</li>" for b in analysis.get("bullets", [])])
    risks_html = "".join([f"<li>{r}</li>" for r in analysis.get("risks", [])])

    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #38bdf8; font-size: 24px; margin: 0;">StockRec AI</h1>
        <p style="color: #94a3b8; margin: 4px 0;">Análisis de {analysis.get('ticker')}</p>
      </div>

      <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid {color};">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="margin: 0; font-size: 28px;">{analysis.get('ticker')}</h2>
            <p style="margin: 4px 0; color: #94a3b8;">{analysis.get('company_name')}</p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 32px;">{emoji}</div>
            <div style="font-size: 20px; font-weight: bold; color: {color};">{rec}</div>
            <div style="font-size: 24px; color: {color}; font-weight: bold;">{analysis.get('score')}/100</div>
          </div>
        </div>
        <p style="margin: 12px 0 0; color: #cbd5e1; font-style: italic;">{analysis.get('summary')}</p>
      </div>

      <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #38bdf8; margin-top: 0;">📊 Argumentos del análisis</h3>
        <ul style="padding-left: 20px; color: #cbd5e1; line-height: 1.8;">{bullets_html}</ul>
      </div>

      <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #f59e0b; margin-top: 0;">⚠️ Riesgos a considerar</h3>
        <ul style="padding-left: 20px; color: #cbd5e1; line-height: 1.8;">{risks_html}</ul>
      </div>

      <p style="text-align: center; color: #475569; font-size: 12px;">
        Este análisis es generado por IA y no constituye asesoramiento financiero.<br>
        Siempre consulta con un profesional antes de invertir.
      </p>
    </div>
    """

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": [to_email],
        "subject": f"{emoji} {analysis.get('ticker')}: {rec} ({analysis.get('score')}/100) — StockRec AI",
        "html": html,
    })


def send_welcome_email(to_email: str, user_name: str):
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px;">
      <h1 style="color: #38bdf8;">Bienvenido a StockRec AI, {user_name}!</h1>
      <p>Ya puedes analizar acciones y recibir recomendaciones inteligentes directamente en tu correo.</p>
      <p style="color: #94a3b8; font-size: 12px;">Este análisis es generado por IA y no constituye asesoramiento financiero.</p>
    </div>
    """
    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": [to_email],
        "subject": "Bienvenido a StockRec AI 🚀",
        "html": html,
    })
