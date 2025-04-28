const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');

// 프로젝트 ID 가져오기
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'sp-2504-cf8b6';
const APP_URL = `https://${PROJECT_ID}.du.r.appspot.com`;

// 상태 확인 API 엔드포인트
const HEALTH_CHECK_URL = `${APP_URL}/api/health`;

// .next 디렉토리 경로
const NEXT_DIR = path.join(__dirname, '..', '.next');

// 중요 파일 목록 정의
const CRITICAL_FILES = [
  '.next/BUILD_ID',
  '.next/server/pages-manifest.json',
  '.next/static'
];

// 파일 존재여부 확인 함수
function verifyFiles() {
  console.log('중요 파일 확인 중...');
  let success = true;

  CRITICAL_FILES.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ 파일 확인 완료: ${file}`);
      
      // 디렉토리인 경우 내용물 확인
      if (fs.statSync(filePath).isDirectory()) {
        const items = fs.readdirSync(filePath);
        console.log(`   └─ 디렉토리 내용: ${items.length}개 항목`);
      }
    } else {
      console.error(`❌ 파일이 없음: ${file}`);
      success = false;
    }
  });

  return success;
}

// 빌드 ID 가져오기
function getBuildId() {
  const buildIdPath = path.join(NEXT_DIR, 'BUILD_ID');
  if (fs.existsSync(buildIdPath)) {
    return fs.readFileSync(buildIdPath, 'utf8').trim();
  }
  return null;
}

// 앱 배포 상태 확인 함수
function checkAppStatus() {
  return new Promise((resolve) => {
    console.log(`앱 상태 확인 중: ${HEALTH_CHECK_URL}`);
    https.get(HEALTH_CHECK_URL, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log(`✅ 앱 상태: ${response.status || 'OK'}`);
            console.log(`   서버 시간: ${response.timestamp || 'Unknown'}`);
            resolve(true);
          } catch (e) {
            console.log(`✅ 앱 응답: ${data}`);
            resolve(true);
          }
        } else {
          console.error(`❌ HTTP 상태 코드: ${res.statusCode}`);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.error(`❌ 앱 연결 오류: ${err.message}`);
      resolve(false);
    });
  });
}

// 앱 버전 확인 함수
function checkAppVersions() {
  return new Promise((resolve) => {
    const command = `gcloud app versions list --project=${PROJECT_ID} --format=json`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ 앱 버전 확인 오류: ${error.message}`);
        resolve(false);
        return;
      }
      
      try {
        const versions = JSON.parse(stdout);
        
        if (versions.length > 0) {
          console.log('🔍 배포된 앱 버전:');
          versions.forEach((version, index) => {
            const status = version.servingStatus === 'SERVING' ? '🟢' : '⚪';
            console.log(`   ${status} ${version.id} (${version.servingStatus}) - 트래픽: ${version.trafficSplit || '0%'}`);
          });
          resolve(true);
        } else {
          console.warn('⚠️ 배포된 앱 버전이 없습니다.');
          resolve(false);
        }
      } catch (e) {
        console.error(`❌ 앱 버전 정보 파싱 오류: ${e.message}`);
        resolve(false);
      }
    });
  });
}

// 메인 검증 함수
async function verifyDeployment() {
  console.log('배포 검증 시작...');
  console.log('='.repeat(50));
  
  // 빌드 ID 확인
  const buildId = getBuildId();
  if (buildId) {
    console.log(`📦 빌드 ID: ${buildId}`);
  } else {
    console.error('❌ 빌드 ID를 찾을 수 없습니다.');
  }
  
  console.log('-'.repeat(50));
  
  // 중요 파일 확인
  const filesOk = verifyFiles();
  
  console.log('-'.repeat(50));
  
  // 앱 상태 확인
  const appOk = await checkAppStatus();
  
  console.log('-'.repeat(50));
  
  // 앱 버전 확인
  const versionsOk = await checkAppVersions();
  
  console.log('='.repeat(50));
  
  // 최종 상태 보고
  if (filesOk && appOk && versionsOk) {
    console.log('✅ 배포 검증 완료: 모든 검사를 통과했습니다.');
    console.log(`🌐 앱 URL: ${APP_URL}`);
    return true;
  } else {
    console.error('❌ 배포 검증 실패: 하나 이상의 검사를 통과하지 못했습니다.');
    return false;
  }
}

// 스크립트 실행
verifyDeployment().then((success) => {
  process.exit(success ? 0 : 1);
}); 