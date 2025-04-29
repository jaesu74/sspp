/**
 * 제재 대상 검색 시스템 설정 파일 (클라이언트 측)
 * 주의: 이 파일에는 민감한 정보를 포함하지 않습니다.
 */

const config = {
    // 프로덕션 환경 설정
    production: {
        apiBaseUrl: '/api',
        dataFile: '/data/sanctions.json',
        useLocalData: false,
        updateInterval: 86400000, // 24시간마다 데이터 새로고침 (ms)
        cacheTimeout: 3600000, // 1시간 캐시 (ms)
        domainName: window.location.hostname
    },
    
    // 개발 환경 설정
    development: {
        apiBaseUrl: '/api',
        dataFile: '/data/sanctions.json',
        useLocalData: true,
        updateInterval: 60000, // 1분마다 데이터 새로고침 (개발 중)
        cacheTimeout: 0, // 캐시 사용 안 함 (개발 중)
        domainName: 'localhost'
    }
};

// 현재 환경 감지
const isProduction = location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
const currentEnv = isProduction ? 'production' : 'development';

// 현재 환경에 맞는 설정 내보내기
const CONFIG = config[currentEnv];

// 상수 내보내기
const API_BASE_URL = CONFIG.apiBaseUrl;
const DATA_FILE = CONFIG.dataFile;
const USE_LOCAL_DATA = CONFIG.useLocalData;
const UPDATE_INTERVAL = CONFIG.updateInterval;
const CACHE_TIMEOUT = CONFIG.cacheTimeout;
const DOMAIN_NAME = CONFIG.domainName; 