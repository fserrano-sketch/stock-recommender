const GRADIENTS = [
  'linear-gradient(135deg, #38bdf8, #0284c7)',
  'linear-gradient(135deg, #a78bfa, #7c3aed)',
  'linear-gradient(135deg, #34d399, #059669)',
  'linear-gradient(135deg, #f472b6, #db2777)',
  'linear-gradient(135deg, #fb923c, #ea580c)',
  'linear-gradient(135deg, #fbbf24, #d97706)',
  'linear-gradient(135deg, #38bdf8, #a78bfa)',
  'linear-gradient(135deg, #34d399, #a78bfa)',
  'linear-gradient(135deg, #f472b6, #fb923c)',
]

export function getTickerGradient(ticker) {
  let hash = 0
  for (let i = 0; i < ticker.length; i++) hash = ticker.charCodeAt(i) + ((hash << 5) - hash)
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

// Map popular tickers to their website domains for logo fetching
const TICKER_DOMAINS = {
  AAPL: 'apple.com', MSFT: 'microsoft.com', GOOGL: 'google.com', AMZN: 'amazon.com',
  NVDA: 'nvidia.com', META: 'meta.com', TSLA: 'tesla.com', JPM: 'jpmorgan.com',
  V: 'visa.com', UNH: 'unitedhealthgroup.com', XOM: 'exxonmobil.com', MA: 'mastercard.com',
  AVGO: 'broadcom.com', JNJ: 'jnj.com', PG: 'pg.com', HD: 'homedepot.com',
  COST: 'costco.com', MRK: 'merck.com', ABBV: 'abbvie.com', CVX: 'chevron.com',
  KO: 'coca-cola.com', PEP: 'pepsico.com', BAC: 'bankofamerica.com', WMT: 'walmart.com',
  MCD: 'mcdonalds.com', CSCO: 'cisco.com', DIS: 'disney.com', NFLX: 'netflix.com',
  ADBE: 'adobe.com', CRM: 'salesforce.com', AMD: 'amd.com', INTC: 'intel.com',
  QCOM: 'qualcomm.com', TXN: 'ti.com', ORCL: 'oracle.com', IBM: 'ibm.com',
  NKE: 'nike.com', SBUX: 'starbucks.com', PYPL: 'paypal.com', UBER: 'uber.com',
  SHOP: 'shopify.com', SPOT: 'spotify.com', ABNB: 'airbnb.com', COIN: 'coinbase.com',
  PLTR: 'palantir.com', RIVN: 'rivian.com', F: 'ford.com', GM: 'gm.com',
  GS: 'goldmansachs.com', MS: 'morganstanley.com', WFC: 'wellsfargo.com', C: 'citi.com',
  AMGN: 'amgen.com', GILD: 'gilead.com', PFE: 'pfizer.com', MRNA: 'modernatx.com',
  BABA: 'alibaba.com', TSM: 'tsmc.com', ASML: 'asml.com', SAP: 'sap.com',
  SPY: 'ssga.com', QQQ: 'invesco.com', GE: 'ge.com', CAT: 'caterpillar.com', BA: 'boeing.com',
}

export function getLogoUrl(ticker) {
  const domain = TICKER_DOMAINS[ticker?.toUpperCase()]
  if (!domain) return null
  return `https://logo.clearbit.com/${domain}`
}
