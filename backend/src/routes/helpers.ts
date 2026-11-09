export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Barista-Pin, X-Client-Id, X-Audience-Name, X-Burst-Index, X-Forwarded-For, X-Simulated-Ip",
};

export function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
    },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: true, message }, status);
}

export const BARISTA_PIN = "7788";

export function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove arabic diacritics / harakat
    .replace(/\u064A/g, "\u06CC") // Arabic Yeh (ي) -> Persian Yeh (ی)
    .replace(/\u0643/g, "\u06A9") // Arabic Kaf (ك) -> Persian Keheh (ک)
    .replace(/\u0629/g, "\u0647") // Teh Marbuta (ة) -> Heh (ه)
    .replace(/\u06C0/g, "\u0647") // Heh with yeh (ۀ) -> Heh (ه)
    .replace(/\u200C/g, " ") // Zero-width non-joiner -> space
    .replace(/[()[\]{}*+?!.,:;"'\\^$|~`_#\-—–/]/g, " ") // Punctuation & symbols -> space
    .replace(/\s+/g, " ")
    .trim();
}
