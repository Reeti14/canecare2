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
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    model_path = os.path.join(base_dir, 'model', 'canecare', 'canecare_model.keras')
    class_names_path = os.path.join(base_dir, 'model', 'canecare', 'class_names.json')

    with open(class_names_path, 'r', encoding='utf-8') as f:
        class_names = json.load(f)

    model = tf.keras.models.load_model(model_path)

    # Warmup prediction to initialize XLA and graph execution
    dummy = np.zeros((1, 224, 224, 3), dtype=np.float32)
    model.predict(dummy, verbose=0)

    # Signal to Node.js that the worker is fully initialized and warm
    sys.stdout.write("READY\n")
    sys.stdout.flush()

    for line in sys.stdin:
        img_path = line.strip()
        if not img_path:
            continue
        if img_path == "PING":
            sys.stdout.write("PONG\n")
            sys.stdout.flush()
            continue

        try:
            if not os.path.exists(img_path):
                sys.stdout.write(json.dumps({"error": f"Image file not found: {img_path}"}) + "\n")
                sys.stdout.flush()
                continue

            img = Image.open(img_path).convert('RGB')
            img = img.resize((224, 224), Image.Resampling.BILINEAR)

            img_array = (np.array(img, dtype=np.float32) / 127.5) - 1.0
            img_array = np.expand_dims(img_array, axis=0)

            output = model.predict(img_array, verbose=0)[0]

            probabilities = []
            for idx, prob in enumerate(output):
                probabilities.append({
                    "label": class_names.get(str(idx), f"Class {idx}"),
                    "probability": float(prob)
                })

            probabilities.sort(key=lambda x: x['probability'], reverse=True)

            result = {
                "predictions": probabilities,
                "top": probabilities[0]
            }
            sys.stdout.write(json.dumps(result) + "\n")
            sys.stdout.flush()

        except Exception as e:
            sys.stdout.write(json.dumps({"error": str(e)}) + "\n")
            sys.stdout.flush()

if __name__ == '__main__':
    main()
