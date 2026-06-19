from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.database import get_db
from db.models import Watchlist, Analysis, EmailSubscription
from api.auth import get_current_user
from db.models import User

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


class WatchlistAdd(BaseModel):
    ticker: str


class SubscriptionAdd(BaseModel):
    ticker: str
    frequency: str = "daily"  # daily, weekly, instant


@router.get("/")
def get_watchlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.query(Watchlist).filter(Watchlist.user_id == current_user.id).all()
    result = []
    for item in items:
        latest = db.query(Analysis).filter(
            Analysis.ticker == item.ticker
        ).order_by(Analysis.created_at.desc()).first()

        result.append({
            "id": item.id,
            "ticker": item.ticker,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "latest_analysis": {
                "recommendation": latest.recommendation,
                "score": latest.score,
                "price": latest.price,
                "price_change_pct": latest.price_change_pct,
                "created_at": latest.created_at.isoformat() if latest.created_at else None,
            } if latest else None,
        })
    return result


@router.post("/")
def add_to_watchlist(
    req: WatchlistAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticker = req.ticker.upper().strip()
    existing = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.ticker == ticker,
    ).first()
    if existing:
        return {"ok": True, "message": "Ya está en tu watchlist"}

    db.add(Watchlist(user_id=current_user.id, ticker=ticker))
    db.commit()
    return {"ok": True, "ticker": ticker}


@router.delete("/{ticker}")
def remove_from_watchlist(
    ticker: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.ticker == ticker.upper(),
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="No está en tu watchlist")
    db.delete(item)
    db.commit()
    return {"ok": True}


@router.get("/subscriptions")
def get_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subs = db.query(EmailSubscription).filter(
        EmailSubscription.user_id == current_user.id
    ).all()
    return [
        {
            "id": s.id,
            "ticker": s.ticker,
            "frequency": s.frequency,
            "active": s.active,
        }
        for s in subs
    ]


@router.post("/subscriptions")
def add_subscription(
    req: SubscriptionAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticker = req.ticker.upper().strip()
    existing = db.query(EmailSubscription).filter(
        EmailSubscription.user_id == current_user.id,
        EmailSubscription.ticker == ticker,
    ).first()
    if existing:
        existing.active = True
        existing.frequency = req.frequency
        db.commit()
        return {"ok": True, "message": "Suscripción actualizada"}

    db.add(EmailSubscription(
        user_id=current_user.id,
        ticker=ticker,
        frequency=req.frequency,
    ))
    db.commit()
    return {"ok": True, "ticker": ticker, "frequency": req.frequency}


@router.delete("/subscriptions/{ticker}")
def remove_subscription(
    ticker: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = db.query(EmailSubscription).filter(
        EmailSubscription.user_id == current_user.id,
        EmailSubscription.ticker == ticker.upper(),
    ).first()
    if sub:
        db.delete(sub)
        db.commit()
    return {"ok": True}
