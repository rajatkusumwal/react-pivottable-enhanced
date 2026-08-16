/**
 * Share a report by link.
 *
 * The whole report state (rows, columns, measures, filters, formatting…) is
 * serialised to URL-safe base64 and carried in a query parameter, so a link is
 * self-contained: no backend storage is needed. The same helpers work in the
 * browser and on the server (SSR / tests).
 */
import { createDefaultConfig } from "./types";
import type { PivotConfig } from "./types";

/** Query parameter carrying the encoded report. */
export const REPORT_PARAM = "report";

const toBase64 = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return typeof btoa === "function"
    ? btoa(binary)
    : // eslint-disable-next-line no-undef
      Buffer.from(text, "utf-8").toString("base64");
};

const fromBase64 = (base64: string): string => {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  // eslint-disable-next-line no-undef
  return Buffer.from(base64, "base64").toString("utf-8");
};

const urlSafe = (b64: string) => b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unUrlSafe = (s: string) => {
  const restored = s.replace(/-/g, "+").replace(/_/g, "/");
  return restored + "=".repeat((4 - (restored.length % 4)) % 4);
};

/** Serialises a report to an opaque, URL-safe token. */
export function encodeReport(config: PivotConfig): string {
  return urlSafe(toBase64(JSON.stringify(config)));
}

/** Parses a token produced by `encodeReport`. Returns null when unreadable. */
export function decodeReport(token: string): PivotConfig | null {
  try {
    const parsed = JSON.parse(fromBase64(unUrlSafe(token))) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return createDefaultConfig(parsed as Partial<PivotConfig>);
  } catch {
    return null;
  }
}

/** Builds a shareable absolute URL for the report. */
export function buildReportUrl(baseUrl: string, config: PivotConfig): string {
  const url = new URL(baseUrl);
  url.searchParams.set(REPORT_PARAM, encodeReport(config));
  return url.toString();
}

/** Reads a report out of a URL (or `location.href`). */
export function readReportFromUrl(url: string): PivotConfig | null {
  try {
    const token = new URL(url).searchParams.get(REPORT_PARAM);
    return token ? decodeReport(token) : null;
  } catch {
    return null;
  }
}
