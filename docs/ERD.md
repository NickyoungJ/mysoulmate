# 🗄️ ERD – 지능형 AI 여자친구 챗봇 데이터베이스 설계

## 1) 핵심 도메인 테이블 (현재 구현완료)

### **users** ✅
사용자 기본 정보 및 관계 상태 관리
```sql
id (PK, uuid)
telegram_user_id (bigint, UNIQUE) -- 텔레그램 개별 식별자
telegram_username (text, nullable)
timezone (text, default 'Asia/Seoul')
locale (text, default 'ko-KR')
relationship_stage (smallint, default 2) -- 1~5단계, 기본값 친구
onboarding_stage (smallint, default 0)
created_at (timestamptz, default now)
last_active_at (timestamptz)
```

### **conversations** ✅
대화방 관리 및 세션 구분
```sql
id (PK, uuid)
user_id (uuid, FK → users.id)
title (text, nullable)
started_at (timestamptz, default now)
ended_at (timestamptz, nullable)
```

### **messages** ✅
모든 대화 내용 저장 및 맥락 관리
```sql
id (PK, uuid)
conversation_id (uuid, FK → conversations.id)
user_id (uuid, FK → users.id) -- 조회/필터 편의
role (text enum: 'user','assistant','system')
content (text) -- 원문 메시지
tokens (int, nullable)
reply_to_message_id (uuid, FK → messages.id, nullable)
created_at (timestamptz, default now)
```

### **memories** ✅
사용자 개인 정보 기억 시스템
```sql
id (PK, uuid)
user_id (uuid, FK → users.id)
key (text) -- 예: 'favorite_food','nickname','birthday'
value (text)
confidence (numeric, default 0.8)
last_updated_at (timestamptz, default now)
UNIQUE(user_id, key)
```

## 2) 관계 분석 시스템 (현재 구현완료)

### **relationship_stages** ✅
관계 단계 정의 및 특성 관리
```sql
stage_id (PK, smallint)
stage_name (text) -- '처음 만남', '친구', '썸타는 사이', '연인', '오래된 연인'
description (text)
conversation_tone (jsonb) -- 대화 톤 설정
typical_behaviors (jsonb) -- 각 단계별 행동 특성
created_at (timestamptz, default now)
```

### **relationship_transitions** ✅
관계 변화 히스토리 추적
```sql
id (PK, uuid)
user_id (uuid, FK → users.id)
from_stage (smallint)
to_stage (smallint)
trigger_message_id (uuid, FK → messages.id)
inference_reason (text)
confidence (numeric, default 0.8)
confirmed (boolean, default false)
confirmation_message_id (uuid, FK → messages.id, nullable)
created_at (timestamptz, default now)
```

### **relationship_inferences** ✅
AI 관계 분석 로그 및 디버깅
```sql
id (PK, uuid)
user_id (uuid, FK → users.id)
current_stage (smallint)
suggested_stage (smallint)
analysis_data (jsonb) -- 분석 결과 상세 데이터
confidence (numeric)
action_taken (text) -- 'confirmed', 'rejected', 'pending'
created_at (timestamptz, default now)
```

## 3) 감정 추적 시스템 (현재 구현완료)

### **user_emotions** ✅
실시간 감정 분석 결과 저장
```sql
id (PK, uuid)
user_id (uuid, FK → users.id)
message_id (uuid, FK → messages.id)
emotion_type (text CHECK: '기쁨','슬픔','분노','불안','피곤','설렘',
              '스트레스','만족','우울','흥미','놀람','실망','중립')
intensity (smallint CHECK: 1-10)
context (text) -- 감정의 구체적 상황/원인
keywords (text[]) -- 감정을 나타내는 키워드들
suggestion (text CHECK: '공감','위로','격려','축하','경청','조언')
confidence (text CHECK: 'low','medium','high')
created_at (timestamptz, default now)
```

### **emotion_summaries** ✅
일별 감정 패턴 요약 (성능 최적화용)
```sql
id (PK, uuid)
user_id (uuid, FK → users.id)
date (date, default current_date)
dominant_emotion (text) -- 하루 중 가장 많이 나타난 감정
average_intensity (numeric) -- 평균 감정 강도
emotion_count (jsonb) -- {"기쁨": 3, "스트레스": 2, ...}
notes (text)
created_at (timestamptz, default now)
UNIQUE(user_id, date)
```

## 4) 향후 확장 테이블 (Phase 2 - 미구현)

### **personas** (아바타 캐릭터 설정)
```sql
id (PK, uuid)
name (text)
system_prompt (text) -- 말투/성격 프롬프트
style_tags (text[]) -- 예: ['따뜻함','애교','현실연애']
sd_model_name (text) -- 예: 'sdxl-turbo', 'realisticVisionV6'
sd_lora_refs (text[]) -- LoRA 모델 식별자 목록
face_ref_url (text, nullable) -- 기준 얼굴 이미지(스토리지 URL)
created_at (timestamptz)
```

### **user_preferences** (개별 아바타 스타일 설정)
```sql
id (PK, uuid)
user_id (uuid, FK → users.id)
appearance (jsonb) -- 머리색/헤어/분위기/메이크업 등
image_style (text enum: 'photo','film','anime','illustration', default 'photo')
image_send_policy (text enum: 'auto','keyword','scheduled','off', default 'auto')
default_negative_prompt (text)
nsfw_allowed (bool, default false)
created_at (timestamptz), updated_at (timestamptz)
```

### **images** (생성된 아바타 이미지 관리)
```sql
id (PK, uuid)
user_id (uuid, FK → users.id)
conversation_id (uuid, FK → conversations.id, nullable)
message_id (uuid, FK → messages.id, nullable) -- 해당 답변 메시지와 연결
provider (text enum: 'stability','replicate','hf','openai')
prompt (text)
negative_prompt (text)
seed (bigint, nullable)
steps (smallint, nullable)
guidance (numeric, nullable)
model_name (text)
lora_refs (text[], nullable)
controlnet_cfg (jsonb, nullable) -- 포즈/구도 제약
width (smallint), height (smallint)
image_url (text) -- Supabase Storage or 외부 URL
status (text enum: 'queued','succeeded','failed')
cost_cents (int, nullable)
created_at (timestamptz, default now)
```

### **image_triggers** (자동 이미지 생성 규칙)
```sql
id (PK, uuid)
user_id (uuid, FK → users.id)
rule_type (text enum: 'keyword','schedule','emotion','random','system')
rule_config (jsonb)
-- 예: {keywords:['보고싶다','셀카'], chance:0.3}
-- 예: {cron:'0 22 * * *', template_id:'goodnight'}
-- 예: {emotion:'sad', template_id:'cheer_up'}
active (bool, default true)
last_fired_at (timestamptz, nullable)
created_at (timestamptz)
```

### **prompt_templates** (이미지 생성 템플릿)
```sql
id (PK, uuid)
name (text) -- 'goodnight', 'running_after_work' 등
type (text enum: 'avatar','story','outfit','activity','seasonal','event')
prompt (text) -- Stable Diffusion용 포지티브 프롬프트
negative_prompt (text)
safety_cfg (jsonb) -- 검열/필터링 설정
created_at (timestamptz)
```

## 5) 구독/접근 제어 시스템 (Phase 4 - 미구현)

### **subscriptions** (구독 관리)
```sql
id (PK, uuid)
user_id (uuid, FK → users.id)
provider (text enum: 'stripe','toss','telegram','etc')
plan (text enum: 'free','pro','vip')
status (text enum: 'active','trial','past_due','canceled')
started_at (timestamptz)
expires_at (timestamptz)
external_tx_id (text, nullable)
created_at (timestamptz)
```

### **rate_limits** (사용량 제한)
```sql
id (PK, uuid)
user_id (uuid, FK → users.id)
daily_msg_count (int, default 0)
daily_img_count (int, default 0)
reset_at (timestamptz)
```

### **whitelist** (선허용 사용자)
```sql
id (PK, uuid)
telegram_user_id (bigint, UNIQUE)
note (text)
created_at (timestamptz)
```

## 6) 운영/로깅 시스템 (선택사항)

### **api_logs** (API 호출 추적)
```sql
id (PK, uuid)
user_id (uuid, FK → users.id, nullable)
provider (text enum: 'openai','stability','replicate','telegram')
request (jsonb)
response (jsonb)
latency_ms (int)
created_at (timestamptz)
```

### **conversation_summaries** (장문 대화 요약)
```sql
id (PK, uuid)
conversation_id (uuid, FK → conversations.id)
summary (text)
created_at (timestamptz)
```

## 7) ER 관계 다이어그램

### 현재 구현된 관계 (Phase 1)
```
users (1) ──< (N) conversations ──< (N) messages
  │                         │
  │                         └─────< (N) user_emotions
  │
  ├── (N) memories
  ├── (N) relationship_transitions
  └── (N) relationship_inferences

relationship_stages (1) ──< (N) [relationship data via stage_id]
messages (1) ──(0..1) user_emotions (via message_id)
```

### 향후 확장 관계 (Phase 2+)
```
users (1) ──< (N) conversations ──< (N) messages
  │                         │             │
  │                         └─────< (N) images
  │                                       │
  ├── (1) personas (optional link)        │
  ├── (1) user_preferences               │
  ├── (N) memories                       │
  ├── (N) image_triggers                 │
  ├── (N) subscriptions                  │
  ├── (1) rate_limits                    │
  └── (N) api_logs                       │
                                         │
conversations (1) ──< (N) conversation_summaries
messages (1) ──(0..1) images (via message_id)
images (N) ──> (N) prompt_templates (via prompts used)
```

## 8) 주요 인덱스 설정

### 성능 최적화를 위한 인덱스
```sql
-- 사용자 관련
CREATE INDEX idx_users_telegram_user_id ON users(telegram_user_id);

-- 대화 관련
CREATE INDEX idx_conversations_user_id ON conversations(user_id, started_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_user_id ON messages(user_id, created_at DESC);

-- 감정 분석
CREATE INDEX idx_user_emotions_user_id ON user_emotions(user_id, created_at DESC);
CREATE INDEX idx_user_emotions_emotion_type ON user_emotions(emotion_type, created_at DESC);

-- 관계 분석
CREATE INDEX idx_relationship_transitions_user_id ON relationship_transitions(user_id, created_at DESC);
CREATE INDEX idx_relationship_inferences_user_id ON relationship_inferences(user_id, created_at DESC);

-- 기억 시스템
CREATE INDEX idx_memories_user_id ON memories(user_id, key);
```

## 9) Row Level Security (RLS) 정책

모든 테이블에 RLS 활성화 및 service_role 전체 접근 허용
```sql
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can do everything" ON [table_name] FOR ALL TO service_role USING (true);
```

## 10) 구현 체크포인트

### 현재 구현 완료 (Phase 1)
- ✅ **유저 구분**: telegram_user_id 기준으로 전 테이블 연결
- ✅ **대화 맥락**: 최근 N개 messages + memories를 GPT 컨텍스트에 주입
- ✅ **감정 추적**: 모든 메시지에 대해 감정 분석 및 저장
- ✅ **관계 발전**: 자동 분석 및 단계별 프롬프트 적용
- ✅ **데이터 일관성**: 모든 상호작용 기록 보장

### 다음 구현 예정 (Phase 2)
- 🔄 **이미지 자동 생성**: image_triggers 규칙 평가 → prompt_templates 조합 → images 생성/저장
- 🔄 **개인화 아바타**: user_preferences 기반 맞춤형 이미지 생성
- 🔄 **이미지 히스토리**: 과거 생성 이미지 조회 및 관리

### 향후 구현 (Phase 3+)
- 📅 **구독 제어**: subscriptions.status='active' 사용자만 고급 기능 제공
- 📅 **사용량 제한**: rate_limits로 일일 메시지/이미지 제한
- 📅 **성능 모니터링**: api_logs를 통한 비용 및 성능 추적

---

## 11) 데이터베이스 마이그레이션 파일 위치

```
📁 supabase/
├── schema.sql              # 기본 테이블 (users, conversations, messages, memories)
├── relationship_schema.sql # 관계 분석 테이블 3개
├── emotion_schema.sql      # 감정 추적 테이블 2개
└── future_schema.sql       # 향후 확장용 (아직 미생성)
```

**현재 구현된 데이터베이스는 지능형 AI 여자친구의 모든 상호작용을 체계적으로 기록하고 분석할 수 있는 완전한 구조입니다.**
