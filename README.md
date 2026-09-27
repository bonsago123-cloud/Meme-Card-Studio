# 과제3 제출 패키지

1. `submission/01-submit.txt`: 제출란에 붙여 넣을 문구. 최종 결과물 URL과 확인된 전체 커밋 URL이 입력되어 있습니다.
2. `submission/02-checklist.md`: 과제 조건별 확인 범위와 남은 항목.
3. `submission/03-image-rights.md`: ChatGPT 생성 이미지 활용 및 본인 편집 출처 기록.
4. `dist/submission.html`: 완성본 3장과 검사 링크가 있는 작품 확인 페이지.
5. `dist/examples/`: 사용자가 만든 실제 완성 PNG 3장. 원본 바이트 유지.
6. `verification/`: 과제 원문·현재 자동 검사 결과·이미지 메타데이터 검사·이전 결함 기록.

전체 폴더는 Vercel용 정적 프로젝트입니다. `vercel.json`이 저장소 최상위, 출력 폴더는 dist입니다. 배포·공개 GitHub 커밋 생성은 이번 작업에서 수행하지 않았습니다. 기존 편집 기능은 변경하지 않았으며 완성본과 제출 자료만 정리했습니다.

검사 재실행: `node tests/multi-editor-check.mjs`, `node tests/check.mjs`.
로컬 확인: `python3 -m http.server 8000` 후 `http://localhost:8000/dist/submission.html`.

과제의 필수 제출은 공개 결과물 주소·고정 소스 주소입니다. ZIP은 그 주소를 대신하지 않으며 이미지와 검사는 증거 보관용입니다. 과제 전체 통과를 임의로 표시하지 않았습니다.

확인한 배포 주소: https://meme-card-studio-phye.vercel.app/
확인한 고정 소스: https://github.com/bonsago123-cloud/Meme-Card-Studio/commit/2b75a22c4af6fcfaa551f7702f04ad7f5219b9aa
실행 파일 5개의 바이트 일치는 verification/url-checks.json에 기록했습니다. 제출 문서와 새 완성 예시는 ZIP에만 추가된 보충 자료입니다.
