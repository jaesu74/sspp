// 제재 정보 서비스
import { API, PAGINATION, MESSAGES, SEARCH } from './constants';

/**
 * 제재 정보 목록을 가져오는 함수
 * @param {Object} options - 검색 및 필터링 옵션
 * @returns {Promise<Array>} - 제재 정보 목록
 */
export const getSanctionsList = async (options = {}) => {
  try {
    const { query = '', page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, source = SEARCH.ALL_SOURCES } = options;
    
    // API 엔드포인트 구성
    let url = `${API.SANCTIONS.BASE}?page=${page}&limit=${limit}`;
    if (query) url += `&query=${encodeURIComponent(query)}`;
    if (source !== SEARCH.ALL_SOURCES) url += `&source=${source}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`${MESSAGES.ERRORS.API_REQUEST} ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('제재 정보 가져오기 오류:', error);
    return { data: [], error: error.message, total: 0 };
  }
};

/**
 * 특정 ID의 제재 정보 상세 내용을 가져오는 함수
 * @param {string} id - 제재 정보 ID
 * @returns {Promise<Object>} - 제재 정보 상세
 */
export const getSanctionDetail = async (id) => {
  try {
    const response = await fetch(API.SANCTIONS.DETAIL(id));
    
    if (!response.ok) {
      throw new Error(`${MESSAGES.ERRORS.API_REQUEST} ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('제재 정보 상세 가져오기 오류:', error);
    return { error: error.message };
  }
};

/**
 * 제재 정보 통계를 가져오는 함수
 * @returns {Promise<Object>} - 제재 정보 통계
 */
export const getSanctionsStats = async () => {
  try {
    const response = await fetch(API.SANCTIONS.STATS);
    
    if (!response.ok) {
      throw new Error(`${MESSAGES.ERRORS.API_REQUEST} ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('제재 정보 통계 가져오기 오류:', error);
    return { error: error.message };
  }
};

/**
 * 문자열 간의 유사도를 계산하는 함수 (Levenshtein 거리 기반)
 * 
 * @param {string} str1 첫 번째 문자열
 * @param {string} str2 두 번째 문자열
 * @returns {number} 0~1 사이의 유사도 (1이 완전 일치)
 */
export function calculateStringSimilarity(str1, str2) {
  // 문자열이 아니면 0 반환
  if (typeof str1 !== 'string' || typeof str2 !== 'string') {
    return 0;
  }
  
  // 소문자로 변환하여 비교
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // 완전 일치하면 1 반환
  if (s1 === s2) return 1;
  
  // 둘 중 하나가 공백이면 0 반환
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // 부분 문자열이면 가중치 부여
  if (s1.includes(s2) || s2.includes(s1)) {
    // 포함된 문자열 길이의 비율에 따라 유사도 계산
    const shorter = s1.length < s2.length ? s1 : s2;
    const longer = s1.length >= s2.length ? s1 : s2;
    return shorter.length / longer.length * 0.9; // 부분 문자열은 최대 0.9점
  }
  
  // Levenshtein 거리 계산을 위한 행렬 초기화
  const matrix = Array(s1.length + 1).fill().map(() => Array(s2.length + 1).fill(0));
  
  // 첫 번째 행과 열 초기화
  for (let i = 0; i <= s1.length; i++) {
    matrix[i][0] = i;
  }
  
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  
  // 행렬 채우기
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // 삭제
        matrix[i][j - 1] + 1,      // 삽입
        matrix[i - 1][j - 1] + cost // 치환
      );
    }
  }
  
  // 유사도 계산 (0~1 사이 값으로 정규화)
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1; // 둘 다 빈 문자열이면 완전 일치
  
  const distance = matrix[s1.length][s2.length];
  return 1 - (distance / maxLen);
}

/**
 * 제재 정보 검색 함수
 * @param {string} searchTerm - 검색어
 * @param {Object} options - 검색 옵션 (source, type, country, limit 등)
 * @returns {Promise<Array>} - 검색 결과
 */
export const searchSanctions = async (searchTerm, options = {}) => {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }
    
    // 쿼리 파라미터 구성
    const params = new URLSearchParams();
    params.append('q', searchTerm);
    
    if (options.limit) params.append('limit', options.limit);
    if (options.type) params.append('type', options.type);
    if (options.country) params.append('country', options.country);
    if (options.source) params.append('source', options.source);
    
    // API 요청
    const response = await fetch(`${API.SANCTIONS.SEARCH}?${params.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `${MESSAGES.ERRORS.API_REQUEST} ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('제재 정보 검색 오류:', error);
    return [];
  }
};

/**
 * ID로 제재 정보 조회 함수
 * @param {string} id - 제재 정보 ID
 * @returns {Promise<Object>} - 제재 정보 상세
 */
export const getSanctionById = async (id) => {
  try {
    if (!id) {
      throw new Error(MESSAGES.ERRORS.ID_REQUIRED);
    }
    
    // API 요청
    const response = await fetch(API.SANCTIONS.DETAIL(id));
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `${MESSAGES.ERRORS.API_REQUEST} ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('제재 정보 상세 조회 오류:', error);
    throw error;
  }
};

/**
 * 제재 정보 처리를 위한 유틸리티 함수들
 */

/**
 * 다양한 날짜 형식을 표준화된 형식으로 변환
 * @param {string|number} dateValue - 변환할 날짜 값
 * @returns {string} 표준화된 날짜 문자열 (YYYY-MM-DD)
 */
export function formatDate(dateValue) {
  if (!dateValue) return null;
  
  try {
    let date;
    
    // Unix 타임스탬프인 경우 (밀리초 또는 초 단위)
    if (typeof dateValue === 'number' || /^\d+$/.test(dateValue)) {
      // 13자리(밀리초) 또는 10자리(초) 타임스탬프 처리
      const timestamp = String(dateValue).length > 10 
        ? Number(dateValue) 
        : Number(dateValue) * 1000;
      
      date = new Date(timestamp);
    } 
    // ISO 문자열 또는 기타 날짜 형식
    else {
      date = new Date(dateValue);
    }
    
    // 유효한 날짜인지 확인
    if (isNaN(date.getTime())) {
      console.warn(`유효하지 않은 날짜 형식: ${dateValue}`);
      return dateValue;
    }
    
    // YYYY-MM-DD 형식으로 변환
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.warn(`날짜 변환 중 오류: ${error.message}`);
    return dateValue;
  }
}

/**
 * 제재 항목에서 요약 정보 생성
 * @param {Object} sanctionEntry - 제재 항목 데이터
 * @returns {Object} 요약 정보 객체
 */
export function generateSummary(sanctionEntry) {
  if (!sanctionEntry) return null;
  
  try {
    const summary = {
      type: getSanctionType(sanctionEntry),
      entity: getEntityType(sanctionEntry),
      countries: getCountries(sanctionEntry),
      dateUpdated: getLastUpdateDate(sanctionEntry),
      programs: getPrograms(sanctionEntry),
      source: getSource(sanctionEntry),
      identifiers: getKeyIdentifiers(sanctionEntry)
    };
    
    return summary;
  } catch (error) {
    console.warn(`요약 정보 생성 중 오류: ${error.message}`);
    return null;
  }
}

/**
 * 제재 유형 결정
 * @param {Object} entry - 제재 항목
 * @returns {string} 제재 유형
 */
function getSanctionType(entry) {
  if (!entry) return 'unknown';
  
  // 제재 유형 확인 로직
  if (entry.sanctionType) return entry.sanctionType;
  if (entry.type) return entry.type;
  
  // ID로 추정
  const id = entry.id || entry._id || '';
  if (typeof id === 'string') {
    if (id.startsWith('UN')) return 'UN Sanctions';
    if (id.startsWith('EU')) return 'EU Sanctions';
    if (id.startsWith('OFAC') || id.startsWith('US')) return 'US Sanctions';
    if (id.startsWith('UK')) return 'UK Sanctions';
  }
  
  return 'Sanctions';
}

/**
 * 엔티티 유형 결정
 * @param {Object} entry - 제재 항목
 * @returns {string} 엔티티 유형 (individual, entity, vessel 등)
 */
function getEntityType(entry) {
  if (!entry) return 'unknown';
  
  // 직접적인 엔티티 유형 필드
  if (entry.entityType) return entry.entityType;
  if (entry.entity_type) return entry.entity_type;
  if (entry.partyType) return entry.partyType;
  if (entry.party_type) return entry.party_type;
  
  // 세부 정보에서 확인
  const details = entry.details || {};
  if (details.entityType) return details.entityType;
  
  // 이름 패턴으로 추정 (법인명에 많이 사용되는 키워드)
  const name = entry.name || entry.firstName || entry.lastName || '';
  if (typeof name === 'string') {
    const companyKeywords = ['LLC', 'LTD', 'INC', 'CORPORATION', 'CORP', 'CO', 'COMPANY', 'GROUP'];
    
    for (const keyword of companyKeywords) {
      if (name.toUpperCase().includes(keyword)) {
        return 'entity';
      }
    }
    
    // 선박명에 많이 사용되는 키워드
    const vesselKeywords = ['VESSEL', 'SHIP', 'TANKER', 'CARRIER'];
    for (const keyword of vesselKeywords) {
      if (name.toUpperCase().includes(keyword)) {
        return 'vessel';
      }
    }
  }
  
  // 개인/단체 구분용 필드 확인
  if (entry.firstName || entry.lastName || entry.dateOfBirth) {
    return 'individual';
  }
  
  return 'unknown';
}

/**
 * 관련 국가 정보 추출
 * @param {Object} entry - 제재 항목
 * @returns {Array} 국가 목록
 */
function getCountries(entry) {
  if (!entry) return [];
  
  const countries = new Set();
  
  // 직접 국가 필드
  if (entry.country && typeof entry.country === 'string') {
    countries.add(entry.country);
  }
  
  if (entry.countries && Array.isArray(entry.countries)) {
    entry.countries.forEach(c => countries.add(c));
  }
  
  // 세부 정보에서 국가 정보
  const details = entry.details || {};
  if (details.country) countries.add(details.country);
  if (details.nationality) countries.add(details.nationality);
  if (details.placeOfBirth) countries.add(details.placeOfBirth);
  
  // 주소 정보에서 국가 추출
  if (entry.addresses && Array.isArray(entry.addresses)) {
    entry.addresses.forEach(addr => {
      if (addr.country) countries.add(addr.country);
    });
  }
  
  return Array.from(countries).filter(Boolean);
}

/**
 * 마지막 업데이트 날짜 추출
 * @param {Object} entry - 제재 항목
 * @returns {string} 날짜 문자열
 */
function getLastUpdateDate(entry) {
  if (!entry) return null;
  
  // 가능한 날짜 필드들 확인
  const possibleDateFields = [
    'updatedDate', 'dateUpdated', 'lastUpdated', 
    'publicationDate', 'listingDate'
  ];
  
  for (const field of possibleDateFields) {
    if (entry[field]) {
      return formatDate(entry[field]);
    }
  }
  
  // 세부 정보에서 확인
  const details = entry.details || {};
  for (const field of possibleDateFields) {
    if (details[field]) {
      return formatDate(details[field]);
    }
  }
  
  return null;
}

/**
 * 프로그램 정보 추출
 * @param {Object} entry - 제재 항목
 * @returns {Array} 프로그램 목록
 */
function getPrograms(entry) {
  if (!entry) return [];
  
  if (entry.programs && Array.isArray(entry.programs)) {
    return entry.programs.filter(Boolean);
  }
  
  if (entry.program && typeof entry.program === 'string') {
    return [entry.program];
  }
  
  return [];
}

/**
 * 출처 정보 추출
 * @param {Object} entry - 제재 항목
 * @returns {string} 출처 정보
 */
function getSource(entry) {
  if (!entry) return 'unknown';
  
  if (entry.source) return entry.source;
  
  // ID로 추정
  const id = entry.id || entry._id || '';
  if (typeof id === 'string') {
    if (id.startsWith('UN')) return 'UN';
    if (id.startsWith('EU')) return 'EU';
    if (id.startsWith('OFAC') || id.startsWith('US')) return 'US';
    if (id.startsWith('UK')) return 'UK';
  }
  
  return 'unknown';
}

/**
 * 주요 식별자 정보 추출
 * @param {Object} entry - 제재 항목
 * @returns {Object} 주요 식별자 정보
 */
function getKeyIdentifiers(entry) {
  if (!entry) return {};
  
  const identifiers = {};
  
  // ID 정보
  identifiers.id = entry.id || entry._id || null;
  
  // 이름 정보
  if (entry.name) identifiers.name = entry.name;
  if (entry.firstName && entry.lastName) {
    identifiers.fullName = `${entry.firstName} ${entry.lastName}`.trim();
  }
  
  // 주요 식별자
  if (entry.passportNumber) identifiers.passport = entry.passportNumber;
  if (entry.nationalId) identifiers.nationalId = entry.nationalId;
  
  // 세부 정보에서 식별자 추출
  const details = entry.details || {};
  if (details.dateOfBirth) identifiers.dateOfBirth = formatDate(details.dateOfBirth);
  if (details.placeOfBirth) identifiers.placeOfBirth = details.placeOfBirth;
  
  return identifiers;
}

/**
 * 제재 데이터를 국가별로 그룹화
 * 
 * @param {Array} entries - 제재 항목 배열
 * @returns {Object} - 국가별로 그룹화된 객체
 */
export function groupByCountry(entries) {
  if (!entries || !Array.isArray(entries)) return {};
  
  return entries.reduce((acc, entry) => {
    const country = entry.country || 'UNKNOWN';
    if (!acc[country]) {
      acc[country] = [];
    }
    acc[country].push(entry);
    return acc;
  }, {});
}

/**
 * 제재 데이터를 유형별로 그룹화
 * 
 * @param {Array} entries - 제재 항목 배열
 * @returns {Object} - 유형별로 그룹화된 객체
 */
export function groupByType(entries) {
  if (!entries || !Array.isArray(entries)) return {};
  
  return entries.reduce((acc, entry) => {
    const type = entry.type || 'UNKNOWN';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(entry);
    return acc;
  }, {});
}

export default {
  getSanctionsList,
  getSanctionDetail,
  getSanctionsStats
}; 