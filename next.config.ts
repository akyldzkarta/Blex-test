import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel serverless: prompt dosyasını webhook fonksiyonuyla birlikte paketle
  outputFileTracingIncludes: {
    "/api/webhook": ["./AGENT_PROMPT.md"],
  },
};

export default nextConfig;
