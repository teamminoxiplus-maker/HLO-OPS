/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Allow email attachments to pass through Server Actions (base64 inflates
    // ~33%; this covers the ~10 MB total attachment cap enforced in the app).
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
