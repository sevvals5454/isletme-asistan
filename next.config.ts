import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Birden fazla lockfile uyarısını sustur: workspace kökünü bu projeye sabitle.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
