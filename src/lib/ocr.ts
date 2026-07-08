import { ImageAnnotatorClient } from "@google-cloud/vision";
import type { ParsedReceipt } from "./types";
import { parseReceiptText } from "./parse-receipt";

let visionClient: ImageAnnotatorClient | null = null;

function getVisionClient(): ImageAnnotatorClient {
  if (!visionClient) {
    visionClient = new ImageAnnotatorClient();
  }
  return visionClient;
}

export async function extractReceiptFromImage(
  imageBase64: string,
): Promise<ParsedReceipt> {
  const client = getVisionClient();
  const buffer = Buffer.from(imageBase64, "base64");

  const [result] = await client.textDetection({
    image: { content: buffer },
  });

  const rawText =
    result.textAnnotations?.[0]?.description?.trim() ??
    result.fullTextAnnotation?.text?.trim() ??
    "";

  if (!rawText) {
    return {
      merchant: "",
      date: "",
      total: null,
      subtotal: null,
      tax: null,
      currency: "USD",
      rawText: "",
      confidence: "low",
    };
  }

  return parseReceiptText(rawText);
}
