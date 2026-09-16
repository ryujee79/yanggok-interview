# yanggok-interview

양곡고 2027 제시문 면접 지도 일정의 GitHub Pages 버전입니다.

## 구성
- `index.html` : 교사/학생 일정 조회
- `admin.html` : 최종 엑셀과 ZIP을 브라우저에서 암호화해 배포용 파일로 만드는 도구
- `data/schedule.enc.json` : 암호화된 일정 데이터
- `assets/*.enc.json` : 암호화된 사용/미사용 지문 ZIP
- `.github/workflows/pages.yml` : GitHub Pages 자동 배포

## 개인정보 보호
저장소가 공개되어 있으므로 원본 엑셀이나 원본 ZIP/PDF를 저장소에 올리지 않습니다.
`admin.html`에서 접속암호로 암호화한 `.enc.json` 파일만 올립니다. 접속암호는 저장소에 기록하지 않습니다.

## GitHub Pages 최초 설정
Repository `Settings` → `Pages` → `Build and deployment` → `Source`를 **GitHub Actions**로 선택합니다.
이후 main 브랜치가 바뀔 때마다 Pages가 자동 배포됩니다.

예상 주소:
`https://ryujee79.github.io/yanggok-interview/`

## 자료 갱신
1. 배포된 사이트의 `/admin.html`을 엽니다.
2. 현재 접속암호를 입력합니다.
3. 새 최종 엑셀을 선택해 `schedule.enc.json`을 만듭니다.
4. 사용/미사용 ZIP도 각각 암호화 파일로 만듭니다.
5. GitHub에서 기존 파일을 같은 이름으로 교체합니다.
6. main 브랜치 변경 후 GitHub Pages가 자동 재배포됩니다.

원본 파일은 GitHub에 직접 올리지 마세요.
