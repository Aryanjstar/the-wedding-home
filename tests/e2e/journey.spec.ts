import { expect, test, type APIRequestContext, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import path from "node:path";

/**
 * The whole product, as real people use it: two families on two weddings, an Admin, a second
 * Admin, a Manager, and a guest with no account. Mail goes to plus-addresses of E2E_INBOX so it
 * lands in one real inbox. Run against `npm run dev`, or set E2E_BASE_URL.
 */

const tag = process.env.E2E_TAG ?? `${Date.now().toString(36)}`;
const inbox = process.env.E2E_INBOX ?? "aryanjstar3@gmail.com";
const [user, domain] = inbox.split("@");
const mail = (role: string) => `${user}+${role}-${tag}@${domain}`;
const password = process.env.E2E_PASSWORD ?? `Mandap-${randomBytes(6).toString("hex")}`;
const newPassword = `${password}-2`;

const people = {
  admin: { name: "Meera Iyer", email: mail("admin") },
  manager: { name: "Ravi Iyer", email: mail("manager") },
  admin2: { name: "Arun Kapoor", email: mail("admin2") },
  otherAdmin: { name: "Zoya Khan", email: mail("other") },
};

const state: { slug?: string; inviteUrl?: string; galleryUrl?: string; haldiId?: string; sangeetId?: string; taskId?: string } = {};

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function write(request: APIRequestContext, baseURL: string, method: "POST" | "PATCH" | "PUT" | "DELETE", url: string, data?: unknown) {
  return request.fetch(url, { method, data, headers: { Origin: baseURL } });
}

async function planWedding(page: Page, couple: { bride: string; groom: string; date: string; city: string }, person: { name: string; email: string }) {
  await page.goto("/plan");
  await page.fill("input[name=bride]", couple.bride);
  await page.fill("input[name=groom]", couple.groom);
  await page.fill("input[name=date]", couple.date);
  await page.fill("input[name=city]", couple.city);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.fill("input[name=name]", person.name);
  await page.fill("input[name=email]", person.email);
  await page.fill("input[name=password]", password);
  await page.fill("input[name=confirm]", password);
  await page.getByRole("button", { name: "Create the wedding" }).click();
  await page.waitForURL("**/app/events**");
}

async function addFunction(page: Page, input: { kind: string; date: string; start: string; venue?: string; city?: string; address?: string; primary?: boolean; muhurat?: string; dress?: string; about?: string }) {
  await page.getByRole("button", { name: "Add a function" }).click();
  const drawer = page.getByRole("dialog", { name: "Add a function" });
  await drawer.getByRole("button", { name: input.kind, exact: true }).click();
  await drawer.locator("input[name=date]").fill(input.date);
  await drawer.locator("input[name=start]").fill(input.start);
  const toggle = drawer.getByRole("switch");
  if (Boolean(input.primary) !== ((await toggle.getAttribute("aria-checked")) === "true")) await toggle.click();
  if (input.muhurat) await drawer.locator("input[name=muhurat]").fill(input.muhurat);
  if (input.venue) await drawer.locator("input[name=venueName]").fill(input.venue);
  if (input.city) await drawer.locator("input[name=city]").fill(input.city);
  if (input.address) await drawer.locator("input[name=address]").fill(input.address);
  if (input.dress) await drawer.locator("input[name=dressNote]").fill(input.dress);
  if (input.about) await drawer.locator("textarea[name=description]").fill(input.about);
  await drawer.getByRole("button", { name: "Add function" }).click();
  await expect(page.getByText(`${input.kind} is on the week.`)).toBeVisible();
}

async function signIn(page: Page, email: string, secret: string) {
  await page.goto("/sign-in");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", secret);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function newPage(browser: Browser, options: Parameters<Browser["newContext"]>[0] = {}): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: 1360, height: 900 }, ...options });
  return { context, page: await context.newPage() };
}

test.describe.serial("a family plans a wedding end to end", () => {
  let admin: Page;
  let adminContext: BrowserContext;
  let errors: string[];

  test.beforeAll(async ({ browser }) => {
    ({ context: adminContext, page: admin } = await newPage(browser));
    errors = trackErrors(admin);
  });

  test.afterAll(async () => {
    await adminContext.close();
  });

  test("an Admin plans the wedding and gets an empty, calm workspace", async () => {
    await planWedding(admin, { bride: "Meera Iyer", groom: "Arun Kapoor", date: "2027-02-14", city: "Udaipur" }, people.admin);
    await expect(admin.getByRole("heading", { name: "The week" })).toBeVisible();
    await expect(admin.getByText("No functions yet")).toBeVisible();
    await expect(admin.locator(".ws-couple")).toContainText("Meera & Arun");
    await expect(admin.getByRole("link", { name: "Members" })).toBeVisible();
    await expect(admin.getByRole("link", { name: "Website & themes" })).toBeVisible();
  });

  test("functions with venues, a primary date and muhurat, edited and mapped", async () => {
    await addFunction(admin, { kind: "Haldi", date: "2027-02-12", start: "10:00", venue: "Lake Pichola Ghat", city: "Udaipur", address: "Lal Ghat", dress: "Yellow, nothing you love", about: "Turmeric, laughter, and a mess." });
    await addFunction(admin, { kind: "Sangeet", date: "2027-02-13", start: "19:30", venue: "Fateh Prakash Palace", city: "Udaipur" });
    await addFunction(admin, { kind: "Wedding", date: "2027-02-14", start: "18:00", venue: "The Leela Palace", city: "Udaipur", primary: true, muhurat: "20:14" });
    await addFunction(admin, { kind: "Reception", date: "2027-02-15", start: "20:00" });
    await expect(admin.locator(".ws-event")).toHaveCount(4);
    await expect(admin.getByText("Muhurat 8:14 pm")).toBeVisible();
    await expect(admin.locator(".ws-event").first().getByRole("link", { name: "Open in Google Maps" })).toHaveAttribute("href", /google\.com\/maps\/search/);
    await expect(admin.locator(".ws-event").first().locator("iframe")).toHaveAttribute("src", /maps\.google\.com\/maps\?q=/);
    // The reception has no venue: no map, no broken embed.
    await expect(admin.locator(".ws-event").nth(3).locator("iframe")).toHaveCount(0);

    // Edit the reception: give it a venue and a dress note.
    await admin.locator(".ws-event").nth(3).getByRole("button", { name: "Edit" }).click();
    const drawer = admin.getByRole("dialog", { name: "Edit Reception" });
    await drawer.locator("input[name=venueName]").fill("Oberoi Udaivilas");
    await drawer.locator("input[name=dressNote]").fill("Black tie, Indian or western");
    await drawer.getByRole("button", { name: "Save changes" }).click();
    await expect(admin.getByText("Reception saved.")).toBeVisible();
    await expect(admin.locator(".ws-event").nth(3)).toContainText("Oberoi Udaivilas");

    const events = await (await admin.request.get("/api/events")).json() as { items: { id: string; title: string }[] };
    state.haldiId = events.items.find((item) => item.title === "Haldi")?.id;
    state.sangeetId = events.items.find((item) => item.title === "Sangeet")?.id;

    await admin.goto("/app");
    await expect(admin.locator(".ws-hero")).toContainText("Muhurat 8:14 pm");
    await expect(admin.locator(".ws-hero")).toContainText("14 February 2027");
    await expect(admin.locator(".ws-hero-next")).toContainText("Haldi");
  });

  test("households, private links, WhatsApp, and the e-card", async ({ baseURL }) => {
    await admin.goto("/app/guests");
    await admin.getByRole("button", { name: "Add a household" }).first().click();
    let drawer = admin.getByRole("dialog", { name: "Add a household" });
    await drawer.locator("input[name=name]").fill("Sharma family");
    await drawer.getByRole("button", { name: "Bride's side" }).click();
    await drawer.getByRole("button", { name: "One more" }).click();
    await drawer.locator("input[name=phone]").fill("98765 43210");
    await drawer.locator("input[name=email]").fill(mail("guest"));
    await drawer.getByRole("button", { name: "Add household" }).click();
    await expect(admin.getByText("Sharma family added.")).toBeVisible();

    await admin.getByRole("button", { name: "Add a household" }).first().click();
    drawer = admin.getByRole("dialog", { name: "Add a household" });
    await drawer.locator("input[name=name]").fill("College friends");
    await drawer.getByRole("button", { name: "Friends and others" }).click();
    // Only the Sangeet.
    for (const name of [/Haldi/, /Wedding/, /Reception/]) await drawer.getByRole("button", { name }).click();
    await drawer.getByRole("button", { name: "Add household" }).click();
    await expect(admin.locator(".ws-guest-row")).toHaveCount(2);

    // A phone number that is not a phone number is refused.
    await admin.locator(".ws-guest-row", { hasText: "College friends" }).getByRole("button", { name: "Edit" }).click();
    drawer = admin.getByRole("dialog", { name: "Edit College friends" });
    await drawer.locator("input[name=phone]").fill("12");
    await drawer.getByRole("button", { name: "Save changes" }).click();
    await expect(drawer.locator(".auth-alert")).toContainText("10-digit");
    await drawer.locator("input[name=phone]").fill("");
    await drawer.getByRole("button", { name: "Save changes" }).click();
    await expect(admin.getByText("College friends saved.")).toBeVisible();

    const households = await (await admin.request.get("/api/households")).json() as { items: { id: string; name: string; maxPeople: number; phone: string | null; invitedEventIds: string[] }[] };
    const sharma = households.items.find((item) => item.name === "Sharma family")!;
    const friends = households.items.find((item) => item.name === "College friends")!;
    expect(sharma.maxPeople).toBe(5);
    expect(sharma.phone).toBe("+919876543210");
    expect(friends.invitedEventIds).toEqual([state.sangeetId]);
    expect(JSON.stringify(households)).not.toContain("inviteToken");

    const share = await (await admin.request.get(`/api/households/${sharma.id}/share`)).json() as { inviteUrl: string; waUrl: string; message: string };
    expect(share.waUrl).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
    expect(share.message).toContain("Meera Iyer & Arun Kapoor");
    expect(share.message).toContain(share.inviteUrl);
    const friendsShare = await (await admin.request.get(`/api/households/${friends.id}/share`)).json() as { waUrl: string; inviteUrl: string };
    expect(friendsShare.waUrl).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(friendsShare.inviteUrl).not.toBe(share.inviteUrl);
    state.inviteUrl = new URL(share.inviteUrl).pathname;

    const card = await admin.request.get(`/api/households/${sharma.id}/ecard`);
    expect(card.headers()["content-type"]).toContain("image/png");
    expect((await card.body()).byteLength).toBeGreaterThan(5000);

    // The invitation email goes to the guest's inbox and is marked sent.
    await admin.locator(".ws-guest-row", { hasText: "Sharma family" }).getByRole("button", { name: "Email the invitation" }).click();
    await expect(admin.getByText(`Invitation emailed to ${mail("guest")}.`)).toBeVisible();
    await expect(admin.locator(".ws-guest-row", { hasText: "Sharma family" })).toContainText("sent");
    void baseURL;
  });

  test("a guest opens the private link on a phone and RSVPs per function with diet", async ({ browser, baseURL }) => {
    const { context, page } = await newPage(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const guestErrors = trackErrors(page);
    await page.goto(state.inviteUrl!);
    await expect(page.getByText("Dear Sharma family")).toBeVisible();
    await expect(page.locator(".g-invite-fn")).toHaveCount(4);
    await expect(page.locator(".g-invite-fn").first()).toContainText("हल्दी");
    await expect(page.getByRole("link", { name: "Open in Google Maps" }).first()).toHaveAttribute("href", /google\.com\/maps/);

    const rows = page.locator(".g-rsvp-row");
    await rows.nth(0).getByRole("radio", { name: "Yes, coming" }).click();
    await rows.nth(0).getByRole("button", { name: "One more, People coming" }).click();
    await rows.nth(0).getByRole("button", { name: "One more, Jain" }).click();
    await expect(rows.nth(0)).toContainText("add up to 4");
    await page.getByRole("button", { name: "Send my reply" }).click();
    await expect(page.locator(".g-error")).toContainText("must add up to 3");
    await rows.nth(0).getByRole("button", { name: "One fewer, Veg" }).click();
    await expect(rows.nth(0)).toContainText("Adds up: 3 plates.");
    await page.getByRole("button", { name: "Same answer for every function" }).click();
    await rows.nth(3).getByRole("radio", { name: "Can't come" }).click();
    await page.getByRole("button", { name: "Send my reply" }).click();
    await expect(page.getByText("Thank you. Your reply is saved.")).toBeVisible();

    // The same link changes the answer; it never duplicates.
    await page.reload();
    await expect(page.locator(".g-rsvp-row").nth(0)).toContainText("Adds up: 3 plates.");
    await page.locator(".g-rsvp-row").nth(1).getByRole("button", { name: "One fewer, People coming" }).click();
    await page.getByRole("button", { name: "Update my reply" }).click();
    await expect(page.getByText("Thank you. Your reply is saved.")).toBeVisible();

    // More people than the invitation allows is refused by the server too.
    const token = state.inviteUrl!.split("/").pop();
    const over = await write(context.request, baseURL!, "PUT", `/api/public/invite/${token}/rsvp`, { responses: [{ eventId: state.haldiId, status: "yes", attendingCount: 9, diet: { veg: 9, nonVeg: 0, jain: 0 } }] });
    expect(over.status()).toBe(400);
    const notMine = await write(context.request, baseURL!, "PUT", `/api/public/invite/${token}/rsvp`, { responses: [{ eventId: "0123456789abcdef01234567", status: "no" }] });
    expect(notMine.status()).toBe(400);

    // Sound: starts silent, the guest turns it on, and it survives the next page.
    await page.getByRole("button", { name: /Play music/ }).first().click();
    await expect(page.locator(".g-sound").first()).toHaveAttribute("aria-pressed", "true");
    const width = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(width).toBeLessThanOrEqual(1);

    await page.goto("/i/not-a-real-token-at-all-000000000");
    await expect(page.getByText("This invitation link is not valid")).toBeVisible();
    expect(guestErrors).toEqual([]);
    await context.close();
  });

  test("the family sees replies, caterer totals, and the reminder queue", async () => {
    await admin.goto("/app/guests");
    await expect(admin.locator(".ws-guest-row", { hasText: "Sharma family" })).toContainText("Haldi · 3");
    await expect(admin.locator(".ws-guest-row", { hasText: "Sharma family" })).toContainText("Reception · no");
    await admin.getByRole("tab", { name: "Caterer counts" }).click();
    const haldi = admin.locator(".ws-caterer-card", { hasText: "Haldi" });
    await expect(haldi).toContainText("Veg 2");
    await expect(haldi).toContainText("Jain 1");
    await admin.getByRole("tab", { name: "Reminders" }).click();
    await admin.getByRole("combobox", { name: "Function" }).selectOption(state.sangeetId!);
    await expect(admin.locator(".ui-row", { hasText: "College friends" })).toBeVisible();
    await expect(admin.getByText("1 month before")).toBeVisible();
    await expect(admin.locator(".ui-row", { hasText: "College friends" }).getByRole("button", { name: "Email" })).toBeDisabled();
    const share = await (await admin.request.get(`/api/households/${(await (await admin.request.get("/api/households")).json() as { items: { id: string; name: string }[] }).items.find((item) => item.name === "College friends")!.id}/share?kind=please_rsvp&eventId=${state.sangeetId}`)).json() as { message: string };
    expect(share.message).toContain("please tell us if you can join the Sangeet");

    // A silent household with an email gets the reminder now, through Resend.
    await admin.getByRole("tab", { name: /^Households/ }).click();
    await admin.getByRole("button", { name: "Add a household" }).first().click();
    const drawer = admin.getByRole("dialog", { name: "Add a household" });
    await drawer.locator("input[name=name]").fill("Mehta ji and family");
    await drawer.getByRole("button", { name: "Groom's side" }).click();
    await drawer.locator("input[name=email]").fill(mail("mehta"));
    await drawer.getByRole("button", { name: "Add household" }).click();
    await expect(admin.getByText("Mehta ji and family added.")).toBeVisible();
    await admin.getByRole("tab", { name: "Reminders" }).click();
    await admin.getByRole("combobox", { name: "Function" }).selectOption(state.sangeetId!);
    await expect(admin.locator(".ui-row", { hasText: "Mehta ji and family" })).toBeVisible();
    await admin.getByRole("button", { name: "Email 1 now" }).click();
    await admin.locator("dialog.ui-confirm").getByRole("button", { name: "Send 1 email" }).click();
    await expect(admin.getByText("Sent 1.")).toBeVisible({ timeout: 30_000 });
    await expect(admin.locator(".ui-row", { hasText: "Mehta ji and family" })).toContainText("Last reminded");
  });

  test("deleting a function that has invitations asks first", async () => {
    await admin.goto("/app/events");
    await admin.locator(".ws-event", { hasText: "Sangeet" }).getByRole("button", { name: "Edit" }).click();
    await admin.getByRole("dialog", { name: "Edit Sangeet" }).getByRole("button", { name: "Remove" }).click();
    await admin.locator("dialog.ui-confirm").getByRole("button", { name: "Remove" }).click();
    await expect(admin.locator("dialog.ui-confirm")).toContainText("households are invited");
    await admin.locator("dialog.ui-confirm").getByRole("button", { name: "Cancel" }).click();
    await expect(admin.locator(".ws-event", { hasText: "Sangeet" })).toHaveCount(1);
  });

  test("tasks: add, assign, date, priority, done, filter, delete", async () => {
    await admin.goto("/app/tasks");
    await admin.getByRole("textbox", { name: "New task" }).fill("Book the pandit ji");
    await admin.getByRole("button", { name: "Add", exact: true }).click();
    await expect(admin.getByText("Task added.")).toBeVisible();
    await admin.getByRole("textbox", { name: "New task" }).fill("Confirm the caterer count");
    await admin.getByRole("button", { name: "Add", exact: true }).click();
    await admin.locator(".ws-task", { hasText: "Book the pandit ji" }).click();
    const drawer = admin.getByRole("dialog", { name: "Task" });
    await drawer.locator("select[name=assigneeId]").selectOption({ label: people.admin.name });
    await drawer.locator("input[name=dueOn]").fill("2027-01-20");
    await drawer.getByRole("tab", { name: "High" }).click();
    await drawer.locator("select[name=eventId]").selectOption({ label: "Wedding" });
    await drawer.getByRole("button", { name: "Save" }).click();
    await expect(admin.getByText("Task saved.")).toBeVisible();
    const card = admin.locator(".ws-task", { hasText: "Book the pandit ji" });
    await expect(card).toContainText(people.admin.name);
    await expect(card).toContainText("Wedding");
    await admin.getByRole("tab", { name: /Mine/ }).click();
    await expect(admin.locator(".ws-task")).toHaveCount(1);
    await admin.getByRole("tab", { name: /^All/ }).click();
    await card.getByRole("checkbox").click();
    await expect(admin.locator(".ws-column", { hasText: "Done" }).locator(".ws-task", { hasText: "Book the pandit ji" })).toBeVisible();
    await admin.locator(".ws-task", { hasText: "Confirm the caterer count" }).click();
    await admin.getByRole("dialog", { name: "Task" }).getByRole("button", { name: "Delete" }).click();
    await admin.locator("dialog.ui-confirm").getByRole("button", { name: "Delete" }).click();
    await expect(admin.locator(".ws-task", { hasText: "Confirm the caterer count" })).toHaveCount(0);
  });

  test("vendors and expenses in rupees, linked together", async () => {
    await admin.goto("/app/vendors");
    await admin.getByRole("button", { name: "Add a vendor" }).first().click();
    let drawer = admin.getByRole("dialog", { name: "Add a vendor" });
    await drawer.locator("input[name=name]").fill("Udaipur Caterers");
    await drawer.locator("select[name=category]").selectOption("caterer");
    await drawer.getByRole("textbox", { name: "agreedCostInr" }).fill("450000");
    await expect(drawer.getByRole("textbox", { name: "agreedCostInr" })).toHaveValue("4,50,000");
    await drawer.locator("input[name=phone]").fill("+91 94140 12345");
    await drawer.locator("input[name=website]").fill("udaipurcaterers.in");
    await drawer.getByRole("button", { name: "Save vendor" }).click();
    await expect(admin.locator(".ws-vendor", { hasText: "Udaipur Caterers" })).toContainText("₹4,50,000");

    // Nearby search runs through Places on the server, or says calmly that it cannot.
    await admin.getByRole("tab", { name: "Find nearby" }).click();
    await admin.getByRole("button", { name: "Search nearby" }).click();
    await expect(admin.locator(".ws-place").first().or(admin.locator(".ui-error-note"))).toBeVisible({ timeout: 20_000 });
    if (await admin.locator(".ws-place").count()) {
      await admin.locator(".ws-place").first().getByRole("button", { name: "Save" }).click();
      await expect(admin.getByText(/saved to My vendors/)).toBeVisible();
    }

    await admin.goto("/app/expenses");
    await admin.getByRole("button", { name: "Log an expense" }).first().click();
    drawer = admin.getByRole("dialog", { name: "Log an expense" });
    await drawer.locator("input[name=title]").fill("Caterer advance");
    await drawer.getByRole("textbox", { name: "amountInr" }).fill("250000");
    await drawer.locator("select[name=category]").selectOption("catering");
    await drawer.getByRole("combobox").nth(2).selectOption({ label: "Udaipur Caterers" });
    await drawer.getByRole("button", { name: "Log expense" }).click();
    await expect(admin.getByText("₹2,50,000 logged.")).toBeVisible();
    await admin.getByRole("button", { name: "Log an expense" }).first().click();
    drawer = admin.getByRole("dialog", { name: "Log an expense" });
    await drawer.locator("input[name=title]").fill("Haldi marigolds");
    await drawer.getByRole("textbox", { name: "amountInr" }).fill("18500");
    await drawer.locator("select[name=category]").selectOption("decoration");
    await drawer.getByRole("button", { name: "Log expense" }).click();
    await expect(admin.locator(".ws-total")).toHaveText("₹2,68,500");
    await admin.locator(".ui-row", { hasText: "Haldi marigolds" }).click();
    drawer = admin.getByRole("dialog", { name: "Edit expense" });
    await drawer.getByRole("textbox", { name: "amountInr" }).fill("20000");
    await drawer.getByRole("button", { name: "Save" }).click();
    await expect(admin.locator(".ws-total")).toHaveText("₹2,70,000");
    await admin.goto("/app/vendors");
    await expect(admin.locator(".ws-vendor", { hasText: "Udaipur Caterers" })).toContainText("Paid ₹2,50,000");
    await admin.goto("/app");
    await expect(admin.locator(".ws-stat", { hasText: "Spent so far" })).toContainText("₹2,70,000");
  });

  test("photos: upload, album, hide, QR, and the guest gallery", async ({ browser }) => {
    await admin.goto("/app/photos");
    await admin.getByRole("combobox", { name: "Album for the upload" }).selectOption({ label: "Album: Haldi" });
    await admin.locator("input[type=file]").setInputFiles([path.join(process.cwd(), "public/photos/haldi.jpg"), path.join(process.cwd(), "public/photos/sangeet.jpg")]);
    await expect(admin.getByText("2 files added to the gallery.")).toBeVisible({ timeout: 30_000 });
    await expect(admin.locator(".ws-tile")).toHaveCount(2);
    await expect(admin.getByRole("button", { name: "Haldi · 2" })).toBeVisible();
    const qr = await admin.request.get("/api/gallery/qr");
    expect(qr.headers()["content-type"]).toBe("image/png");
    const gallery = await (await admin.request.get("/api/gallery")).json() as { url: string };
    state.galleryUrl = new URL(gallery.url).pathname;
    await admin.locator(".ws-tile").first().getByRole("button", { name: "Hide from guests" }).click();
    await expect(admin.getByText("Hidden from guests.")).toBeVisible();

    const { context, page } = await newPage(browser, { viewport: { width: 390, height: 844 } });
    await page.goto(state.galleryUrl);
    await expect(page.locator(".g-tile")).toHaveCount(1);
    await page.locator("input[type=file]").setInputFiles(path.join(process.cwd(), "public/photos/wedding.jpg"));
    await expect(page.getByText(/Thank you\. 1 file is in the gallery/)).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".g-tile")).toHaveCount(2);

    await admin.reload();
    await admin.getByRole("switch", { name: "Guests can upload" }).click();
    await expect(admin.getByText("Guests can look, not upload.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("The family has turned uploads off")).toBeVisible();
    await admin.getByRole("switch", { name: "Gallery open" }).click();
    await expect(admin.getByText("The gallery link now shows a closed page.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("This gallery is closed")).toBeVisible();
    await admin.getByRole("switch", { name: "Gallery open" }).click();
    await expect(admin.getByText("The gallery is open.")).toBeVisible();
    await context.close();
  });

  test("the website: pack, a function's own world and music, helplines, aashirwad, publish", async ({ browser }) => {
    await admin.goto("/app/website");
    await admin.locator(".ws-pack", { hasText: "Traditional" }).click();
    await expect(admin.getByText("Traditional is the wedding's look.")).toBeVisible();
    const haldi = admin.locator(".ws-fn-theme").filter({ has: admin.locator("strong", { hasText: /^Haldi$/ }) });
    await haldi.getByRole("combobox").nth(1).selectOption({ label: "Dhol · bhangra" });
    await haldi.getByRole("button", { name: "Save" }).click();
    await expect(admin.getByText("Haldi theme saved.")).toBeVisible();
    await admin.locator("input[name=brideHelpName]").fill("Lakshmi Mausi");
    await admin.locator("input[name=brideHelpPhone]").fill("+91 98290 11111");
    await admin.locator("input[name=brideHeading]").fill("The Iyers of Chennai");
    await admin.locator("textarea[name=stay]").fill("Hotel Lakend is 5 minutes from the ghat.");
    await admin.getByRole("button", { name: "Save details" }).click();
    await expect(admin.getByText("Website details saved.")).toBeVisible();
    await admin.locator("input[name=author]").fill("Paati");
    await admin.locator("textarea[name=message]").fill("May your home always be full of laughter.");
    await admin.getByRole("button", { name: "Add to the wall" }).click();
    await expect(admin.locator(".ws-blessing")).toContainText("Paati");
    const bad = await write(admin.request, new URL(admin.url()).origin, "PATCH", "/api/website", { liveUrl: "https://example.com/stream" });
    expect(bad.status()).toBe(400);
    await admin.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(admin.getByText("The guest site is live.")).toBeVisible();
    const site = await (await admin.request.get("/api/website")).json() as { slug: string };
    state.slug = site.slug;
    expect(site.slug).toMatch(/^meera-arun-14022027/);

    const { context, page } = await newPage(browser);
    const guestErrors = trackErrors(page);
    await page.goto(`/w/${state.slug}`);
    await expect(page.locator(".g-hero")).toContainText("Meera & Arun");
    await expect(page.locator(".g-fn-card")).toHaveCount(4);
    await expect(page.getByText("Lakshmi Mausi")).toBeVisible();
    await expect(page.getByText("May your home always be full of laughter.")).toBeVisible();
    await page.getByRole("button", { name: /Play music/ }).first().click();
    await expect(page.locator(".g-header .g-sound")).toHaveAttribute("aria-pressed", "true");
    await page.locator(".g-fn-card", { hasText: "Haldi" }).click();
    await expect(page.locator(".g-stage-hero")).toContainText("हल्दी");
    await expect(page.locator(".g-header .g-sound")).toContainText("Dhol · bhangra");
    await expect(page.locator(".g-header .g-sound")).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("link", { name: "Sangeet", exact: true }).click();
    await expect(page.locator(".g-header .g-sound")).toContainText("Yaman · teental");
    await page.locator(".g-header .g-sound").click();
    await expect(page.locator(".g-header .g-sound")).toHaveAttribute("aria-pressed", "false");
    expect(guestErrors).toEqual([]);

    await admin.getByRole("button", { name: "Unpublish" }).click();
    await admin.locator("dialog.ui-confirm").getByRole("button", { name: "Unpublish" }).click();
    await expect(admin.getByText("The site is now a draft.")).toBeVisible();
    expect((await page.goto(`/w/${state.slug}`))?.status()).toBe(404);
    await admin.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(admin.getByText("The guest site is live.")).toBeVisible();
    await context.close();
  });

  test("preview as guest works for a test invitation without saving", async () => {
    await admin.goto("/app/preview");
    await admin.getByRole("link", { name: "Open the test invitation" }).click();
    await expect(admin.getByText("Dear Preview family")).toBeVisible();
    await admin.locator(".g-rsvp-row").first().getByRole("radio", { name: "Yes, coming" }).click();
    await admin.getByRole("button", { name: "Send my reply" }).click();
    await expect(admin.getByText("Preview only")).toBeVisible();
    await admin.goto("/app/guests");
    await expect(admin.locator(".ws-guest-row")).toHaveCount(3);
  });

  test("members: a Manager joins, sees the right pages, and the last Admin stays", async ({ browser, baseURL }) => {
    await admin.goto("/app/members");
    await expect(admin.locator(".ws-member", { hasText: "(you)" }).getByRole("button", { name: "Make Manager" })).toBeDisabled();
    await admin.getByPlaceholder("papa@example.com").fill(people.manager.email);
    await admin.getByRole("button", { name: "Send invite" }).click();
    await expect(admin.getByText(`Invitation emailed to ${people.manager.email}.`)).toBeVisible();
    await expect(admin.locator(".ws-member", { hasText: people.manager.email })).toContainText("Invited · Manager");
    await admin.getByPlaceholder("papa@example.com").fill(people.manager.email);
    await admin.getByRole("button", { name: "Send invite" }).click();
    await expect(admin.getByText("That invitation is already waiting.")).toBeVisible();

    const { context, page } = await newPage(browser);
    await page.goto(`/create-account?email=${encodeURIComponent(people.manager.email)}`);
    await page.fill("input[name=name]", people.manager.name);
    await page.fill("input[name=password]", password);
    await page.fill("input[name=confirm]", password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/app");
    await expect(page.locator(".ws-couple")).toContainText("Meera & Arun");
    await expect(page.locator(".ws-person")).toContainText("Manager");
    await expect(page.getByRole("link", { name: "Members" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Website & themes" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Preview as guest" })).toBeVisible();
    await page.goto("/app/members");
    await expect(page.getByText("Admins only")).toBeVisible();
    expect((await write(context.request, baseURL!, "PATCH", "/api/website", { stay: "Hacked" })).status()).toBe(403);
    expect((await write(context.request, baseURL!, "POST", "/api/members/invitations", { email: "x@example.com", role: "admin" })).status()).toBe(403);
    // A Manager plans: the same data, and their task shows up for the Admin.
    await page.goto("/app/tasks");
    await page.getByRole("textbox", { name: "New task" }).fill("Order the varmala");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Task added.")).toBeVisible();
    await page.goto("/app/guests");
    await expect(page.locator(".ws-guest-row")).toHaveCount(3);

    await admin.goto("/app/tasks");
    await expect(admin.locator(".ws-task", { hasText: "Order the varmala" })).toBeVisible();

    // Promote, then the original Admin can step down; the wedding never has zero Admins.
    await admin.goto("/app/members");
    await admin.locator(".ws-member", { hasText: people.manager.name }).getByRole("button", { name: "Make Admin" }).click();
    await expect(admin.getByText(`${people.manager.name} is now an Admin.`)).toBeVisible();
    await page.goto("/app");
    await page.reload();
    await expect(page.getByRole("link", { name: "Members" })).toBeVisible();
    await admin.locator(".ws-member", { hasText: people.manager.name }).getByRole("button", { name: "Make Manager" }).click();
    await expect(admin.getByText(`${people.manager.name} is now a Manager.`)).toBeVisible();
    const members = await (await admin.request.get("/api/members")).json() as { members: { userId: string; email: string }[] };
    const me = members.members.find((member) => member.email === people.admin.email)!;
    expect((await write(admin.request, baseURL!, "PATCH", `/api/members/${me.userId}`, { role: "manager" })).status()).toBe(409);

    // A second Admin by invitation, withdrawn and sent again.
    await admin.getByPlaceholder("papa@example.com").fill(people.admin2.email);
    await admin.getByRole("tab", { name: "Admin" }).click();
    await admin.getByRole("button", { name: "Send invite" }).click();
    await expect(admin.locator(".ws-member", { hasText: people.admin2.email })).toContainText("Invited · Admin");
    await admin.locator(".ws-member", { hasText: people.admin2.email }).getByRole("button", { name: "Withdraw" }).click();
    await expect(admin.getByText("Invitation withdrawn.")).toBeVisible();
    await context.close();
  });

  test("another family's wedding is invisible, and one account plans one wedding", async ({ browser, baseURL }) => {
    const { context, page } = await newPage(browser);
    await planWedding(page, { bride: "Zoya Khan", groom: "Kabir Rao", date: "2027-03-20", city: "Kochi" }, people.otherAdmin);
    await expect(page.locator(".ws-event")).toHaveCount(0);
    expect((await page.request.get(`/api/events/${state.haldiId}`)).status()).toBe(404);
    const households = await (await page.request.get("/api/households")).json() as { items: unknown[] };
    expect(households.items).toHaveLength(0);
    expect((await write(page.request, baseURL!, "DELETE", `/api/events/${state.haldiId}`)).status()).toBe(404);
    expect((await write(page.request, baseURL!, "POST", "/api/wedding", { brideName: "A", groomName: "B", weddingDate: "2027-01-01", city: "Goa" })).status()).toBe(409);
    // Inviting someone who already organises another wedding is a clear error.
    await page.goto("/app/members");
    await page.getByPlaceholder("papa@example.com").fill(people.admin.email);
    await page.getByRole("button", { name: "Send invite" }).click();
    await expect(page.getByText("That email is already on a wedding.")).toBeVisible();
    await context.close();
  });

  test("account: name, password with the eye, wrong password, reset request", async ({ browser }) => {
    await admin.goto("/app/account");
    await admin.locator("input[name=name]").fill("Meera Iyer Kapoor");
    await admin.getByRole("button", { name: "Save name" }).click();
    await expect(admin.locator(".ws-person")).toContainText("Meera Iyer Kapoor");
    await admin.locator("input[name=current]").fill("not-my-password");
    await admin.locator("input[name=next]").fill(newPassword);
    await admin.locator("input[name=again]").fill(newPassword);
    await admin.getByRole("button", { name: "Change password" }).click();
    await expect(admin.locator(".auth-alert")).toContainText("current password is not right");
    await admin.locator("input[name=current]").fill(password);
    const eye = admin.getByRole("button", { name: "Show password" }).first();
    await eye.click();
    await expect(admin.locator("input[name=current]")).toHaveAttribute("type", "text");
    await admin.getByRole("button", { name: "Change password" }).click();
    await expect(admin.getByText("Password changed.")).toBeVisible();

    const { context, page } = await newPage(browser);
    await signIn(page, people.admin.email, password);
    await expect(page.locator(".auth-alert")).toContainText("That email and password do not match.");
    await signIn(page, people.admin.email, newPassword);
    await page.waitForURL("**/app");
    await page.goto("/reset-password");
    await page.fill("input[name=email]", `nobody-${tag}@example.com`);
    await page.getByRole("button", { name: "Send the reset link" }).click();
    await expect(page.getByText("Check that inbox.")).toBeVisible();
    await context.close();
  });

  test("phone widths do not overflow, and nothing threw in the browser", async () => {
    await admin.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/app", "/app/events", "/app/guests", "/app/tasks", "/app/expenses", "/app/vendors", "/app/photos", "/app/website", "/app/members", "/app/account"]) {
      await admin.goto(route);
      await admin.waitForLoadState("networkidle");
      const overflow = await admin.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} overflows`).toBeLessThanOrEqual(1);
    }
    await admin.getByRole("button", { name: "Open menu" }).click();
    await expect(admin.getByRole("link", { name: "Events" })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
