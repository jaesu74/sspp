/**
 * 배포를 위한 파일을 준비하는 스크립트
 * 배포에 필요한 파일들을 deploy 디렉토리로 복사합니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 디렉토리 경로
const standaloneDir = path.join(__dirname, '../.next/standalone');
const staticDir = path.join(__dirname, '../.next/static');
const publicDir = path.join(__dirname, '../public');
const deployDir = path.join(__dirname, '../deploy');

// 배포 디렉토리 생성
if (!fs.existsSync(deployDir)) {
  console.log(`배포 디렉토리 생성: ${deployDir}`);
  fs.mkdirSync(deployDir, { recursive: true });
}

try {
  console.log('배포 파일 준비 시작...');
  
  // 1. standalone 디렉토리 복사
  console.log('1. standalone 디렉토리 복사 중...');
  execSync(`xcopy "${standaloneDir}" "${deployDir}" /E /I /H /Y`);
  
  // 2. static 디렉토리 복사
  console.log('2. static 디렉토리 복사 중...');
  const deployStaticDir = path.join(deployDir, '.next/static');
  
  if (!fs.existsSync(deployStaticDir)) {
    fs.mkdirSync(deployStaticDir, { recursive: true });
  }
  
  execSync(`xcopy "${staticDir}" "${deployStaticDir}" /E /I /H /Y`);
  
  // 3. public 디렉토리 복사
  console.log('3. public 디렉토리 복사 중...');
  const deployPublicDir = path.join(deployDir, 'public');
  
  if (!fs.existsSync(deployPublicDir)) {
    fs.mkdirSync(deployPublicDir, { recursive: true });
  }
  
  execSync(`xcopy "${publicDir}" "${deployPublicDir}" /E /I /H /Y`);
  
  console.log('배포 파일 준비 완료!');
  console.log(`배포 파일 위치: ${deployDir}`);
  console.log('서버 실행 방법: ');
  console.log('1. 배포 디렉토리로 이동: cd deploy');
  console.log('2. 서버 실행: node server.js');
  
} catch (error) {
  console.error('배포 파일 준비 중 오류 발생:', error);
  process.exit(1);
} 