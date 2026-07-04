from PIL import Image

def remove_bg_and_crop(input_path, output_path, threshold=240):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        # White/off-white background
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            new_data.append((255, 255, 255, 0)) # transparent
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    
    # Crop to bounding box
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(output_path, "PNG")
    print(f"Saved transparent cropped logo to {output_path}")

remove_bg_and_crop("frontend/static/folder/new_logo.png", "frontend/static/logo_transparent.png")
