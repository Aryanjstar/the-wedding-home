// Runs the reminder planner and sender once, the same work the daily Vercel Cron does.
// npx tsx --env-file=.env.local --conditions=react-server scripts/run-reminders.ts [ISO time to pretend it is]
import mongoose from "mongoose";

async function main() {
  const { runReminders } = await import("../src/modules/reminders/service");
  try {
    const now = process.argv[2] ? new Date(process.argv[2]) : new Date();
    console.log(JSON.stringify({ now: now.toISOString(), ...(await runReminders(now)) }));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
