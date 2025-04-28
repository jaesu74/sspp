// Firebase 설정
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase 구성 정보 - 환경 변수 사용
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// 환경 변수가 없는 경우 경고
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  console.warn('Firebase API 키가 환경 변수에 설정되지 않았습니다. .env 파일을 확인하세요.');
}

// Firebase 앱 초기화 (클라이언트 측에서만)
let app, auth, db;

// 서버 사이드 렌더링 중에는 초기화하지 않음
if (typeof window !== 'undefined') {
  try {
    if (!getApps().length) {
      console.log('Firebase 앱 초기화 중...');
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('Firebase 인증 서비스 초기화 완료');
  } catch (error) {
    console.error('Firebase 초기화 오류:', error);
  }
}

export { auth, db }; 