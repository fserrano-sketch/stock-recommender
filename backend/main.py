from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from db.database import engine
from db import models
from api.routes import analysis, portfolio, watchlist, users

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="StockRec AI",
    description="Sistema de recomendación de acciones con IA",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(analysis.router)
app.include_router(portfolio.router)
app.include_router(watchlist.router)


@app.get("/")
def root():
    return {"status": "ok", "app": "StockRec AI"}


@app.get("/health")
def health():
    return {"status": "healthy"}
