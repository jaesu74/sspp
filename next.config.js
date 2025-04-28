/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: '.next',
  // 정적 파일에 대한 assetPrefix 설정
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://sp.wvl.co.kr' : '',
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
  // 하드 네비게이션 오류 방지를 위한 설정
  experimental: {
    scrollRestoration: true,
  },
}

module.exports = nextConfig 