/**
 * Deep Learning Client
 *
 * Bridges the Next.js frontend/backend to the Python FastAPI
 * deep-learning steganalysis server (default port 8000).
 */

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';
const DL_TIMEOUT_MS = parseInt(process.env.DL_TIMEOUT_MS || '15000', 10);
const DL_CONNECT_TIMEOUT_MS = 2000; // Quick fail if backend is offline

export interface DLAnalyzeResponse {
  status: string;
  model_loaded: boolean;
  is_stego: boolean;
  confidence: number;
  score: number;
  message_decoded: string | null;
  robustness?: Record<string, number> | null;
}

export interface DLDecodeResponse {
  status: string;
  model_loaded: boolean;
  message_bits: number[] | null;
}

export interface DLEnsembleResponse {
  status: string;
  model_loaded: boolean;
  ensemble_score: number | null;
  is_stego: boolean | null;
  confidence: number | null;
}

/**
 * Send an image buffer to the Python FastAPI backend for deep-learning analysis.
 * Falls back gracefully if the backend is unreachable or model is not trained.
 */
export async function analyzeWithDeepLearning(
  imageBuffer: ArrayBuffer,
  mimeType: string = 'image/png',
  useEnsemble: boolean = false,
): Promise<DLAnalyzeResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DL_TIMEOUT_MS);

  try {
    const blob = new Blob([imageBuffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, 'upload');
    formData.append('run_robustness', 'true');

    const endpoint = useEnsemble ? '/ensemble' : '/analyze';
    const response = await fetch(`${PYTHON_API_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[DL-Client] Python backend returned ${response.status}`);
      const text = await response.text();
      console.warn(`[DL-Client] Response: ${text}`);
      return null;
    }

    let textResponse = await response.text();
    try {
      const data: any = JSON.parse(textResponse);
      return data as DLAnalyzeResponse;
    } catch (parseError: any) {
      console.error('[DL-Client] JSON parsing error:', parseError);
      console.warn(`[DL-Client] Response (invalid JSON): ${textResponse}`);
      return {
        status: 'error',
        model_loaded: false,
        is_stego: false,
        confidence: 0,
        score: 0,
        message_decoded: null,
      };
    }

  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('[DL-Client] Deep-learning analysis timed out.');
    } else {
      console.warn('[DL-Client] Deep-learning backend unreachable:', err.message);
      console.error(err);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Health-check the Python backend.
 */
export async function checkDLBackendHealth(): Promise<{
  online: boolean;
  model_loaded: boolean;
  device: string;
}> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/health`, { method: 'GET' });
    if (!res.ok) {
      console.warn(`[DL-Client] Backend health endpoint returned ${res.status}`);
      return { online: false, model_loaded: false, device: 'unknown' };
    }

    let text = await res.text();
    try {
      const data = JSON.parse(text);
      return {
        online: true,
        model_loaded: data.model_loaded || false,
        device: data.device || 'unknown',
      };
    } catch {
      console.warn(`[DL-Client] Invalid JSON in health endpoint: ${text}`);
      return { online: false, model_loaded: false, device: 'unknown' };
    }
  } catch (err: any) {
    console.error(`[DL-Client] Backend health check failed: ${err.message}`);
    return { online: false, model_loaded: false, device: 'unknown' };
  }
}
