'use client';

/**
 * HyperspeedScene — the actual Three.js scene.
 * This file (and all its imports: three, postprocessing, hyperspeed-presets)
 * lives in its own async chunk. It is only ever loaded via dynamic() in
 * hyperspeed-background.tsx, never synchronously.
 */

import Hyperspeed from './hyperspeed';
import { hyperspeedPresets } from './hyperspeed-presets';

export default function HyperspeedScene() {
  return (
    <Hyperspeed
      effectOptions={{
        ...hyperspeedPresets.one,
        // Cap render resolution to reduce GPU load on hi-DPI displays
      }}
    />
  );
}
