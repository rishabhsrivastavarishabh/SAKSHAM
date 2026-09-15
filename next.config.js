/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["mongodb", "tesseract.js"],
  },
};

module.exports = nextConfig;
