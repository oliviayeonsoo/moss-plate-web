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
  tokens.css   색·폰트·레이아웃 토큰 (폰트 교체는 여기서만)
  base.css     reset + 좌측 고정 / 우측 스크롤 2단 뼈대
  hero.css     S0. Hero
assets/
  icons/       Hero 효과 카드 아이콘 (손그림, 투명 배경 원본)
  partners/    파트너 로고 원본 (S2에서 사용 예정)
fonts/         웹폰트 파일을 둘 자리 (현재 비어 있음)
```

## 섹션 진행 현황

| # | 섹션 | 상태 |
|---|---|---|
| S0 | Hero (좌측 고정 패널) | 완료 |
| S1 | 서울 지도 | 대기 |
| S2 | 파트너 로고 | 대기 |
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

폰트는 PC에 설치된 폰트를 family 이름으로 불러온다. 이름이 다르거나 폰트를 바꾸려면
`css/tokens.css`의 해당 스택 맨 앞 이름만 수정하면 된다. 배포용 웹폰트 파일은 `fonts/`에 두고
`@font-face`를 추가한다.

