import { detectBitPlaneAnomaly } from '../src/lib/stegoveritas-detector';
import { DetectionEngine } from '../src/lib/detection-engine';

function tinyPngBuffer(): ArrayBuffer {
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aN0AAAAASUVORK5CYII=';
  return Uint8Array.from(Buffer.from(b64, 'base64')).buffer;
}

describe('image false-positive hardening', () => {
  test('bit-plane anomaly does not flag random data by default', () => {
    const random = new Uint8Array(10000);
    for (let i = 0; i < random.length; i++) random[i] = Math.floor(Math.random() * 256);
    expect(detectBitPlaneAnomaly(random)).toBe(false);
  });

  test('benign image stays below medium severity', async () => {
    const buffer = tinyPngBuffer();
    const pixels = new Uint8Array(400);
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = Math.floor((Math.random() * 256 + Math.random() * 256) / 2);
    }

    const result = await DetectionEngine.analyze('', buffer, pixels, 'image/png');
    expect(result.severity === 'Safe' || result.severity === 'Low' || result.severity === 'Medium').toBe(true);
    expect(result.score).toBeLessThan(35);
  });

  test('rgba input with constant alpha does not produce high severity', async () => {
    const buffer = tinyPngBuffer();
    const rgba = new Uint8Array(4 * 4000);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = Math.floor((Math.random() * 256 + Math.random() * 256) / 2);       // R
      rgba[i + 1] = Math.floor((Math.random() * 256 + Math.random() * 256) / 2);   // G
      rgba[i + 2] = Math.floor((Math.random() * 256 + Math.random() * 256) / 2);   // B
      rgba[i + 3] = 255;                               // A (constant)
    }

    const result = await DetectionEngine.analyze('', buffer, rgba, 'image/png');
    expect(result.severity === 'Safe' || result.severity === 'Low' || result.severity === 'Medium').toBe(true);
  });

  test('hard evidence can still escalate severity', async () => {
    const clean = new Uint8Array(tinyPngBuffer());
    const withTrailing = new Uint8Array(clean.length + 64);
    withTrailing.set(clean, 0);
    withTrailing.fill(0xab, clean.length);

    const pixels = new Uint8Array(400);
    for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 7) % 256;

    const result = await DetectionEngine.analyze('', withTrailing.buffer, pixels, 'image/png');
    expect(result.score).toBeGreaterThanOrEqual(35);
  });
});
