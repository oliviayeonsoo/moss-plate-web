# moss-plate-web

이끼 플레이트 웹사이트. Figma 러프를 source of truth로 섹션별로 완성해 나간다.
빌드 도구 없이 HTML/CSS만 사용한다. 기준 해상도는 1440px 데스크톱이다.

## 실행

`index.html`을 브라우저로 열면 된다. 로컬 서버를 쓰려면:

```bash
python3 -m http.server 8080
```

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
js/
  seoul-map.js 지도 확대/축소·드래그, 마커 툴팁, 축척
assets/
  icons/       Hero 효과 카드 아이콘 (손그림, 투명 배경 원본)
  map/districts/  서울 25개 구 크레용 지도 (무손실 webp, 구별 레이어)
  partners/    파트너 로고 원본
  partners/trimmed/  여백을 잘라 높이 120px로 줄인 사용본
fonts/         웹폰트 파일 (Y Clover Bold, Y페어링체 Bold, Pretendard Regular·Medium·SemiBold·Bold — woff2)
```

## 섹션 진행 현황

| # | 섹션 | 상태 |
|---|---|---|
| S0 | Hero (좌측 고정 패널) | 완료 |
| S1 | 서울 지도 + 파트너 로고 컨베이어 | 완료 (기관 데이터 입력 필요) |
| S2 | 파트너 로고 | S1에 포함 |
| S3 | 맞춤 도안 컨피규레이터 | 대기 |
| S4 | 사례 갤러리 | 대기 |
| S5 | 팀 소개 배너 | 대기 |
| S6 | 푸터 | 대기 |

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
