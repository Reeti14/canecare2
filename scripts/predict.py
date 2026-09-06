import sys
import os
import json
import numpy as np 
# Suppress TF & C++ logging completely
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import tensorflow as tf
from PIL import Image
def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)
        
    img_path = sys.argv[1]
    if not os.path.exists(img_path):
        print(json.dumps({"error": f"File not found: {img_path}"}))
        sys.exit(1)
        
    model_path = r"C:\Users\manvi kesarwani\canecare2\model\canecare\canecare_model.keras"
    model = tf.keras.models.load_model(model_path)
    
    # Open image, convert to RGB, resize to 224x224
    img = Image.open(img_path).convert('RGB')
    img = img.resize((224, 224), Image.Resampling.BILINEAR)
    
    # Apply MobileNetV2 preprocessing: normalize to [-1, 1]
    img_array = np.array(img, dtype=np.float32)
    img_array = (img_array / 127.5) - 1.0   # Scale to [-1, 1]
    img_array = np.expand_dims(img_array, axis=0)
    
    # Predict
    output = model.predict(img_array)[0]
    
    # Class mapping
    class_names_path = os.path.join(os.getcwd(), 'model', 'canecare', 'class_names.json')
    with open(class_names_path, 'r', encoding='utf-8') as f:
        class_names = json.load(f)
        
    probabilities = []
    for idx, prob in enumerate(output):
        probabilities.append({
            "label": class_names.get(str(idx), f"Class {idx}"),
            "probability": float(prob)
        })
        
    # Sort descending
    probabilities.sort(key=lambda x: x['probability'], reverse=True)
    
    result = {
        "predictions": probabilities,
        "top": probabilities[0]
    }
    
    # Print clean JSON output only
    sys.stdout.write(json.dumps(result) + "\n")
    sys.stdout.flush()

if __name__ == '__main__':
    main()
