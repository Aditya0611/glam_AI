import os
import torch
from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration
from tqdm import tqdm
import argparse

def autocaption(input_dir, output_dir=None, prompt="a photo of"):
    """
    Generates captions for all images in input_dir and saves them as .txt files.
    """
    if output_dir is None:
        output_dir = input_dir
    os.makedirs(output_dir, exist_ok=True)

    # 1. Load Model
    print("⏳ Loading BLIP model (first time may take a minute)...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
    model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(device)
    print(f"✅ Model loaded on {device}")

    # 2. Process Images
    image_exts = ('.png', '.jpg', '.jpeg', '.webp')
    images = [f for f in os.listdir(input_dir) if f.lower().endswith(image_exts)]
    
    if not images:
        print(f"❌ No images found in {input_dir}")
        return

    print(f"📸 Found {len(images)} images. Starting captioning...")

    for img_name in tqdm(images):
        img_path = os.path.join(input_dir, img_name)
        try:
            raw_image = Image.open(img_path).convert('RGB')

            # Generate caption
            inputs = processor(raw_image, prompt, return_tensors="pt").to(device)
            out = model.generate(**inputs, max_new_tokens=50)
            caption = processor.decode(out[0], skip_special_tokens=True)

            # Save caption
            output_name = os.path.splitext(img_name)[0] + ".txt"
            output_path = os.path.join(output_dir, output_name)
            
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(caption)
                
        except Exception as e:
            print(f"⚠️ Error processing {img_name}: {e}")

    print(f"✨ Done! Captions saved to {output_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Auto-caption images for LoRA training.")
    parser.add_argument("--dir", type=str, required=True, help="Directory containing images")
    parser.add_argument("--prompt", type=str, default="a photo of", help="Starting prompt for captions")
    args = parser.parse_args()

    autocaption(args.dir, prompt=args.prompt)
