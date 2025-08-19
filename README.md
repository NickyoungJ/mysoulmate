# 텔레그램 AI 여자친구 챗봇 💕

Vercel과 OpenAI ChatGPT를 활용한 텔레그램 AI 여자친구 챗봇입니다.

## 🚀 기능

- 텔레그램을 통한 자연스러운 대화
- 다정하고 애교 많은 여자친구 페르소나
- 서버리스 아키텍처로 24시간 응답
- OpenAI GPT-4o-mini 모델 사용

## 📋 설정 방법

### 1. 텔레그램 봇 생성

1. 텔레그램에서 [@BotFather](https://t.me/BotFather)와 대화
2. `/newbot` 명령어 입력
3. 봇 이름과 사용자명 설정
4. 발급받은 토큰을 저장

### 2. OpenAI API 키 발급

1. [OpenAI 웹사이트](https://platform.openai.com/)에서 계정 생성
2. API Keys 섹션에서 새 키 생성
3. 발급받은 키를 저장

### 3. 환경 변수 설정

`.env.example` 파일을 참고하여 `.env.local` 파일 생성:

```bash
cp .env.example .env.local
```

그리고 실제 값들로 수정:

```env
OPENAI_API_KEY=sk-your-actual-openai-key
TELEGRAM_BOT_TOKEN=your-actual-bot-token
```

### 4. 의존성 설치

```bash
npm install
```

### 5. 로컬 개발 서버 실행

```bash
npm run dev
```

### 6. Vercel 배포

```bash
npm run deploy
```

### 7. 텔레그램 Webhook 설정

배포 완료 후, 다음 URL로 GET 요청을 보내 webhook을 설정합니다:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-vercel-app.vercel.app/api/webhook
```

## 🏗️ 프로젝트 구조

```
girlfriend/
├── api/
│   └── webhook.js          # 메인 webhook 핸들러
├── package.json            # 프로젝트 설정 및 의존성
├── vercel.json            # Vercel 배포 설정
├── .env.example           # 환경 변수 예시
├── .gitignore            # Git 무시 파일
└── README.md             # 프로젝트 문서
```

## 💡 사용법

1. 텔레그램에서 생성한 봇을 찾아 대화 시작
2. 아무 메시지나 보내면 AI 여자친구가 응답합니다
3. 자연스럽게 대화를 즐기세요! 💕

## 🔧 커스터마이징

`api/webhook.js` 파일에서 페르소나를 수정할 수 있습니다:

- `system` 메시지의 내용을 변경하여 성격 조정
- `temperature` 값을 조정하여 응답의 창의성 조절
- `max_tokens` 값을 조정하여 응답 길이 조절

## 📊 비용 안내

- **Vercel**: 무료 플랜으로 충분 (월 100GB 대역폭, 100GB-hrs 실행 시간)
- **OpenAI**: 사용량에 따라 과금 (GPT-4o-mini는 상대적으로 저렴)
- **텔레그램**: 무료

## ⚠️ 주의사항

- 환경 변수를 절대 공개 저장소에 업로드하지 마세요
- OpenAI API 사용량을 모니터링하세요
- 텔레그램 메시지는 최대 4096자까지 가능합니다

## 🤝 기여

버그 리포트나 기능 제안은 언제든 환영합니다!

## 📄 라이선스

MIT License
