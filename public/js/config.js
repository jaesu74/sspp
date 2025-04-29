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
    
    // Firebase 설정 - 주의: 이 config.js 파일은 Next.js의 서버 측 환경 변수 시스템을 사용할 수 없습니다.
    // 이 설정은 lib/firebase/config.js에서 중앙 관리하고, 환경 변수(process.env)를 통해 적절히 주입됩니다.
    firebase: {
        // 모든 값은 환경 변수에서 가져옵니다. 하드코딩하지 않습니다.
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: ""
    }
};

// 현재 환경 감지
const isProduction = location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
const currentEnv = isProduction ? 'production' : 'development';

// 현재 환경에 맞는 설정 내보내기
const CONFIG = config[currentEnv];

// Firebase 설정은 별도로 사용하지 않음
// 이 파일은 곧 삭제될 예정입니다. Firebase 설정은 lib/firebase/config.js를 사용하세요.
const FIREBASE_CONFIG = {}; 

// 상수 내보내기
const API_BASE_URL = CONFIG.apiBaseUrl;
const DATA_FILE = CONFIG.dataFile;
const USE_LOCAL_DATA = CONFIG.useLocalData;
const UPDATE_INTERVAL = CONFIG.updateInterval;
const CACHE_TIMEOUT = CONFIG.cacheTimeout;
const DOMAIN_NAME = CONFIG.domainName; 