import os
import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

router = APIRouter()

REPLICATE_API_KEY = os.getenv("REPLICATE_API_KEY")
REPLICATE_BASE = "https://api.replicate.com"


def _auth_headers():
    if not REPLICATE_API_KEY:
        raise HTTPException(status_code=500, detail="REPLICATE_API_KEY not configured in backend/.env")
    return {
        "Authorization": f"Bearer {REPLICATE_API_KEY}",
        "Content-Type": "application/json",
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
        raise HTTPException(status_code=response.status_code, detail=response.text)

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
