-- 감정 추적 기능을 위한 테이블

-- 사용자 감정 기록 테이블
CREATE TABLE user_emotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  emotion_type TEXT NOT NULL CHECK (emotion_type IN (
    '기쁨', '슬픔', '분노', '불안', '피곤', '설렘', 
    '스트레스', '만족', '우울', '흥미', '놀람', '실망', '중립'
  )),
  intensity SMALLINT CHECK (intensity >= 1 AND intensity <= 10),
  context TEXT,
  keywords TEXT[],
  suggestion TEXT CHECK (suggestion IN (
    '공감', '위로', '격려', '축하', '경청', '조언'
  )),
  confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 감정 패턴 요약 테이블 (선택사항 - 성능 최적화용)
CREATE TABLE emotion_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  dominant_emotion TEXT,
  average_intensity NUMERIC,
  emotion_count JSONB, -- {"기쁨": 3, "스트레스": 2, ...}
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 인덱스 생성
CREATE INDEX idx_user_emotions_user_id ON user_emotions(user_id, created_at DESC);
CREATE INDEX idx_user_emotions_emotion_type ON user_emotions(emotion_type, created_at DESC);
CREATE INDEX idx_emotion_summaries_user_date ON emotion_summaries(user_id, date DESC);

-- RLS 정책
ALTER TABLE user_emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything" ON user_emotions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can do everything" ON emotion_summaries FOR ALL TO service_role USING (true);
