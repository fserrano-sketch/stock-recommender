from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import Analysis
from api.auth import get_optional_user
from db.models import User

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/")
def list_analyses(
    sector: str | None = Query(None),
    recommendation: str | None = Query(None),
    period: str | None = Query("today"),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
):
    """List recent analyses — the recommendation feed."""
    from datetime import datetime, timedelta
    q = db.query(Analysis)

    if sector:
        q = q.filter(Analysis.sector == sector)
    if recommendation:
        q = q.filter(Analysis.recommendation == recommendation.upper())
    if period == "today":
        q = q.filter(Analysis.created_at >= datetime.utcnow().replace(hour=0, minute=0))
    elif period == "7d":
        q = q.filter(Analysis.created_at >= datetime.utcnow() - timedelta(days=7))

    analyses = q.order_by(Analysis.created_at.desc()).limit(limit * 3).all()

    # Deduplicate: keep only the most recent per ticker
    seen = set()
    unique = []
    for a in analyses:
        if a.ticker not in seen:
            seen.add(a.ticker)
            unique.append(a)
        if len(unique) >= limit:
            break

    return [_serialize(a) for a in unique]


@router.post("/{ticker}")
def analyze_ticker(
    ticker: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Run a full AI analysis on the given ticker. Returns result synchronously."""
    from services.data_fetcher import get_stock_data, get_news, get_macro_data, get_sector_performance
    from services.claude_service import generate_stock_analysis

    ticker = ticker.upper().strip()

    try:
        stock_data = get_stock_data(ticker)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"No se encontró el ticker {ticker}: {str(e)}")

    if not stock_data.get("price"):
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} no encontrado o sin datos de precio")

    news = get_news(ticker)
    macro = get_macro_data()
    sector_perf = get_sector_performance(stock_data.get("sector", ""))

    try:
        ai_result = generate_stock_analysis(stock_data, news, macro, sector_perf)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando análisis con IA: {str(e)}")

    analysis = Analysis(
        ticker=ticker,
        company_name=stock_data.get("company_name"),
        sector=stock_data.get("sector"),
        recommendation=ai_result.get("recommendation"),
        score=ai_result.get("score"),
        bullets=ai_result.get("bullets"),
        price=stock_data.get("price"),
        price_change_pct=stock_data.get("price_change_pct"),
        pe_ratio=stock_data.get("pe_ratio"),
        market_cap=stock_data.get("market_cap"),
        data_snapshot={**stock_data, "news_count": len(news), "macro": macro, "sector_perf": sector_perf},
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # Email to subscriber if authenticated
    if current_user:
        _maybe_notify_subscribers(ticker, {**ai_result, **stock_data}, db)

    return {
        **_serialize(analysis),
        "stock_data": stock_data,
        "news": news[:5],
        "macro": macro,
        "sector_perf": sector_perf,
        "summary": ai_result.get("summary"),
        "risks": ai_result.get("risks"),
        "time_horizon": ai_result.get("time_horizon"),
    }


@router.get("/{ticker}/history")
def get_ticker_history(ticker: str, db: Session = Depends(get_db)):
    """Return historical price data for charts."""
    from services.data_fetcher import get_historical_prices
    return get_historical_prices(ticker.upper())


@router.get("/{ticker}/latest")
def get_latest_analysis(ticker: str, db: Session = Depends(get_db)):
    analysis = db.query(Analysis).filter(
        Analysis.ticker == ticker.upper()
    ).order_by(Analysis.created_at.desc()).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="No hay análisis previos para este ticker")
    return _serialize(analysis)


def _maybe_notify_subscribers(ticker: str, analysis_data: dict, db: Session):
    from db.models import EmailSubscription, User
    from services.email_service import send_analysis_email

    instant_subs = db.query(EmailSubscription).filter(
        EmailSubscription.ticker == ticker,
        EmailSubscription.frequency == "instant",
        EmailSubscription.active == True,
    ).all()

    for sub in instant_subs:
        user = db.query(User).filter(User.id == sub.user_id).first()
        if user:
            try:
                send_analysis_email(user.email, user.name or "", analysis_data)
            except Exception:
                pass


def _serialize(a: Analysis) -> dict:
    return {
        "id": a.id,
        "ticker": a.ticker,
        "company_name": a.company_name,
        "sector": a.sector,
        "recommendation": a.recommendation,
        "score": a.score,
        "bullets": a.bullets,
        "price": a.price,
        "price_change_pct": a.price_change_pct,
        "pe_ratio": a.pe_ratio,
        "market_cap": a.market_cap,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }
