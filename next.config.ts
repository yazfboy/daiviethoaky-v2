import type { NextConfig } from "next";

/**
 * Chỉ cho phép trình duyệt tải ảnh từ chính site và từ máy chủ ảnh của Wikimedia Commons (nguồn ảnh được phép
 * duy nhất ở Phase 3). Ảnh từ mọi host khác bị trình duyệt chặn. Khớp ALLOWED_IMAGE_HOSTS trong src/lib/media/urls.ts.
 */
const IMG_SRC = "img-src 'self' data: blob: https://upload.wikimedia.org https://thumb.wikimedia.org";

const nextConfig: NextConfig = {
  // Tắt nén gzip để luồng chữ (stream) tới trình duyệt ngay, không bị gom lại.
  compress: false,
  poweredByHeader: false,
  // Không gửi source map phía trình duyệt ở bản build.
  productionBrowserSourceMaps: false,
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Content-Security-Policy", value: IMG_SRC }] }];
  },
};

export default nextConfig;
