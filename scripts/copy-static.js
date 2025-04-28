const fs = require('fs');
const path = require('path');

// 경로 정의
const nextDir = path.join(__dirname, '../.next');
const buildIdPath = path.join(nextDir, 'BUILD_ID');

// BUILD_ID 파일 존재 여부 확인
if (!fs.existsSync(buildIdPath)) {
  console.error('BUILD_ID 파일을 찾을 수 없습니다. 빌드가 완료되었는지 확인하세요.');
  process.exit(1);
}

// BUILD_ID 읽기
const buildId = fs.readFileSync(buildIdPath, 'utf8').trim();
console.log(`빌드 ID: ${buildId}`);

// 정적 파일 경로 설정
const staticSourceDir = path.join(nextDir, 'static');
const manifestPath = path.join(nextDir, `${buildId}`, '_buildManifest.js');
const ssgManifestPath = path.join(nextDir, `${buildId}`, '_ssgManifest.js');

// 대상 디렉토리 생성
const staticDestDir = path.join(nextDir, `static/${buildId}`);
if (!fs.existsSync(staticDestDir)) {
  fs.mkdirSync(staticDestDir, { recursive: true });
}

// 매니페스트 파일 복사 (루트 레벨 -> 정적 디렉토리)
try {
  if (fs.existsSync(manifestPath)) {
    fs.copyFileSync(manifestPath, path.join(staticDestDir, '_buildManifest.js'));
    console.log('_buildManifest.js 파일을 복사했습니다.');
  } else {
    console.warn(`${manifestPath} 파일을 찾을 수 없습니다.`);
  }

  if (fs.existsSync(ssgManifestPath)) {
    fs.copyFileSync(ssgManifestPath, path.join(staticDestDir, '_ssgManifest.js'));
    console.log('_ssgManifest.js 파일을 복사했습니다.');
  } else {
    console.warn(`${ssgManifestPath} 파일을 찾을 수 없습니다.`);
  }
} catch (err) {
  console.error('파일 복사 중 오류가 발생했습니다:', err);
  process.exit(1);
}

console.log('정적 파일 복사가 완료되었습니다.'); 