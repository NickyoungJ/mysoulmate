# 🧠 지능형 AI 여자친구 챗봇 💕

30대 직장인 여성 캐릭터와 감정 인식, 관계 발전 시스템을 갖춘 지능형 텔레그램 AI 여자친구 챗봇입니다.

## ✨ 주요 기능

### 🎭 **지능형 캐릭터 시스템**
- **30대 직장인 여성** 페르소나 (운동, 자기계발 좋아함)
- **5단계 관계 발전**: 처음만남 → 친구 → 썸 → 연인 → 오래된연인
- **자연스러운 관계 변화**: AI가 대화 패턴을 분석하여 자동으로 관계 발전 제안

### 🧠 **실시간 감정 분석**
- **12가지 감정 인식**: 기쁨, 슬픔, 분노, 불안, 피곤, 설렘, 스트레스, 만족, 우울, 흥미, 놀람, 실망
- **감정 강도 측정**: 1-10 단계로 정밀 분석
- **맞춤형 반응**: 감정에 따른 적절한 공감/위로/격려/축하

### 💭 **완전한 메모리 시스템**
- **대화 기억**: 모든 대화 내용과 맥락 기억
- **사용자 정보 기억**: 이름, 취향, 습관, 중요한 개인 정보
- **감정 히스토리**: 과거 감정 패턴 기억 및 활용
- **관계 발전 기록**: 관계 변화 과정 추적

### 🔍 **관계 추론 엔진**
- **자동 분석**: 대화 패턴, 친밀도, 감정 변화 분석
- **자연스러운 확인**: "우리 요즘 많이 친해진 것 같지 않아?" 같은 자연스러운 질문
- **점진적 발전**: 사용자와의 관계를 단계적으로 발전시킴

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
# OpenAI API 키
OPENAI_API_KEY=sk-your-actual-openai-key

# 텔레그램 봇 토큰
TELEGRAM_BOT_TOKEN=your-actual-bot-token

# Supabase 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-key
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
│   └── webhook.js              # 메인 webhook 핸들러 (감정+관계 분석 통합)
├── lib/
│   ├── supabase.js            # 데이터베이스 연결 및 기본 CRUD
│   ├── emotionTracker.js      # 감정 분석 및 추적 시스템
│   └── relationshipAnalyzer.js # 관계 상태 추론 엔진
├── supabase/
│   ├── schema.sql             # 기본 테이블 스키마
│   ├── relationship_schema.sql # 관계 분석 테이블
│   └── emotion_schema.sql     # 감정 추적 테이블
├── docs/
│   ├── PRD.md                 # 제품 요구사항 문서
│   └── ERD.md                 # 데이터베이스 설계 문서
├── package.json               # 프로젝트 설정 및 의존성
├── vercel.json               # Vercel 배포 설정
├── .env.example              # 환경 변수 예시
└── README.md                 # 프로젝트 문서
```

## 💡 사용법

1. **텔레그램에서 봇 시작**: 생성한 봇을 찾아 대화 시작
2. **자연스러운 대화**: 아무 메시지나 보내면 30대 직장인 여성 캐릭터가 응답
3. **감정 인식 체험**: "오늘 힘들었어", "기분 좋아!" 등으로 감정 분석 확인
4. **관계 발전 경험**: 대화를 이어가며 자연스러운 관계 발전 체험
5. **기억 확인**: 이전에 말한 정보들을 기억하는지 확인

### 🎯 **대화 예시**
```
사용자: "회사에서 프레젠테이션 망쳤어"
AI: "아, 정말 속상했겠다... 나도 직장 생활 하니까 그런 기분 너무 잘 알아. 
어떤 부분이 잘 안 됐어? 얘기해봐, 들어줄게."
[감정 분석: 스트레스 8/10, 반응: 공감+위로]

사용자: "승진했어!"
AI: "와! 정말 축하해! 🎉 얼마나 열심히 했는데, 드디어 인정받았구나! 
나도 덩달아 기분이 좋아져. 오늘은 축하 겸 맛있는 거라도 먹어야겠다!"
[감정 분석: 기쁨 9/10, 반응: 축하+공감]
```

## 🔧 시스템 특징

### **🧠 지능형 분석**
- **감정 분석**: GPT-4o-mini로 12가지 감정 실시간 분석
- **관계 추론**: 대화 패턴 분석으로 관계 단계 자동 감지
- **맥락 기억**: 모든 대화와 감정 히스토리 기억

### **📊 데이터 추적**
- **Supabase**: 모든 상호작용 데이터 저장
- **실시간 분석**: 대화, 감정, 관계 변화 실시간 추적
- **히스토리 관리**: 과거 데이터 기반 개인화된 응답

### **⚙️ 커스터마이징**
- **캐릭터 조정**: `lib/relationshipAnalyzer.js`에서 페르소나 수정
- **감정 분석 조정**: `lib/emotionTracker.js`에서 감정 분류 수정
- **관계 단계 조정**: 5단계 관계 모델 커스터마이징 가능

## 📊 비용 안내

- **Vercel**: 무료 플랜으로 충분 (월 100GB 대역폭, 100GB-hrs 실행 시간)
- **OpenAI**: 사용량에 따라 과금 (GPT-4o-mini는 상대적으로 저렴)
  - 대화: $0.15/1M 입력 토큰, $0.6/1M 출력 토큰
  - 감정 분석: $0.15/1M 입력 토큰, $0.6/1M 출력 토큰
  - 관계 추론: $0.15/1M 입력 토큰, $0.6/1M 출력 토큰
- **Supabase**: 무료 플랜으로 시작 가능 (500MB 데이터베이스, 5GB 대역폭)
- **텔레그램**: 무료

## 🚀 기술 스택

- **Frontend**: 텔레그램 봇 API
- **Backend**: Vercel Serverless Functions (Node.js)
- **AI Engine**: OpenAI GPT-4o-mini
- **Database**: Supabase (PostgreSQL)
- **Libraries**: 
  - `@supabase/supabase-js`: 데이터베이스 연동
  - `openai`: AI 모델 호출
  - `node-telegram-bot-api`: 텔레그램 연동

## 📚 문서

- **[PRD (제품 요구사항)](docs/PRD.md)**: 전체 시스템 설계 및 기능 명세
- **[ERD (데이터베이스 설계)](docs/ERD.md)**: 데이터베이스 구조 및 관계 설계

## ⚠️ 주의사항

- 환경 변수를 절대 공개 저장소에 업로드하지 마세요
- OpenAI API 사용량을 모니터링하세요
- 텔레그램 메시지는 최대 4096자까지 가능합니다

## 🤝 기여

버그 리포트나 기능 제안은 언제든 환영합니다!

## 📄 라이선스

MIT License
