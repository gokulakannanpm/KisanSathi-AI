from dotenv import load_dotenv
load_dotenv(override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import ai, farmer, mandi, recommendation, schemes, weather

app = FastAPI(
    title="KisanSathi AI - Agricultural Intelligence & Government Schemes Platform",
    description="Personalized agricultural integration platform connecting farmer context with government schemes, deterministic eligibility, and multilingual accessibility.",
    version="1.0.0"
)

# Enable CORS for React Frontend (Member 4)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
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
