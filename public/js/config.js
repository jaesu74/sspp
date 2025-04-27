/**
 * 제재 대상 검색 시스템 설정 파일
 */

const config = {
    // 프로덕션 환경 설정
    production: {
        apiBaseUrl: '/data', // GitHub Pages에서는 상대 경로 사용
        dataFile: '/data/sanctions.json',
        useLocalData: true,
        updateInterval: 86400000, // 24시간마다 데이터 새로고침 (ms)
        cacheTimeout: 3600000, // 1시간 캐시 (ms)
        domainName: window.location.hostname
    },
    
    // 개발 환경 설정
    development: {
        apiBaseUrl: 'http://localhost:8000/api',
        dataFile: '/data/sanctions.json',
        useLocalData: false,
        updateInterval: 60000, // 1분마다 데이터 새로고침 (개발 중)
        cacheTimeout: 0, // 캐시 사용 안 함 (개발 중)
        domainName: 'localhost'
    },
    
    // Firebase 설정
    firebase: {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sp-2504.firebaseapp.com",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sp-2504",
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sp-2504.firebasestorage.app",
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1058704122563",
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1058704122563:web:01b2ff0c777aa0e2967876"
    }
};

// 현재 환경 감지
const isProduction = location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
const currentEnv = isProduction ? 'production' : 'development';

// 현재 환경에 맞는 설정 내보내기
const CONFIG = config[currentEnv];
const FIREBASE_CONFIG = config.firebase;

// 상수 내보내기
const API_BASE_URL = CONFIG.apiBaseUrl;
const DATA_FILE = CONFIG.dataFile;
const USE_LOCAL_DATA = CONFIG.useLocalData;
const UPDATE_INTERVAL = CONFIG.updateInterval;
const CACHE_TIMEOUT = CONFIG.cacheTimeout;
const DOMAIN_NAME = CONFIG.domainName; 