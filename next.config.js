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
  // 클라이언트 측에서 필요한 환경 변수 설정
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_BASE_URL: 'https://sp.wvl.co.kr',
    NEXT_PUBLIC_API_URL: 'https://sp.wvl.co.kr/api'
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
  // 환경 변수를 바로 포함
  publicRuntimeConfig: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  }
}

module.exports = nextConfig 