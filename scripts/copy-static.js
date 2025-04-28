const fs = require('fs');
const path = require('path');

// 소스 및 타겟 디렉토리 설정
const SOURCE_DIR = path.join(__dirname, '..', 'public');
const BUILD_DIR = path.join(__dirname, '..', '.next', 'static');

// 디렉토리가 존재하는지 확인하고 없으면 생성
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    console.log(`디렉토리 생성: ${directory}`);
    fs.mkdirSync(directory, { recursive: true });
    return true;
  }
  return false;
}

// 파일 복사 함수
function copyFile(source, target) {
  try {
    const fileContent = fs.readFileSync(source);
    fs.writeFileSync(target, fileContent);
    console.log(`파일 복사 완료: ${path.relative(process.cwd(), source)} → ${path.relative(process.cwd(), target)}`);
    return true;
  } catch (error) {
    console.error(`파일 복사 실패: ${source} → ${target}`, error);
    return false;
  }
}

// 디렉토리 복사 함수
function copyDirectory(source, target) {
  if (!fs.existsSync(source)) {
    console.warn(`소스 디렉토리가 존재하지 않음: ${source}`);
    return false;
  }

  ensureDirectoryExists(target);
  
  let count = 0;
  const items = fs.readdirSync(source);
  
  for (const item of items) {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      count += copyDirectory(sourcePath, targetPath);
    } else {
      if (copyFile(sourcePath, targetPath)) {
        count++;
      }
    }
  }
  
  return count;
}

// 메인 실행 함수
function main() {
  console.log('정적 파일 복사 시작...');
  
  ensureDirectoryExists(BUILD_DIR);
  
  const count = copyDirectory(SOURCE_DIR, BUILD_DIR);
  
  console.log(`정적 파일 복사 완료: 총 ${count}개 파일 복사됨`);
}

// 스크립트 실행
main(); 