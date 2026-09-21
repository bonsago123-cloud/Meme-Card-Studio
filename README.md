# 짤·카드 스튜디오 — Vercel + Supabase

기존 편집 기능을 유지하면서 Cloudflare D1/R2, vinext, Wrangler 의존성을 제거한 버전입니다.

- Vercel: 공개 편집기와 Node.js 저장 API
- Supabase Database: 브라우저별 보관함의 저장 위치와 버전
- Supabase Storage: 이미지와 문구가 포함된 템플릿 JSON
- 사용자 회원가입, Supabase Auth, CAPTCHA는 사용하지 않습니다.
- 첫 방문 시 서버가 무작위 서명 쿠키를 발급합니다. 쿠키를 지우거나 다른 브라우저로 접속하면 별도 보관함입니다. 이전 사이트에서 새 주소로 옮길 때는 JSON 내보내기/가져오기를 사용하세요.

## 가장 먼저

**기존 프로젝트 폴더에 덮어쓰기만 하지 마세요.** 별도 폴더에 압축을 풀어 새 GitHub 저장소로 올리거나, 기존 저장소의 작업 폴더에서 `.git`을 제외한 이전 소스를 백업 후 이 묶음으로 교체하세요. 예전 `app/`, `vite.config.ts`, `pnpm-lock.yaml`, `.openai/`가 남으면 잘못된 프레임워크로 인식될 수 있습니다.

상세 순서는 **DEPLOY-KO.md**를 따르세요.

## 파일

| 파일/폴더 | 역할 |
|---|---|
| `public/index.html`, `public/app.js`, `public/style.css` | 기존 편집 화면 |
| `public/engine.mjs` | 공통 렌더링·JSON 검증 |
| `public/storage.mjs` | Supabase 직접 전송과 저장 확인 |
| `api/templates.js` | Vercel API 진입점 |
| `server/` | 쿠키 검증·저장 처리·Supabase 연결 |
| `supabase/setup.sql` | 테이블·버킷·원자적 저장 함수 생성 |
| `vercel.json` | Vercel 빌드/출력 설정 |
| `.env.example` | 필요한 환경변수 이름과 예시 |
| `tests/` | 저장 실패·동시 수정·격리 검사 |
| `public/evidence/` | 기존 편집기 검사와 완성 이미지 3개 |

## 로컬 실행

Node.js 22 이상을 사용하세요.

```sh
npm ci
```

`.env.example`을 `.env.local`로 복사하고 Supabase 설정값을 입력한 뒤:

```sh
npm run dev
```

`http://localhost:3000`을 엽니다. 설정값이 없어도 이미지 편집·다운로드는 사용할 수 있으며 서버 보관함은 설정 안내 오류를 표시합니다.

```sh
npm test
npm run build
```

`dist/`에는 공개 파일만 복사합니다. 서버 소스·환경변수·SQL은 공개 출력에 들어가지 않습니다.

## 저장 처리

1. Vercel은 현재 쿠키/저장 버전을 확인하고 임시 업로드 URL을 발급합니다.
2. 브라우저가 이미지 포함 JSON을 Supabase로 직접 전송합니다(최대 20MiB).
3. Vercel은 업로드된 JSON 전체를 검증하고 **다른 경로**에 확정 파일을 생성합니다.
4. DB 함수가 현재 버전이 맞는 경우에만 보관함 포인터를 변경합니다. 기존 버전을 덮어쓰는 충돌은 거부합니다.

서명 업로드 URL로 완료된 파일을 다시 바꿀 수 없도록 임시 경로와 확정 경로를 분리했습니다. 비밀 키는 서버 환경변수에서만 읽습니다. 공개 RLS 정책을 추가하지 마세요.

파일 전송 후 브라우저를 닫으면 임시 파일이 남을 수 있습니다. 필요하면 Supabase Storage의 `card-studio/uploads`에서 24시간 이상 지난 임시 파일을 지우세요. **`collections` 폴더는 저장된 템플릿이므로 삭제하지 마세요.** 모든 사용자의 보관함은 같은 서버 서비스 계정이 관리하며, 사용자 구분은 서버가 서명한 쿠키로 이루어집니다.

## 검사와 제출

이번 저장 방식의 검사 범위는 `TEST-RESULTS.md`를 보세요. 기존 `public/evidence`의 브라우저 기록은 이전 배포에서 수행한 기록이며, 새 Supabase 계정으로 연결한 검사인 것처럼 제출하면 안 됩니다. 설정 후 템플릿 3개 생성 → 1개 수정 → 1개 삭제 → 새로고침 유지와 정상/손상 JSON 가져오기를 다시 확인하세요.

제출 URL은 Vercel 공개 Production 주소와 공개 GitHub 전체 커밋 URL입니다. Vercel의 Deployment Protection이 켜져 로그인 화면이 나오면 해당 공개 배포의 보호를 해제한 뒤 시크릿 창에서 확인하세요.

이전 사이트의 보관함은 자동 이전되지 않습니다. 이전 화면에서 JSON 내보내기 → 새 화면에서 JSON 가져오기로 옮기세요.

## 참고한 공식 문서

- https://vercel.com/docs/functions/limitations
- https://vercel.com/docs/functions/runtimes/node-js
- https://supabase.com/docs/guides/storage/uploads/standard-uploads
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/getting-started/api-keys

서비스 요금제나 결제 설정은 이 코드가 변경하지 않습니다.
