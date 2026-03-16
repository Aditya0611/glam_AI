import os
import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

router = APIRouter()

REPLICATE_BASE = "https://api.replicate.com"


def _auth_headers():
    REPLICATE_API_KEY = os.getenv("REPLICATE_API_KEY") or os.getenv("REPLICATE_API_TOKEN")
    if not REPLICATE_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="REPLICATE_API_KEY not found in environment. Check Render environment variables."
        )
    return {
        "Authorization": f"Bearer {REPLICATE_API_KEY}",
        "Content-Type": "application/json",
    }


@router.get("/debug")
async def debug_info():
    """Diagnostic route to verify API key presence and format."""
    key = os.getenv("REPLICATE_API_KEY")
    token = os.getenv("REPLICATE_API_TOKEN")
    
    # We check both because Replicate docs sometimes mention TOKEN vs KEY
    val = key or token
    name = "REPLICATE_API_KEY" if key else ("REPLICATE_API_TOKEN" if token else "MISSING")
    
    if not val:
        return {
            "status": "error",
            "message": "REPLICATE_API_KEY is not set in environment variables.",
            "suggestion": "Check Render Dashboard > Settings > Environment Variables"
        }
    
    masked = f"{val[:3]}...{val[-4:]}" if len(val) > 8 else "***"
    return {
        "status": "ok",
        "env_var_found": name,
        "key_length": len(val),
        "key_masked": masked,
        "format_valid": val.startswith("r8_"),
        "instruction": "If format_valid is False, your key might be missing the r8_ prefix or is malformed."
    }


# ---------------------------------------------------------------------------
# Route 1: Create a Prediction (flux-fill-dev)
# ---------------------------------------------------------------------------
@router.post("/predictions")
async def create_prediction(request: Request):
    """
    Proxies a prediction creation request to Replicate.
    Mirrors ReplicateService.generateWithFluxLoRA() — creating the prediction.
    """
    body = await request.json()

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{REPLICATE_BASE}/v1/models/black-forest-labs/flux-fill-dev/predictions",
            headers=_auth_headers(),
            json=body,
        )

    if response.status_code not in (200, 201):
        # Return the actual error message from Replicate for debugging
        detail = response.text
        try:
            detail = response.json()
        except:
            pass
        raise HTTPException(
            status_code=response.status_code, 
            detail={"error": "Replicate API Error", "replicate_detail": detail}
        )

    return JSONResponse(content=response.json(), status_code=response.status_code)


# ---------------------------------------------------------------------------
# Route 2: Poll Prediction Status
# ---------------------------------------------------------------------------
@router.get("/predictions/{prediction_id}")
async def get_prediction(prediction_id: str):
    """
    Proxies a prediction status poll to Replicate.
    Mirrors ReplicateService.pollForResult().
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{REPLICATE_BASE}/v1/predictions/{prediction_id}",
            headers=_auth_headers(),
        )

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return JSONResponse(content=response.json())
