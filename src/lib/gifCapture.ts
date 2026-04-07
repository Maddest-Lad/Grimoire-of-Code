import GIF from 'gif.js';

/**
 * Serializes the SVG element to a canvas frame, offsetting all SMIL animation
 * `begin` attributes by the current SVG time so each frame reflects the live
 * animation state rather than always rendering at t=0.
 */
function captureSVGFrame(svgEl: SVGSVGElement, canvas: HTMLCanvasElement): Promise<void> {
  const currentTime = svgEl.getCurrentTime();
  const clone = svgEl.cloneNode(true) as SVGSVGElement;

  // Shift every SMIL animation's begin time so it renders at the current position
  clone.querySelectorAll('animate, animateTransform, animateMotion').forEach((el) => {
    const beginAttr = el.getAttribute('begin');
    const existingOffset = beginAttr && !Number.isNaN(parseFloat(beginAttr))
      ? parseFloat(beginAttr)
      : 0;
    el.setAttribute('begin', `${existingOffset - currentTime}s`);
  });

  clone.setAttribute('width', String(canvas.width));
  clone.setAttribute('height', String(canvas.height));

  const svgData = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image(canvas.width, canvas.height);
    img.onload = () => {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Captures `FRAMES` frames of the live SVG at ~15fps and downloads the result
 * as an animated GIF named `grimoire.gif`.
 *
 * @param svgEl      The root <svg> element to record
 * @param onProgress Called with 0–100 as frames are captured
 */
export async function downloadGif(
  svgEl: SVGSVGElement,
  onProgress: (pct: number) => void,
): Promise<void> {
  const SIZE = 600;
  const FRAMES = 45;
  const DELAY = 66; // ~15 fps

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: SIZE,
    height: SIZE,
    // Worker loaded from CDN — no Vite config needed
    workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js',
  });

  for (let i = 0; i < FRAMES; i++) {
    if (i > 0) await new Promise<void>((r) => setTimeout(r, DELAY));
    await captureSVGFrame(svgEl, canvas);
    gif.addFrame(canvas, { copy: true, delay: DELAY });
    onProgress(Math.round(((i + 1) / FRAMES) * 100));
  }

  return new Promise((resolve) => {
    gif.on('finished', (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'grimoire.gif';
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    });
    gif.render();
  });
}
