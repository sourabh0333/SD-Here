"""Denoise + grade the raw Cycles bakes into web textures.

python scripts/blender/postprocess.py <bake_dir> <out_dir> [gamma] [gain]
"""
import os
import sys

import cv2
import numpy as np

src, dst = sys.argv[1], sys.argv[2]
gamma = float(sys.argv[3]) if len(sys.argv) > 3 else 1.25
gain = float(sys.argv[4]) if len(sys.argv) > 4 else 1.08
os.makedirs(dst, exist_ok=True)
for group in ("shell", "furniture", "props"):
    im = cv2.imread(os.path.join(src, f"{group}_raw.png"))
    den = cv2.fastNlMeansDenoisingColored(im, None, 5, 7, 7, 21)
    f = (den.astype(np.float32) / 255.0) ** (1.0 / gamma) * gain
    out = np.clip(f * 255.0, 0, 255).astype(np.uint8)
    cv2.imwrite(os.path.join(dst, f"{group}.jpg"), out, [cv2.IMWRITE_JPEG_QUALITY, 88])
    small = cv2.resize(out, (out.shape[1] // 2, out.shape[0] // 2), interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(dst, f"{group}_low.jpg"), small, [cv2.IMWRITE_JPEG_QUALITY, 85])
    print(group, "mean", round(float(out.mean()), 1))
