// ============================================================================
// URL STATE SERIALIZATION / COMPRESSION (LZ-STRING)
// ============================================================================

import LZString from 'lz-string';
import { FeaPreset } from '../types/fea';

export function serializeStateToUrl(state: FeaPreset): string {
  try {
    const json = JSON.stringify(state);
    const compressed = LZString.compressToEncodedURIComponent(json);
    return `${window.location.origin}${window.location.pathname}?ex=${compressed}`;
  } catch (e) {
    console.error('Failed to serialize state to URL', e);
    return window.location.href;
  }
}

export function deserializeStateFromUrl(): FeaPreset | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const compressed = params.get('ex');
    if (!compressed) return null;
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    return JSON.parse(json) as FeaPreset;
  } catch (e) {
    console.error('Failed to deserialize state from URL', e);
    return null;
  }
}
