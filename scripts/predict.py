import sys
import os
import json
import numpy as np 

# Suppress TF & C++ logging completely
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import tensorflow as tf
tf.get_logger().setLevel('ERROR')
from PIL import Image

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)
        
    img_path = sys.argv[1]
    if not os.path.exists(img_path):
        print(json.dumps({"error": f"File not found: {img_path}"}))
        sys.exit(1)
        
    model_path = os.path.join(
        os.getcwd(), 'model', 'canecare', 'canecare_effnetb3.keras'
    )
    if not os.path.exists(model_path):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        model_path = os.path.join(base_dir, 'model', 'canecare', 'canecare_effnetb3.keras')

    model = tf.keras.models.load_model(model_path, compile=False)

    # EfficientNet-B3 expects 300x300
    # No manual normalization — preprocessing is inside the model
    img = Image.open(img_path).convert('RGB')
    img = img.resize((300, 300), Image.Resampling.BILINEAR)

    img_array = np.array(img, dtype=np.float32)
    img_array = np.expand_dims(img_array, axis=0)
    
    # Predict
    output = model.predict(img_array, verbose=0)[0]
    
    # Class mapping
    class_names_path = os.path.join(os.getcwd(), 'model', 'canecare', 'class_names.json')
    if not os.path.exists(class_names_path):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        class_names_path = os.path.join(base_dir, 'model', 'canecare', 'class_names.json')

    with open(class_names_path, 'r', encoding='utf-8') as f:
        class_names = json.load(f)
        
    # Invert mapping if class_names is { "Label": index }
    if class_names and any(isinstance(v, int) for v in class_names.values()):
        idx_to_class = {v: k for k, v in class_names.items()}
    else:
        idx_to_class = {int(k): v for k, v in class_names.items()}

    probabilities = []
    for idx, prob in enumerate(output):
        probabilities.append({
            "label": idx_to_class.get(idx, f"Class {idx}"),
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

