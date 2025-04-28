// ID로 제재 정보 조회 API
import fs from 'fs';
import path from 'path';
import { formatDate, generateSummary } from '../../../lib/sanctionsService';

// 캐시 메커니즘
const CACHE_DURATION = 60 * 60 * 1000; // 1시간 캐시 (밀리초)
const sanctionsCache = {
  data: {},
  timestamp: {}
};

/**
 * 특정 ID에 해당하는 제재 정보 상세 조회 API
 * 
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 */
export default function handler(req, res) {
  // GET 요청만 처리
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // URL에서 ID 파라미터 추출
    const { id } = req.query;
    const { forceRefresh } = req.query; // 캐시를 무시하고 새로고침할지 여부
    
    if (!id) {
      return res.status(400).json({ error: 'ID 파라미터가 필요합니다.' });
    }
    
    console.log(`ID ${id}에 대한 제재 정보 조회 요청을 처리합니다.`);
    
    // 캐시에서 데이터 확인
    const now = Date.now();
    if (!forceRefresh && 
        sanctionsCache.data[id] && 
        (now - sanctionsCache.timestamp[id]) < CACHE_DURATION) {
      console.log(`ID ${id}에 대한 제재 정보를 캐시에서 반환합니다.`);
      return res.status(200).json({
        data: sanctionsCache.data[id],
        source: 'cache',
        cachedAt: new Date(sanctionsCache.timestamp[id]).toISOString()
      });
    }
    
    // 데이터 파일 경로 설정
    const dataDir = path.join(process.cwd(), 'data');
    const chunksDir = path.join(dataDir, 'chunks');
    const integratedFile = path.join(dataDir, 'sanctions.json');
    const specialListsDir = path.join(dataDir, 'special-lists');
    
    let sanctionEntry = null;
    let dataSource = '';
    
    // 먼저 chunk 파일에서 검색
    if (fs.existsSync(chunksDir)) {
      console.log('chunks 디렉토리에서 검색합니다...');
      
      const chunkFiles = fs.readdirSync(chunksDir)
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(chunksDir, file));
      
      for (const chunkFile of chunkFiles) {
        try {
          const chunkData = JSON.parse(fs.readFileSync(chunkFile, 'utf8'));
          
          if (!Array.isArray(chunkData)) {
            console.warn(`경고: ${chunkFile}의 데이터가 배열이 아닙니다.`);
            continue;
          }
          
          const foundEntry = chunkData.find(entry => {
            const entryId = entry.id || entry._id;
            return entryId === id;
          });
          
          if (foundEntry) {
            console.log(`ID ${id}를 ${chunkFile} 파일에서 찾았습니다.`);
            sanctionEntry = foundEntry;
            dataSource = path.basename(chunkFile);
            break;
          }
        } catch (error) {
          console.error(`${chunkFile} 파일 처리 중 오류: ${error.message}`);
        }
      }
    }
    
    // chunk 파일에서 찾지 못한 경우, 통합 파일에서 검색
    if (!sanctionEntry && fs.existsSync(integratedFile)) {
      console.log('통합 파일에서 검색합니다...');
      
      try {
        const sanctionsData = JSON.parse(fs.readFileSync(integratedFile, 'utf8'));
        
        if (!Array.isArray(sanctionsData)) {
          console.warn(`경고: 통합 파일의 데이터가 배열이 아닙니다.`);
        } else {
          sanctionEntry = sanctionsData.find(entry => {
            const entryId = entry.id || entry._id;
            return entryId === id;
          });
          
          if (sanctionEntry) {
            console.log(`ID ${id}를 통합 파일에서 찾았습니다.`);
            dataSource = 'integrated-file';
          }
        }
      } catch (error) {
        console.error(`통합 파일 처리 중 오류: ${error.message}`);
      }
    }
    
    // 특별 목록 파일에서 검색 (추가 데이터 소스)
    if (!sanctionEntry && fs.existsSync(specialListsDir)) {
      console.log('특별 목록 디렉토리에서 검색합니다...');
      
      const specialFiles = fs.readdirSync(specialListsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(specialListsDir, file));
      
      for (const specialFile of specialFiles) {
        try {
          const specialData = JSON.parse(fs.readFileSync(specialFile, 'utf8'));
          
          if (!Array.isArray(specialData)) {
            console.warn(`경고: ${specialFile}의 데이터가 배열이 아닙니다.`);
            continue;
          }
          
          const foundEntry = specialData.find(entry => {
            const entryId = entry.id || entry._id;
            return entryId === id;
          });
          
          if (foundEntry) {
            console.log(`ID ${id}를 ${specialFile} 파일에서 찾았습니다.`);
            sanctionEntry = foundEntry;
            dataSource = `special-list:${path.basename(specialFile)}`;
            break;
          }
        } catch (error) {
          console.error(`${specialFile} 파일 처리 중 오류: ${error.message}`);
        }
      }
    }
    
    // 검색 결과에 따른 응답 처리
    if (!sanctionEntry) {
      console.log(`ID ${id}에 해당하는 제재 정보를 찾을 수 없습니다.`);
      return res.status(404).json({ error: '해당 ID의 제재 정보를 찾을 수 없습니다.' });
    }
    
    // 데이터 처리 및 표준화
    const processedEntry = processAndStandardizeEntry(sanctionEntry);
    
    // 캐시에 결과 저장
    sanctionsCache.data[id] = processedEntry;
    sanctionsCache.timestamp[id] = now;
    
    // 성공 응답 반환 (표준화된 형식)
    return res.status(200).json({
      data: processedEntry,
      source: dataSource,
      requestedAt: new Date().toISOString(),
      cached: false
    });
    
  } catch (error) {
    console.error('제재 정보 조회 중 오류 발생:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
}

/**
 * 제재 정보 엔트리를 처리하고 표준화하는 함수
 * @param {Object} entry - 원본 제재 정보 데이터
 * @returns {Object} - 처리 및 표준화된 데이터
 */
function processAndStandardizeEntry(entry) {
  if (!entry) return null;
  
  // 원본 데이터 복사
  const processed = { ...entry };
  
  // ID 통일
  processed.id = processed.id || processed._id;
  
  // 날짜 필드 포맷팅
  const dateFields = [
    'startDate', 'endDate', 'listingDate', 'publicationDate', 'lastUpdated',
    'birthDate', 'dateOfBirth', 'dob', 'dateCreated', 'dateModified'
  ];
  
  dateFields.forEach(field => {
    if (processed[field]) {
      processed[field] = formatDate(processed[field]);
    }
    
    // details 객체 내부의 날짜 필드도 처리
    if (processed.details && processed.details[field]) {
      processed.details[field] = formatDate(processed.details[field]);
    }
  });
  
  // 국가 정보 통일
  if (processed.country && !processed.countries) {
    processed.countries = Array.isArray(processed.country) ? processed.country : [processed.country];
  } else if (processed.countries && !processed.country) {
    processed.country = Array.isArray(processed.countries) ? processed.countries[0] : processed.countries;
  } else if (!processed.countries && !processed.country) {
    // 주소나 국적 정보에서 국가 유추
    const possibleCountry = processed.nationality || 
                            (processed.address && processed.address.country) ||
                            (processed.addresses && processed.addresses[0] && 
                             (typeof processed.addresses[0] === 'object' ? 
                               processed.addresses[0].country : null));
    if (possibleCountry) {
      processed.country = possibleCountry;
      processed.countries = [possibleCountry];
    }
  }
  
  // 프로그램 정보 통일
  if (!processed.programs && processed.program) {
    processed.programs = Array.isArray(processed.program) ? processed.program : [processed.program];
  }
  
  // 별칭 정보 통일
  const aliases = [];
  if (processed.aliases && Array.isArray(processed.aliases)) {
    aliases.push(...processed.aliases.map(alias => typeof alias === 'object' ? alias.name : alias));
  }
  if (processed.name_aliases && Array.isArray(processed.name_aliases)) {
    aliases.push(...processed.name_aliases);
  }
  if (processed.also_known_as && Array.isArray(processed.also_known_as)) {
    aliases.push(...processed.also_known_as);
  }
  if (aliases.length > 0) {
    processed.aliases = [...new Set(aliases)]; // 중복 제거
  }
  
  // 요약 정보 생성
  const summary = generateSummary(processed);
  if (summary) {
    processed._summary = summary;
  }
  
  // 식별자 정보 통합
  const identifiers = [];
  if (processed.identifiers && Array.isArray(processed.identifiers)) {
    identifiers.push(...processed.identifiers);
  }
  if (processed.identity_numbers && Array.isArray(processed.identity_numbers)) {
    identifiers.push(...processed.identity_numbers.map(id => ({ type: 'ID', value: id })));
  }
  if (processed.document_numbers && Array.isArray(processed.document_numbers)) {
    identifiers.push(...processed.document_numbers.map(doc => ({ type: 'Document', value: doc })));
  }
  if (processed.passportNumber) {
    identifiers.push({ type: 'Passport', value: processed.passportNumber });
  }
  if (processed.nationalIdNumber) {
    identifiers.push({ type: 'National ID', value: processed.nationalIdNumber });
  }
  
  if (identifiers.length > 0) {
    processed.identifiers = identifiers;
  }
  
  return processed;
} 