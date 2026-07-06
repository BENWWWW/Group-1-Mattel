// --------------- Types ---------------

export interface RoboflowPrediction {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  detection_id?: string;
  class_id?: number;
}

export interface RoboflowDetectionResult {
  inference_id: string;
  time: number;
  image: { width: number; height: number };
  predictions: RoboflowPrediction[];
}

export interface RoboflowInferenceOptions {
  /** Minimum confidence threshold 0-100 (default: 25) */
  confidence?: number;
  /** IoU threshold for NMS 0-1 (default: 0.5) */
  iouThreshold?: number;
  /** Max number of detections to return (default: 100) */
  maxDetections?: number;
  /** Request timeout in ms (default: 15000) */
  timeoutMs?: number;
  /** Number of retries on failure (default: 2) */
  retries?: number;
}

// --------------- Errors ---------------

export class RoboflowApiError extends Error {
  public readonly statusCode: number;
  public readonly responseBody: string;

  constructor(message: string, statusCode: number, responseBody: string) {
    super(message);
    this.name = "RoboflowApiError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export class RoboflowTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Roboflow request timed out after ${timeoutMs}ms`);
    this.name = "RoboflowTimeoutError";
  }
}

export class RoboflowConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoboflowConfigError";
  }
}

// --------------- Config ---------------

function getConfig() {
  const apiKey = process.env.ROBOFLOW_API_KEY;
  if (!apiKey) {
    throw new RoboflowConfigError(
      "Missing ROBOFLOW_API_KEY environment variable. " +
      "Set it in .env or find it at https://app.roboflow.com/settings/api"
    );
  }

  const projectId = process.env.ROBOFLOW_PROJECT_ID || "mattel-object-detection3";
  const modelVersion = process.env.ROBOFLOW_MODEL_VERSION || "1";
  const defaultConfidence = parseInt(process.env.ROBOFLOW_CONFIDENCE || "25", 10);

  return { apiKey, projectId, modelVersion, defaultConfidence };
}

// --------------- Helpers ---------------

/** Fetch with an AbortController-based timeout */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new RoboflowTimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Wait for `ms` milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --------------- Main Client ---------------

/**
 * Run object detection on a base64-encoded image using the Roboflow
 * direct detect API (mattel-object-detection3 model).
 *
 * The workflow endpoint (`serverless.roboflow.com/.../workflows/...`) wraps
 * this same model but currently has a server-side parameter binding bug.
 * When that's fixed, swap the URL below to the workflow endpoint.
 *
 * @param imageBase64 - Raw base64-encoded image data (no data: prefix)
 * @param options     - Optional inference parameters
 * @returns           - Detection result with predictions array
 */
export async function runObjectDetection(
  imageBase64: string,
  options: RoboflowInferenceOptions = {}
): Promise<RoboflowDetectionResult> {
  const config = getConfig();

  const confidence = options.confidence ?? config.defaultConfidence;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxRetries = options.retries ?? 2;

  // Build URL with query parameters
  const params = new URLSearchParams({
    api_key: config.apiKey,
    confidence: String(confidence),
  });

  if (options.iouThreshold !== undefined) {
    params.set("overlap", String(Math.round(options.iouThreshold * 100)));
  }
  if (options.maxDetections !== undefined) {
    params.set("max_det", String(options.maxDetections));
  }

  // Use the serverless inference endpoint (same model, better availability)
  const url = `https://serverless.roboflow.com/${config.projectId}/${config.modelVersion}?${params.toString()}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 500ms, 1500ms
        const backoffMs = 500 * Math.pow(3, attempt - 1);
        console.log(`[Roboflow] Retry ${attempt}/${maxRetries} after ${backoffMs}ms`);
        await sleep(backoffMs);
      }

      const response = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: imageBase64,
        },
        timeoutMs
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new RoboflowApiError(
          `Roboflow API returned ${response.status}: ${errorBody}`,
          response.status,
          errorBody
        );
      }

      const result: RoboflowDetectionResult = await response.json();
      return result;

    } catch (err: any) {
      lastError = err;

      // Don't retry on client errors (4xx) or config errors
      if (err instanceof RoboflowConfigError) throw err;
      if (err instanceof RoboflowApiError && err.statusCode >= 400 && err.statusCode < 500) {
        throw err;
      }
      // Retry on timeouts and server errors (5xx)
      if (attempt === maxRetries) throw err;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error("Roboflow inference failed");
}

/**
 * Run the Roboflow Workflow endpoint.
 *
 * NOTE: Currently disabled due to a server-side bug in the workflow
 * definition (model_id parameter binding). When fixed on Roboflow's
 * side, this function can be used as a drop-in replacement.
 *
 * Workflow: mattel-object-detection3-vmattel-object-detection3-1-yolo26n-t2-logic
 * Valid inputs: image, confidence, iou_threshold, max_detections, class_agnostic_nms
 */
export async function runWorkflow(
  imageBase64: string,
  options: RoboflowInferenceOptions = {}
): Promise<any> {
  const config = getConfig();
  const workflowId = "mattel-object-detection3-vmattel-object-detection3-1-yolo26n-t2-logic";
  const workspace = "rubencv";
  const timeoutMs = options.timeoutMs ?? 15_000;

  const url = `https://serverless.roboflow.com/${workspace}/workflows/${workflowId}`;

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: config.apiKey,
        inputs: {
          image: { type: "base64", value: imageBase64 },
          confidence: (options.confidence ?? config.defaultConfidence) / 100,
          iou_threshold: options.iouThreshold ?? 0.5,
          max_detections: options.maxDetections ?? 100,
          class_agnostic_nms: false,
        },
      }),
    },
    timeoutMs
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new RoboflowApiError(
      `Roboflow Workflow API returned ${response.status}: ${errorBody}`,
      response.status,
      errorBody
    );
  }

  return await response.json();
}
