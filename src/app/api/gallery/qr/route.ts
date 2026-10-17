import QRCode from "qrcode";

import { galleryLink } from "@/modules/gallery/service";
import { toProblem } from "@/server/http/handle";
import { createRequestId } from "@/server/http/request-id";

/** The stable gallery QR. Made on demand, never stored. */
export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const { url, couple } = await galleryLink(request);
    const format = new URL(request.url).searchParams.get("format") === "svg" ? "svg" : "png";
    const headers = {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Request-Id": requestId,
      "Content-Disposition": `inline; filename="${couple.replace(/[^\w -]/g, "")} gallery QR.${format}"`,
    };
    if (format === "svg") {
      const svg = await QRCode.toString(url, { type: "svg", margin: 2, color: { dark: "#3b1d1a", light: "#fffaf3" } });
      return new Response(svg, { headers: { ...headers, "Content-Type": "image/svg+xml" } });
    }
    const png = await QRCode.toBuffer(url, { type: "png", width: 720, margin: 2, color: { dark: "#3b1d1a", light: "#fffaf3" } });
    return new Response(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
  } catch (error) {
    return toProblem(error, requestId);
  }
}
