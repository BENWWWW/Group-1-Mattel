// ============================================================
// machineMatch.ts — GPT-6 Luna machine identity check
// Verifies a vendor-uploaded evidence photo shows the machine
// the PM task is for, using the asset's reference photo + details.
// With a checkTitle, also looks for the defect that check is about
// (burn marks, loose cables, leaks...).
// ============================================================

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY });

export interface MachineMatchAsset {
  name: string;
  type: string | null;
  description: string | null;
  asset_code: string;
  image_url: string | null;
}

export interface MachineMatchResult {
  match: boolean;
  confidence: number; // 0–100
  reason: string;
  issueFound: boolean; // photo shows a problem the checklist item looks for
  issue: string; // one sentence, "" when none
}

export async function checkMachineMatch(
  photoUrl: string,
  asset: MachineMatchAsset,
  checkTitle?: string
): Promise<MachineMatchResult> {
  const content: OpenAI.Responses.ResponseInputContent[] = [];

  if (asset.image_url) {
    content.push({ type: "input_text", text: "Reference photo of the expected machine:" });
    content.push({ type: "input_image", image_url: asset.image_url, detail: "auto" });
  }
  content.push({ type: "input_text", text: "Photo uploaded by the technician:" });
  content.push({ type: "input_image", image_url: photoUrl, detail: "auto" });
  content.push({
    type: "input_text",
    text:
      `Expected machine: ${asset.name} (${asset.type || "unknown type"}, asset code ${asset.asset_code}). ` +
      `${asset.description ?? ""}\n` +
      "Does the uploaded photo show this machine (same type/model)? A close-up of a part of this machine counts as a match. " +
      "If an asset tag or label is readable, compare it to the asset code. " +
      "Give confidence as 0-100 and a one-sentence reason.\n" +
      (checkTitle
        ? `The technician took this photo for the inspection step "${checkTitle}". ` +
          "Set issueFound=true only if the photo clearly shows a problem this step looks for " +
          "(e.g. burn marks, scorching, melted insulation, loose or disconnected cables, damage, leaks, corrosion), " +
          "and describe it in issue (one sentence). Otherwise issueFound=false and issue=\"\"."
        : "Set issueFound=false and issue=\"\"."),
  });

  const res = await client.responses.create({
    model: "gpt-6-luna",
    input: [{ role: "user", content }],
    text: {
      format: {
        type: "json_schema",
        name: "machine_match",
        strict: true,
        schema: {
          type: "object",
          properties: {
            match: { type: "boolean" },
            confidence: { type: "number" },
            reason: { type: "string" },
            issueFound: { type: "boolean" },
            issue: { type: "string" },
          },
          required: ["match", "confidence", "reason", "issueFound", "issue"],
          additionalProperties: false,
        },
      },
    },
  });

  return JSON.parse(res.output_text) as MachineMatchResult;
}
