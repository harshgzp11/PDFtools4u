/**
 * Background Removal Post-Processing Utilities
 * 
 * Pipeline order (critical):
 *   1. Inference → raw alpha mask at model resolution (e.g. 512×512)
 *   2. Upscale  → bilinear interpolation to native image dimensions
 *   3. Hole Fill → BFS flood-fill from edges (optional)
 *   4. Feather  → Gaussian blur on alpha channel at native res (optional)
 *   5. Composite → multiply alpha mask with original RGB pixels
 */

// ─── Bilinear Upscale ────────────────────────────────────────────────
/**
 * Upscales a single-channel (alpha) mask from (srcW×srcH) to (dstW×dstH)
 * using bilinear interpolation.
 * @param {Uint8Array} src  - Source alpha values, length = srcW*srcH
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} dstW
 * @param {number} dstH
 * @returns {Uint8Array} - Upscaled alpha values, length = dstW*dstH
 */
export function upscaleMask(src, srcW, srcH, dstW, dstH) {
  const dst = new Uint8Array(dstW * dstH);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    const srcY = y * yRatio;
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, srcH - 1);
    const fy = srcY - y0;

    for (let x = 0; x < dstW; x++) {
      const srcX = x * xRatio;
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const fx = srcX - x0;

      const tl = src[y0 * srcW + x0];
      const tr = src[y0 * srcW + x1];
      const bl = src[y1 * srcW + x0];
      const br = src[y1 * srcW + x1];

      const top = tl + (tr - tl) * fx;
      const bot = bl + (br - bl) * fx;
      dst[y * dstW + x] = Math.round(top + (bot - top) * fy);
    }
  }
  return dst;
}

// ─── Fill Interior Holes (BFS from edges) ────────────────────────────
/**
 * BFS flood-fill from all image border pixels to identify exterior background.
 * Any alpha=0 pixel NOT reachable from the border is reclassified as foreground (alpha=255).
 * This solves the wire-mesh / basket / cage hole problem.
 * 
 * @param {ImageData} imageData  - RGBA image data (mutated in place)
 * @param {number} [threshold=10] - Alpha threshold below which a pixel is considered transparent
 * @returns {ImageData}
 */
export function fillInteriorHoles(imageData, threshold = 10) {
  const { width, height, data } = imageData;
  const total = width * height;
  const visited = new Uint8Array(total); // 0 = unvisited, 1 = visited-exterior
  const queue = [];

  // Seed the BFS queue with all border pixels that are transparent
  for (let x = 0; x < width; x++) {
    // Top row
    if (data[(0 * width + x) * 4 + 3] < threshold) {
      queue.push(x);
      visited[x] = 1;
    }
    // Bottom row
    const bIdx = (height - 1) * width + x;
    if (data[bIdx * 4 + 3] < threshold) {
      queue.push(bIdx);
      visited[bIdx] = 1;
    }
  }
  for (let y = 1; y < height - 1; y++) {
    // Left column
    const lIdx = y * width;
    if (data[lIdx * 4 + 3] < threshold) {
      queue.push(lIdx);
      visited[lIdx] = 1;
    }
    // Right column
    const rIdx = y * width + (width - 1);
    if (data[rIdx * 4 + 3] < threshold) {
      queue.push(rIdx);
      visited[rIdx] = 1;
    }
  }

  // BFS traversal — mark all reachable transparent pixels as exterior
  const dx = [0, 0, 1, -1];
  const dy = [1, -1, 0, 0];
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const px = idx % width;
    const py = (idx - px) / width;

    for (let d = 0; d < 4; d++) {
      const nx = px + dx[d];
      const ny = py + dy[d];
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const nIdx = ny * width + nx;
      if (visited[nIdx]) continue;
      if (data[nIdx * 4 + 3] < threshold) {
        visited[nIdx] = 1;
        queue.push(nIdx);
      }
    }
  }

  // Any transparent pixel NOT visited by BFS is an interior hole → fill it
  for (let i = 0; i < total; i++) {
    if (data[i * 4 + 3] < threshold && !visited[i]) {
      data[i * 4 + 3] = 255; // Set alpha to fully opaque
    }
  }

  return imageData;
}

// ─── Soft Edge Feather (Gaussian Blur on Alpha) ──────────────────────
/**
 * Applies a Gaussian blur to ONLY the alpha channel of the image,
 * producing smooth anti-aliased edges without affecting RGB values.
 * 
 * Uses a separable 1D Gaussian kernel for O(n*r) performance.
 * 
 * @param {ImageData} imageData - RGBA image data (mutated in place)
 * @param {number} radius - Blur radius in pixels (0 = no blur)
 * @returns {ImageData}
 */
export function softEdgeFeather(imageData, radius) {
  if (radius <= 0) return imageData;

  const { width, height, data } = imageData;

  // Build 1D Gaussian kernel
  const size = Math.ceil(radius * 2.5) | 0;
  const kernel = new Float32Array(size * 2 + 1);
  let sum = 0;
  const sigma = radius / 2;
  const sigmaSquared2 = 2 * sigma * sigma;
  for (let i = -size; i <= size; i++) {
    const val = Math.exp(-(i * i) / sigmaSquared2);
    kernel[i + size] = val;
    sum += val;
  }
  // Normalize
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

  // Extract alpha channel
  const alpha = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    alpha[i] = data[i * 4 + 3];
  }

  // Horizontal pass
  const temp = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let k = -size; k <= size; k++) {
        const sx = Math.min(Math.max(x + k, 0), width - 1);
        val += alpha[y * width + sx] * kernel[k + size];
      }
      temp[y * width + x] = val;
    }
  }

  // Vertical pass
  const result = new Float32Array(width * height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let val = 0;
      for (let k = -size; k <= size; k++) {
        const sy = Math.min(Math.max(y + k, 0), height - 1);
        val += temp[sy * width + x] * kernel[k + size];
      }
      result[y * width + x] = val;
    }
  }

  // Only affect pixels near the edges — blend between original and blurred alpha.
  // Pure interior (alpha=255) and pure exterior (alpha=0) pixels stay unchanged.
  // Only edge pixels (those whose blurred value differs from the original) get softened.
  for (let i = 0; i < width * height; i++) {
    const orig = data[i * 4 + 3];
    const blurred = Math.round(Math.min(255, Math.max(0, result[i])));
    
    // If the original alpha is hard (0 or 255), use the blurred value only if it's near the edge
    // We detect "near edge" by checking if a neighborhood contains both FG and BG pixels
    // Simple heuristic: if blurred != orig, it's an edge region → use blurred
    if (orig === 0 && blurred < 10) {
      // Pure background far from edge — keep 0
      data[i * 4 + 3] = 0;
    } else if (orig === 255 && blurred > 245) {
      // Pure foreground far from edge — keep 255
      data[i * 4 + 3] = 255;
    } else {
      // Edge region — use the blurred alpha
      data[i * 4 + 3] = blurred;
    }
  }

  return imageData;
}

// ─── Apply Alpha Mask to Original Image ──────────────────────────────
/**
 * Composites a single-channel alpha mask with the original image's RGB data.
 * 
 * @param {ImageData} original - The original full-resolution RGBA image
 * @param {Uint8Array} alphaMask - Single-channel alpha values at same resolution
 * @returns {ImageData} - New ImageData with RGB from original and alpha from mask
 */
export function applyAlphaMask(original, alphaMask) {
  const out = new ImageData(
    new Uint8ClampedArray(original.data),
    original.width,
    original.height
  );
  for (let i = 0; i < alphaMask.length; i++) {
    out.data[i * 4 + 3] = alphaMask[i];
  }
  return out;
}

// ─── Contact Shadow ──────────────────────────────────────────────────
/**
 * Adds a soft contact shadow beneath the foreground subject.
 * Renders a blurred, downscaled silhouette onto the target canvas.
 * 
 * @param {HTMLCanvasElement} subjectCanvas - Canvas containing the cut-out subject
 * @param {number} blurRadius - Shadow blur radius (default 20)
 * @param {number} opacity - Shadow opacity 0–1 (default 0.3)
 * @param {number} offsetY - Vertical offset in pixels (default 10)
 * @returns {HTMLCanvasElement} - New canvas with shadow + subject composited
 */
export function addContactShadow(subjectCanvas, blurRadius = 20, opacity = 0.3, offsetY = 10) {
  const { width, height } = subjectCanvas;
  
  // Create output canvas with extra room for shadow
  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height + offsetY + blurRadius;
  const ctx = outCanvas.getContext('2d');

  // Step 1: Create a silhouette of the subject (solid black)
  const silCanvas = document.createElement('canvas');
  silCanvas.width = width;
  silCanvas.height = height;
  const silCtx = silCanvas.getContext('2d');
  silCtx.drawImage(subjectCanvas, 0, 0);
  silCtx.globalCompositeOperation = 'source-in';
  silCtx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
  silCtx.fillRect(0, 0, width, height);

  // Step 2: Draw the blurred silhouette (shadow) offset downward
  ctx.filter = `blur(${blurRadius}px)`;
  ctx.drawImage(silCanvas, 0, offsetY);
  ctx.filter = 'none';

  // Step 3: Draw the original subject on top
  ctx.drawImage(subjectCanvas, 0, 0);

  return outCanvas;
}

// ─── Blob ↔ ImageData Helpers ────────────────────────────────────────

/**
 * Converts a Blob (PNG/JPEG) into an ImageData and its canvas.
 * @param {Blob} blob
 * @returns {Promise<{imageData: ImageData, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}>}
 */
export async function blobToImageData(blob) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { imageData, canvas, ctx };
}

/**
 * Converts an ImageData back into a PNG Blob.
 * @param {ImageData} imageData
 * @returns {Promise<Blob>}
 */
export async function imageDataToBlob(imageData) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

/**
 * Converts an HTMLCanvasElement to a Blob URL.
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<string>}
 */
export async function canvasToObjectURL(canvas) {
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  return URL.createObjectURL(blob);
}
