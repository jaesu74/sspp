/**
 * XML 데이터를 JSON으로 변환하는 스크립트
 * 
 * 다양한 소스(UN, EU, US 등)의 XML 형식 제재 데이터를 표준화된 JSON 형식으로 변환합니다.
 * 명령줄 인수:
 *   --input: 입력 XML 파일 경로
 *   --output: 출력 JSON 파일 경로
 *   --source: 데이터 소스 (un, eu, us 등)
 * 
 * 사용 예:
 *   node xml-to-json-converter.js --input=data/temp/un_raw.xml --output=data/temp/un.json --source=un
 */

const fs = require('fs');
const path = require('path');
const { DOMParser } = require('xmldom');
const xpath = require('xpath');
const minimist = require('minimist');

// 명령줄 인수 파싱
const args = minimist(process.argv.slice(2));
const inputFile = args.input;
const outputFile = args.output;
const source = args.source;

// 필수 인수 확인
if (!inputFile || !outputFile || !source) {
  console.error('오류: 필수 인수가 누락되었습니다.');
  console.error('사용법: node xml-to-json-converter.js --input=<입력_파일> --output=<출력_파일> --source=<소스>');
  process.exit(1);
}

// 소스별 매핑 설정
const sourceConfigs = {
  un: {
    rootXPath: '//CONSOLIDATED_LIST/INDIVIDUALS/INDIVIDUAL | //CONSOLIDATED_LIST/ENTITIES/ENTITY',
    idPath: './@DATAID',
    namePath: './FIRST_NAME | ./NAME_ORIGINAL',
    aliasesPath: './INDIVIDUAL_ALIAS/ALIAS_NAME | ./ENTITY_ALIAS/ALIAS_NAME',
    typePath: 'local-name(.)',
    countryPath: './NATIONALITY/VALUE | ./COUNTRY/VALUE',
    birthdatePath: './INDIVIDUAL_DATE_OF_BIRTH/DATE',
    addressPath: './INDIVIDUAL_ADDRESS/NOTE | ./ENTITY_ADDRESS/NOTE',
    programPath: './UN_LIST_TYPE',
    documentPath: './INDIVIDUAL_DOCUMENT/TYPE_OF_DOCUMENT | ./INDIVIDUAL_DOCUMENT/NUMBER',
    formatFn: unFormatEntity
  },
  eu: {
    rootXPath: '//sanctionEntity',
    idPath: './referenceNumber',
    namePath: './nameAlias[isPrimary="true"]/wholeName',
    aliasesPath: './nameAlias[isPrimary="false"]/wholeName',
    typePath: './subjectType/classificationCode',
    countryPath: './citizenship/countryDescription | ./residenceCountry/countryDescription',
    birthdatePath: './birthdate/birthdate',
    addressPath: './address/street | ./address/city | ./address/country',
    programPath: './regulation/publicationDate',
    documentPath: './identification/identificationTypeCode | ./identification/identificationTypeDescription | ./identification/number',
    formatFn: euFormatEntity
  },
  us: {
    rootXPath: '//sdnEntry',
    idPath: './uid',
    namePath: './firstName | ./lastName',
    aliasesPath: './aka/firstName | ./aka/lastName',
    typePath: './sdnType',
    countryPath: './address/country | ./nationality/country',
    birthdatePath: './dateOfBirthItem/dateOfBirth',
    addressPath: './address/address1 | ./address/city | ./address/country',
    programPath: './programList/program',
    documentPath: './idList/id/idType | ./idList/id/idNumber',
    formatFn: usFormatEntity
  }
};

// 메인 함수 - XML을 JSON으로 변환
async function convertXmlToJson() {
  try {
    console.log(`XML 파일 읽기: ${inputFile}`);
    
    if (!fs.existsSync(inputFile)) {
      throw new Error(`입력 파일을 찾을 수 없습니다: ${inputFile}`);
    }
    
    const xmlContent = fs.readFileSync(inputFile, 'utf8');
    
    // XML 파서 설정 (오류 무시하는 핸들러)
    const parserOptions = {
      errorHandler: {
        warning: function(w) { /* 경고 무시 */ },
        error: function(e) { console.error(`XML 파싱 오류 (무시됨): ${e}`); },
        fatalError: function(e) { console.error(`XML 파싱 치명적 오류: ${e}`); }
      }
    };
    
    console.log('XML 파싱 중...');
    const doc = new DOMParser(parserOptions).parseFromString(xmlContent);
    
    // 해당 소스의 설정 가져오기
    const config = sourceConfigs[source];
    if (!config) {
      throw new Error(`알 수 없는 데이터 소스: ${source}`);
    }
    
    // XPath로 엔티티 노드 추출
    console.log('데이터 추출 중...');
    const entities = xpath.select(config.rootXPath, doc);
    console.log(`추출된 엔티티 수: ${entities.length}`);
    
    // 엔티티를 JSON 형식으로 변환
    const result = [];
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      
      // 진행 상황 로깅 (10% 단위)
      if (entities.length > 100 && i % Math.floor(entities.length / 10) === 0) {
        console.log(`변환 진행률: ${Math.round(i / entities.length * 100)}%`);
      }
      
      try {
        // 소스별 형식 함수 사용하여 변환
        const jsonEntity = config.formatFn(entity, config);
        if (jsonEntity) {
          result.push(jsonEntity);
        }
      } catch (error) {
        console.error(`엔티티 변환 중 오류 (인덱스 ${i}): ${error.message}`);
      }
    }
    
    // 메타데이터 추가
    const finalOutput = {
      source: source.toUpperCase(),
      lastUpdated: new Date().toISOString(),
      count: result.length,
      data: result
    };
    
    // 출력 디렉토리 확인 및 생성
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // JSON 파일로 저장
    console.log(`JSON 파일 저장 중: ${outputFile}`);
    fs.writeFileSync(outputFile, JSON.stringify(finalOutput, null, 2));
    
    console.log(`변환 완료: ${result.length}개 항목이 ${outputFile}에 저장되었습니다.`);
    return true;
  } catch (error) {
    console.error(`XML에서 JSON으로의 변환 중 오류 발생: ${error.message}`);
    if (error.stack) console.error(error.stack);
    return false;
  }
}

// UN 소스 데이터 형식 변환 함수
function unFormatEntity(entity, config) {
  const getNodeValue = (xpathExpr) => {
    const nodes = xpath.select(xpathExpr, entity);
    if (nodes.length === 0) return null;
    return nodes[0].nodeValue || nodes[0].textContent;
  };
  
  const getNodesValues = (xpathExpr) => {
    const nodes = xpath.select(xpathExpr, entity);
    return nodes.map(node => node.nodeValue || node.textContent).filter(Boolean);
  };
  
  // 기본 정보 추출
  const id = getNodeValue(config.idPath) || `UN-${Math.random().toString(36).substr(2, 9)}`;
  const name = getNodeValue(config.namePath);
  const entityType = getNodeValue(config.typePath) === 'INDIVIDUAL' ? 'individual' : 'entity';
  
  // 국가 정보
  const countries = getNodesValues(config.countryPath);
  
  // 별칭 정보
  const aliases = getNodesValues(config.aliasesPath);
  
  // 생년월일(개인) 또는 설립일(단체)
  const birthDate = getNodeValue(config.birthdatePath);
  
  // 주소 정보
  const addresses = getNodesValues(config.addressPath).map(addr => ({
    text: addr
  }));
  
  // 제재 프로그램
  const programs = getNodesValues(config.programPath);
  
  // 식별 문서 (여권, ID 등)
  const docTypes = getNodesValues(`${config.documentPath}[1]`);
  const docNumbers = getNodesValues(`${config.documentPath}[2]`);
  
  const identifiers = [];
  for (let i = 0; i < Math.min(docTypes.length, docNumbers.length); i++) {
    identifiers.push({
      type: docTypes[i],
      value: docNumbers[i]
    });
  }
  
  // 표준화된 형식으로 변환
  return {
    id,
    source: 'UN',
    name: name || '(이름 없음)',
    nameOriginal: name,
    type: entityType,
    subtype: entityType === 'individual' ? 'person' : 'organization',
    countries: countries,
    aliases: aliases.map(alias => ({ name: alias })),
    birthDate,
    addresses,
    programs,
    identifiers,
    listingDate: new Date().toISOString().split('T')[0],
    lastUpdated: new Date().toISOString()
  };
}

// EU 소스 데이터 형식 변환 함수
function euFormatEntity(entity, config) {
  const getNodeValue = (xpathExpr) => {
    const nodes = xpath.select(xpathExpr, entity);
    if (nodes.length === 0) return null;
    return nodes[0].nodeValue || nodes[0].textContent;
  };
  
  const getNodesValues = (xpathExpr) => {
    const nodes = xpath.select(xpathExpr, entity);
    return nodes.map(node => node.nodeValue || node.textContent).filter(Boolean);
  };
  
  // 기본 정보 추출
  const id = getNodeValue(config.idPath) || `EU-${Math.random().toString(36).substr(2, 9)}`;
  const name = getNodeValue(config.namePath);
  
  // 엔티티 타입
  const typeCode = getNodeValue(config.typePath);
  const entityType = typeCode === 'P' ? 'individual' : 'entity';
  
  // 국가 정보
  const countries = getNodesValues(config.countryPath);
  
  // 별칭 정보
  const aliases = getNodesValues(config.aliasesPath);
  
  // 생년월일(개인) 또는 설립일(단체)
  const birthDate = getNodeValue(config.birthdatePath);
  
  // 주소 정보
  const streets = getNodesValues(`${config.addressPath}[1]`);
  const cities = getNodesValues(`${config.addressPath}[2]`);
  const addressCountries = getNodesValues(`${config.addressPath}[3]`);
  
  const addresses = [];
  for (let i = 0; i < Math.max(streets.length, cities.length, addressCountries.length); i++) {
    addresses.push({
      street: streets[i] || '',
      city: cities[i] || '',
      country: addressCountries[i] || ''
    });
  }
  
  // 제재 프로그램
  const programs = getNodesValues(config.programPath);
  
  // 식별 문서 (여권, ID 등)
  const docTypes = getNodesValues(`${config.documentPath}[1]`);
  const docDescs = getNodesValues(`${config.documentPath}[2]`);
  const docNumbers = getNodesValues(`${config.documentPath}[3]`);
  
  const identifiers = [];
  for (let i = 0; i < Math.min(docTypes.length, docNumbers.length); i++) {
    identifiers.push({
      type: docTypes[i],
      description: docDescs[i],
      value: docNumbers[i]
    });
  }
  
  // 표준화된 형식으로 변환
  return {
    id,
    source: 'EU',
    name: name || '(이름 없음)',
    nameOriginal: name,
    type: entityType,
    subtype: entityType === 'individual' ? 'person' : (typeCode === 'V' ? 'vessel' : 'organization'),
    countries,
    aliases: aliases.map(alias => ({ name: alias })),
    birthDate,
    addresses,
    programs,
    identifiers,
    listingDate: new Date().toISOString().split('T')[0],
    lastUpdated: new Date().toISOString()
  };
}

// US 소스 데이터 형식 변환 함수
function usFormatEntity(entity, config) {
  const getNodeValue = (xpathExpr) => {
    const nodes = xpath.select(xpathExpr, entity);
    if (nodes.length === 0) return null;
    return nodes[0].nodeValue || nodes[0].textContent;
  };
  
  const getNodesValues = (xpathExpr) => {
    const nodes = xpath.select(xpathExpr, entity);
    return nodes.map(node => node.nodeValue || node.textContent).filter(Boolean);
  };
  
  // 기본 정보 추출
  const id = getNodeValue(config.idPath) || `US-${Math.random().toString(36).substr(2, 9)}`;
  const firstName = getNodeValue(`${config.namePath}[1]`);
  const lastName = getNodeValue(`${config.namePath}[2]`);
  const name = [firstName, lastName].filter(Boolean).join(' ');
  
  // 엔티티 타입
  const typeValue = getNodeValue(config.typePath);
  const entityType = typeValue === 'Individual' ? 'individual' : 'entity';
  
  // 국가 정보
  const countries = getNodesValues(config.countryPath);
  
  // 별칭 정보 (첫째 이름과 성을 결합)
  const akaFirstNames = getNodesValues(`${config.aliasesPath}[1]`);
  const akaLastNames = getNodesValues(`${config.aliasesPath}[2]`);
  
  const aliases = [];
  for (let i = 0; i < Math.max(akaFirstNames.length, akaLastNames.length); i++) {
    const akaName = [akaFirstNames[i], akaLastNames[i]].filter(Boolean).join(' ');
    if (akaName) {
      aliases.push({ name: akaName });
    }
  }
  
  // 생년월일(개인) 또는 설립일(단체)
  const birthDate = getNodeValue(config.birthdatePath);
  
  // 주소 정보
  const streetAddresses = getNodesValues(`${config.addressPath}[1]`);
  const cities = getNodesValues(`${config.addressPath}[2]`);
  const addressCountries = getNodesValues(`${config.addressPath}[3]`);
  
  const addresses = [];
  for (let i = 0; i < Math.max(streetAddresses.length, cities.length, addressCountries.length); i++) {
    addresses.push({
      street: streetAddresses[i] || '',
      city: cities[i] || '',
      country: addressCountries[i] || ''
    });
  }
  
  // 제재 프로그램
  const programs = getNodesValues(config.programPath);
  
  // 식별 문서 (여권, ID 등)
  const docTypes = getNodesValues(`${config.documentPath}[1]`);
  const docNumbers = getNodesValues(`${config.documentPath}[2]`);
  
  const identifiers = [];
  for (let i = 0; i < Math.min(docTypes.length, docNumbers.length); i++) {
    identifiers.push({
      type: docTypes[i],
      value: docNumbers[i]
    });
  }
  
  // 표준화된 형식으로 변환
  return {
    id,
    source: 'US',
    name: name || '(이름 없음)',
    nameOriginal: name,
    type: entityType,
    subtype: entityType === 'individual' ? 'person' : typeValue,
    countries,
    aliases,
    birthDate,
    addresses,
    programs,
    identifiers,
    listingDate: new Date().toISOString().split('T')[0],
    lastUpdated: new Date().toISOString()
  };
}

// 스크립트 실행
convertXmlToJson(); 