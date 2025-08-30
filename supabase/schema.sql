-- 메모리 기능을 위한 기본 테이블들

-- 사용자 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT UNIQUE NOT NULL,
  telegram_username TEXT,
  timezone TEXT DEFAULT 'Asia/Seoul',
  locale TEXT DEFAULT 'ko-KR',
  relationship_stage SMALLINT DEFAULT 1, -- 1~5 단계(낯선→친구→썸→연인→장기)
  onboarding_stage SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ
);

-- 대화방 테이블
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- 메시지 테이블
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
  content TEXT NOT NULL,
  tokens INTEGER,
  reply_to_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 기억 테이블 (중요한 정보들)
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL, -- 예: 'favorite_food', 'nickname', 'birthday'
  value TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0.8,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- 인덱스 생성
CREATE INDEX idx_users_telegram_user_id ON users(telegram_user_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id, started_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_user_id ON messages(user_id, created_at DESC);
CREATE INDEX idx_memories_user_id ON memories(user_id, key);

-- Row Level Security (RLS) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- 기본 정책 (서비스 키로 모든 접근 허용)
CREATE POLICY "Service role can do everything" ON users FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can do everything" ON conversations FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can do everything" ON messages FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can do everything" ON memories FOR ALL TO service_role USING (true);
