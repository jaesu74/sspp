/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: '.next',
  // 정적 파일에 대한 assetPrefix 명확히 설정
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://sp.wvl.co.kr' : '',
  // 추가: 빌드 ID 생성을 위한 generateBuildId 함수 정의
  generateBuildId: async () => {
    // 타임스탬프를 사용하여 고유한 빌드 ID 생성
    return `build-${Date.now()}`;
  },
  env: {
    // 배포 환경 URL
    NEXT_PUBLIC_BASE_URL: 'https://sp.wvl.co.kr',
    NEXT_PUBLIC_API_URL: 'https://sp.wvl.co.kr/api',
  },
  // Firebase 관련 설정
  transpilePackages: ['firebase', '@firebase/app', '@firebase/auth', '@firebase/firestore'],
  // API 경로 유지
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  // 빌드 최적화
  swcMinify: true,
  // 정적 이미지 최적화 비활성화 (App Engine에서 더 안정적인 배포를 위해)
  images: {
    unoptimized: true,
  },
  // 정적 파일 출력 설정
  output: 'standalone',
  // 실험적 기능 설정
  experimental: {
    scrollRestoration: true,
    // CSS 최적화 - Next.js 15.3.1에 맞게 설정
    optimizeCss: true,
  },
  // 추가: 웹팩 설정 커스터마이징
  webpack: (config, { isServer, dev }) => {
    // 프로덕션 빌드에만 적용되는 최적화
    if (!dev) {
      config.optimization.minimize = true;
    }
    
    return config;
  },
}

module.exports = nextConfig 