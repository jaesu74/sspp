/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: '.next',
  // 정적 파일 경로 설정
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://sp.wvl.co.kr' : '',
  // 빌드 ID 생성
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  // Firebase 패키지 트랜스파일 설정
  transpilePackages: ['firebase', '@firebase/app', '@firebase/auth', '@firebase/firestore'],
  // API 라우팅
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  // 이미지 최적화 설정
  images: {
    unoptimized: true,
  },
  // 정적 파일 출력 설정
  output: 'standalone',
  // 실험적 기능 설정
  experimental: {
    scrollRestoration: true,
    optimizeCss: true,
  },
  // 웹팩 설정
  webpack: (config, { isServer, dev }) => {
    if (!dev) {
      config.optimization.minimize = true;
    }
    return config;
  },
}

module.exports = nextConfig 