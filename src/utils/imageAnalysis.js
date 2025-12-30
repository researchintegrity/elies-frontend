/**
 * Image Analysis Utilities
 * 
 * Client-side image forensics analysis tools for scientific integrity verification.
 * 
 * Attribution:
 * These algorithms are inspired by and adapted from "Forensically" by Jonas Wagner
 * Original source: https://29a.ch/photo-forensics/
 * License: The original Forensically uses various open-source components.
 * 
 * This implementation provides similar functionality for the ELIS Scientific Integrity Platform,
 * enabling researchers to analyze images for potential manipulations or inconsistencies.
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates an offscreen canvas with the given dimensions
 */
export function createOffscreenCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

/**
 * Loads an image from a URL and returns it as a canvas
 */
export async function loadImageToCanvas(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Enable CORS for analysis
        img.onload = () => {
            const canvas = createOffscreenCanvas(img.naturalWidth, img.naturalHeight);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            resolve({ canvas, ctx, width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
        img.src = imageUrl;
    });
}

/**
 * Histogram equalization for image enhancement
 * Adapted from Forensically by Jonas Wagner (https://29a.ch/photo-forensics/)
 */
export function equalizeHistogram(imageData, channel = 0, stride = 1) {
    const histogram = new Uint32Array(256);
    const lookup = new Uint8Array(256);
    const data = imageData.data;

    // Build histogram
    for (let i = channel; i < data.length; i += stride * 4) {
        histogram[data[i]]++;
    }

    // Calculate cumulative distribution
    const pixelCount = Math.floor((data.length / 4) / stride);
    let cumulative = 0;
    const scale = 255 / pixelCount;

    for (let i = 0; i < 256; i++) {
        cumulative += histogram[i];
        lookup[i] = Math.min(255, Math.floor(cumulative * scale));
    }

    // Apply equalization
    for (let i = channel; i < data.length; i += stride * 4) {
        data[i] = lookup[data[i]];
    }

    return imageData;
}

/**
 * Auto contrast adjustment
 */
export function autoContrast(imageData) {
    const data = imageData.data;
    let min = 255, max = 0;

    // Find min/max luminance
    for (let i = 0; i < data.length; i += 4) {
        const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
        min = Math.min(min, lum);
        max = Math.max(max, lum);
    }

    if (max === min) return imageData;

    const scale = 255 / (max - min);

    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, (data[i] - min) * scale));
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - min) * scale));
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - min) * scale));
    }

    return imageData;
}

// ============================================================================
// ERROR LEVEL ANALYSIS (ELA)
// ============================================================================

/**
 * Error Level Analysis
 * Compares the original image to a recompressed version to detect manipulation.
 * 
 * Adapted from Forensically by Jonas Wagner (https://29a.ch/photo-forensics/)
 * Based on research by Neal Krawetz (http://www.hackerfactor.com/)
 * 
 * @param {HTMLCanvasElement} canvas - Source canvas with image
 * @param {number} quality - JPEG recompression quality (1-100)
 * @param {number} scale - Error scale/amplification factor
 * @param {number} opacity - Opacity of ELA layer (0-100), blends with original
 */
export async function applyErrorLevelAnalysis(canvas, quality = 75, scale = 10, opacity = 100) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Get original image data
    const originalData = ctx.getImageData(0, 0, width, height);

    // Recompress image as JPEG
    const jpegDataUrl = canvas.toDataURL('image/jpeg', quality / 100);

    // Load recompressed image
    const recompressed = await loadImageToCanvas(jpegDataUrl);
    const recompressedData = recompressed.ctx.getImageData(0, 0, width, height);

    // Calculate difference (ELA)
    const resultCanvas = createOffscreenCanvas(width, height);
    const resultCtx = resultCanvas.getContext('2d');
    const resultData = resultCtx.createImageData(width, height);

    // Opacity factor (0.0 to 1.0)
    const opacityFactor = opacity / 100;

    for (let i = 0; i < originalData.data.length; i += 4) {
        // Calculate absolute difference scaled
        const dr = Math.abs(originalData.data[i] - recompressedData.data[i]) * scale;
        const dg = Math.abs(originalData.data[i + 1] - recompressedData.data[i + 1]) * scale;
        const db = Math.abs(originalData.data[i + 2] - recompressedData.data[i + 2]) * scale;

        // Clamp ELA values
        const elaR = Math.min(255, dr);
        const elaG = Math.min(255, dg);
        const elaB = Math.min(255, db);

        // Blend with original based on opacity
        // At opacity 100%: show ELA result
        // At opacity 0%: show original image
        resultData.data[i] = Math.round(elaR * opacityFactor + originalData.data[i] * (1 - opacityFactor));
        resultData.data[i + 1] = Math.round(elaG * opacityFactor + originalData.data[i + 1] * (1 - opacityFactor));
        resultData.data[i + 2] = Math.round(elaB * opacityFactor + originalData.data[i + 2] * (1 - opacityFactor));
        resultData.data[i + 3] = 255;
    }

    resultCtx.putImageData(resultData, 0, 0);
    return resultCanvas;
}

// ============================================================================
// NOISE ANALYSIS
// ============================================================================

/**
 * Noise Analysis
 * Extracts and amplifies the noise pattern from an image using a separable median filter.
 * Manipulated regions often have different noise characteristics.
 * 
 * Adapted from Forensically by Jonas Wagner (https://29a.ch/photo-forensics/)
 * Uses a separable median filter (horizontal pass, then vertical pass).
 * 
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {number} amplitude - Noise amplification factor
 * @param {boolean} equalize - Apply histogram equalization
 * @param {number} opacity - Opacity of noise layer (0-100), blends with original
 */
export function applyNoiseAnalysis(canvas, amplitude = 20, equalize = false, opacity = 100) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const originalData = ctx.getImageData(0, 0, width, height);
    const opacityFactor = opacity / 100;

    const resultCanvas = createOffscreenCanvas(width, height);
    const resultCtx = resultCanvas.getContext('2d');
    const resultData = resultCtx.createImageData(width, height);

    // Get median of 3 values (inline for performance)
    const median3 = (a, b, c) => {
        if (a > b) {
            if (b > c) return b;
            if (a > c) return c;
            return a;
        } else {
            if (a > c) return a;
            if (b > c) return c;
            return b;
        }
    };

    // Create temporary buffer for horizontal pass
    const tempData = new Float32Array(width * height * 3);

    // Horizontal pass: for each row, compute median of 3 horizontal neighbors
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const ti = (y * width + x) * 3;

            // Handle edge cases
            const x0 = Math.max(0, x - 1);
            const x2 = Math.min(width - 1, x + 1);

            for (let c = 0; c < 3; c++) {
                const v0 = originalData.data[(y * width + x0) * 4 + c];
                const v1 = originalData.data[i + c];
                const v2 = originalData.data[(y * width + x2) * 4 + c];
                tempData[ti + c] = median3(v0, v1, v2);
            }
        }
    }

    // Vertical pass: for each column, compute median of 3 vertical neighbors from temp
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const ti = (y * width + x) * 3;

            // Handle edge cases
            const y0 = Math.max(0, y - 1);
            const y2 = Math.min(height - 1, y + 1);

            for (let c = 0; c < 3; c++) {
                const v0 = tempData[(y0 * width + x) * 3 + c];
                const v1 = tempData[ti + c];
                const v2 = tempData[(y2 * width + x) * 3 + c];

                const median = median3(v0, v1, v2);
                const noise = originalData.data[i + c] - median;

                // Scale noise and shift to visible range (128 = no noise)
                const noiseVal = Math.min(255, Math.max(0, 128 + noise * amplitude));
                // Blend with original based on opacity
                resultData.data[i + c] = Math.round(noiseVal * opacityFactor + originalData.data[i + c] * (1 - opacityFactor));
            }
            resultData.data[i + 3] = 255;
        }
    }

    resultCtx.putImageData(resultData, 0, 0);

    if (equalize) {
        const finalData = resultCtx.getImageData(0, 0, width, height);
        equalizeHistogram(finalData, 0, 1);
        equalizeHistogram(finalData, 1, 1);
        equalizeHistogram(finalData, 2, 1);
        resultCtx.putImageData(finalData, 0, 0);
    }

    return resultCanvas;
}

// ============================================================================
// LUMINANCE GRADIENT
// ============================================================================

/**
 * Luminance Gradient Analysis
 * Visualizes the direction and magnitude of brightness changes along x and y axes.
 * Useful for detecting lighting inconsistencies or edge manipulation.
 * 
 * Parts of the image at similar angles to light source should have similar colors.
 * Sharp edges that don't match surrounding gradients may indicate manipulation.
 * 
 * Adapted from Forensically by Jonas Wagner (https://29a.ch/photo-forensics/)
 * Technique inspired by Neal Krawetz (http://www.hackerfactor.com/)
 * 
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {number} intensity - Gradient amplification factor (default ~5)
 * @param {number} opacity - Blend with original (0-1, default 0.95)
 * @param {boolean} normalize - Normalize gradients to use full range
 * @param {boolean} equalize - Apply histogram equalization
 */
export function applyLuminanceGradient(canvas, intensity = 5, opacity = 1, normalize = true, equalize = false) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const originalData = ctx.getImageData(0, 0, width, height);

    const resultCanvas = createOffscreenCanvas(width, height);
    const resultCtx = resultCanvas.getContext('2d');
    const resultData = resultCtx.createImageData(width, height);

    // Helper to get luminance at a position
    const getLuminance = (x, y) => {
        // Clamp to image bounds
        x = Math.max(0, Math.min(width - 1, x));
        y = Math.max(0, Math.min(height - 1, y));
        const idx = (y * width + x) * 4;
        return (
            0.299 * originalData.data[idx] +
            0.587 * originalData.data[idx + 1] +
            0.114 * originalData.data[idx + 2]
        );
    };

    // First pass: calculate all gradients and find max for normalization
    const gradients = new Float32Array(width * height * 2);
    let maxGrad = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const gi = (y * width + x) * 2;

            // Simple gradient: difference to right and below neighbors
            const dx = getLuminance(x + 1, y) - getLuminance(x, y);
            const dy = getLuminance(x, y + 1) - getLuminance(x, y);

            gradients[gi] = dx;
            gradients[gi + 1] = dy;

            if (normalize) {
                maxGrad = Math.max(maxGrad, Math.abs(dx), Math.abs(dy));
            }
        }
    }

    // Normalization factor
    const normFactor = normalize && maxGrad > 0 ? (127 / maxGrad) : 1;

    // Second pass: apply intensity and create output
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const gi = (y * width + x) * 2;

            let dx = gradients[gi];
            let dy = gradients[gi + 1];

            // Apply normalization
            if (normalize) {
                dx *= normFactor;
                dy *= normFactor;
            }

            // Apply intensity
            dx *= intensity;
            dy *= intensity;

            // Encode gradient as color:
            // R = horizontal gradient (right is brighter = red, left is brighter = cyan)
            // G = vertical gradient (down is brighter = green, up is brighter = magenta)  
            // B = 128 (neutral) for visibility
            const gradR = Math.min(255, Math.max(0, 128 + dx));
            const gradG = Math.min(255, Math.max(0, 128 + dy));
            const gradB = 128;

            // Blend with original based on opacity
            resultData.data[idx] = Math.round(gradR * opacity + originalData.data[idx] * (1 - opacity));
            resultData.data[idx + 1] = Math.round(gradG * opacity + originalData.data[idx + 1] * (1 - opacity));
            resultData.data[idx + 2] = Math.round(gradB * opacity + originalData.data[idx + 2] * (1 - opacity));
            resultData.data[idx + 3] = 255;
        }
    }

    resultCtx.putImageData(resultData, 0, 0);

    // Apply histogram equalization if requested
    if (equalize) {
        const finalData = resultCtx.getImageData(0, 0, width, height);
        equalizeHistogram(finalData, 0, 1);
        equalizeHistogram(finalData, 1, 1);
        equalizeHistogram(finalData, 2, 1);
        resultCtx.putImageData(finalData, 0, 0);
    }

    return resultCanvas;
}

// ============================================================================
// LEVEL SWEEP
// ============================================================================

/**
 * Level Sweep
 * Highlights a specific range of brightness levels in the image.
 * Magnifies contrast at certain brightness levels to reveal hidden edges.
 * 
 * Adapted from Forensically by Jonas Wagner (https://29a.ch/photo-forensics/)
 * 
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {number} position - Position in histogram (0-1)
 * @param {number} sweepWidth - Width of level range to highlight
 * @param {number} opacity - Opacity of sweep layer (0-100), blends with original
 */
export function applyLevelSweep(canvas, position = 0.5, sweepWidth = 32, opacity = 100) {
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const height = canvas.height;
    const originalData = ctx.getImageData(0, 0, canvasWidth, height);
    const opacityFactor = opacity / 100;

    const resultCanvas = createOffscreenCanvas(canvasWidth, height);
    const resultCtx = resultCanvas.getContext('2d');
    const resultData = resultCtx.createImageData(canvasWidth, height);

    const center = position * 255;
    const halfWidth = sweepWidth / 2;

    for (let i = 0; i < originalData.data.length; i += 4) {
        // Apply level sweep per channel to preserve colors
        for (let c = 0; c < 3; c++) {
            const channelValue = originalData.data[i + c];

            // Map channel value to output based on position and width
            // Values at (center - halfWidth) map to 0
            // Values at (center + halfWidth) map to 255
            let sweepOutput = ((channelValue - center + halfWidth) / sweepWidth) * 255;
            sweepOutput = Math.min(255, Math.max(0, sweepOutput));

            // Blend with original based on opacity
            resultData.data[i + c] = Math.round(sweepOutput * opacityFactor + originalData.data[i + c] * (1 - opacityFactor));
        }
        resultData.data[i + 3] = 255;
    }

    resultCtx.putImageData(resultData, 0, 0);
    return resultCanvas;
}

// ============================================================================
// CLONE DETECTION
// ============================================================================

/**
 * Clone Detection
 * Identifies potentially copied and pasted regions within an image using block matching
 * with Haar wavelet-based feature extraction.
 * 
 * Inspired by the paper "Detection of Copy-Move Forgery in Digital Images" 
 * by Jessica Fridrich, David Soukal, and Jan Lukáš.
 * Algorithm adapted from Forensically by Jonas Wagner (https://29a.ch/photo-forensics/)
 * 
 * The algorithm:
 * 1. Convert image to grayscale
 * 2. Extract blocks and compute Haar wavelet coefficients
 * 3. Quantize coefficients based on similarity parameter
 * 4. Filter blocks by detail (high-frequency energy)
 * 5. Find matching blocks with identical features
 * 6. Cluster matches by displacement vector
 * 7. Draw results
 */
export function applyCloneDetection(canvas, options = {}) {
    const {
        minSimilarity = 0.47,
        minDetail = 0.01,
        minClusterSize = 8,
        blockSize = 4,
        maxImageSize = 1024,
        showQuantized = false
    } = options;

    let width = canvas.width;
    let height = canvas.height;

    // Resize if needed for performance
    let scale = 1;
    if (width > maxImageSize || height > maxImageSize) {
        scale = maxImageSize / Math.max(width, height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
    }

    // Create working canvas at scaled size
    const workCanvas = createOffscreenCanvas(width, height);
    const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
    workCtx.drawImage(canvas, 0, 0, width, height);
    const imageData = workCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Convert to grayscale
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        gray[i] = Math.floor(
            0.299 * data[idx] +
            0.587 * data[idx + 1] +
            0.114 * data[idx + 2]
        );
    }

    // Ensure blockSize is power of 2
    const bSize = Math.pow(2, Math.round(Math.log2(blockSize)));

    // Haar wavelet helper functions (inlined for performance)
    function haarStep(src, dst, stride, offset, size) {
        const half = size / 2;
        for (let i = 0; i < half; i++) {
            const a = src[i * 2 * stride + offset];
            const b = src[(i * 2 + 1) * stride + offset];
            dst[i * stride + offset] = (a + b) / 2;
            dst[(half + i) * stride + offset] = (a - b) / 2;
        }
    }

    function haarTransform2D(block, temp, size) {
        for (let s = size; s > 1; s = s >> 1) {
            for (let row = 0; row < s; row++) {
                haarStep(block, temp, 1, row * size, s);
            }
            for (let col = 0; col < s; col++) {
                haarStep(temp, block, size, col, s);
            }
        }
    }

    function quantizeBlock(block, size, similarity) {
        const threshold = size >> 2;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = y * size + x;
                // Forensically precedence: x > threshold OR (y > threshold AND val < 10)
                if (x > threshold || (y > threshold && block[idx] < 10)) {
                    block[idx] = 0;
                } else {
                    block[idx] = Math.round(block[idx] * similarity) / similarity;
                }
            }
        }
    }

    function getBlockDetail(block, size) {
        let sum = 0, count = 0;
        const threshold = size >> 3;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (x > threshold || y > threshold) {
                    const val = block[y * size + x];
                    sum += val * val;
                    count++;
                }
            }
        }
        return count > 0 ? Math.sqrt(sum / count) : 0;
    }

    // Block storage: hash -> array of [x, y] positions
    const blockMap = Object.create(null);
    const block = new Int16Array(bSize * bSize);
    const temp = new Int16Array(bSize * bSize);

    // Use similarity directly as in Forensically
    const quantFactor = minSimilarity;
    const detailThreshold = minDetail;

    // Extract blocks with wavelet features
    for (let y = 0; y <= height - bSize; y++) {
        for (let x = 0; x <= width - bSize; x++) {
            // Copy block from image
            for (let by = 0; by < bSize; by++) {
                for (let bx = 0; bx < bSize; bx++) {
                    block[by * bSize + bx] = gray[(y + by) * width + (x + bx)];
                }
            }

            // Apply Haar wavelet transform
            haarTransform2D(block, temp, bSize);

            // Quantize coefficients
            quantizeBlock(block, bSize, quantFactor);

            // Calculate detail (reject uniform blocks)
            const detail = getBlockDetail(block, bSize);

            if (detail >= detailThreshold) {
                const hash = Array.prototype.join.call(block, ',');
                if (blockMap[hash]) {
                    blockMap[hash].push([x, y]);
                } else {
                    blockMap[hash] = [[x, y]];
                }
            }
        }
    }

    // Find matching blocks using two-pass algorithm (like Forensically)
    const matches = [];
    const keys = Object.keys(blockMap);
    const displacementCount = Object.create(null);

    // First pass: truncate arrays to 4 and count displacement vectors
    // (Forensically mutates arrays: p.length > 4 && (p.length = 4))
    for (const key of keys) {
        const positions = blockMap[key];
        if (positions.length > 4) {
            positions.length = 4;  // Truncate like Forensically
        }

        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const [x1, y1] = positions[i];
                const [x2, y2] = positions[j];
                const dx = x2 - x1;
                const dy = y2 - y1;

                // Skip if distance^2 < 8 AND minClusterSize > 1
                if (dx * dx + dy * dy < 8 && minClusterSize > 1) continue;

                const dispKey = `${Math.round(dx / 2)},${Math.round(dy / 2)},${Math.round(x1 / 8)},${Math.round(y1 / 8)}`;
                displacementCount[dispKey] = (displacementCount[dispKey] || 0) + 1;
            }
        }
    }

    // Second pass: collect matches exceeding cluster threshold
    // (After first pass, all arrays are <= 4 elements, so no length check needed)
    for (const key of keys) {
        const positions = blockMap[key];

        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const [x1, y1] = positions[i];
                const [x2, y2] = positions[j];
                const dx = x2 - x1;
                const dy = y2 - y1;

                const dispKey = `${Math.round(dx / 2)},${Math.round(dy / 2)},${Math.round(x1 / 8)},${Math.round(y1 / 8)}`;

                if (displacementCount[dispKey] > minClusterSize) {
                    matches.push({ x1, y1, x2, y2 });
                }
            }
        }
    }

    // Create result canvas
    const resultCanvas = createOffscreenCanvas(canvas.width, canvas.height);
    const resultCtx = resultCanvas.getContext('2d');
    const scaleBack = 1 / scale;

    if (showQuantized) {
        const quantData = resultCtx.createImageData(canvas.width, canvas.height);
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const idx = (y * canvas.width + x) * 4;
                const srcX = Math.floor(x * scale);
                const srcY = Math.floor(y * scale);
                if (srcX < width && srcY < height) {
                    const grayVal = gray[srcY * width + srcX];
                    // Apply same quantization as in algorithm
                    const qVal = Math.round(grayVal * quantFactor) / quantFactor;
                    quantData.data[idx] = Math.max(0, Math.min(255, qVal));
                    quantData.data[idx + 1] = Math.max(0, Math.min(255, qVal));
                    quantData.data[idx + 2] = Math.max(0, Math.min(255, qVal));
                }
                quantData.data[idx + 3] = 255;
            }
        }
        resultCtx.putImageData(quantData, 0, 0);
    } else {
        resultCtx.drawImage(canvas, 0, 0);
        resultCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        resultCtx.fillRect(0, 0, canvas.width, canvas.height);

        if (matches.length > 0) {
            // Draw connecting lines (red)
            resultCtx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            resultCtx.lineWidth = 1;
            for (const match of matches) {
                const cx1 = (match.x1 + bSize / 2) * scaleBack;
                const cy1 = (match.y1 + bSize / 2) * scaleBack;
                const cx2 = (match.x2 + bSize / 2) * scaleBack;
                const cy2 = (match.y2 + bSize / 2) * scaleBack;
                resultCtx.beginPath();
                resultCtx.moveTo(cx1, cy1);
                resultCtx.lineTo(cx2, cy2);
                resultCtx.stroke();
            }

            // Highlight matching regions (blue)
            resultCtx.fillStyle = 'rgba(100, 150, 255, 0.6)';
            const highlightSize = bSize * scaleBack;
            for (const match of matches) {
                resultCtx.fillRect(match.x1 * scaleBack, match.y1 * scaleBack, highlightSize, highlightSize);
                resultCtx.fillRect(match.x2 * scaleBack, match.y2 * scaleBack, highlightSize, highlightSize);
            }
        } else {
            resultCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            resultCtx.fillRect(0, 0, canvas.width, canvas.height);
            resultCtx.drawImage(canvas, 0, 0);
        }
    }

    return resultCanvas;
}


// ============================================================================
// MAGNIFIER ENHANCEMENT
// ============================================================================

/**
 * Apply enhancement to a region of an image (for magnifier tool)
 */
export function enhanceRegion(imageData, enhancement = 'equalizeHistogram') {
    const data = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
    );

    switch (enhancement) {
        case 'equalizeHistogram':
            equalizeHistogram(data, 0, 1);
            equalizeHistogram(data, 1, 1);
            equalizeHistogram(data, 2, 1);
            break;
        case 'autoContrast':
            autoContrast(data);
            break;
        case 'autoContrastByChannel':
            // Apply auto contrast to each channel separately
            for (let c = 0; c < 3; c++) {
                let min = 255, max = 0;
                for (let i = c; i < data.data.length; i += 4) {
                    min = Math.min(min, data.data[i]);
                    max = Math.max(max, data.data[i]);
                }
                if (max > min) {
                    const scale = 255 / (max - min);
                    for (let i = c; i < data.data.length; i += 4) {
                        data.data[i] = Math.min(255, Math.max(0, (data.data[i] - min) * scale));
                    }
                }
            }
            break;
        default:
            // No enhancement
            break;
    }

    return data;
}

// ============================================================================
// METADATA EXTRACTION
// ============================================================================

/**
 * Extract basic image info (for full EXIF, a library like exif-js would be needed)
 */
export function getImageInfo(canvas, mimeType = 'image/jpeg') {
    return {
        width: canvas.width,
        height: canvas.height,
        aspectRatio: (canvas.width / canvas.height).toFixed(2),
        megapixels: ((canvas.width * canvas.height) / 1000000).toFixed(2),
        type: mimeType
    };
}

// ============================================================================
// STRING EXTRACTION
// ============================================================================

/**
 * Extract printable ASCII strings from image data
 * Useful for finding hidden metadata or watermarks.
 * 
 * Inspired by the Unix 'strings' command.
 * Adapted from Forensically by Jonas Wagner (https://29a.ch/photo-forensics/)
 */
export async function extractStrings(blob, minLength = 4) {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const strings = [];
    let current = '';

    for (let i = 0; i < bytes.length; i++) {
        const char = bytes[i];

        // Check if printable ASCII (32-126) or common whitespace
        if ((char >= 32 && char <= 126) || char === 9 || char === 10 || char === 13) {
            current += String.fromCharCode(char);
        } else {
            if (current.length >= minLength) {
                // Filter out strings that are just repeated characters
                if (!/^(.)\1+$/.test(current.trim())) {
                    strings.push({
                        offset: i - current.length,
                        value: current.trim()
                    });
                }
            }
            current = '';
        }
    }

    // Don't forget the last string
    if (current.length >= minLength && !/^(.)\1+$/.test(current.trim())) {
        strings.push({
            offset: bytes.length - current.length,
            value: current.trim()
        });
    }

    return strings;
}

// ============================================================================
// JPEG ANALYSIS
// ============================================================================

/**
 * Parse JPEG structure to find markers
 * Adapted from Forensically by Jonas Wagner (https://29a.ch/photo-forensics/)
 */
export async function analyzeJpegStructure(blob) {
    if (!blob.type.includes('jpeg') && !blob.type.includes('jpg')) {
        return { error: 'Not a JPEG file', markers: [] };
    }

    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const markers = [];

    const markerNames = {
        0xD8: 'SOI (Start of Image)',
        0xE0: 'APP0 (JFIF)',
        0xE1: 'APP1 (EXIF/XMP)',
        0xE2: 'APP2 (ICC Profile)',
        0xDB: 'DQT (Quantization Table)',
        0xC0: 'SOF0 (Baseline DCT)',
        0xC1: 'SOF1 (Extended Sequential)',
        0xC2: 'SOF2 (Progressive DCT)',
        0xC4: 'DHT (Huffman Table)',
        0xDA: 'SOS (Start of Scan)',
        0xDD: 'DRI (Restart Interval)',
        0xFE: 'COM (Comment)',
        0xD9: 'EOI (End of Image)'
    };

    let i = 0;
    while (i < bytes.length - 1) {
        if (bytes[i] === 0xFF) {
            const marker = bytes[i + 1];

            // Skip padding bytes
            if (marker === 0xFF || marker === 0x00) {
                i++;
                continue;
            }

            const name = markerNames[marker] || `Unknown (0x${marker.toString(16).toUpperCase()})`;

            let length = 0;
            // Markers without length
            if (marker !== 0xD8 && marker !== 0xD9 && marker >= 0xD0 && marker <= 0xD7) {
                length = 0;
            } else if (marker !== 0xD8 && marker !== 0xD9) {
                if (i + 3 < bytes.length) {
                    length = (bytes[i + 2] << 8) | bytes[i + 3];
                }
            }

            markers.push({
                offset: i,
                marker: `0xFF${marker.toString(16).toUpperCase().padStart(2, '0')}`,
                name,
                length
            });

            // Move past this marker
            if (marker === 0xD8 || marker === 0xD9) {
                i += 2;
            } else if (marker >= 0xD0 && marker <= 0xD7) {
                i += 2;
            } else if (length > 0) {
                i += 2 + length;
            } else {
                i += 2;
            }
        } else {
            i++;
        }
    }

    return { markers, size: bytes.length };
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * Tool definitions with metadata
 */
export const ANALYSIS_TOOLS = {
    ela: {
        id: 'ela',
        name: 'Error Level Analysis',
        description: 'Compares the image to a recompressed version to detect manipulation',
        icon: 'FiZap',
        category: 'forensics'
    },
    noise: {
        id: 'noise',
        name: 'Noise Analysis',
        description: 'Extracts and visualizes the noise pattern of the image',
        icon: 'FiActivity',
        category: 'forensics'
    },
    gradient: {
        id: 'gradient',
        name: 'Luminance Gradient',
        description: 'Visualizes brightness changes to detect lighting inconsistencies',
        icon: 'FiSun',
        category: 'forensics'
    },
    levelSweep: {
        id: 'levelSweep',
        name: 'Level Sweep',
        description: 'Highlights specific brightness levels to reveal hidden details',
        icon: 'FiSliders',
        category: 'forensics'
    },
    magnifier: {
        id: 'magnifier',
        name: 'Magnifier',
        description: 'Zoom and enhance image details with histogram equalization',
        icon: 'FiSearch',
        category: 'inspection'
    },
    cloneDetection: {
        id: 'cloneDetection',
        name: 'Clone Detection',
        description: 'Identifies potentially copied and pasted regions',
        icon: 'FiCopy',
        category: 'forensics'
    },
    metadata: {
        id: 'metadata',
        name: 'Metadata',
        description: 'View image properties and embedded information',
        icon: 'FiInfo',
        category: 'inspection'
    },
    jpegAnalysis: {
        id: 'jpegAnalysis',
        name: 'JPEG Analysis',
        description: 'Analyze JPEG structure and quantization tables',
        icon: 'FiFileText',
        category: 'inspection'
    }
};

export default {
    // Analysis functions
    applyErrorLevelAnalysis,
    applyNoiseAnalysis,
    applyLuminanceGradient,
    applyLevelSweep,
    applyCloneDetection,
    enhanceRegion,
    analyzeJpegStructure,
    getImageInfo,

    // Utilities
    loadImageToCanvas,
    createOffscreenCanvas,
    equalizeHistogram,
    autoContrast,

    // Tool definitions
    ANALYSIS_TOOLS
};
