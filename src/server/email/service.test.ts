import { afterEach, describe, expect, it, vi } from "vitest";

import { EmailDeliveryError, sendEmail } from "@/server/email/service";

describe("sendEmail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  it("accepts a provider id and does not throw", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.EMAIL_FROM = "The Wedding Home <onboarding@resend.dev>";
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: "msg_1" }));

    await expect(sendEmail({
      to: "a@example.com",
      subject: "Hello",
      text: "Body",
      idempotencyKey: "one",
    }, fetchImpl)).resolves.toBeUndefined();

    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.headers).toMatchObject({ "Idempotency-Key": "one", "User-Agent": "the-wedding-home" });
  });

  it("fails closed when the provider rejects the message", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.EMAIL_FROM = "The Wedding Home <onboarding@resend.dev>";
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("no", { status: 403 }));

    await expect(sendEmail({
      to: "a@example.com",
      subject: "Hello",
      text: "Body",
      idempotencyKey: "two",
    }, fetchImpl)).rejects.toBeInstanceOf(EmailDeliveryError);
  });
});
