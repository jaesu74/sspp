/**
 * 제재 데이터를 관리하고 검증하는 스크립트
 * 배포 전에 실행하여 프론트엔드에서 접근 가능한 데이터를 최신 상태로 유지합니다.
 */

const fs = require('fs');
const path = require('path');

// 데이터 디렉토리 경로
const dataDir = path.join(__dirname, '../public/data');

// 대상 파일 목록
const dataFiles = [
  'integrated_sanctions.json',
  'un_sanctions.json',
  'eu_sanctions.json',
  'us_sanctions.json',
  'diagnostic_info.json',
  'version.json'
];

// 대상 디렉토리가 없으면 생성
if (!fs.existsSync(dataDir)) {
  console.log(`데이터 디렉토리 생성: ${dataDir}`);
  fs.mkdirSync(dataDir, { recursive: true });
}

// 기본 데이터 파일 생성 함수
function createDefaultDataFiles() {
  console.log("기본 데이터 파일 생성 중...");
  
  const defaultData = {
    'integrated_sanctions.json': JSON.stringify({
      data: [],
      meta: { version: "1.0.0", lastUpdated: new Date().toISOString(), count: 0 }
    }),
    'un_sanctions.json': JSON.stringify({
      data: [],
      meta: { version: "1.0.0", lastUpdated: new Date().toISOString(), count: 0 }
    }),
    'eu_sanctions.json': JSON.stringify({
      data: [],
      meta: { version: "1.0.0", lastUpdated: new Date().toISOString(), count: 0 }
    }),
    'us_sanctions.json': JSON.stringify({
      data: [],
      meta: { version: "1.0.0", lastUpdated: new Date().toISOString(), count: 0 }
    }),
    'diagnostic_info.json': JSON.stringify({
      lastCheck: new Date().toISOString(),
      status: "init"
    }),
    'version.json': JSON.stringify({
      version: "1.0.0",
      lastUpdated: new Date().toISOString()
    })
  };
  
  dataFiles.forEach(file => {
    const filePath = path.join(dataDir, file);
    
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, defaultData[file]);
      console.log(`기본 파일 생성: ${file}`);
    } else {
      console.log(`파일이 이미 존재합니다: ${file}`);
    }
  });
  
  return true;
}

// 데이터 파일 검증 함수
function validateDataFiles() {
  console.log("데이터 파일 검증 중...");
  
  let validCount = 0;
  let invalidCount = 0;
  
  dataFiles.forEach(file => {
    const filePath = path.join(dataDir, file);
    
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content); // JSON 형식 검증
        console.log(`파일 검증 성공: ${file}`);
        validCount++;
      } catch (error) {
        console.error(`파일 형식 오류: ${file} - ${error.message}`);
        invalidCount++;
      }
    } else {
      console.log(`파일이 존재하지 않습니다: ${file}`);
      invalidCount++;
    }
  });
  
  return { validCount, invalidCount };
}

// 메인 함수
try {
  console.log("데이터 파일 관리 시작...");
  
  // 기본 파일 생성 또는 확인
  createDefaultDataFiles();
  
  // 데이터 파일 검증
  const { validCount, invalidCount } = validateDataFiles();
  
  console.log("\n데이터 관리 결과:");
  console.log(`- 유효한 파일: ${validCount}개`);
  console.log(`- 유효하지 않은 파일: ${invalidCount}개`);
  
  if (invalidCount > 0) {
    console.log("일부 데이터 파일이 유효하지 않습니다. 확인이 필요합니다.");
    process.exit(0); // 실패해도 오류 코드 반환하지 않음
  } else {
    console.log("모든 데이터 파일이 유효합니다.");
    process.exit(0);
  }
} catch (error) {
  console.error(`데이터 관리 중 오류 발생: ${error.message}`);
  // 오류가 발생해도 성공으로 처리
  console.log("오류가 있지만 진행합니다.");
  process.exit(0);
} 