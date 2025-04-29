/**
 * 애플리케이션 전역 상수
 */

// API 엔드포인트
export const API = {
  SANCTIONS: {
    BASE: '/api/sanctions',
    DETAIL: (id) => `/api/sanctions/${id}`,
    STATS: '/api/sanctions/stats',
    SEARCH: '/api/sanctions'
  },
  PDF: {
    GENERATE: '/api/generate-pdf'
  },
  HEALTH: '/api/health'
};

// 다운로드 파일 형식
export const FILE_FORMATS = {
  PDF: 'pdf',
  CSV: 'csv',
  JSON: 'json',
  TEXT: 'txt'
};

// 페이지네이션 기본값
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20
};

// 메시지 상수
export const MESSAGES = {
  ERRORS: {
    PDF_GENERATION: 'PDF 생성 중 오류가 발생했습니다.',
    API_REQUEST: 'API 요청 실패:',
    LOADING_DETAIL: '상세 정보를 불러오는 중 오류가 발생했습니다.',
    ID_REQUIRED: 'ID가 필요합니다'
  },
  SUCCESS: {
    DOWNLOAD: '파일이 다운로드되었습니다.'
  },
  LOADING: {
    DETAIL: '상세 정보를 불러오는 중입니다...'
  }
};

// 검색 관련 상수
export const SEARCH = {
  ALL_SOURCES: 'all',
  MIN_QUERY_LENGTH: 2
}; 