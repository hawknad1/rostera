import type { NextConfig } from "next"

import { securityHeaders } from "./src/lib/http/security-headers"

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({ includeHsts: process.env.NODE_ENV === "production" }),
      },
    ]
  },
}

export default nextConfig
