import os
from dotenv import load_dotenv
load_dotenv(override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import ai, auth, farmer, mandi, recommendation, schemes, weather

app = FastAPI(
    title="KisanSathi AI - Agricultural Intelligence & Government Schemes Platform",
    description="Personalized agricultural integration platform connecting farmer context with government schemes, deterministic eligibility, and multilingual accessibility.",
    version="1.0.0"
)

# Secure CORS Configuration for React Frontend & Mobile WebView
DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://kisansathi-ai-1-029i.onrender.com"
]

env_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
if env_origins:
    if env_origins == "*":
        allowed_origins = ["*"]
        allow_creds = False
    else:
        configured = [o.strip().rstrip("/") for o in env_origins.split(",") if o.strip()]
        allowed_origins = list(dict.fromkeys(DEFAULT_ORIGINS + configured))
        allow_creds = True
else:
    allowed_origins = DEFAULT_ORIGINS
    allow_creds = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_creds,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router)
app.include_router(schemes.router)
app.include_router(farmer.router)
app.include_router(weather.router)
app.include_router(mandi.router)
app.include_router(recommendation.router)
app.include_router(ai.router)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "KisanSathi AI Backend",
        "module": "Government Schemes & Multilingual Accessibility (Member 3)",
        "version": "1.0.0"
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to KisanSathi AI API",
        "documentation": "/docs",
        "schemes_endpoint": "/api/schemes",
        "languages_endpoint": "/api/schemes/languages",
        "health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
