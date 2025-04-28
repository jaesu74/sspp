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
    let seenIds = new Set(); // 중복 ID 추적용
    
    // 데이터 로드 - 청크 파일에서 우선 로드
    if (fs.existsSync(chunksDir)) {
      console.log('청크 파일에서 데이터를 로드합니다...');
      
      const chunkFiles = fs.readdirSync(chunksDir)
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(chunksDir, file));
      
      for (const chunkFile of chunkFiles) {
        try {
          const chunkData = JSON.parse(fs.readFileSync(chunkFile, 'utf8'));
          
          if (Array.isArray(chunkData)) {
            for (const entry of chunkData) {
              const id = entry.id || entry._id;
              if (id && !seenIds.has(id)) {
                sanctionsData.push(entry);
                seenIds.add(id);
              }
            }
          } else {
            console.warn(`경고: ${chunkFile}의 데이터가 배열이 아닙니다.`);
          }
        } catch (error) {
          console.error(`${chunkFile} 파일 처리 중 오류: ${error.message}`);
        }
      }
      
      console.log(`청크 파일에서 총 ${sanctionsData.length}개 항목을 로드했습니다.`);
    }
    
    // 통합 파일에서 부족한 데이터 보충
    if (fs.existsSync(integratedFile)) {
      // 통합 파일이 너무 크면 처리하지 않음
      const stats = fs.statSync(integratedFile);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      if (fileSizeMB > 100 && sanctionsData.length > 1000) {
        console.log(`통합 파일이 너무 큽니다 (${fileSizeMB.toFixed(2)}MB). 검색 결과가 충분하므로 처리를 건너뜁니다.`);
      } else {
        console.log('통합 파일에서 추가 데이터를 로드합니다...');
        
        try {
          const data = JSON.parse(fs.readFileSync(integratedFile, 'utf8'));
          if (Array.isArray(data)) {
            for (const entry of data) {
              const id = entry.id || entry._id;
              if (id && !seenIds.has(id)) {
                sanctionsData.push(entry);
                seenIds.add(id);
              }
            }
            console.log(`통합 파일에서 ${sanctionsData.length - seenIds.size + 1}개 추가 항목을 로드했습니다.`);
          } else {
            console.warn('경고: 통합 파일의 데이터가 배열이 아닙니다.');
          }
        } catch (error) {
          console.error(`통합 파일 처리 중 오류: ${error.message}`);
        }
      }
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
      // 검색어 정규화 및 타입 체크
      const normalizedQuery = query.toString().toLowerCase().trim();
      const isNumeric = /^[0-9]+$/.test(normalizedQuery);
      const isDate = /^\d{4}-\d{2}-\d{2}$/.test(normalizedQuery) || /^\d{2}\/\d{2}\/\d{4}$/.test(normalizedQuery);
      
      console.log(`검색어 "${normalizedQuery}" 분석: 숫자=${isNumeric}, 날짜=${isDate}`);
      
      // 검색어 동의어 맵 (필요시 확장)
      const synonyms = {
        "company": ["corporation", "enterprise", "firm", "business", "organization"],
        "person": ["individual", "human", "citizen", "subject"],
        "vessel": ["ship", "boat", "tanker", "carrier"],
        "aircraft": ["plane", "helicopter", "jet"],
        "bank": ["financial institution", "credit union", "monetary"],
        "military": ["army", "defense", "armed forces", "warfare"],
        "government": ["administration", "authority", "regime", "state"],
        "oil": ["petroleum", "crude", "gas", "fuel"]
      };
      
      // 검색어를 토큰으로 분리
      const searchTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 0);
      
      // 동의어 확장
      const expandedTerms = [...searchTerms];
      for (const term of searchTerms) {
        // 동의어 추가
        for (const [key, values] of Object.entries(synonyms)) {
          if (term === key || values.includes(term)) {
            expandedTerms.push(key);
            expandedTerms.push(...values);
          }
        }
      }
      
      // 중복 제거 및 정렬
      const uniqueTerms = [...new Set(expandedTerms)].sort();
      if (uniqueTerms.length > searchTerms.length) {
        console.log(`검색어 확장: ${searchTerms.join(', ')} -> ${uniqueTerms.join(', ')}`);
      }
      
      filteredData = filteredData.filter(entry => {
        // 기본 검색 필드
        const nameFields = [
          entry.name,
          entry.nameOriginal,
          entry.title,
          entry.description,
          ...(entry.aliases || []).map(alias => alias.name || alias),
          ...(entry.name_aliases || []),
          ...(entry.also_known_as || [])
        ].filter(Boolean).join(' ').toLowerCase();
        
        // ID 및 숫자 관련 필드
        const numericFields = [
          entry.id,
          entry._id,
          entry.referenceNumber,
          entry.refNumber,
          entry.reference,
          entry.regNumber,
          entry.passportNumber,
          entry.idNumber,
          entry.registrationNumber,
          ...(entry.identifiers || []).map(id => id.value || id),
          ...(entry.identity_numbers || []),
          ...(entry.phone_numbers || []),
          ...(entry.document_numbers || [])
        ].filter(Boolean).map(String).join(' ').toLowerCase();
        
        // 국가, 주소 필드
        const locationFields = [
          ...(entry.countries || []),
          ...(entry.country || []),
          entry.nationality,
          entry.citizenship,
          entry.location,
          ...(entry.addresses || []).map(addr => 
            typeof addr === 'string' ? addr : Object.values(addr).filter(Boolean).join(' ')
          ),
          ...(entry.locations || []).map(loc => 
            typeof loc === 'string' ? loc : Object.values(loc).filter(Boolean).join(' ')
          )
        ].filter(Boolean).join(' ').toLowerCase();
        
        // 날짜 필드
        const dateFields = [
          entry.birthDate,
          entry.dateOfBirth,
          entry.dob,
          entry.startDate,
          entry.endDate,
          entry.listingDate,
          entry.publicationDate,
          entry.effectiveDate,
          entry.lastUpdated
        ].filter(Boolean).join(' ').toLowerCase();
        
        // 기타 필드 (소속, 프로그램, 이유 등)
        const otherFields = [
          entry.remarks,
          entry.comments,
          entry.reason,
          entry.reasonListing,
          entry.program,
          ...(entry.programs || []),
          ...(entry.programsOriginal || []),
          entry.sourceDescription,
          entry.entity_type,
          entry.type,
          entry.subtype
        ].filter(Boolean).join(' ').toLowerCase();
        
        // 모든 필드를 하나로 합침
        const allFields = nameFields + ' ' + numericFields + ' ' + locationFields + ' ' + dateFields + ' ' + otherFields;
        
        // 숫자 전용 검색 (부분 일치도 허용)
        if (isNumeric) {
          return numericFields.includes(normalizedQuery) || 
                 allFields.includes(normalizedQuery);
        }
        // 날짜 전용 검색
        else if (isDate) {
          return dateFields.includes(normalizedQuery);
        } 
        // 일반 검색 (모든 필드에서 동의어 포함 검색)
        else {
          // 모든 확장된 검색어 중 하나라도 일치하면 결과에 포함
          return uniqueTerms.some(term => allFields.includes(term)) ||
                 // 또는 원래 검색어들이 모두 포함되면 결과에 포함
                 searchTerms.every(term => allFields.includes(term));
        }
      });
    }
    
    // 유형 필터
    if (type) {
      filteredData = filteredData.filter(entry => {
        const entryType = 
          (entry.type && entry.type.toLowerCase()) || 
          (entry.entityType && entry.entityType.toLowerCase()) ||
          (entry.entity_type && entry.entity_type.toLowerCase()) ||
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
          ...(entry.citizenship && [entry.citizenship] || []),
          ...(entry.address && entry.address.country && [entry.address.country] || []),
          ...(entry.addresses && entry.addresses.map(addr => 
            typeof addr === 'string' ? addr : addr.country || addr.state || addr.city
          ) || [])
        ].filter(Boolean).map(c => c.toLowerCase());
        
        return countries.some(c => c.includes(country.toLowerCase()));
      });
    }
    
    // 프로그램 필터
    if (program) {
      filteredData = filteredData.filter(entry => {
        const programs = [
          ...(entry.programs || []),
          ...(entry.programsOriginal || []),
          entry.program,
          entry.regime,
          entry.sanction_list,
          entry.legal_basis
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
          (entry.source_url && entry.source_url.toLowerCase()) ||
          (entry.sourceUrl && entry.sourceUrl.toLowerCase()) ||
          (entry.source_description && entry.source_description.toLowerCase()) ||
          (entry.source_file && entry.source_file.toLowerCase());
          
        return entrySource && entrySource.includes(source.toLowerCase());
      });
    }
    
    // 날짜 범위 필터
    if (dateFrom || dateTo) {
      filteredData = filteredData.filter(entry => {
        // 마지막 업데이트 날짜 추출
        let updateDate = entry.lastUpdated || 
                          entry.lastUpdate ||
                          entry.last_updated ||
                          entry.update_date ||
                          (entry.details && entry.details.lastUpdated) || 
                          entry.publicationDate || 
                          entry.publication_date ||
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
        aValue = a.lastUpdated || a.lastUpdate || a.last_updated || (a.details && a.details.lastUpdated) || a.publicationDate || a.listingDate || '';
        bValue = b.lastUpdated || b.lastUpdate || b.last_updated || (b.details && b.details.lastUpdated) || b.publicationDate || b.listingDate || '';
        
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
      
      // 등재일(startDate) 정보 추출
      const listingDate = entry.listingDate || entry.startDate || 
                         entry.listing_date || entry.start_date ||
                         (entry.details && entry.details.listingDate) || 
                         (entry.details && entry.details.startDate);
      
      return {
        id: entry.id || entry._id,
        name: entry.name || entry.nameOriginal || entry.full_name || '(이름 없음)',
        type: entry.type || entry.entityType || entry.entity_type || (entry.details && entry.details.type) || '알 수 없음',
        source: entry.source || entry.sourceDescription || entry.source_description || '알 수 없음',
        lastUpdated: formatDate(
          entry.lastUpdated || 
          entry.lastUpdate || 
          entry.last_updated ||
          (entry.details && entry.details.lastUpdated) || 
          entry.publicationDate || 
          entry.publication_date ||
          entry.listingDate
        ),
        listingDate: listingDate ? formatDate(listingDate) : null,
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