// ============================================================
// sightengine.ts — SightEngine Image Quality Detection Client
// Assesses technical quality of vendor-uploaded evidence photos
// (blur, exposure, distortion) via a single quality score.
// ============================================================

import { setTimeout as sleep } from "node:timers/promises";

// --------------- Types ---------------

export interface SightEngineQualityResult {
  status: string;
  request: {
    id: string;
    timestamp: number;
    operations: number;
  };
  quality: {
    score: number; // 0.0 – 1.0
  };
  media: {
    id: string;
    uri: string;
  };
}

const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

// --------------- Errors ---------------

export class SightEngineApiError extends Error {
  public readonly statusCode: number;
  public readonly responseBody: string;

  constructor(message: string, statusCode: number, responseBody: string) {
    super(message);
    this.name = "SightEngineApiError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export class SightEngineTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`SightEngine request timed out after ${timeoutMs}ms`);
    this.name = "SightEngineTimeoutError";
  }
}

export class SightEngineConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SightEngineConfigError";
  }
}

// --------------- Config ---------------

function getConfig() {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret) {
    throw new SightEngineConfigError(
      "Missing SIGHTENGINE_API_USER or SIGHTENGINE_API_SECRET environment variable. " +
      "Set them in .env or find them at https://dashboard.sightengine.com"
    );
  }

  return { apiUser, apiSecret };
}

// --------------- Main Client ---------------

/**
 * Check the technical quality of an image using SightEngine's
 * Image Quality Detection API.
 *
 * Evaluates blur, exposure, light distortions and returns a
 * single quality score (0.0–1.0). Retries timeouts and 5xx errors
 * up to MAX_RETRIES times with backoff.
 *
 * @param imageUrl - Publicly accessible URL of the image to check
 * @returns        - Quality result with score
 */
export async function checkImageQuality(imageUrl: string): Promise<SightEngineQualityResult> {
  const config = getConfig();

  // Build URL with query parameters
  const params = new URLSearchParams({
    url: imageUrl,
    models: "quality",
    api_user: config.apiUser,
    api_secret: config.apiSecret,
  });

  const url = `https://api.sightengine.com/1.0/check.json?${params.toString()}`;

  for (let attempt = 0; ; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 500ms, 1500ms
        const backoffMs = 500 * Math.pow(3, attempt - 1);
        console.log(`[SightEngine] Retry ${attempt}/${MAX_RETRIES} after ${backoffMs}ms`);
        await sleep(backoffMs);
      }

      const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) }).catch((err) => {
        throw err?.name === "TimeoutError" ? new SightEngineTimeoutError(TIMEOUT_MS) : err;
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new SightEngineApiError(
          `SightEngine API returned ${response.status}: ${errorBody}`,
          response.status,
          errorBody
        );
      }

      const result: SightEngineQualityResult = await response.json();

      // SightEngine returns status: "success" on success
      if (result.status !== "success") {
        throw new SightEngineApiError(
          `SightEngine returned non-success status: ${result.status}`,
          200,
          JSON.stringify(result)
        );
      }

      return result;

    } catch (err: any) {
      // Don't retry on config errors or client errors (4xx)
      if (err instanceof SightEngineConfigError) throw err;
      if (err instanceof SightEngineApiError && err.statusCode >= 400 && err.statusCode < 500) {
        throw err;
      }
      // Retry on timeouts and server errors (5xx)
      if (attempt === MAX_RETRIES) throw err;
    }
  }
}
