import { NextRequest, NextResponse } from "next/server";
import {
  runObjectDetection,
  RoboflowApiError,
  RoboflowTimeoutError,
  RoboflowConfigError,
} from "@/lib/roboflow";

/**
 * POST /api/classify
 *
 * Accepts an image URL and sends it to the Roboflow Object Detection API
 * via the reusable roboflow client (with retries & timeout).
 * Returns the predicted class and confidence score based on detected objects.
 *
 * Body: { imageUrl: string, expectedClass?: string }
 * Response: { predictedClass: string, confidence: number, isMatch: boolean, allPredictions: Array }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, expectedClass } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 }
      );
    }

    // Fetch the image and convert to base64 for Roboflow
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error("Failed to fetch image:", imageResponse.status, imageResponse.statusText);
      return NextResponse.json(
        { error: "Failed to fetch image from storage" },
        { status: 400 }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    // Call Roboflow Object Detection via the reusable client
    console.log("[Classify] Running Roboflow object detection...");

    const result = await runObjectDetection(base64Image, {
      confidence: parseInt(process.env.ROBOFLOW_CONFIDENCE || "25", 10),
    });

    console.log(
      `[Classify] Roboflow response: ${result.predictions.length} predictions in ${result.time.toFixed(3)}s`
    );

    let predictedClass = "";
    let confidence = 0;
    let allPredictions: Array<{ class: string; confidence: number }> = [];

    if (result.predictions && result.predictions.length > 0) {
      // Sort by confidence descending, take the highest
      const sorted = [...result.predictions].sort(
        (a, b) => (b.confidence || 0) - (a.confidence || 0)
      );

      predictedClass = (sorted[0].class || "").toLowerCase().trim();
      confidence = Math.round((sorted[0].confidence || 0) * 100);

      allPredictions = sorted.map((p) => ({
        class: (p.class || "").toLowerCase().trim(),
        confidence: Math.round((p.confidence || 0) * 100),
      }));
    } else {
      // No objects detected
      console.log("[Classify] No objects detected in image");
      predictedClass = "unknown";
      confidence = 0;
    }

    // Determine if the prediction matches the expected class
    const normalizedExpected = (expectedClass || "").toLowerCase().trim();
    const isMatch = normalizedExpected
      ? predictedClass === normalizedExpected ||
        predictedClass.includes(normalizedExpected) ||
        normalizedExpected.includes(predictedClass)
      : true;

    console.log(`[Classify] Result: predicted="${predictedClass}", confidence=${confidence}%, expected="${normalizedExpected}", isMatch=${isMatch}`);

    return NextResponse.json({
      predictedClass,
      confidence,
      isMatch,
      allPredictions,
    });
  } catch (error: any) {
    // Handle typed Roboflow errors
    if (error instanceof RoboflowConfigError) {
      console.error("[Classify] Roboflow config error:", error.message);
      return NextResponse.json(
        { error: "AI classification service not configured" },
        { status: 500 }
      );
    }

    if (error instanceof RoboflowTimeoutError) {
      console.error("[Classify] Roboflow timeout:", error.message);
      return NextResponse.json(
        { error: "AI classification timed out. Please try again." },
        { status: 504 }
      );
    }

    if (error instanceof RoboflowApiError) {
      console.error("[Classify] Roboflow API error:", error.statusCode, error.responseBody);
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
