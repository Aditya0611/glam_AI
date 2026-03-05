import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from routes.gemini import router as gemini_router
from routes.replicate import router as replicate_router
from routes.presets import router as presets_router

app = FastAPI(title="Glam AI Backend", version="1.0.0")

# Allow requests from the React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(gemini_router, prefix="/api/gemini")
app.include_router(replicate_router, prefix="/api/replicate")
app.include_router(presets_router, prefix="/api")


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Glam AI Backend is running 🎨"}
