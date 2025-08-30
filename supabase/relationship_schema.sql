-- 관계 상태 추론 기능을 위한 추가 테이블들

-- 관계 단계 정의 테이블
CREATE TABLE relationship_stages (
  stage_id SMALLINT PRIMARY KEY,
  stage_name TEXT NOT NULL,
  description TEXT,
  conversation_tone JSONB,
  typical_behaviors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 관계 변화 히스토리 테이블
CREATE TABLE relationship_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  from_stage SMALLINT,
  to_stage SMALLINT,
  trigger_message_id UUID REFERENCES messages(id),
  inference_reason TEXT,
  confidence NUMERIC DEFAULT 0.8,
  confirmed BOOLEAN DEFAULT FALSE,
  confirmation_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 관계 추론 로그 테이블 (디버깅용)
CREATE TABLE relationship_inferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  current_stage SMALLINT,
  suggested_stage SMALLINT,
  analysis_data JSONB, -- 분석 결과 저장
  confidence NUMERIC,
  action_taken TEXT, -- 'confirmed', 'rejected', 'pending'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 관계 단계 데이터 삽입
INSERT INTO relationship_stages (stage_id, stage_name, description, conversation_tone, typical_behaviors) VALUES
(1, '처음 만남', '서로를 알아가는 단계', 
 '{"formality": "polite", "intimacy": "low", "playfulness": "minimal"}',
 '["존댓말 사용", "기본적인 질문", "정중한 거리감 유지", "호기심 표현"]'),

(2, '친구', '편안한 친구 관계', 
 '{"formality": "casual", "intimacy": "medium", "playfulness": "moderate"}',
 '["반말 가능", "개인적 관심사 공유", "유머와 농담", "일상 대화"]'),

(3, '썸타는 사이', '서로에게 특별한 감정이 있는 단계', 
 '{"formality": "casual", "intimacy": "high", "playfulness": "high"}',
 '["미묘한 관심 표현", "질투나 샘", "특별함 어필", "은근한 스킨십"]'),

(4, '연인', '공식적인 연인 관계', 
 '{"formality": "intimate", "intimacy": "very_high", "playfulness": "high"}',
 '["애칭 사용", "직접적 사랑 표현", "미래 계획 공유", "깊은 애정 표현"]'),

(5, '오래된 연인', '안정적이고 깊은 연인 관계', 
 '{"formality": "comfortable", "intimacy": "very_high", "playfulness": "natural"}',
 '["자연스러운 일상 공유", "깊은 이해", "편안한 애정", "장기적 계획"]');

-- 인덱스 생성
CREATE INDEX idx_relationship_transitions_user_id ON relationship_transitions(user_id, created_at DESC);
CREATE INDEX idx_relationship_inferences_user_id ON relationship_inferences(user_id, created_at DESC);

-- RLS 정책
ALTER TABLE relationship_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_inferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything" ON relationship_stages FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can do everything" ON relationship_transitions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can do everything" ON relationship_inferences FOR ALL TO service_role USING (true);
