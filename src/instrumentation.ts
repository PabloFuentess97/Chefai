// Runs once when the Next.js server boots. Used to start the BullMQ worker
// in the same process as the web server (acceptable for ChefAI scale).

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startImageWorker } = await import("./lib/worker");
    startImageWorker();
  }
}
