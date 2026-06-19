import numpy as np
import pandas as pd
import yfinance as yf
from scipy.optimize import minimize


def get_returns(tickers: list[str], period: str = "2y") -> pd.DataFrame:
    """Download historical returns for a list of tickers."""
    data = yf.download(tickers, period=period, auto_adjust=True, progress=False)
    if isinstance(data.columns, pd.MultiIndex):
        prices = data["Close"]
    else:
        prices = data[["Close"]] if "Close" in data.columns else data
    returns = prices.pct_change().dropna()
    return returns


def markowitz_optimization(tickers: list[str]) -> dict:
    """Minimum variance portfolio (Markowitz)."""
    returns = get_returns(tickers)
    mu = returns.mean() * 252
    cov = returns.cov() * 252
    n = len(tickers)

    def portfolio_variance(w):
        return float(w @ cov.values @ w)

    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1}]
    bounds = [(0.05, 0.6) for _ in range(n)]
    w0 = np.array([1 / n] * n)

    result = minimize(portfolio_variance, w0, method="SLSQP", bounds=bounds, constraints=constraints)

    weights = dict(zip(tickers, [round(float(w), 4) for w in result.x]))
    w = result.x
    exp_return = float(w @ mu.values)
    volatility = float(np.sqrt(w @ cov.values @ w))
    sharpe = (exp_return - 0.05) / volatility if volatility > 0 else 0

    return {
        "weights": weights,
        "expected_return": round(exp_return, 4),
        "volatility": round(volatility, 4),
        "sharpe": round(sharpe, 4),
    }


def max_sharpe_optimization(tickers: list[str], risk_free: float = 0.05) -> dict:
    """Maximum Sharpe Ratio portfolio."""
    returns = get_returns(tickers)
    mu = returns.mean() * 252
    cov = returns.cov() * 252
    n = len(tickers)

    def neg_sharpe(w):
        r = float(w @ mu.values)
        v = float(np.sqrt(w @ cov.values @ w))
        return -(r - risk_free) / v if v > 0 else 0

    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1}]
    bounds = [(0.05, 0.6) for _ in range(n)]
    w0 = np.array([1 / n] * n)

    result = minimize(neg_sharpe, w0, method="SLSQP", bounds=bounds, constraints=constraints)

    weights = dict(zip(tickers, [round(float(w), 4) for w in result.x]))
    w = result.x
    exp_return = float(w @ mu.values)
    volatility = float(np.sqrt(w @ cov.values @ w))
    sharpe = (exp_return - risk_free) / volatility if volatility > 0 else 0

    return {
        "weights": weights,
        "expected_return": round(exp_return, 4),
        "volatility": round(volatility, 4),
        "sharpe": round(sharpe, 4),
    }


def correlation_analysis(tickers: list[str]) -> dict:
    """Correlation matrix and diversification analysis."""
    returns = get_returns(tickers)
    corr = returns.corr()

    # Find high correlation pairs
    high_pairs = []
    for i in range(len(tickers)):
        for j in range(i + 1, len(tickers)):
            val = corr.iloc[i, j]
            if abs(val) > 0.7:
                high_pairs.append({
                    "pair": [tickers[i], tickers[j]],
                    "correlation": round(float(val), 3),
                })

    # Average correlation as diversification proxy
    avg_corr = (corr.values.sum() - len(tickers)) / (len(tickers) * (len(tickers) - 1)) if len(tickers) > 1 else 0

    corr_matrix = {
        t: {t2: round(float(corr.loc[t, t2]), 3) for t2 in tickers}
        for t in tickers
        if t in corr.index
    }

    return {
        "correlation_matrix": corr_matrix,
        "high_correlation_pairs": high_pairs,
        "avg_correlation": round(float(avg_corr), 3),
        "diversification_score": round((1 - abs(float(avg_corr))) * 100, 1),
    }


def efficient_frontier(tickers: list[str], n_points: int = 50) -> list[dict]:
    """Compute efficient frontier points for chart."""
    returns = get_returns(tickers)
    mu = returns.mean() * 252
    cov = returns.cov() * 252
    n = len(tickers)

    min_ret = float(mu.min())
    max_ret = float(mu.max())
    target_returns = np.linspace(min_ret, max_ret, n_points)

    frontier = []
    for target in target_returns:
        constraints = [
            {"type": "eq", "fun": lambda w: np.sum(w) - 1},
            {"type": "eq", "fun": lambda w, t=target: float(w @ mu.values) - t},
        ]
        bounds = [(0.0, 1.0) for _ in range(n)]
        w0 = np.array([1 / n] * n)

        try:
            result = minimize(
                lambda w: float(w @ cov.values @ w),
                w0, method="SLSQP", bounds=bounds, constraints=constraints
            )
            if result.success:
                vol = float(np.sqrt(result.fun))
                frontier.append({"return": round(float(target), 4), "volatility": round(vol, 4)})
        except Exception:
            pass

    return frontier


def optimize_portfolio(tickers: list[str], current_weights: dict | None = None) -> dict:
    """Run all three optimization methods and return combined results."""
    tickers = [t.upper() for t in tickers]

    markowitz = markowitz_optimization(tickers)
    sharpe = max_sharpe_optimization(tickers)
    correlation = correlation_analysis(tickers)
    frontier = efficient_frontier(tickers, n_points=30) if len(tickers) >= 2 else []

    result = {
        "tickers": tickers,
        "markowitz": markowitz,
        "sharpe": sharpe,
        "correlation": correlation,
        "efficient_frontier": frontier,
    }

    if current_weights:
        result["current_weights"] = current_weights
        result["rebalancing"] = _compute_rebalancing(
            current_weights, sharpe["weights"]
        )

    return result


def _compute_rebalancing(current: dict, optimal: dict) -> list[dict]:
    """Compute rebalancing actions: what to buy/sell."""
    actions = []
    all_tickers = set(list(current.keys()) + list(optimal.keys()))
    for t in all_tickers:
        cur = current.get(t, 0)
        opt = optimal.get(t, 0)
        diff = opt - cur
        if abs(diff) > 0.01:
            actions.append({
                "ticker": t,
                "current": round(cur, 4),
                "optimal": round(opt, 4),
                "action": "COMPRAR" if diff > 0 else "VENDER",
                "change": round(diff, 4),
            })
    return sorted(actions, key=lambda x: abs(x["change"]), reverse=True)
