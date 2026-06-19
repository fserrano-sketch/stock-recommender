import yfinance as yf
import httpx
import os
import requests
from datetime import datetime, timedelta
from fredapi import Fred
import pandas as pd


RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "")
FRED_API_KEY = os.getenv("FRED_API_KEY", "")

def _yf_session():
    s = requests.Session()
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    })
    return s


def get_stock_data(ticker: str) -> dict:
    """Fetch comprehensive stock data from yfinance."""
    stock = yf.Ticker(ticker, session=_yf_session())
    info = stock.info

    hist_1y = stock.history(period="1y")
    hist_3m = stock.history(period="3mo")

    price = info.get("currentPrice") or info.get("regularMarketPrice") or (
        hist_1y["Close"].iloc[-1] if not hist_1y.empty else None
    )
    prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose")
    price_change_pct = ((price - prev_close) / prev_close * 100) if price and prev_close else 0

    # Technical indicators
    closes = hist_3m["Close"] if not hist_3m.empty else pd.Series()
    rsi = _calc_rsi(closes)
    macd, signal = _calc_macd(closes)
    ma50 = closes.rolling(50).mean().iloc[-1] if len(closes) >= 50 else None
    ma200 = hist_1y["Close"].rolling(200).mean().iloc[-1] if len(hist_1y) >= 200 else None

    # Price history for sparkline (30 days)
    hist_30d = stock.history(period="1mo")
    sparkline = hist_30d["Close"].tolist() if not hist_30d.empty else []

    return {
        "ticker": ticker.upper(),
        "company_name": info.get("longName", ticker),
        "sector": info.get("sector", "N/A"),
        "industry": info.get("industry", "N/A"),
        "price": price,
        "price_change_pct": round(price_change_pct, 2),
        "market_cap": info.get("marketCap"),
        "pe_ratio": info.get("trailingPE"),
        "forward_pe": info.get("forwardPE"),
        "pb_ratio": info.get("priceToBook"),
        "ps_ratio": info.get("priceToSalesTrailing12Months"),
        "ev_ebitda": info.get("enterpriseToEbitda"),
        "eps": info.get("trailingEps"),
        "eps_growth": info.get("earningsGrowth"),
        "revenue_growth": info.get("revenueGrowth"),
        "profit_margin": info.get("profitMargins"),
        "roe": info.get("returnOnEquity"),
        "debt_to_equity": info.get("debtToEquity"),
        "current_ratio": info.get("currentRatio"),
        "dividend_yield": info.get("dividendYield"),
        "beta": info.get("beta"),
        "52w_high": info.get("fiftyTwoWeekHigh"),
        "52w_low": info.get("fiftyTwoWeekLow"),
        "target_price": info.get("targetMeanPrice"),
        "analyst_recommendation": info.get("recommendationKey"),
        "analyst_count": info.get("numberOfAnalystOpinions"),
        "rsi": round(rsi, 2) if rsi else None,
        "macd": round(macd, 4) if macd else None,
        "macd_signal": round(signal, 4) if signal else None,
        "ma50": round(float(ma50), 2) if ma50 else None,
        "ma200": round(float(ma200), 2) if ma200 else None,
        "sparkline": [round(p, 2) for p in sparkline],
        "description": info.get("longBusinessSummary", "")[:500],
    }


def get_news(ticker: str) -> list[dict]:
    """Fetch recent news from Seeking Alpha via RapidAPI."""
    if not RAPIDAPI_KEY:
        return _get_yfinance_news(ticker)

    try:
        url = "https://seeking-alpha.p.rapidapi.com/news/v2/list-by-symbol"
        headers = {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": "seeking-alpha.p.rapidapi.com"
        }
        params = {"id": ticker, "size": "10"}

        with httpx.Client(timeout=10) as client:
            resp = client.get(url, headers=headers, params=params)
            if resp.status_code == 200:
                data = resp.json()
                articles = data.get("data", [])
                return [
                    {
                        "title": a.get("attributes", {}).get("title", ""),
                        "summary": a.get("attributes", {}).get("summary", ""),
                        "published": a.get("attributes", {}).get("publishOn", ""),
                        "source": "Seeking Alpha",
                    }
                    for a in articles[:8]
                ]
    except Exception:
        pass

    return _get_yfinance_news(ticker)


def _get_yfinance_news(ticker: str) -> list[dict]:
    stock = yf.Ticker(ticker, session=_yf_session())
    news = stock.news or []
    return [
        {
            "title": n.get("title", ""),
            "summary": n.get("summary", ""),
            "published": datetime.fromtimestamp(n.get("providerPublishTime", 0)).isoformat(),
            "source": n.get("publisher", "Yahoo Finance"),
        }
        for n in news[:8]
    ]


def get_macro_data() -> dict:
    """Fetch macro economic indicators from FRED."""
    if not FRED_API_KEY:
        return {"note": "FRED API key not configured"}

    try:
        fred = Fred(api_key=FRED_API_KEY)
        end = datetime.now()
        start = end - timedelta(days=90)

        def safe_get(series_id):
            try:
                s = fred.get_series(series_id, observation_start=start)
                return round(float(s.dropna().iloc[-1]), 4) if not s.empty else None
            except Exception:
                return None

        return {
            "fed_funds_rate": safe_get("FEDFUNDS"),
            "cpi_yoy": safe_get("CPIAUCSL"),
            "unemployment_rate": safe_get("UNRATE"),
            "gdp_growth": safe_get("A191RL1Q225SBEA"),
            "10y_treasury": safe_get("GS10"),
            "vix": safe_get("VIXCLS"),
        }
    except Exception as e:
        return {"error": str(e)}


def get_sector_performance(sector: str) -> dict:
    """Get sector ETF performance as proxy for sector health."""
    sector_etfs = {
        "Technology": "XLK",
        "Healthcare": "XLV",
        "Financials": "XLF",
        "Consumer Discretionary": "XLY",
        "Consumer Staples": "XLP",
        "Energy": "XLE",
        "Industrials": "XLI",
        "Materials": "XLB",
        "Real Estate": "XLRE",
        "Utilities": "XLU",
        "Communication Services": "XLC",
    }

    etf = sector_etfs.get(sector)
    if not etf:
        return {}

    try:
        stock = yf.Ticker(etf, session=_yf_session())
        hist = stock.history(period="3mo")
        if hist.empty:
            return {}
        perf_3m = (hist["Close"].iloc[-1] / hist["Close"].iloc[0] - 1) * 100
        hist_1m = stock.history(period="1mo")
        perf_1m = (hist_1m["Close"].iloc[-1] / hist_1m["Close"].iloc[0] - 1) * 100 if not hist_1m.empty else 0
        return {
            "etf": etf,
            "perf_1m": round(perf_1m, 2),
            "perf_3m": round(perf_3m, 2),
        }
    except Exception:
        return {}


def get_historical_prices(ticker: str, period: str = "1y") -> list[dict]:
    """Return OHLCV data for charts."""
    stock = yf.Ticker(ticker, session=_yf_session())
    hist = stock.history(period=period)
    if hist.empty:
        return []
    return [
        {
            "date": str(idx.date()),
            "open": round(row["Open"], 2),
            "high": round(row["High"], 2),
            "low": round(row["Low"], 2),
            "close": round(row["Close"], 2),
            "volume": int(row["Volume"]),
        }
        for idx, row in hist.iterrows()
    ]


def _calc_rsi(closes: pd.Series, period: int = 14) -> float | None:
    if len(closes) < period + 1:
        return None
    delta = closes.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return float(rsi.iloc[-1])


def _calc_macd(closes: pd.Series) -> tuple[float | None, float | None]:
    if len(closes) < 26:
        return None, None
    ema12 = closes.ewm(span=12).mean()
    ema26 = closes.ewm(span=26).mean()
    macd = ema12 - ema26
    signal = macd.ewm(span=9).mean()
    return float(macd.iloc[-1]), float(signal.iloc[-1])
