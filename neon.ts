import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Only Postgres (with pgvector) is used by this app.
  // AI Gateway: skipped — Free plan doesn't support it, and we use a custom
  //   OpenAI-compatible gateway (yujianwudi.top) for LLM + embeddings.
  // Auth: skipped — single-user, no authentication.
  // Object Storage: skipped — files go to Vercel Blob.
  // Functions: skipped — no serverless function requirement.

  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      return { ttl: "7d" };
    }
    return {};
  },
});
