export function memberInvitationText(input: {
  brideName: string;
  groomName: string;
  role: "admin" | "manager";
  email: string;
  url: string;
  expiresAt: Date;
}) {
  const role = input.role === "admin" ? "an Admin" : "a Manager";
  const when = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(input.expiresAt);
  return [
    `Join ${input.brideName} & ${input.groomName} on The Wedding Home as ${role}.`,
    "",
    `Sign in or create an account using ${input.email}, then accept the invitation:`,
    input.url,
    "",
    `This invitation expires on ${when}.`,
    "If you were not expecting this, you can ignore this email.",
  ].join("\n");
}

export function passwordResetText(url: string) {
  return [
    "Reset your password for The Wedding Home.",
    "",
    "Open this link within the next hour:",
    url,
    "",
    "If you did not ask for this, you can ignore this email. The password stays the same.",
  ].join("\n");
}

export function householdInvitationText(input: {
  brideName: string;
  groomName: string;
  weddingDate: string;
  city: string;
  url: string;
}) {
  return [
    `${input.brideName} & ${input.groomName} invite you.`,
    "",
    `${input.weddingDate} · ${input.city}`,
    "",
    "Open your invitation. You do not need an account:",
    input.url,
  ].join("\n");
}

export function reminderText(input: {
  kind: "please_rsvp" | "see_you_soon";
  householdName: string;
  couple: string;
  eventTitle: string;
  when: string;
  venue: string | null;
  url: string;
}) {
  if (input.kind === "see_you_soon") {
    return [
      `${input.householdName}, see you at the ${input.eventTitle}.`,
      "",
      `${input.when}${input.venue ? ` · ${input.venue}` : ""}`,
      "",
      "Your invitation has the map, what to wear, and the helplines:",
      input.url,
      "",
      `With love,`,
      `${input.couple} and the families`,
    ].join("\n");
  }
  return [
    `Namaste ${input.householdName},`,
    "",
    `${input.couple} would love to know if you can join the ${input.eventTitle} on ${input.when}.`,
    "",
    "Please reply on your invitation. It takes a minute and needs no account:",
    input.url,
    "",
    "With love,",
    "The families",
  ].join("\n");
}
