import { NextRequest, NextResponse } from "next/server";
import {
  checkImageQuality,
  SightEngineApiError,
  SightEngineTimeoutError,
  SightEngineConfigError,
} from "@/lib/sightengine";
import { checkMachineMatch, MachineMatchAsset } from "@/lib/machineMatch";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/classify
 *
 * Accepts an image URL and sends it to the SightEngine Image Quality
 * Detection API. Returns a quality score (0–100) indicating the
 * technical quality (sharpness, exposure, blur, distortion) of the image.
 *
 * If taskId is given, also asks GPT-6 Luna whether the photo shows the
 * task's machine (compared against the asset's reference photo/details).
 * With checkTitle, the same call also flags visible defects for that check
 * (e.g. burn marks for "Visual check for burn marks").
 * machineMatch is null when no taskId, no asset, or the check failed.
 *
 * Body: { imageUrl: string, taskId?: string, checkTitle?: string }
 * Response: { qualityScore: number, confidence: number, isAcceptable: boolean, qualityLabel: string,
 *             machineMatch: { match: boolean, confidence: number, reason: string, issueFound: boolean, issue: string } | null }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, taskId, checkTitle } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 }
      );
    }

    // Machine check runs alongside the quality check. Failures fall back to null
    // so an OpenAI outage never blocks evidence uploads.
    const machineMatchPromise = taskId
      ? getTaskAsset(taskId)
          .then((asset) => (asset ? checkMachineMatch(imageUrl, asset, checkTitle) : null))
          .catch((err) => {
            console.error("[Classify] Machine match failed:", err);
            return null;
          })
      : Promise.resolve(null);

    // Call SightEngine Image Quality Detection
    // SightEngine accepts image URLs directly — no base64 conversion needed
    console.log("[Classify] Running SightEngine image quality check...");

    const [result, machineMatch] = await Promise.all([
      checkImageQuality(imageUrl),
      machineMatchPromise,
    ]);

    if (machineMatch) {
      console.log(
        `[Classify] Machine match: match=${machineMatch.match}, confidence=${machineMatch.confidence}, reason="${machineMatch.reason}", issueFound=${machineMatch.issueFound}`
      );
    }

    // Convert 0.0–1.0 score to 0–100 percentage
    const qualityScore = Math.round(result.quality.score * 100);

    console.log(
      `[Classify] SightEngine response: quality score = ${qualityScore}% (raw: ${result.quality.score})`
    );

    // Determine quality label and acceptability based on thresholds
    // Based on SightEngine documentation recommendations:
    // >= 60: Good to excellent quality → Pass
    // 45-59: Decent quality → Pass with warning
    // < 45: Poor quality → Reject
    let qualityLabel: string;
    let isAcceptable: boolean;

    if (qualityScore >= 85) {
      qualityLabel = "Excellent";
      isAcceptable = true;
    } else if (qualityScore >= 60) {
      qualityLabel = "Good";
      isAcceptable = true;
    } else if (qualityScore >= 45) {
      qualityLabel = "Fair";
      isAcceptable = true; // Pass but flagged for review
    } else if (qualityScore >= 25) {
      qualityLabel = "Poor";
      isAcceptable = false;
    } else {
      qualityLabel = "Very Poor";
      isAcceptable = false;
    }

    console.log(
      `[Classify] Result: qualityScore=${qualityScore}%, label="${qualityLabel}", acceptable=${isAcceptable}`
    );

    return NextResponse.json({
      qualityScore,
      confidence: qualityScore, // Alias for backward compatibility
      isAcceptable,
      qualityLabel,
      machineMatch,
    });
  } catch (error: any) {
    // Handle typed SightEngine errors
    if (error instanceof SightEngineConfigError) {
      console.error("[Classify] SightEngine config error:", error.message);
      return NextResponse.json(
        { error: "AI quality check service not configured" },
        { status: 500 }
      );
    }

    if (error instanceof SightEngineTimeoutError) {
      console.error("[Classify] SightEngine timeout:", error.message);
      return NextResponse.json(
        { error: "AI quality check timed out. Please try again." },
        { status: 504 }
      );
    }

    if (error instanceof SightEngineApiError) {
      console.error("[Classify] SightEngine API error:", error.statusCode, error.responseBody);
      return NextResponse.json(
        { error: "AI service error: " + error.message },
        { status: 502 }
      );
    }

    console.error("[Classify] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}

/** Look up the asset a PM task is for. Uses the caller's session, so RLS applies. */
async function getTaskAsset(taskId: string): Promise<MachineMatchAsset | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_tasks")
    .select("assets(name, type, description, asset_code, image_url)")
    .eq("id", taskId)
    .single();
  if (error) throw error;
  return (data?.assets as unknown as MachineMatchAsset | null) ?? null;
}
