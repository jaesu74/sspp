/**
 * Firebase 설정 관리 파일
 * 환경 변수에서 설정 정보를 가져옵니다.
 */

// 환경 변수 확인 함수
function checkEnvVariables() {
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    if (typeof window !== 'undefined') {
      console.warn(`Firebase 설정 오류: 다음 환경 변수가 없습니다 - ${missingVars.join(', ')}`);
    }
    return false;
  }
  
  return true;
}

// Firebase 설정 객체
const firebaseConfig = {
  // 환경 변수가 있는 경우에만 실제 값 사용
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'dummy-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'dummy-auth-domain',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'dummy-project-id',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''
};

// Firebase 환경 변수 확인
const isFirebaseConfigValid = checkEnvVariables();

// 외부로 내보내기
export { firebaseConfig, isFirebaseConfigValid };