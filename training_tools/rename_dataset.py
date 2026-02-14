import os
import argparse

def rename_dataset(directory, prefix="style"):
    """
    Renames all images in a directory to a clean format: prefix_01, prefix_02, etc.
    """
    image_exts = ('.png', '.jpg', '.jpeg', '.webp')
    files = [f for f in os.listdir(directory) if f.lower().endswith(image_exts)]
    files.sort() # Sort to keep some order

    print(f"🔄 Renaming {len(files)} images in {directory}...")

    for i, filename in enumerate(files, 1):
        extension = os.path.splitext(filename)[1].lower()
        new_name = f"{prefix}_{i:02d}{extension}"
        
        old_path = os.path.join(directory, filename)
        new_path = os.path.join(directory, new_name)

        # Handle naming conflicts if the file already exists
        if os.path.exists(new_path):
             # Skip or handle if necessary, for simplicity we just rename
             pass
             
        os.rename(old_path, new_path)
        print(f"✅ {filename} -> {new_name}")

    print("✨ Dataset renamed successfully!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean up dataset filenames.")
    parser.add_argument("--dir", type=str, required=True, help="Directory with images")
    parser.add_argument("--prefix", type=str, default="glam", help="Prefix for filenames (e.g., glam)")
    args = parser.parse_args()

    if os.path.exists(args.dir):
        rename_dataset(args.dir, args.prefix)
    else:
        print(f"❌ Directory not found: {args.dir}")
