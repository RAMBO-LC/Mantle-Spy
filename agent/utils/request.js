export async function safeRequest(fn, label = "API", maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Execute the provided async function
      return await fn();
    } catch (err) {
      const isLast = attempt === maxRetries;
      const code = err?.code || err?.response?.status || "UNKNOWN";
      const msg = err?.message || String(err);

      if (isLast) {
        console.error(`[${label}] ❌ Final failure after ${maxRetries} attempts (${code}): ${msg}`);
        return null; // Graceful non-fatal return
      }

      // Exponential backoff: 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`[${label}] ⚠️ Attempt ${attempt} failed (${code}): ${msg}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return null;
}
