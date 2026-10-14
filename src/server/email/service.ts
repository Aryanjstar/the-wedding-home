import "server-only";

import { getAppEnv, getEmailEnv } from "@/config/env";
import { householdInvitationText, memberInvitationText, passwordResetText } from "@/server/email/messages";

export class EmailDeliveryError extends Error {
  constructor() {
    super("Email provider did not accept the message.");
    this.name = "EmailDeliveryError";
  }
}

type SendInput = {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
};

export async function sendEmail(input: SendInput, fetchImpl: typeof fetch = fetch) {
  const { RESEND_API_KEY, EMAIL_FROM } = getEmailEnv();
  let response: Response;
  try {
    response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "the-wedding-home",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        text: input.text,
      }),
    });
  } catch {
    throw new EmailDeliveryError();
  }

  const body = await response.json().catch(() => null) as { id?: unknown } | null;
  if (!response.ok || typeof body?.id !== "string" || body.id.length === 0) {
    throw new EmailDeliveryError();
  }
}

function absoluteUrl(path: string) {
  return new URL(path, getAppEnv().NEXT_PUBLIC_APP_URL).href;
}

export async function sendMemberInvitation(input: {
  to: string;
  token: string;
  brideName: string;
  groomName: string;
  role: "admin" | "manager";
  expiresAt: Date;
  idempotencyKey: string;
}) {
  const url = absoluteUrl(`/join/${input.token}`);
  await sendEmail({
    to: input.to,
    subject: `You're invited to organise ${input.brideName} & ${input.groomName}`,
    text: memberInvitationText({
      brideName: input.brideName,
      groomName: input.groomName,
      role: input.role,
      email: input.to,
      url,
      expiresAt: input.expiresAt,
    }),
    idempotencyKey: input.idempotencyKey,
  });
}

export async function sendPasswordReset(input: { to: string; token: string; idempotencyKey: string }) {
  const url = absoluteUrl(`/reset-password/${encodeURIComponent(input.token)}`);
  await sendEmail({
    to: input.to,
    subject: "Reset your Wedding Home password",
    text: passwordResetText(url),
    idempotencyKey: input.idempotencyKey,
  });
}

export async function sendHouseholdInvitation(input: {
  to: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  city: string;
  invitePath: string;
  idempotencyKey: string;
}) {
  await sendEmail({
    to: input.to,
    subject: `${input.brideName} & ${input.groomName} invite you`,
    text: householdInvitationText({
      brideName: input.brideName,
      groomName: input.groomName,
      weddingDate: input.weddingDate,
      city: input.city,
      url: absoluteUrl(input.invitePath),
    }),
    idempotencyKey: input.idempotencyKey,
  });
}
