# moss-plate-web

이끼 플레이트 웹사이트. Figma 러프를 source of truth로 섹션별로 완성해 나간다.
빌드 도구 없이 HTML/CSS/JS만 사용한다. 기준 해상도는 1440px 데스크톱이다.
의존성은 S3 도안 생성 엔진용 `manifold-3d@3.5.4` 하나뿐이다 (번들러 없음, importmap으로 로컬 경로 연결).

## 실행

```bash
npm install                  # manifold-3d 설치 (처음 한 번)
python3 -m http.server 8080  # → http://localhost:8080
npm test                     # S3 엔진 검증 (브라우저 없이)
```

S3가 ES 모듈 + WASM이라 `index.html`을 파일로 직접 열면(file://) S3가 동작하지 않는다.
나머지 섹션은 파일로 열어도 동작한다. 배포 시 `node_modules/manifold-3d/manifold.js`와
`manifold.wasm`이 같은 경로로 함께 올라가야 한다 (Pages 워크플로가 자동으로 넣는다).

## 배포 (GitHub Pages)

주소: https://oliviayeonsoo.github.io/moss-plate-web/

`main`에 푸시하면 `.github/workflows/pages.yml`이 자동으로 배포한다.
manifold-3d 설치(`npm ci`) → 엔진 테스트(`npm test`) → 사이트 파일과 manifold 파일 2개를 모아 Pages에 올린다.
테스트가 실패하면 배포하지 않는다. 처음 한 번은 저장소 Settings → Pages → Source를 **GitHub Actions**로 설정해야 한다.

## 구조

```
index.html
css/
  fonts.css    @font-face (프로젝트에 포함된 웹폰트)
  tokens.css   색·폰트·레이아웃 토큰 (폰트 교체는 여기서만)
  base.css     reset + 좌측 고정 / 우측 스크롤 2단 뼈대
  hero.css     S0. Hero
  section.css  우측 섹션 공통 제목/부제
  map.css      S1. 서울 지도 + 파트너 로고 컨베이어
  configurator.css  S3. 맞춤 도안 만들기
  cases.css    S4. 사례 갤러리
  team-banner.css  S5. 팀 소개 배너
  footer.css   S6. 푸터
js/
  seoul-map.js 지도 확대/축소·드래그, 마커 툴팁, 축척
  lib/moss/moss-engine.js  S3 도안 생성 엔진 (원본 번들 그대로, 수정 금지)
  configurator/app.js      S3 화면 ↔ 엔진 연결
  cases/            S4 (cases-data.js: 카드 데이터, cases.js: 렌더 + 캐러셀)
  site/             S5·S6 링크와 팀 사진 경로 (site-config.js) + 적용 스크립트
assets/
  icons/       Hero 효과 카드 아이콘 (손그림, 투명 배경 원본)
  map/districts/  서울 25개 구 크레용 지도 (무손실 webp, 구별 레이어)
  partners/    파트너 로고 원본
  partners/trimmed/  여백을 잘라 높이 120px로 줄인 사용본
  team/        S5 팀 사진 (team-photo.webp, 1800px)
fonts/         웹폰트 파일 (Y Clover Bold, Y페어링체 Regular·Bold, Pretendard Regular·Medium·SemiBold·Bold — woff2)
```

## 섹션 진행 현황

| # | 섹션 | 상태 |
|---|---|---|
| S0 | Hero (좌측 고정 패널) | 완료 |
| S1 | 서울 지도 + 파트너 로고 컨베이어 | 완료 (기관 데이터 입력 필요) |
| S2 | 파트너 로고 | S1에 포함 |
| S3 | 맞춤 도안 만들기 | 러프 화면 + 3피스 도안 생성 엔진 연결 완료 |
| S4 | 사례 갤러리 (캐러셀) | 완료 (이미지·실제 문구 입력 필요) |
| S5 | 팀 소개 배너 | 완료 |
| S6 | 푸터 | 완료 (링크 주소 입력 필요) |

## 폰트

| 역할 | 토큰 | 폰트 |
|---|---|---|
| 로고타입 | `--font-logo` | Y Clover Bold |
| 부제·CTA·카드 문구·섹션 헤드라인 | `--font-display` | Y Pairing Font Bold |
| 소속 표기·본문·라벨·링크 | `--font-body` | Pretendard Regular |

Y페어링체는 `fonts/`의 파일을 `css/fonts.css`에서 직접 연결한다. 원본 TTF의 내부 family명이
`YPairingFont  Bd`이고 굵기값이 400이라, 설치 폰트 이름에 기대면 Bold가 적용되지 않기 때문이다.
Y Clover와 Pretendard도 같은 방식으로 연결한다. 세 폰트 모두 프로젝트에 포함되어 있어
PC 설치 여부와 관계없이 같은 결과가 나온다. Pretendard Thin은 쓰는 곳이 없어 포함하지 않았다.
폰트를 바꾸려면 `css/tokens.css`의 해당 스택과 `css/fonts.css`를 수정한다.

## 서울 지도 기관 정보 수정

마커는 `index.html`의 `.seoul-map__marker` 버튼이다. 툴팁 내용은 버튼의 속성에서 읽는다.

| 속성 | 내용 |
|---|---|
| `data-name` | 기관명 (툴팁 제목) |
| `data-address` / `data-address2` | 주소 1줄 / 2줄 |
| `data-href` | 화살표 버튼 링크 |
| `data-default` | 처음 열려 있는 마커 (현재 강동구) |
| `data-placeholder` | 정보가 아직 없는 마커 표시용. 정보를 넣으면 지운다 |

마커 위치(`left`/`top` %)는 지도 원본 좌표 기준이라 확대해도 구 위에 고정된다.

## 맞춤 도안 만들기 (S3)

화면은 Figma 러프 그대로, 로직은 `js/lib/moss/moss-engine.js`(이끼 플레이트 3피스 생성 엔진)다.
엔진은 원본 번들(`src/core/{params,validate,geometry,stl}.js` → `npm run bundle`)을 수정 없이 복사한 것이고,
계산은 전부 사용자 브라우저에서 manifold-3d(WASM)로 한다. 서버·외부 API·외부 3D 서비스 없음.

`js/configurator/app.js`가 화면과 엔진을 잇는다.

| 화면 | 엔진 키 | 비고 |
|---|---|---|
| 위쪽 가로 화살표 입력 | `width` | 설치 공간 가로 |
| 왼쪽 세로 화살표 입력 | `depth` | 설치 공간 세로 |
| 오른쪽 위 입력 | `rearGap` | 세면대 뒤 공간 (0 또는 2cm 이상) |
| 오른쪽 아래 입력 | `sideGap` | 세면대 옆 공간 (0 또는 2cm 이상) |

- 화면은 cm, 엔진은 mm라서 `FIELDS[i].scale`(10)을 곱해 넘긴다. 기본값은 `DEFAULTS`(47 / 18 / 9 / 15 cm).
- 앱이 뜰 때 `initGeometry()` 1회. wasm은 `manifold.js` 옆에서 자동으로 찾는다(`locateFile` 불필요).
- 값이 바뀔 때마다 `validate()`. `errors`는 해당 칸 근처에 문구 + 칩 주황 + 버튼 막힘, `warnings`는 문구만.
  가로·세로 문구는 칩 근처 전용 자리, 뒤·옆 문구는 기존 안내 문구 자리에 표시되고 없어지면 안내 문구로 돌아간다.
- `stl 파일 생성하기` → `buildPieces()` → `downloadAll()`. 조각이 여러 개면 ZIP 하나(`moss_47x18cm_3pieces.zip`),
  하나면 STL 하나로 받아진다.
- 화면에 3D 미리보기 자리가 없어서 pieces 데이터는 다운로드에만 쓴다.
- `npm test`(`test/engine.test.mjs`)는 기본값 3조각·옆 공간 0 → 1조각·뒤 공간 1 → 에러·빈칸 → 에러와
  메시 닫힘·STL/ZIP 구조를 검사한다. (원본 `test/core.test.mjs`는 받지 못해서 이식 확인용으로 새로 작성)

## 사례 갤러리 카드 추가/수정 (S4)

`js/cases/cases-data.js`의 `window.MOSS_CASES` 배열만 고친다.

```js
{ image: 'assets/cases/파일명.webp', title: '기관명/장소', description: '짧은 설명', link: '' }
```

- `image`를 비우면 같은 크기의 회색 자리가 표시된다. 이미지는 카드 틀(224×175)에 맞춰 잘려 보인다(`object-fit: cover`).
- `link`가 있으면 카드 전체가 링크가 된다. `alt`(선택)가 없으면 `title`을 대체 텍스트로 쓴다.
- 한 화면에 3장이 보이고, 좌우 버튼으로 한 장씩 순환한다. 3장 미만이면 버튼이 숨겨진다.

## 링크·팀 사진 설정 (S5, S6)

`js/site/site-config.js`의 `window.MOSS_SITE`만 고친다.

- `links`: `teamHomepage`, `email`, `instagram`, `x`, `linkedin`, `terms`, `privacy`.
  `#`이면 연결 전이다. `email`은 `mailto:`로 연결되고 화면 표시도 이 값을 따른다.
  `http(s)://` 주소는 새 탭으로 열린다.
- `images.teamPhoto`: S5 팀 사진 경로. 파일이 없거나 불러오지 못하면 CSS 점선 격자 배경만 보인다.
  사진은 점선 격자 배경이 포함된 통사진이고, 배너를 폭에 맞춰 채우며 아래 기준으로 잘린다(`object-fit: cover`).
  러프의 어두운 톤은 사진 위 반투명 막(`.team-banner__shade`, rgba(49,49,49,.36))이다.

## 공통 간격 규칙

`css/tokens.css`의 값 하나로 우측 콘텐츠 전체 간격을 관리한다.

| 토큰 | 값 | 적용 |
|---|---|---|
| `--section-gap` | 120px | 섹션(푸터 포함) 사이 간격. `base.css`의 `.content > * + *` 한 곳에서만 만든다 |
| `--content-pad-x` | 72px | S1·S3·S4 좌우 여백 |
| `--banner-pad-x` | 48px | S5 팀 배너만 러프대로 더 넓게 (72로 바꾸면 다른 섹션과 같아진다) |

새 섹션을 추가할 때는 섹션 자체에 위아래 여백을 주지 않고, `<main class="content">` 안에 순서대로 넣으면 간격이 자동으로 맞는다.
