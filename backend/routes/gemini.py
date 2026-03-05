import os
import json
import base64
import httpx
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import google.generativeai as genai

router = APIRouter()

# Initialize Gemini on module load
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def get_model():
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured in backend/.env")
    return genai.GenerativeModel("gemini-1.5-flash")


def _image_part(image_bytes: bytes, mime_type: str):
    """Create an inline image part for Gemini."""
    return {
        "inline_data": {
            "data": base64.b64encode(image_bytes).decode("utf-8"),
            "mime_type": mime_type,
        }
    }


# ---------------------------------------------------------------------------
# Route 1: Enhance Prompt
# ---------------------------------------------------------------------------
@router.post("/enhance-prompt")
async def enhance_prompt(
    image: UploadFile = File(...),
    user_prompt: str = Form(...),
):
    """
    Analyzes image + user prompt and returns a detailed Stable Diffusion prompt.
    Mirrors GeminiService.enhancePrompt()
    """
    image_bytes = await image.read()
    model = get_model()

    prompt_text = f"""
    You are an expert prompt engineer for Stable Diffusion AI art.
    Look at this image of a person.
    The user wants to apply this edit: "{user_prompt}".

    Write a detailed, high-quality text-to-image prompt that describes:
    1. The physical appearance of the person in the image (hair, eyes, skin tone, gender) based on what you see.
    2. The requested style/edit applied perfectly. **EMPHASIZE this part.** Use strong, descriptive color words (e.g. "vibrant green lipstick" instead of just "green lipstick").
    3. Professional photography keywords (e.g., "cinematic lighting", "8k", "photorealistic", "vogue editorial").

    IMPORTANT: Return ONLY the prompt text. Do not add explanations.
    The prompt should follow this structure: "portrait of [detailed description of person], wearing [STRONG description of makeup/style], [technical quality keywords]"
    """

    try:
        result = model.generate_content([prompt_text, _image_part(image_bytes, image.content_type)])
        enhanced_text = result.text.strip()
        return {"enhanced_prompt": enhanced_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {str(e)}")


# ---------------------------------------------------------------------------
# Route 2: Extract Makeup Attributes (from reference image)
# ---------------------------------------------------------------------------
@router.post("/extract-makeup")
async def extract_makeup(image: UploadFile = File(...)):
    """
    Extracts makeup attributes (colors, textures) from a reference image.
    Mirrors GeminiService.extractMakeupAttributes()
    """
    image_bytes = await image.read()
    model = get_model()

    prompt_text = """
    You are a professional makeup artist and computer vision expert.
    Analyze the makeup in this reference image and extract the attributes in a structured JSON format.

    Look for:
    1. Lipstick: Primary HEX color, texture (matte, gloss, shimmer, satin).
    2. Eyeshadow: Primary HEX color, secondary/crease HEX color, texture (matte, shimmer, metallic).
    3. Blush: HEX color, intensity (0-100).
    4. Eyeliner: Color (usually black/brown), style (cat-eye, thin, bold).

    IMPORTANT: Return ONLY a valid JSON object. No markdown, no triple backticks, no text before or after.

    Required Format:
    {
      "lipstick": { "color": "#HEX", "texture": "matte|gloss|shimmer|satin" },
      "eyeshadow": { "color": "#HEX", "creaseColor": "#HEX", "texture": "matte|shimmer|metallic" },
      "blush": { "color": "#HEX", "intensity": 60 },
      "eyeliner": { "color": "#000000", "style": "cat-eye" }
    }
    """

    try:
        result = model.generate_content([prompt_text, _image_part(image_bytes, image.content_type)])
        text = result.text.strip()
        # Strip any accidental markdown code fences
        json_str = text.replace("```json", "").replace("```", "").strip()
        data = json.loads(json_str)
        return data
    except json.JSONDecodeError:
        # Return safe defaults if JSON parsing fails
        return {
            "lipstick": {"color": "#FF0000", "texture": "matte"},
            "eyeshadow": {"color": "#4A3728", "texture": "matte"},
            "blush": {"color": "#E2725B", "intensity": 40},
            "eyeliner": {"color": "#000000", "style": "thin"},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {str(e)}")


# ---------------------------------------------------------------------------
# Route 3: Generate Makeup Plan
# ---------------------------------------------------------------------------
@router.post("/makeup-plan")
async def generate_makeup_plan(
    image: UploadFile = File(...),
    preset_style: str = Form("natural makeup"),
    preset_layers: str = Form("foundation,blush,lipstick"),  # comma-separated
):
    """
    Generates a full layer-by-layer makeup plan based on photo analysis + preset.
    Mirrors GeminiService.generateMakeupPlan()
    """
    image_bytes = await image.read()
    model = get_model()
    layers = [l.strip() for l in preset_layers.split(",") if l.strip()]

    prompt_text = f"""
    You are a professional makeup artist and AI vision expert.
    Analyze this person's photo and create a detailed, layer-by-layer makeup application plan.

    STYLE REQUESTED: {preset_style}
    LAYERS TO INCLUDE: {', '.join(layers)}

    Analyze the person's features:
    1. Skin tone (fair, light, medium, tan, deep, rich)
    2. Face shape (oval, round, square, heart, long)
    3. Eye color (if visible)
    4. Hair color (if visible)

    Then create a makeup plan with these layers IN ORDER:
    {chr(10).join(f'{i+1}. {l}' for i, l in enumerate(layers))}

    For EACH layer, provide:
    - name: layer name (foundation/blush/lipstick/eyes)
    - mask: which facial region (full/cheeks/lips/eyes)
    - color: HEX color code that complements their features
    - intensity: 0-100 (IMPORTANT: use 50-80 for natural looks, 80-100 for dramatic looks)
    - texture: matte/gloss/shimmer/satin/metallic
    - prompt: A HIGHLY SPECIFIC prompt for THIS LAYER ONLY that describes the exact makeup effect.
      CRITICAL RULES:
      1. Use makeup-specific keywords: "glossy", "matte", "shimmer", "metallic", "cream", "powder"
      2. Include color descriptors: "coral pink", "deep burgundy", "warm bronze", "cool taupe"
      3. Describe the finish: "dewy glow", "velvety matte", "high shine", "subtle shimmer"
      4. DO NOT mention face shape, bone structure, or identity
      5. Focus ONLY on the makeup product and its application

      GOOD EXAMPLES:
      - Lipstick: "glossy coral pink lipstick with high shine finish, creamy texture, vibrant color"
      - Blush: "warm peachy blush with subtle shimmer, natural flush on cheeks, soft glow"
      - Eyeshadow: "shimmery bronze eyeshadow with metallic finish, warm tones, professional application"
      - Foundation: "smooth matte foundation, even coverage, natural skin finish, flawless base"

    CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no explanations.

    Required Format:
    {{
      "analysis": {{
        "skinTone": "medium",
        "faceShape": "oval",
        "eyeColor": "brown",
        "hairColor": "dark brown"
      }},
      "layers": [
        {{
          "name": "foundation",
          "mask": "full",
          "color": "#F5D0C5",
          "intensity": 50,
          "texture": "matte",
          "prompt": "smooth matte foundation with medium coverage, natural skin finish, flawless even tone, professional makeup base"
        }}
      ]
    }}
    """

    try:
        result = model.generate_content([prompt_text, _image_part(image_bytes, image.content_type)])
        text = result.text.strip()
        json_str = text.replace("```json", "").replace("```", "").strip()
        plan = json.loads(json_str)

        if not plan.get("analysis") or not plan.get("layers") or not isinstance(plan["layers"], list):
            raise ValueError("Invalid plan structure from Gemini")

        return plan
    except Exception as e:
        # Return a safe fallback plan
        fallback_defaults = {
            "foundation": {"name": "foundation", "mask": "full", "color": "#F5D0C5", "intensity": 50, "texture": "matte", "prompt": "smooth matte foundation, even coverage, natural skin finish, flawless base"},
            "blush": {"name": "blush", "mask": "cheeks", "color": "#FF6B9D", "intensity": 70, "texture": "matte", "prompt": "rosy pink blush on cheeks, natural flush, visible color, 8k, photorealistic"},
            "lipstick": {"name": "lipstick", "mask": "lips", "color": "#C70039", "intensity": 80, "texture": "matte", "prompt": "intense true red lipstick, defined lips, matte finish, professional makeup, bold red color"},
            "eyes": {"name": "eyes", "mask": "eyes", "color": "#8B6F47", "intensity": 65, "texture": "shimmer", "prompt": "brown eyeshadow, defined eyes, natural eye makeup, professional look"},
        }
        fallback_layers = [fallback_defaults.get(l, fallback_defaults["foundation"]) for l in layers]
        return {
            "analysis": {"skinTone": "Natural", "faceShape": "Oval", "eyeColor": "Unknown", "hairColor": "Unknown"},
            "layers": fallback_layers,
        }
