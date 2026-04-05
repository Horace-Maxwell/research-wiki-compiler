import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*", "./prompts/**/*", "./templates/wiki/**/*"],
  },
};

export default nextConfig;
