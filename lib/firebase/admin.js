import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

// 기본 서비스 계정 템플릿 (실제 값은 환경 변수나 파일에서 로드해야 함)
const defaultServiceAccount = {
  "type": "service_account",
  "project_id": "YOUR_PROJECT_ID",
  "private_key_id": "YOUR_PRIVATE_KEY_ID",
  "private_key": "YOUR_PRIVATE_KEY",
  "client_email": "YOUR_CLIENT_EMAIL",
  "client_id": "YOUR_CLIENT_ID",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/YOUR_CLIENT_EMAIL"
};

let serviceAccount = null;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // 환경 변수에서 서비스 계정 키를 읽음
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    console.log('환경 변수에서 Firebase 서비스 계정 로드됨');
  } else if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    // 개발 환경에서만 파일에서 읽기 시도
    const serviceAccountPath = path.join(process.cwd(), 'lib/firebase/service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
      serviceAccount = JSON.parse(fileContent);
      console.log('파일에서 Firebase 서비스 계정 로드됨');
    } else {
      console.warn('서비스 계정 파일을 찾을 수 없음. 다음 위치에 파일을 생성하세요: ', serviceAccountPath);
      console.warn('service-account.example.json을 참조하여 올바른 자격 증명으로 채우세요.');
      serviceAccount = defaultServiceAccount;
    }
  } else {
    console.warn('Firebase 서비스 계정 정보가 제공되지 않았습니다. 환경 변수를 설정하세요.');
    serviceAccount = defaultServiceAccount;
  }
} catch (error) {
  console.error('Firebase 서비스 계정 키 로드 오류:', error);
  serviceAccount = defaultServiceAccount;
}

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('Firebase Admin SDK 초기화 성공');
  } catch (error) {
    console.error('Firebase Admin SDK 초기화 오류:', error);
  }
}

const adminDb = getFirestore();
const adminAuth = getAuth();

export { adminDb, adminAuth }; 