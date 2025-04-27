import '../styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider } from '../lib/firebase/context';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // 라우터 이벤트 핸들러를 추가합니다.
    const handleRouteChange = (url) => {
      // URL이 동일한 경우 하드 네비게이션 방지
      if (url === router.asPath) {
        return;
      }
      
      // Google Analytics 또는 다른 분석 도구에 페이지 뷰 이벤트를 전송할 수 있습니다.
      console.log(`App is navigating to ${url}`);
    };

    router.events.on('routeChangeStart', handleRouteChange);

    // 컴포넌트 언마운트 시 이벤트 리스너 정리
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router]);

  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp; 
