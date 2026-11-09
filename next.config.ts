import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@napi-rs/canvas"],
  agentRules: false,
};

export default nextConfig;
