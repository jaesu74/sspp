/**
 * 배포 전 데이터 수집 및 통합 스크립트
 * 
 * 이 스크립트는 배포 전에 최신 제재 데이터를 수집하고 통합합니다.
 * package.json의 scripts에 "predeploy": "node scripts/pre-deploy-data-collector.js"를 추가하면
 * 배포 명령을 실행할 때마다 자동으로 실행됩니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');

// 설정
const CONFIG = {
  dataDir: path.join(process.cwd(), 'data'),
  chunksDir: path.join(process.cwd(), 'data', 'chunks'),
  docsDataDir: path.join(process.cwd(), 'docs', 'data'),
  publicDataDir: path.join(process.cwd(), 'public', 'data'),
  sources: {
    un: 'https://scsanctions.un.org/resources/xml/en/consolidated.xml',
    eu: 'https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content',
    us: 'https://www.treasury.gov/ofac/downloads/sanctions/1.0/sdn_advanced.xml'
  },
  timeoutMs: 120000 // 데이터 수집 타임아웃(2분)
};

/**
 * 스크립트 시작 로그
 */
function logStart(title) {
  console.log(`\n==== ${title} - ${new Date().toISOString()} ====`);
}

/**
 * 스크립트 종료 로그
 */
function logEnd(title, success = true) {
  const status = success ? '✓ 성공' : '✗ 실패';
  console.log(`==== ${title} ${status} - ${new Date().toISOString()} ====\n`);
}

/**
 * 디렉토리 생성
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`디렉토리 생성: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

/**
 * 데이터 수집 함수
 * 외부 API에서 데이터를 수집하고 임시 파일에 저장
 */
async function collectSanctionsData() {
  logStart('제재 데이터 수집');
  
  ensureDirectoryExists(CONFIG.dataDir);
  ensureDirectoryExists(path.join(CONFIG.dataDir, 'temp'));
  
  try {
    const results = [];
    const sources = Object.entries(CONFIG.sources);
    
    for (const [source, url] of sources) {
      console.log(`${source.toUpperCase()} 데이터 수집 중...`);
      
      try {
        const response = await axios.get(url, { 
          timeout: CONFIG.timeoutMs,
          responseType: 'text'
        });
        
        if (response.status === 200) {
          const tempFile = path.join(CONFIG.dataDir, 'temp', `${source}_raw.xml`);
          fs.writeFileSync(tempFile, response.data);
          console.log(`✓ ${source.toUpperCase()} 데이터 수집 완료 (${(response.data.length / 1024 / 1024).toFixed(2)}MB)`);
          results.push({ source, success: true, size: response.data.length });
        } else {
          console.error(`✗ ${source.toUpperCase()} 데이터 수집 실패: 상태 코드 ${response.status}`);
          results.push({ source, success: false, error: `상태 코드 ${response.status}` });
        }
      } catch (error) {
        console.error(`✗ ${source.toUpperCase()} 데이터 수집 중 오류: ${error.message}`);
        results.push({ source, success: false, error: error.message });
      }
    }
    
    // 수집 결과 저장
    const resultFile = path.join(CONFIG.dataDir, 'collection_result.json');
    fs.writeFileSync(resultFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      results
    }, null, 2));
    
    const successCount = results.filter(r => r.success).length;
    logEnd('제재 데이터 수집', successCount > 0);
    return successCount > 0;
  } catch (error) {
    console.error('데이터 수집 중 오류 발생:', error);
    logEnd('제재 데이터 수집', false);
    return false;
  }
}

/**
 * XML 데이터를 JSON으로 변환
 */
function convertXmlToJson() {
  logStart('XML 데이터 JSON 변환');
  
  try {
    const sources = Object.keys(CONFIG.sources);
    let successCount = 0;
    
    for (const source of sources) {
      const xmlFile = path.join(CONFIG.dataDir, 'temp', `${source}_raw.xml`);
      const jsonFile = path.join(CONFIG.dataDir, 'temp', `${source}.json`);
      
      if (fs.existsSync(xmlFile)) {
        try {
          console.log(`${source.toUpperCase()} XML 변환 중...`);
          
          // XML 변환 스크립트 실행
          execSync(`node scripts/xml-to-json-converter.js --input="${xmlFile}" --output="${jsonFile}" --source="${source}"`, {
            stdio: 'inherit'
          });
          
          console.log(`✓ ${source.toUpperCase()} XML 변환 완료`);
          successCount++;
        } catch (error) {
          console.error(`✗ ${source.toUpperCase()} XML 변환 실패:`, error.message);
        }
      } else {
        console.log(`${source.toUpperCase()} XML 파일이 없습니다. 변환을 건너뜁니다.`);
      }
    }
    
    logEnd('XML 데이터 JSON 변환', successCount > 0);
    return successCount > 0;
  } catch (error) {
    console.error('XML 변환 중 오류 발생:', error);
    logEnd('XML 데이터 JSON 변환', false);
    return false;
  }
}

/**
 * 수집된 데이터 통합
 */
function integrateData() {
  logStart('데이터 통합');
  
  try {
    console.log('통합 스크립트 실행 중...');
    
    // 통합 스크립트 실행
    execSync('node scripts/integrate-sanctions-data.js', {
      stdio: 'inherit'
    });
    
    logEnd('데이터 통합');
    return true;
  } catch (error) {
    console.error('데이터 통합 중 오류 발생:', error);
    logEnd('데이터 통합', false);
    return false;
  }
}

/**
 * 대용량 데이터 파일 분할
 */
function splitLargeDataFile() {
  logStart('대용량 파일 분할');
  
  try {
    const integratedFile = path.join(CONFIG.dataDir, 'sanctions.json');
    
    if (fs.existsSync(integratedFile)) {
      const stats = fs.statSync(integratedFile);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      console.log(`통합 파일 크기: ${fileSizeMB.toFixed(2)}MB`);
      
      if (fileSizeMB > 10) {
        console.log('파일 크기가 10MB를 초과합니다. 분할을 시작합니다...');
        
        // 분할 스크립트 실행
        execSync('node scripts/split-sanctions-data.js', {
          stdio: 'inherit'
        });
        
        console.log('✓ 파일 분할 완료');
      } else {
        console.log('파일 크기가 작아 분할이 필요하지 않습니다.');
      }
    } else {
      console.log('통합 파일이 없습니다. 분할을 건너뜁니다.');
    }
    
    logEnd('대용량 파일 분할');
    return true;
  } catch (error) {
    console.error('파일 분할 중 오류 발생:', error);
    logEnd('대용량 파일 분할', false);
    return false;
  }
}

/**
 * 중복 데이터 제거
 */
function removeDuplicateData() {
  logStart('중복 데이터 제거');
  
  try {
    console.log('중복 제거 스크립트 실행 중...');
    
    // 중복 제거 스크립트 실행
    execSync('node scripts/remove-duplicate-data.js', {
      stdio: 'inherit'
    });
    
    logEnd('중복 데이터 제거');
    return true;
  } catch (error) {
    console.error('중복 제거 중 오류 발생:', error);
    logEnd('중복 데이터 제거', false);
    return false;
  }
}

/**
 * 데이터 동기화 (docs -> public)
 */
function syncData() {
  logStart('데이터 동기화');
  
  try {
    console.log('동기화 스크립트 실행 중...');
    
    // 동기화 스크립트 실행
    execSync('node scripts/sync-data.js', {
      stdio: 'inherit'
    });
    
    logEnd('데이터 동기화');
    return true;
  } catch (error) {
    console.error('데이터 동기화 중 오류 발생:', error);
    logEnd('데이터 동기화', false);
    return false;
  }
}

/**
 * 임시 파일 정리
 */
function cleanupTempFiles() {
  logStart('임시 파일 정리');
  
  try {
    const tempDir = path.join(CONFIG.dataDir, 'temp');
    
    if (fs.existsSync(tempDir)) {
      console.log('임시 파일 삭제 중...');
      
      // Windows와 Linux 환경 모두 지원하는 방식으로 디렉토리 삭제
      if (process.platform === 'win32') {
        execSync(`rmdir /s /q "${tempDir}"`, { stdio: 'inherit' });
      } else {
        execSync(`rm -rf "${tempDir}"`, { stdio: 'inherit' });
      }
      
      console.log('✓ 임시 파일 삭제 완료');
    } else {
      console.log('임시 디렉토리가 없습니다. 정리를 건너뜁니다.');
    }
    
    logEnd('임시 파일 정리');
    return true;
  } catch (error) {
    console.error('임시 파일 정리 중 오류 발생:', error);
    logEnd('임시 파일 정리', false);
    return false;
  }
}

/**
 * 이전 버전 정리
 */
function cleanupOldVersions() {
  logStart('이전 버전 정리');
  
  try {
    console.log('이전 버전 정리 스크립트 실행 중...');
    
    // 이전 버전 정리 스크립트 실행
    execSync('node scripts/cleanup-old-versions.js', {
      stdio: 'inherit'
    });
    
    logEnd('이전 버전 정리');
    return true;
  } catch (error) {
    console.error('이전 버전 정리 중 오류 발생:', error);
    logEnd('이전 버전 정리', false);
    return false;
  }
}

/**
 * 버전 정보 업데이트
 */
function updateVersionInfo() {
  logStart('버전 정보 업데이트');
  
  try {
    const versionFile = path.join(CONFIG.dataDir, 'version.json');
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.log('package.json 파일을 찾을 수 없습니다.');
      logEnd('버전 정보 업데이트', false);
      return false;
    }
    
    // package.json에서 앱 버전 읽기
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const appVersion = packageJson.version || '1.0.0';
    
    // 버전 정보 생성
    const versionInfo = {
      appVersion,
      dataVersion: new Date().toISOString().split('T')[0], // YYYY-MM-DD 형식
      lastUpdated: new Date().toISOString(),
      updateMethod: 'pre-deploy-auto'
    };
    
    // 버전 파일 저장
    ensureDirectoryExists(CONFIG.dataDir);
    fs.writeFileSync(versionFile, JSON.stringify(versionInfo, null, 2));
    
    // 공개 디렉토리에도 복사
    if (fs.existsSync(CONFIG.publicDataDir) || ensureDirectoryExists(CONFIG.publicDataDir)) {
      fs.writeFileSync(path.join(CONFIG.publicDataDir, 'version.json'), JSON.stringify(versionInfo, null, 2));
    }
    
    console.log(`✓ 버전 정보 업데이트 완료: 앱 버전 ${appVersion}, 데이터 버전 ${versionInfo.dataVersion}`);
    logEnd('버전 정보 업데이트');
    return true;
  } catch (error) {
    console.error('버전 정보 업데이트 중 오류 발생:', error);
    logEnd('버전 정보 업데이트', false);
    return false;
  }
}

/**
 * 메인 함수 - 전체 프로세스 실행
 */
async function main() {
  console.log('\n===============================================');
  console.log('배포 전 데이터 수집 및 통합 프로세스 시작');
  console.log(`시작 시간: ${new Date().toISOString()}`);
  console.log('===============================================\n');
  
  // 폴더 생성
  ensureDirectoryExists(CONFIG.dataDir);
  ensureDirectoryExists(CONFIG.chunksDir);
  
  // 단계별 실행
  try {
    // 1. 데이터 수집
    const collectionResult = await collectSanctionsData();
    
    // 2. XML -> JSON 변환
    if (collectionResult) {
      await convertXmlToJson();
    }
    
    // 3. 데이터 통합
    integrateData();
    
    // 4. 대용량 파일 분할
    splitLargeDataFile();
    
    // 5. 중복 데이터 제거
    removeDuplicateData();
    
    // 6. 데이터 동기화
    syncData();
    
    // 7. 임시 파일 정리
    cleanupTempFiles();
    
    // 8. 이전 버전 정리
    cleanupOldVersions();
    
    // 9. 버전 정보 업데이트
    updateVersionInfo();
    
    console.log('\n===============================================');
    console.log('배포 전 데이터 수집 및 통합 프로세스 완료');
    console.log(`종료 시간: ${new Date().toISOString()}`);
    console.log('===============================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n오류 발생:', error);
    console.log('\n===============================================');
    console.log('배포 전 데이터 수집 및 통합 프로세스 실패');
    console.log(`종료 시간: ${new Date().toISOString()}`);
    console.log('===============================================\n');
    
    process.exit(1);
  }
}

// 스크립트 실행
main(); 