// Firebase 설정
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 환경 변수 확인 및 경고
const checkFirebaseConfig = () => {
  const missingVars = [];
  
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) missingVars.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  if (!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) missingVars.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  
  if (missingVars.length > 0) {
    console.warn(`Firebase 설정 오류: 다음 환경 변수가 없습니다 - ${missingVars.join(', ')}`);
    console.warn('Firebase API 키가 환경 변수에 설정되지 않았습니다. .env 파일을 확인하세요.');
    return false;
  }
  
  // 환경 변수가 있을 경우 true 반환
  return true;
};

// Firebase 구성 정보 - 환경 변수만 사용
const getFirebaseConfig = () => {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };
};

// Firebase 앱 초기화 (클라이언트 측에서만)
let app, auth, db;

// 서버 사이드 렌더링 중에는 초기화하지 않음
if (typeof window !== 'undefined') {
  // 환경 변수 확인
  const configValid = checkFirebaseConfig();
  
  try {
    if (!getApps().length) {
      console.log('Firebase 앱 초기화 중...');
      if (configValid) {
        const firebaseConfig = getFirebaseConfig();
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log('Firebase 인증 서비스 초기화 완료');
      } else {
        console.error('Firebase 초기화 중단: 환경 변수가 올바르게 설정되지 않았습니다.');
      }
    } else {
      app = getApps()[0];
      auth = getAuth(app);
      db = getFirestore(app);
    }
  } catch (error) {
    console.error('Firebase 초기화 오류:', error);
  }
}

export { auth, db };