/**
 * Next.js 정적 파일 검증 스크립트
 * 배포된 웹사이트에서 필요한 정적 파일이 올바르게 제공되는지 확인합니다.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 로컬 .next 디렉토리에서 빌드 ID 가져오기
function getLocalBuildId() {
  try {
    const buildIdPath = path.join(__dirname, '../.next/BUILD_ID');
    if (fs.existsSync(buildIdPath)) {
      return fs.readFileSync(buildIdPath, 'utf8').trim();
    }
  } catch (err) {
    console.error('로컬 빌드 ID 읽기 오류:', err);
  }
  return null;
}

// URL에서 HTTP 응답 코드와 내용 가져오기
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// 주어진 URL에서 빌드 ID 추출 시도
async function extractBuildIdFromUrl(baseUrl) {
  try {
    const response = await fetchUrl(`${baseUrl}`);
    if (response.statusCode !== 200) {
      console.log(`사이트 접속 실패: ${response.statusCode}`);
      return null;
    }
    
    const htmlContent = response.body;
    
    // HTML에서 빌드 ID 패턴 찾기
    const buildIdPattern = /_next\/static\/([^\/]+)/;
    const match = htmlContent.match(buildIdPattern);
    
    if (match && match[1]) {
      return match[1];
    }
    
    console.log('HTML에서 빌드 ID를 찾을 수 없습니다.');
    return null;
  } catch (error) {
    console.error('빌드 ID 추출 오류:', error);
    return null;
  }
}

// 정적 파일 검사
async function checkStaticFiles() {
  const baseUrl = 'https://sp.wvl.co.kr';
  
  console.log('배포된 웹사이트 정적 파일 검사 시작...');
  console.log(`기준 URL: ${baseUrl}`);
  
  // 로컬 빌드 ID 가져오기
  const localBuildId = getLocalBuildId();
  console.log(`로컬 빌드 ID: ${localBuildId || '알 수 없음'}`);
  
  // 배포된 웹사이트에서 빌드 ID 추출
  const remoteBuildId = await extractBuildIdFromUrl(baseUrl);
  console.log(`원격 빌드 ID: ${remoteBuildId || '알 수 없음'}`);
  
  // 검사할 빌드 ID 선택 (원격 우선)
  const buildId = remoteBuildId || localBuildId || 'unknown';
  
  // 검사할 중요 정적 파일 경로
  const paths = [
    '/_next/static/chunks/pages/_app-f5129ad028c87ce3.js',
    `/_next/static/${buildId}/_buildManifest.js`,
    `/_next/static/${buildId}/_ssgManifest.js`,
    '/_next/static/chunks/main.js',
    '/_next/static/chunks/webpack.js',
    '/_next/static/chunks/pages/index.js',
    '/_next/static/chunks/pages/auth/login.js'
  ];
  
  console.log('\n중요 정적 파일 상태 검사:');
  console.log('----------------------------------------');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const path of paths) {
    try {
      const url = `${baseUrl}${path}`;
      console.log(`검사 중: ${path}`);
      
      const response = await fetchUrl(url);
      const statusCode = response.statusCode;
      const contentLength = response.headers['content-length'] || 'unknown';
      
      if (statusCode === 200) {
        console.log(`✓ 성공 (${statusCode}) - 크기: ${contentLength} 바이트`);
        successCount++;
      } else {
        console.log(`✗ 실패 (${statusCode})`);
        failCount++;
      }
    } catch (error) {
      console.log(`✗ 오류: ${error.message}`);
      failCount++;
    }
    
    console.log('----------------------------------------');
  }
  
  console.log(`\n검사 완료: ${successCount}개 성공, ${failCount}개 실패`);
  
  // 서버 상태 확인
  try {
    const healthResponse = await fetchUrl(`${baseUrl}/api/health`);
    console.log(`\n서버 상태: ${healthResponse.statusCode} (${healthResponse.body.substring(0, 50)}...)`);
  } catch (error) {
    console.log('\n서버 상태 확인 실패:', error.message);
  }
}

// 실행
checkStaticFiles().catch(console.error); 