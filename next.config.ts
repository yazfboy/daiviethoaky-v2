import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tắt nén gzip để luồng chữ (stream) tới trình duyệt ngay, không bị gom lại.
  compress: false,
  poweredByHeader: false,
  // Không gửi source map phía trình duyệt ở bản build.
  productionBrowserSourceMaps: false,
};

export default nextConfig;
