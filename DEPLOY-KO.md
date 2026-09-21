# 배포 순서 — Supabase 먼저, Vercel 다음

## 1. Supabase 준비

1. 사용할 Supabase 프로젝트를 엽니다.
2. **SQL Editor → New query**에서 `supabase/setup.sql` 내용을 전부 붙여 넣고 실행합니다.
3. 결과에 `card-studio`, `public=false`, `file_size_limit=20971520`이 보이면 생성된 것입니다.

이 SQL은 이 앱의 `card_collections` 테이블과 `card-studio` 비공개 버킷, 저장 함수만 준비합니다. 일반 이용자에게 DB 전체 읽기·쓰기 권한을 주지 않습니다. 별도 Storage 정책이나 Supabase 익명 로그인 설정도 필요하지 않습니다.

프로젝트의 **Connect / Settings → API 또는 API Keys**에서 다음 두 값을 찾습니다(대시보드 배치에 따라 메뉴 이름은 다를 수 있습니다).

- Project URL: `https://프로젝트식별자.supabase.co`
- 서버용 **Secret key** (`sb_secret_...`) 또는 기존 **service_role** 키

`anon`/`publishable` 키는 이 서버용 설정에 사용하지 않습니다. 비밀 키는 GitHub, HTML, 채팅 메시지에 붙여 넣지 말고 Vercel 환경변수에 직접 입력하세요.

## 2. GitHub에 새 소스 올리기

1. 이 압축을 풉니다. `package.json`, `vercel.json`, `public`, `api`, `supabase`가 같은 최상위 폴더에 있어야 합니다.
2. 새 저장소에 이 폴더의 **내용 전체**를 올립니다. 기존 저장소를 사용하면 이전 프레임워크 파일을 남겨두지 마세요. `public` 폴더만 올리면 저장 API가 작동하지 않습니다.
3. 공개 소스 제출이 필요하므로 저장소를 Public으로 준비합니다. `.env.local`은 올리지 않습니다.

## 3. Vercel에 연결

Vercel에서 **Add New → Project → GitHub 저장소 Import**를 선택합니다.

| 항목 | 값 |
|---|---|
| Framework Preset | Other |
| Root Directory | `package.json`이 있는 폴더. 보통 기본값 |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm ci` |
| Node.js Version | 22.x |

위 빌드/출력 값은 `vercel.json`에도 포함되어 있습니다. 기존 Vercel 프로젝트를 재사용하면 예전 Next.js/vinext 설정과 Root Directory를 확인해주세요.

## 4. 환경변수 세 개

Vercel의 프로젝트 **Settings → Environment Variables**(처음 Import 화면에서도 가능)에 아래 이름을 정확히 입력합니다.

| Name | Value |
|---|---|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SECRET_KEY` | 서버용 Secret key 또는 service_role 키 |
| `SESSION_SECRET` | 새로 생성한 충분히 긴 무작위 문자열 |

`SESSION_SECRET`은 Node.js가 있는 PC의 터미널에서 다음 명령으로 만들 수 있습니다.

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

출력된 64자리 문자열을 값으로 넣습니다. 프로젝트 이름이나 예제 문자열을 그대로 사용하지 마세요. 나중에 이 값을 바꾸면 이전 보관함 쿠키가 무효화되므로 기존 사용자는 JSON 백업이 있어야 복원할 수 있습니다.

Production에 세 값을 설정하고 **Deploy**합니다. 이미 배포한 뒤 값을 추가했다면 **Redeploy**해야 합니다. Preview에서도 테스트하려면 해당 환경에도 설정합니다.

## 5. 배포 후 확인

1. Vercel Production 주소를 열어 편집기가 나오는지 확인합니다.
2. 이름을 바꿔 템플릿 3개를 저장합니다. 하나를 불러와 수정하고, 하나를 삭제한 다음 새로고침합니다.
3. 나머지 2개와 수정 내용이 유지되면 저장 연결이 된 것입니다.

추가로 하단의 **완성 카드 · 검사 기록**에서 제공하는 PNG/JPEG, 정상 JSON, 손상 JSON, 필수 누락 JSON으로 확인하세요. 잘못된 JSON 후에는 기존 목록 개수가 바뀌면 안 됩니다.

새 시크릿 창에서 로그인·CAPTCHA 없이 편집기가 열려야 합니다. 시크릿 창의 템플릿 목록이 비어 있는 것은 정상입니다. 보관함이 브라우저 쿠키별로 구분되기 때문입니다. Vercel 로그인 화면이 보이면 공개 배포의 Deployment Protection을 확인하세요.

## 오류별 확인

| 화면의 증상 | 확인할 곳 |
|---|---|
| 템플릿 저장 설정이 완료되지 않음 | 환경변수 이름·값, Redeploy 여부 |
| 보관함 연결 실패 | Supabase 프로젝트 상태, SQL 실행, 서버용 키 사용 여부 |
| 이미지 전송 실패 | `card-studio` 버킷 존재, 프로젝트 저장 한도, 네트워크 |
| 다른 창에서 목록이 바뀜 | 현재 목록을 JSON으로 보관한 뒤 새로고침 |
| 새 주소에서 이전 템플릿이 안 보임 | 이전 사이트에서 JSON 내보내기 후 가져오기 |
| 배포 404 또는 예전 화면 | Root Directory, 이전 프레임워크 설정, 최신 커밋 배포 여부 |

## 제출문

결과물 주소: [실제 Vercel Production 주소]

소스 주소: `https://github.com/소유자/저장소/commit/전체커밋번호`

어디로 가나요: 위 결과물 주소의 편집기 첫 화면.

무엇을 하나요: 1) PNG/JPEG를 불러옵니다. 2) 문구·크기·색·위치와 화면비를 바꿉니다. 3) 이미지를 내려받습니다.

무엇이 보이면 통과: 미리보기와 저장 이미지의 위치·줄바꿈·잘림이 같습니다.

안 될 때: 오류 사유가 표시되며 기존 편집과 템플릿이 유지됩니다.

AI에게 맡긴 일: Vercel·Supabase용 코드 전환, SQL과 저장 검증, 테스트 작성.

내가 직접 판단한 일: [본인이 실제로 선택하고 확인한 내용을 작성]

AI 제안을 따르지 않은 일: [실제 사례 또는 없었다면 그 이유 작성]
