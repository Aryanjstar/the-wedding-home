import { ImageResponse } from "next/og";

import { readEcard } from "@/modules/guests/ecard";
import { toProblem } from "@/server/http/handle";
import { createRequestId } from "@/server/http/request-id";

/** A WhatsApp e-card an elder can forward as a picture. Rendered on demand, never stored. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId();
  try {
    const { id } = await context.params;
    const card = await readEcard(request, id);
    const download = new URL(request.url).searchParams.get("download") === "1";
    const image = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: card.bg,
            color: card.text,
            padding: 64,
            fontFamily: "serif",
            border: `24px solid ${card.accent}`,
          }}
        >
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 8, color: card.accent, textTransform: "uppercase" }}>Shubh Vivah</div>
          <div style={{ display: "flex", fontSize: 40, marginTop: 36, color: card.muted }}>{card.household}, with love you are invited to</div>
          <div style={{ display: "flex", fontSize: 104, marginTop: 24, textAlign: "center" }}>{card.couple}</div>
          <div style={{ display: "flex", width: 220, height: 4, background: card.accent, marginTop: 36, marginBottom: 36 }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, fontSize: 34 }}>
            {card.lines.map((line) => (
              <div key={line} style={{ display: "flex" }}>{line}</div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 30, marginTop: 48, color: card.muted }}>{card.city} · {card.date}</div>
          <div style={{ display: "flex", fontSize: 24, marginTop: 40, color: card.muted }}>Your own RSVP link comes with this card.</div>
        </div>
      ),
      { width: 1080, height: 1350 },
    );
    const headers = new Headers(image.headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Request-Id", requestId);
    if (download) headers.set("Content-Disposition", `attachment; filename="${card.household.replace(/[^\w -]/g, "")} invitation.png"`);
    return new Response(image.body, { headers });
  } catch (error) {
    return toProblem(error, requestId);
  }
}
