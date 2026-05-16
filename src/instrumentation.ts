// Runs once when the Next.js server boots. Used to start the BullMQ worker
// in the same process as the web server (acceptable for ChefAI scale).

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startImageWorker } = await import("./lib/worker");
    startImageWorker();

    // Trial-conversion poller: every 15 min, scan for expired trials and
    // auto-charge their saved payment method. Safe to run on every instance —
    // the SQL filter on `trialChargedAt: null` makes it idempotent.
    const { processExpiredTrials } = await import("./lib/trial-worker");
    const TICK = 15 * 60 * 1000;
    setInterval(() => {
      processExpiredTrials().catch((e) => {
        // logger is server-only; require lazily.
        import("./lib/logger").then(({ logger }) =>
          logger.error({ err: e }, "trial-worker tick crashed")
        );
      });
    }, TICK).unref?.();
    // Kick off one immediate run on boot so users don't wait 15 min after
    // a redeploy.
    setTimeout(() => {
      processExpiredTrials().catch(() => {});
    }, 30_000).unref?.();

    // Email workers — scheduled email campaigns, trial reminders, weekly digest
    const {
      processScheduledEmailCampaigns,
      processTrialReminders,
      processWeeklyDigest,
    } = await import("./lib/email-worker");

    setInterval(() => {
      processScheduledEmailCampaigns().catch((e) =>
        import("./lib/logger").then(({ logger }) =>
          logger.error({ err: e }, "scheduled-email worker crashed")
        )
      );
    }, TICK).unref?.();

    setInterval(() => {
      processTrialReminders().catch((e) =>
        import("./lib/logger").then(({ logger }) =>
          logger.error({ err: e }, "trial-reminder worker crashed")
        )
      );
    }, 30 * 60 * 1000).unref?.(); // 30 min

    setInterval(() => {
      processWeeklyDigest().catch((e) =>
        import("./lib/logger").then(({ logger }) =>
          logger.error({ err: e }, "weekly-digest worker crashed")
        )
      );
    }, 60 * 60 * 1000).unref?.(); // hourly check (fires Mondays 9-10)
  }
}
