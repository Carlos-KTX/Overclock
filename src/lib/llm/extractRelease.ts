import Anthropic from "@anthropic-ai/sdk";
import { REGIONS, THERAPEUTIC_LINES, RELEASE_TYPES } from "../constants";

const MODEL = process.env.EXTRACTION_MODEL ?? "claude-haiku-4-5-20251001";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export interface ExtractedRelease {
  isRelevant: boolean;
  productName: string | null;
  company: string | null;
  region: string | null;
  therapeuticLine: string | null;
  releaseType: string | null;
  summary: string | null;
}

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extract_release",
  description:
    "Extract structured product-release information from a pharma/medical news headline and excerpt.",
  input_schema: {
    type: "object",
    properties: {
      isRelevant: {
        type: "boolean",
        description:
          "True only if this item announces a specific drug/device/product's regulatory approval, commercial launch, or a pipeline/trial readout signaling an upcoming product. False for general business news, opinion, financial results, hiring, etc.",
      },
      productName: { type: "string", description: "Name of the product/drug/device. Empty string if not relevant or not identifiable." },
      company: { type: "string", description: "Company/sponsor name. Empty string if unknown." },
      region: {
        type: "string",
        enum: [...REGIONS],
        description: "Best-matching region for this release based on the regulatory body or market mentioned.",
      },
      therapeuticLine: {
        type: "string",
        enum: [...THERAPEUTIC_LINES],
        description: "Best-matching therapeutic area.",
      },
      releaseType: {
        type: "string",
        enum: [...RELEASE_TYPES],
        description: "approval = regulatory approval/clearance; launch = commercial availability; pipeline = trial/readout signaling a future product.",
      },
      summary: {
        type: "string",
        description: "A neutral 2-3 sentence summary of the release, based only on the provided text.",
      },
    },
    required: ["isRelevant", "productName", "company", "region", "therapeuticLine", "releaseType", "summary"],
  },
};

export async function extractRelease(title: string, excerpt: string): Promise<ExtractedRelease> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "extract_release" },
    messages: [
      {
        role: "user",
        content: `Headline: ${title}\n\nExcerpt: ${excerpt || "(no excerpt available)"}`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return a tool_use block");
  }

  const input = toolUse.input as Record<string, unknown>;
  return {
    isRelevant: Boolean(input.isRelevant),
    productName: (input.productName as string) || null,
    company: (input.company as string) || null,
    region: (input.region as string) || null,
    therapeuticLine: (input.therapeuticLine as string) || null,
    releaseType: (input.releaseType as string) || null,
    summary: (input.summary as string) || null,
  };
}
