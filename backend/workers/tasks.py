from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

celery_app = Celery(
    "stockrec",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
)

celery_app.conf.beat_schedule = {
    "send-daily-subscriptions": {
        "task": "workers.tasks.send_daily_subscriptions",
        "schedule": 60 * 60 * 24,  # every 24 hours
    },
}


@celery_app.task
def analyze_ticker_task(ticker: str, user_email: str | None = None):
    """Background task: run analysis and optionally email the result."""
    from services.data_fetcher import get_stock_data, get_news, get_macro_data, get_sector_performance
    from services.claude_service import generate_stock_analysis
    from db.database import SessionLocal
    from db.models import Analysis

    stock_data = get_stock_data(ticker)
    news = get_news(ticker)
    macro = get_macro_data()
    sector_perf = get_sector_performance(stock_data.get("sector", ""))

    result = generate_stock_analysis(stock_data, news, macro, sector_perf)

    db = SessionLocal()
    try:
        analysis = Analysis(
            ticker=ticker.upper(),
            company_name=stock_data.get("company_name"),
            sector=stock_data.get("sector"),
            recommendation=result.get("recommendation"),
            score=result.get("score"),
            bullets=result.get("bullets"),
            price=stock_data.get("price"),
            price_change_pct=stock_data.get("price_change_pct"),
            pe_ratio=stock_data.get("pe_ratio"),
            market_cap=stock_data.get("market_cap"),
            data_snapshot={**stock_data, "news_count": len(news)},
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        if user_email:
            from services.email_service import send_analysis_email
            send_analysis_email(user_email, "", {**result, **stock_data})

        return {"id": analysis.id, "recommendation": result.get("recommendation")}
    finally:
        db.close()


@celery_app.task
def send_daily_subscriptions():
    """Send daily email alerts to all active subscribers."""
    from db.database import SessionLocal
    from db.models import EmailSubscription, User
    from services.data_fetcher import get_stock_data, get_news, get_macro_data, get_sector_performance
    from services.claude_service import generate_stock_analysis
    from services.email_service import send_analysis_email

    db = SessionLocal()
    try:
        subs = db.query(EmailSubscription).filter(
            EmailSubscription.active == True,
            EmailSubscription.frequency == "daily"
        ).all()

        processed = set()
        for sub in subs:
            ticker = sub.ticker
            user = db.query(User).filter(User.id == sub.user_id).first()
            if not user:
                continue

            if ticker not in processed:
                stock_data = get_stock_data(ticker)
                news = get_news(ticker)
                macro = get_macro_data()
                sector_perf = get_sector_performance(stock_data.get("sector", ""))
                result = generate_stock_analysis(stock_data, news, macro, sector_perf)
                processed[ticker] = {**result, **stock_data}

            send_analysis_email(user.email, user.name or "", processed[ticker])
    finally:
        db.close()
