/**
 * 제재 정보 수집 및 통합 스크립트
 * UN, EU, US 등 다양한 제재 정보를 수집하여 통합합니다.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const xml2js = require('xml2js');

// 데이터 저장 경로
const DATA_DIR = path.join(__dirname, '../public/data');
// 버전 폴더 경로
const VERSIONS_DIR = path.join(DATA_DIR, 'versions');
// 청크 폴더 경로
const CHUNKS_DIR = path.join(DATA_DIR, 'chunks');

// 데이터 소스 URL
const DATA_SOURCES = {
  UN: 'https://scsanctions.un.org/resources/xml/en/consolidated.xml',
  EU: 'https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content',
  US: 'https://www.treasury.gov/ofac/downloads/sdn.xml'
};

/**
 * 현재 날짜로 버전 이름 생성
 * @returns {string} - YYYY-MM-DD 형식의 버전 이름
 */
function generateVersionName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 디렉토리가 없으면 생성
 * @param {string} dir - 생성할 디렉토리 경로
 */
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`디렉토리 생성: ${dir}`);
  }
}

/**
 * XML 데이터를 JSON으로 변환
 * @param {string} xml - XML 데이터
 * @param {string} source - 데이터 소스 (UN, EU, US)
 * @returns {Promise<Array>} - 변환된 JSON 객체 배열
 */
async function convertXmlToJson(xml, source) {
  try {
    console.log(`${source} XML 데이터를 JSON으로 변환 중...`);
    
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xml);
    
    let data = [];
    
    // 소스별 XML 파싱 로직 (실제 데이터 구조에 맞게 조정 필요)
    switch (source) {
      case 'UN':
        if (result.CONSOLIDATED_LIST && result.CONSOLIDATED_LIST.INDIVIDUALS) {
          const individuals = Array.isArray(result.CONSOLIDATED_LIST.INDIVIDUALS.INDIVIDUAL) 
            ? result.CONSOLIDATED_LIST.INDIVIDUALS.INDIVIDUAL 
            : [result.CONSOLIDATED_LIST.INDIVIDUALS.INDIVIDUAL];
            
          individuals.forEach((individual, index) => {
            data.push({
              id: `UN-IND-${index + 1}`,
              name: individual.FIRST_NAME + ' ' + individual.SECOND_NAME,
              type: 'individual',
              country: individual.NATIONALITY && individual.NATIONALITY.VALUE ? individual.NATIONALITY.VALUE : 'Unknown',
              source: 'UN',
              listingDate: individual.LISTED_ON,
              details: { reason: individual.COMMENTS || 'No reason provided' }
            });
          });
        }
        
        if (result.CONSOLIDATED_LIST && result.CONSOLIDATED_LIST.ENTITIES) {
          const entities = Array.isArray(result.CONSOLIDATED_LIST.ENTITIES.ENTITY) 
            ? result.CONSOLIDATED_LIST.ENTITIES.ENTITY 
            : [result.CONSOLIDATED_LIST.ENTITIES.ENTITY];
            
          entities.forEach((entity, index) => {
            data.push({
              id: `UN-ENT-${index + 1}`,
              name: entity.FIRST_NAME,
              type: 'entity',
              country: (entity.citizenship && entity.citizenship.countryDescription) ? entity.citizenship.countryDescription : 
                       (entity.countryOfResidence && entity.countryOfResidence.countryDescription) ? entity.countryOfResidence.countryDescription : 'Unknown',
              source: 'UN',
              listingDate: entity.LISTED_ON,
              details: { reason: entity.COMMENTS || 'No reason provided' }
            });
          });
        }
        break;
        
      case 'EU':
        if (result.export && result.export.sanctionEntity) {
          const entities = Array.isArray(result.export.sanctionEntity) 
            ? result.export.sanctionEntity 
            : [result.export.sanctionEntity];
            
          entities.forEach((entity, index) => {
            const type = (entity.subjectType && entity.subjectType.classificationCode === 'P') ? 'individual' : 'entity';
            data.push({
              id: `EU-${entity.logicalId || index + 1}`,
              name: (entity.nameAlias && entity.nameAlias.wholeName) ? entity.nameAlias.wholeName : 'Unknown',
              type: type,
              country: (entity.citizenship && entity.citizenship.countryDescription) ? entity.citizenship.countryDescription : 
                       (entity.countryOfResidence && entity.countryOfResidence.countryDescription) ? entity.countryOfResidence.countryDescription : 'Unknown',
              source: 'EU',
              listingDate: entity.publishDate,
              details: { reason: (entity.regulation && entity.regulation.regulationSummary) ? entity.regulation.regulationSummary : 'No reason provided' }
            });
          });
        }
        break;
        
      case 'US':
        if (result.sdnList && result.sdnList.sdnEntry) {
          const entries = Array.isArray(result.sdnList.sdnEntry) 
            ? result.sdnList.sdnEntry 
            : [result.sdnList.sdnEntry];
            
          entries.forEach((entry, index) => {
            const type = entry.sdnType === 'Individual' ? 'individual' : 
                       (entry.vesselInfo) ? 'vessel' : 
                       (entry.aircraftInfo) ? 'aircraft' : 'entity';
                       
            data.push({
              id: `US-${entry.uid || index + 1}`,
              name: entry.firstName ? `${entry.firstName} ${entry.lastName}` : entry.lastName,
              type: type,
              country: (entry.addressList && entry.addressList.address && entry.addressList.address.country) ? entry.addressList.address.country : 'Unknown',
              source: 'US',
              listingDate: entry.publishDate || new Date().toISOString(),
              details: { 
                reason: (entry.programList && entry.programList.program) ? entry.programList.program : 'No reason provided',
                additionalInfo: entry.remarks || ''
              }
            });
          });
        }
        break;
    }
    
    console.log(`${source} 데이터 변환 완료: ${data.length}개 항목`);
    return data;
  } catch (error) {
    console.error(`${source} XML 변환 오류:`, error);
    throw error;
  }
}

/**
 * 각 소스의 데이터를 수집
 * @param {string} source - 데이터 소스 (UN, EU, US)
 * @returns {Promise<Array>} - 수집된 데이터 배열
 */
async function collectData(source) {
  try {
    console.log(`${source} 데이터 수집 중...`);
    
    // 실제 API에서 데이터 수집
    const response = await axios.get(DATA_SOURCES[source], {
      responseType: 'text',
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 60000 // 60초 타임아웃
    });
    
    const xml = response.data;
    return await convertXmlToJson(xml, source);
  } catch (error) {
    console.error(`${source} 데이터 수집 중 오류:`, error);
    
    // 오류 발생 시 기존 파일 사용
    const filePath = path.join(DATA_DIR, `${source.toLowerCase()}_sanctions.json`);
    if (fs.existsSync(filePath)) {
      console.log(`${source} 데이터 수집 실패, 기존 파일 사용`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data.data || [];
    }
    
    // 기존 파일도 없는 경우 빈 배열 반환
    return [];
  }
}

/**
 * 데이터를 청크로 분할
 * @param {Array} data - 분할할 데이터 배열
 * @param {string} source - 데이터 소스 (UN, EU, US)
 * @param {number} chunkSize - 청크 크기
 */
function splitDataIntoChunks(data, source, chunkSize = 1000) {
  const sourcePrefix = source.toLowerCase();
  const chunks = [];
  
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const chunkIndex = Math.floor(i / chunkSize) + 1;
    const chunkFileName = `${sourcePrefix}_chunk_${chunkIndex}.json`;
    const chunkPath = path.join(CHUNKS_DIR, chunkFileName);
    
    fs.writeFileSync(chunkPath, JSON.stringify(chunk, null, 2));
    chunks.push({ file: chunkFileName, count: chunk.length });
  }
  
  // 청크 인덱스 파일 업데이트
  const indexPath = path.join(CHUNKS_DIR, 'index.json');
  let index = {};
  
  if (fs.existsSync(indexPath)) {
    try {
      index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch (e) {
      console.error('청크 인덱스 파일 읽기 오류:', e);
    }
  }
  
  index[sourcePrefix] = chunks;
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  
  console.log(`${source} 데이터를 ${chunks.length}개 청크로 분할했습니다.`);
}

/**
 * 각 소스의 데이터를 저장
 * @param {string} source - 데이터 소스 (UN, EU, US)
 * @param {Array} data - 저장할 데이터 배열
 */
function saveSourceData(source, data) {
  const sourcePrefix = source.toLowerCase();
  const filePath = path.join(DATA_DIR, `${sourcePrefix}_sanctions.json`);
  
  const jsonData = {
    data: data,
    meta: {
      source: source,
      count: data.length,
      lastUpdated: new Date().toISOString(),
      version: generateVersionName()
    }
  };
  
  fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
  console.log(`${source} 데이터가 저장되었습니다. (${data.length}개 항목)`);
  
  // 데이터를 청크로 분할
  splitDataIntoChunks(data, source);
}

/**
 * 여러 소스의 데이터를 통합
 * @param {Object} sourcesData - 각 소스의 데이터 객체
 * @returns {Array} - 통합된 데이터 배열
 */
function integrateSourcesData(sourcesData) {
  const integrated = [];
  let idCounter = 1;
  
  // 각 소스의 데이터 통합
  Object.entries(sourcesData).forEach(([source, data]) => {
    data.forEach(item => {
      integrated.push({
        ...item,
        integratedId: `INT-${idCounter++}`,
        originalSource: source
      });
    });
  });
  
  return integrated;
}

/**
 * 통합 데이터를 버전 폴더에 저장하고, 최신 버전을 메인 폴더에도 복사
 * @param {Array} integratedData - 통합된 제재 데이터
 */
function saveVersionedData(integratedData) {
  // 버전 폴더 생성
  const versionName = generateVersionName();
  const versionDir = path.join(VERSIONS_DIR, versionName);
  
  ensureDirectoryExists(versionDir);
  
  // 통합 데이터를 버전 폴더에 저장
  const versionFilePath = path.join(versionDir, 'sanctions.json');
  
  const jsonData = {
    data: integratedData,
    meta: {
      count: integratedData.length,
      lastUpdated: new Date().toISOString(),
      version: versionName,
      sources: ['UN', 'EU', 'US']
    }
  };
  
  fs.writeFileSync(versionFilePath, JSON.stringify(jsonData, null, 2));
  console.log(`버전 ${versionName}의 데이터가 저장되었습니다. (${integratedData.length}개 항목)`);
  
  // 최신 버전을 메인 폴더에도 복사
  const mainFilePath = path.join(DATA_DIR, 'integrated_sanctions.json');
  fs.writeFileSync(mainFilePath, JSON.stringify(jsonData, null, 2));
  console.log('최신 통합 데이터가 메인 폴더에 복사되었습니다.');
  
  // 통합 데이터도 메인 폴더에 저장 (간단한 형식)
  const simpleFilePath = path.join(DATA_DIR, 'sanctions.json');
  fs.writeFileSync(simpleFilePath, JSON.stringify(integratedData, null, 2));
  
  // 버전 정보 업데이트
  const versionInfoPath = path.join(DATA_DIR, 'version.json');
  const versionInfo = {
    current: versionName,
    lastUpdated: new Date().toISOString(),
    recordCount: integratedData.length,
    sources: {
      UN: integratedData.filter(item => item.source === 'UN').length,
      EU: integratedData.filter(item => item.source === 'EU').length,
      US: integratedData.filter(item => item.source === 'US').length
    }
  };
  fs.writeFileSync(versionInfoPath, JSON.stringify(versionInfo, null, 2));
  console.log('버전 정보가 업데이트되었습니다.');
  
  // 진단 정보 업데이트
  const diagnosticPath = path.join(DATA_DIR, 'diagnostic_info.json');
  const diagnosticInfo = {
    lastCheck: new Date().toISOString(),
    status: "success",
    recordsCollected: integratedData.length,
    executionTime: new Date().getTime() - startTime,
    sources: {
      UN: { status: "success", count: integratedData.filter(item => item.source === 'UN').length },
      EU: { status: "success", count: integratedData.filter(item => item.source === 'EU').length },
      US: { status: "success", count: integratedData.filter(item => item.source === 'US').length }
    }
  };
  fs.writeFileSync(diagnosticPath, JSON.stringify(diagnosticInfo, null, 2));
  console.log('진단 정보가 업데이트되었습니다.');
}

/**
 * 메인 함수
 */
const startTime = new Date().getTime();
async function main() {
  try {
    console.log('제재 데이터 수집 및 통합 시작...');
    
    // 필요한 디렉토리 생성
    ensureDirectoryExists(DATA_DIR);
    ensureDirectoryExists(VERSIONS_DIR);
    ensureDirectoryExists(CHUNKS_DIR);
    
    // 각 소스에서 데이터 수집
    const sourcesData = {};
    for (const source of Object.keys(DATA_SOURCES)) {
      const data = await collectData(source);
      sourcesData[source] = data;
      saveSourceData(source, data);
    }
    
    // 데이터 통합
    const integratedData = integrateSourcesData(sourcesData);
    
    // 통합 데이터 저장
    saveVersionedData(integratedData);
    
    console.log('제재 데이터 수집 및 통합 완료.');
    console.log(`총 실행 시간: ${(new Date().getTime() - startTime) / 1000}초`);
    console.log(`총 수집된 데이터 항목: ${integratedData.length}개`);
  } catch (error) {
    console.error('데이터 통합 중 오류 발생:', error);
    
    // 오류 정보 기록
    const diagnosticPath = path.join(DATA_DIR, 'diagnostic_info.json');
    const diagnosticInfo = {
      lastCheck: new Date().toISOString(),
      status: "error",
      error: error.message,
      executionTime: new Date().getTime() - startTime
    };
    fs.writeFileSync(diagnosticPath, JSON.stringify(diagnosticInfo, null, 2));
    
    process.exit(1);
  }
}

// 스크립트 실행
main(); 