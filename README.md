# StockRec AI

Sistema de recomendación de acciones con inteligencia artificial.

## Stack
- **Backend:** Python + FastAPI + SQLAlchemy + Celery
- **Frontend:** React + Tailwind CSS + Recharts (PWA instalable)
- **DB:** PostgreSQL | **Cache:** Redis
- **IA:** Claude claude-sonnet-4-6 (Anthropic)
- **Datos:** yfinance + Seeking Alpha (RapidAPI) + FRED
- **Email:** Resend

---

## Inicio rápido (local)

### 1. Clonar y configurar variables

```bash
cd backend
cp .env.example .env
# Editar .env con tus API keys
```

Keys necesarias:
| Variable | Dónde obtenerla | Costo |
|----------|----------------|-------|
| `ANTHROPIC_API_KEY` | console.anthropic.com | Pay per use |
| `RAPIDAPI_KEY` | rapidapi.com → Seeking Alpha | ~$10/mes (opcional) |
| `FRED_API_KEY` | fred.stlouisfed.org/docs/api | Gratis |
| `RESEND_API_KEY` | resend.com | Gratis hasta 3k emails/mes |
| `SECRET_KEY` | Cualquier string aleatorio largo | — |

### 2. Levantar con Docker Compose

```bash
docker-compose up --build
```

Accede a:
- **Frontend:** http://localhost:5173
- **API docs:** http://localhost:8000/docs

### 3. Sin Docker (desarrollo)

**Backend:**
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # completar API keys
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**PostgreSQL y Redis** (necesarios):
```bash
# Con Docker solo las dependencias:
docker run -d -p 5432:5432 -e POSTGRES_DB=stockrec -e POSTGRES_USER=stockrec -e POSTGRES_PASSWORD=stockrec123 postgres:16-alpine
docker run -d -p 6379:6379 redis:7-alpine
```

---

## Deploy en Railway

1. Crear cuenta en [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Agregar servicios: PostgreSQL y Redis desde Railway marketplace
4. Configurar variables de entorno en el servicio backend
5. El frontend se puede deployar en Railway o en Vercel/Netlify

```bash
# Variables de entorno en Railway (backend):
DATABASE_URL=<provisto por Railway>
REDIS_URL=<provisto por Railway>
ANTHROPIC_API_KEY=...
RAPIDAPI_KEY=...
FRED_API_KEY=...
RESEND_API_KEY=...
SECRET_KEY=<string aleatorio>
APP_URL=https://tu-frontend.railway.app
```

---

## Funcionalidades

### 🔍 Análisis de acciones
- Ingresa cualquier ticker (AAPL, TSLA, NVDA, etc.)
- Análisis fundamental: P/E, ROE, márgenes, deuda, crecimiento
- Análisis técnico: RSI, MACD, medias móviles
- Noticias recientes (Seeking Alpha / Yahoo Finance)
- Contexto macroeconómico (FRED: tasas, inflación, desempleo)
- Claude genera 6-8 bullets argumentados + riesgos
- Score 0-100 con recomendación: COMPRAR / MANTENER / VENDER

### 📊 Portafolio
- **Modo construcción:** lista tickers → pesos óptimos
- **Modo revisión:** carga tu portafolio actual → compara vs óptimo → rebalanceo
- 3 metodologías: Markowitz (mínima varianza), Máximo Sharpe, Correlación
- Frontera eficiente interactiva
- Matriz de correlación para detectar solapamientos
- Claude argumenta la composición óptima

### ⭐ Watchlist
- Seguimiento de tickers favoritos
- Última recomendación de cada ticker
- Actualización manual con un clic
- Suscripción a alertas por email

### 📧 Alertas
- Email HTML diseñado al hacer análisis (modo instantáneo)
- Tarea Celery diaria para enviar resumen a suscriptores
- Push notifications (PWA) cuando hay nueva recomendación

### 📱 PWA
- Instalable en móvil desde el navegador (sin app store)
- Funciona offline (datos cacheados)
- Diseño responsivo

---

## Estructura del proyecto

```
stock-recommender/
├── backend/
│   ├── main.py                    # FastAPI app
│   ├── api/routes/
│   │   ├── analysis.py            # Análisis de tickers
│   │   ├── portfolio.py           # Optimización de portafolios
│   │   ├── watchlist.py           # Watchlist y suscripciones
│   │   └── users.py               # Auth (register/login)
│   ├── services/
│   │   ├── data_fetcher.py        # yfinance + Seeking Alpha + FRED
│   │   ├── claude_service.py      # Claude API prompts
│   │   ├── portfolio_optimizer.py # Markowitz + Sharpe + correlación
│   │   └── email_service.py       # Resend emails
│   ├── db/
│   │   ├── models.py              # SQLAlchemy models
│   │   └── database.py            # Conexión DB
│   └── workers/tasks.py           # Celery background tasks
└── frontend/
    └── src/
        ├── pages/
        │   ├── Home.jsx           # Buscador + feed de recomendaciones
        │   ├── Analysis.jsx       # Detalle del análisis
        │   ├── Watchlist.jsx      # Watchlist personal
        │   ├── Portfolio.jsx      # Análisis de portafolio
        │   ├── Profile.jsx        # Perfil y suscripciones
        │   └── Login.jsx          # Auth
        └── components/
            ├── Layout.jsx
            ├── RecommendationCard.jsx
            ├── ScoreBadge.jsx
            └── Sparkline.jsx
```

---

> ⚠️ **Disclaimer:** Los análisis son generados por IA con fines informativos. No constituyen asesoramiento financiero. Siempre consulta con un profesional antes de invertir.
