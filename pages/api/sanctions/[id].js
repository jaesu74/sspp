// ID로 제재 정보 조회 API
import fs from 'fs';
import path from 'path';
import { formatDate, generateSummary } from '../../../lib/sanctionsService';

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
    
    if (!id) {
      return res.status(400).json({ error: 'ID 파라미터가 필요합니다.' });
    }
    
    console.log(`ID ${id}에 대한 제재 정보 조회 요청을 처리합니다.`);
    
    // 데이터 파일 경로 설정
    const dataDir = path.join(process.cwd(), 'data');
    const chunksDir = path.join(dataDir, 'chunks');
    const integratedFile = path.join(dataDir, 'sanctions.json');
    
    let sanctionEntry = null;
    
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
          }
        }
      } catch (error) {
        console.error(`통합 파일 처리 중 오류: ${error.message}`);
      }
    }
    
    // 검색 결과에 따른 응답 처리
    if (!sanctionEntry) {
      console.log(`ID ${id}에 해당하는 제재 정보를 찾을 수 없습니다.`);
      return res.status(404).json({ error: '해당 ID의 제재 정보를 찾을 수 없습니다.' });
    }
    
    // 날짜 필드 포맷팅
    const dateFields = ['startDate', 'endDate', 'listingDate', 'publicationDate', 'lastUpdated'];
    dateFields.forEach(field => {
      if (sanctionEntry[field]) {
        sanctionEntry[field] = formatDate(sanctionEntry[field]);
      }
      
      // details 객체 내부의 날짜 필드도 처리
      if (sanctionEntry.details && sanctionEntry.details[field]) {
        sanctionEntry.details[field] = formatDate(sanctionEntry.details[field]);
      }
    });
    
    // 요약 정보 생성
    const summary = generateSummary(sanctionEntry);
    if (summary) {
      sanctionEntry._summary = summary;
    }
    
    // 성공 응답 반환
    return res.status(200).json(sanctionEntry);
    
  } catch (error) {
    console.error('제재 정보 조회 중 오류 발생:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
} 