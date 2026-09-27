# Vercel·Supabase 전환 검사 결과

검사 일자: 2026-09-21
실행 환경: Node.js 24.19.0. 배포 설정은 Node.js 22.x.

## 확인 완료
- `npm install`: 고정 버전 @supabase/supabase-js 2.116.0 및 lockfile 생성 완료.
- `npm test`: 21개 PASS, 0개 FAIL.
- `npm run build`: 성공. 공개 정적 파일은 dist로 복사, API는 Vercel Node 함수로 실행.
- 로컬 HTTP 점검: `/` 200, `/storage.mjs` 200, 설정 없는 `/api/templates` 503과 의도한 한국어 안내.
- 공개 출력에 서버 환경변수 이름/Cloudflare Worker import가 없는 것 확인.
- Supabase SDK 설치본의 signed upload URL과 PUT 동작을 확인하여 직접 업로드 방식과 대조.

## 자동 검사 범위
- 무로그인 새 보관함/HttpOnly 쿠키, 쿠키 변조 거부, 사용자 격리
- 템플릿 3개 생성 → 수정 → 삭제 → 재조회
- 정상 JSON과 손상 JSON/필수누락 JSON 검증
- 20MiB 제한, 잘못된 버전 거부
- 동시 수정 충돌, 응답 유실 후 재시도
- 업로드 URL 재사용이 확정 파일을 변경하지 못하는지
- 저장소 실패 시 이전 데이터 유지
- 이미지 본문이 Vercel API를 거치지 않는지
- 교차 출처 쓰기와 쿠키 없는 쓰기 거부
- provider 오류의 비밀값 노출 방지

## 아직 검증하지 않은 것
Supabase 계정 URL/키가 제공되지 않아 실제 Supabase 프로젝트에 SQL을 실행하거나 실제 버킷에 저장하지 않았습니다. 테스트의 저장소는 메모리 대역이며, 이는 운영 DB/RLS/Storage의 실서비스 검증을 대신하지 않습니다. Vercel 계정에 새 버전을 배포하지 않았습니다. 설정 후 DEPLOY-KO.md의 생성·수정·삭제·새로고침·JSON 테스트와 시크릿 창 접근을 확인해야 합니다.

`public/evidence/`의 기존 12개 극단 입력 및 브라우저 기록은 이전 편집기 검사입니다. 렌더 엔진을 보존했지만, 해당 기록을 새 Supabase 연결 검사로 표시하지 않았습니다.
