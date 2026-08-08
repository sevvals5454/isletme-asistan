import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Birden fazla lockfile uyarısını sustur: workspace kökünü bu projeye sabitle.
  outputFileTracingRoot: path.join(__dirname),
  // Dağıtım kimliğini client'a göm → "yeni sürüm var" tespiti için.
  // Vercel'de VERCEL_GIT_COMMIT_SHA otomatik gelir; yerelde "dev".
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
  },
};

export default nextConfig;
