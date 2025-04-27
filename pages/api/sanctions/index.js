// 제재 정보 검색 API
import fs from 'fs';
import path from 'path';
import { calculateStringSimilarity, formatDate, generateSummary } from '../../../lib/sanctionsService';

/**
 * 제재 정보 목록 조회 및 검색 API
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
    // 쿼리 파라미터 추출
    const {
      query = '',
      page = '1',
      limit = '10',
      type,
      country,
      program,
      source,
      dateFrom,
      dateTo,
      sort = 'lastUpdated',
      order = 'desc'
    } = req.query;

    // 페이지 번호와 제한 값을 숫자로 변환
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    console.log(`제재 정보 검색: ${query ? `검색어 "${query}"` : '전체 목록'}, 페이지 ${pageNum}, 항목 수 ${limitNum}`);
    
    // 데이터 파일 경로 설정
    const dataDir = path.join(process.cwd(), 'data');
    const chunksDir = path.join(dataDir, 'chunks');
    const integratedFile = path.join(dataDir, 'sanctions.json');
    
    let sanctionsData = [];
    
    // 데이터 로드 - 먼저 통합 파일 확인 후 청크 파일 확인
    if (fs.existsSync(integratedFile)) {
      console.log('통합 파일에서 데이터를 로드합니다...');
      
      try {
        const data = JSON.parse(fs.readFileSync(integratedFile, 'utf8'));
        if (Array.isArray(data)) {
          sanctionsData = data;
          console.log(`통합 파일에서 ${sanctionsData.length}개 항목을 로드했습니다.`);
        } else {
          console.warn('경고: 통합 파일의 데이터가 배열이 아닙니다.');
        }
      } catch (error) {
        console.error(`통합 파일 처리 중 오류: ${error.message}`);
      }
    } 
    
    // 통합 파일이 없거나 비어있는 경우 청크 파일에서 로드
    if (sanctionsData.length === 0 && fs.existsSync(chunksDir)) {
      console.log('청크 파일에서 데이터를 로드합니다...');
      
      const chunkFiles = fs.readdirSync(chunksDir)
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(chunksDir, file));
      
      for (const chunkFile of chunkFiles) {
        try {
          const chunkData = JSON.parse(fs.readFileSync(chunkFile, 'utf8'));
          
          if (Array.isArray(chunkData)) {
            sanctionsData = [...sanctionsData, ...chunkData];
          } else {
            console.warn(`경고: ${chunkFile}의 데이터가 배열이 아닙니다.`);
          }
        } catch (error) {
          console.error(`${chunkFile} 파일 처리 중 오류: ${error.message}`);
        }
      }
      
      console.log(`청크 파일에서 총 ${sanctionsData.length}개 항목을 로드했습니다.`);
    }
    
    if (sanctionsData.length === 0) {
      return res.status(404).json({
        error: '데이터를 찾을 수 없습니다. data 디렉토리에 sanctions.json 파일이나 chunks 디렉토리가 있는지 확인하세요.'
      });
    }
    
    // 필터링 적용
    let filteredData = sanctionsData;
    
    // 검색어 필터링
    if (query) {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
      
      filteredData = filteredData.filter(entry => {
        // 기본 검색 필드
        const searchFields = [
          entry.name,
          entry.nameOriginal,
          entry.id,
          entry._id,
          entry.referenceNumber,
          ...(entry.aliases || []).map(alias => alias.name),
          ...(entry.identifiers || []).map(id => id.value)
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchTerms.every(term => searchFields.includes(term));
      });
    }
    
    // 유형 필터
    if (type) {
      filteredData = filteredData.filter(entry => {
        const entryType = 
          (entry.type && entry.type.toLowerCase()) || 
          (entry.entityType && entry.entityType.toLowerCase()) ||
          (entry.details && entry.details.type && entry.details.type.toLowerCase());
          
        return entryType && entryType.includes(type.toLowerCase());
      });
    }
    
    // 국가 필터
    if (country) {
      filteredData = filteredData.filter(entry => {
        const countries = [
          ...(entry.countries || []),
          ...(entry.nationality && [entry.nationality] || []),
          ...(entry.address && entry.address.country && [entry.address.country] || []),
          ...(entry.addresses && entry.addresses.map(addr => addr.country) || [])
        ].filter(Boolean).map(c => c.toLowerCase());
        
        return countries.some(c => c.includes(country.toLowerCase()));
      });
    }
    
    // 프로그램 필터
    if (program) {
      filteredData = filteredData.filter(entry => {
        const programs = [
          ...(entry.programs || []),
          ...(entry.programsOriginal || [])
        ].filter(Boolean).map(p => p.toLowerCase());
        
        return programs.some(p => p.includes(program.toLowerCase()));
      });
    }
    
    // 소스 필터
    if (source) {
      filteredData = filteredData.filter(entry => {
        const entrySource = 
          (entry.source && entry.source.toLowerCase()) ||
          (entry.sourceDescription && entry.sourceDescription.toLowerCase()) ||
          (entry.sourceUrl && entry.sourceUrl.toLowerCase());
          
        return entrySource && entrySource.includes(source.toLowerCase());
      });
    }
    
    // 날짜 범위 필터
    if (dateFrom || dateTo) {
      filteredData = filteredData.filter(entry => {
        // 마지막 업데이트 날짜 추출
        let updateDate = entry.lastUpdated || 
                          entry.lastUpdate ||
                          (entry.details && entry.details.lastUpdated) || 
                          entry.publicationDate || 
                          entry.listingDate;
                          
        if (!updateDate) return true; // 날짜 정보가 없는 경우 포함
        
        try {
          // 날짜 형식 변환
          const dateStr = formatDate(updateDate);
          
          // 날짜 범위 검사
          if (dateFrom && dateTo) {
            return dateStr >= dateFrom && dateStr <= dateTo;
          } else if (dateFrom) {
            return dateStr >= dateFrom;
          } else if (dateTo) {
            return dateStr <= dateTo;
          }
          
          return true;
        } catch (e) {
          console.warn(`날짜 처리 오류: ${e.message}`);
          return true; // 날짜 처리 오류 시 포함
        }
      });
    }
    
    // 총 결과 수 확인
    const totalCount = filteredData.length;
    console.log(`필터링 결과: ${totalCount}개 항목 일치`);
    
    // 정렬 필드 결정
    let sortField = 'lastUpdated';
    if (sort === 'name') sortField = 'name';
    else if (sort === 'type') sortField = 'type';
    else if (sort === 'source') sortField = 'source';
    else if (sort === 'country') sortField = 'countries';
    
    // 정렬 적용
    filteredData.sort((a, b) => {
      let aValue, bValue;
      
      if (sortField === 'lastUpdated') {
        aValue = a.lastUpdated || a.lastUpdate || (a.details && a.details.lastUpdated) || a.publicationDate || a.listingDate || '';
        bValue = b.lastUpdated || b.lastUpdate || (b.details && b.details.lastUpdated) || b.publicationDate || b.listingDate || '';
        
        // 날짜 값 비교를 위해 형식화
        try {
          aValue = formatDate(aValue) || '';
          bValue = formatDate(bValue) || '';
        } catch (e) {
          console.warn(`정렬 날짜 처리 오류: ${e.message}`);
        }
      } else if (sortField === 'countries') {
        aValue = (a.countries && a.countries[0]) || (a.nationality) || '';
        bValue = (b.countries && b.countries[0]) || (b.nationality) || '';
      } else {
        aValue = a[sortField] || '';
        bValue = b[sortField] || '';
      }
      
      // 문자열로 변환
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();
      
      // 정렬 순서 적용
      return order.toLowerCase() === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
    
    // 페이징 적용
    const paginatedData = filteredData.slice(skip, skip + limitNum);
    
    // 응답 데이터 생성
    const results = paginatedData.map(entry => {
      // 각 항목에 대해 요약 정보 생성
      const summary = generateSummary(entry);
      
      return {
        id: entry.id || entry._id,
        name: entry.name || entry.nameOriginal || '(이름 없음)',
        type: entry.type || entry.entityType || (entry.details && entry.details.type) || '알 수 없음',
        source: entry.source || entry.sourceDescription || '알 수 없음',
        lastUpdated: formatDate(
          entry.lastUpdated || 
          entry.lastUpdate || 
          (entry.details && entry.details.lastUpdated) || 
          entry.publicationDate || 
          entry.listingDate
        ),
        summary
      };
    });
    
    // 성공 응답 반환
    return res.status(200).json({
      results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
    
  } catch (error) {
    console.error('제재 목록 처리 중 오류 발생:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
}