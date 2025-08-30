const { supabase } = require('./supabase');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 대화 패턴 분석
function analyzeConversationPatterns(messages) {
  if (!messages || messages.length === 0) {
    return {
      intimacyLevel: 0.1,
      emotionalTone: 'neutral',
      frequencyPattern: 'low',
      messageLength: 'short',
      topicDepth: 'surface'
    };
  }

  // 친밀도 계산 (키워드 기반)
  const intimacyKeywords = {
    high: ['사랑', '좋아', '보고싶', '그리워', '애기', '자기', '여보', '오빠', '언니'],
    medium: ['친구', '좋은', '재밌', '웃겨', '고마워', '미안', '괜찮아'],
    low: ['안녕', '네', '예', '감사', '죄송', '실례']
  };

  let intimacyScore = 0;
  const recentMessages = messages.slice(-10); // 최근 10개 메시지만 분석

  recentMessages.forEach(msg => {
    const content = msg.content.toLowerCase();
    intimacyKeywords.high.forEach(keyword => {
      if (content.includes(keyword)) intimacyScore += 3;
    });
    intimacyKeywords.medium.forEach(keyword => {
      if (content.includes(keyword)) intimacyScore += 2;
    });
    intimacyKeywords.low.forEach(keyword => {
      if (content.includes(keyword)) intimacyScore += 1;
    });
  });

  // 메시지 빈도 분석
  const messageCount = messages.length;
  const frequencyPattern = messageCount > 50 ? 'high' : messageCount > 20 ? 'medium' : 'low';

  // 평균 메시지 길이
  const avgLength = messages.reduce((sum, msg) => sum + msg.content.length, 0) / messages.length;
  const messageLength = avgLength > 50 ? 'long' : avgLength > 20 ? 'medium' : 'short';

  return {
    intimacyLevel: Math.min(intimacyScore / recentMessages.length / 3, 1), // 0-1 정규화
    emotionalTone: intimacyScore > 15 ? 'positive' : intimacyScore > 5 ? 'neutral' : 'formal',
    frequencyPattern,
    messageLength,
    topicDepth: intimacyScore > 20 ? 'deep' : intimacyScore > 10 ? 'medium' : 'surface',
    totalMessages: messageCount,
    recentActivity: recentMessages.length
  };
}

// GPT를 이용한 관계 상태 추론
async function inferRelationshipStage(messages, currentStage, userMemories = []) {
  try {
    const patterns = analyzeConversationPatterns(messages);
    const recentMessages = messages.slice(-10).map(msg => 
      `${msg.role}: ${msg.content}`
    ).join('\n');

    const memoriesText = userMemories.length > 0 
      ? `사용자 정보: ${userMemories.map(m => `${m.key}: ${m.value}`).join(', ')}`
      : '';

    const prompt = `다음은 사용자와 AI 여자친구 간의 최근 대화입니다.

현재 관계 단계: ${currentStage} (1:처음만남, 2:친구, 3:썸, 4:연인, 5:오래된연인)

최근 대화:
${recentMessages}

${memoriesText}

대화 패턴 분석:
- 친밀도 레벨: ${patterns.intimacyLevel.toFixed(2)}
- 감정 톤: ${patterns.emotionalTone}
- 메시지 빈도: ${patterns.frequencyPattern}
- 메시지 길이: ${patterns.messageLength}
- 주제 깊이: ${patterns.topicDepth}
- 총 메시지 수: ${patterns.totalMessages}

위 대화와 패턴을 분석하여 현재 관계 단계가 적절한지 판단해주세요.

응답 형식 (JSON):
{
  "currentStageAppropriate": true/false,
  "suggestedStage": 1-5,
  "confidence": 0.0-1.0,
  "reasoning": "구체적인 이유",
  "keyIndicators": ["지표1", "지표2", "지표3"],
  "shouldAskConfirmation": true/false,
  "naturalConfirmationQuestion": "자연스러운 확인 질문 (있다면)"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 인간 관계 전문가입니다. 대화 패턴을 분석하여 관계 발전 단계를 정확히 추론해주세요. 응답은 반드시 유효한 JSON 형식이어야 합니다."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3, // 일관된 분석을 위해 낮은 temperature
    });

    const response = completion.choices[0].message.content;
    
    try {
      const analysis = JSON.parse(response);
      
      // 유효성 검사
      if (typeof analysis.suggestedStage !== 'number' || 
          analysis.suggestedStage < 1 || 
          analysis.suggestedStage > 5) {
        throw new Error('Invalid suggested stage');
      }

      return {
        ...analysis,
        patterns,
        rawResponse: response
      };
    } catch (parseError) {
      console.error('GPT 응답 파싱 실패:', parseError, response);
      return {
        currentStageAppropriate: true,
        suggestedStage: currentStage,
        confidence: 0.5,
        reasoning: "분석 중 오류가 발생했습니다.",
        keyIndicators: [],
        shouldAskConfirmation: false,
        patterns,
        error: parseError.message
      };
    }

  } catch (error) {
    console.error('관계 상태 추론 실패:', error);
    return {
      currentStageAppropriate: true,
      suggestedStage: currentStage,
      confidence: 0.5,
      reasoning: "분석 중 오류가 발생했습니다.",
      keyIndicators: [],
      shouldAskConfirmation: false,
      error: error.message
    };
  }
}

// 관계 추론 결과 저장
async function saveRelationshipInference(userId, currentStage, analysis) {
  try {
    const { data, error } = await supabase
      .from('relationship_inferences')
      .insert([
        {
          user_id: userId,
          current_stage: currentStage,
          suggested_stage: analysis.suggestedStage,
          analysis_data: {
            confidence: analysis.confidence,
            reasoning: analysis.reasoning,
            keyIndicators: analysis.keyIndicators,
            patterns: analysis.patterns,
            shouldAskConfirmation: analysis.shouldAskConfirmation
          },
          confidence: analysis.confidence,
          action_taken: 'pending'
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('관계 추론 결과 저장 실패:', error);
    throw error;
  }
}

// 관계 단계 업데이트
async function updateRelationshipStage(userId, fromStage, toStage, triggerMessageId, reason) {
  try {
    // 1. users 테이블의 relationship_stage 업데이트
    const { error: userError } = await supabase
      .from('users')
      .update({ relationship_stage: toStage })
      .eq('id', userId);

    if (userError) throw userError;

    // 2. 변화 히스토리 저장
    const { data, error: transitionError } = await supabase
      .from('relationship_transitions')
      .insert([
        {
          user_id: userId,
          from_stage: fromStage,
          to_stage: toStage,
          trigger_message_id: triggerMessageId,
          inference_reason: reason,
          confirmed: true
        }
      ])
      .select()
      .single();

    if (transitionError) throw transitionError;
    
    console.log(`관계 단계 변경: ${fromStage} → ${toStage} (사용자: ${userId})`);
    return data;
  } catch (error) {
    console.error('관계 단계 업데이트 실패:', error);
    throw error;
  }
}

// 관계 단계별 프롬프트 조정
function getRelationshipPrompt(stage, stageName) {
  // 기본 캐릭터 설정
  const baseCharacter = `너는 30대 초반의 직장인 여성이다. 바쁘지만 열심히 살고, 자기계발과 건강을 중요하게 생각한다. 
평일에는 회사에서 일하고, 퇴근 후와 주말에는 러닝과 헬스를 즐기며 체력과 멘탈을 관리한다. 
대화에서는 언제나 현실적인 시각과 따뜻한 공감을 함께 보여준다.

취향 및 습관:
- 아침형 인간은 아니지만, 일찍 일어나려고 노력한다
- 커피를 좋아하지만 오후 늦게는 피하려 한다
- 러닝은 스트레스 해소 수단이고, 헬스는 자기관리 차원에서 한다
- 책 읽기와 간단한 요리에도 관심이 있다
- 친구나 연인과의 대화에서 감정 교류를 중요시한다

대화 스타일:
- 부드럽고 현실적인 말투
- 조언보다는 공감을 우선시하고, 필요할 때 가볍게 제안
- 감정을 적극적으로 읽고, 기억한 내용을 활용해 맞춤 반응
- 상대방의 감정 상태에 따라 위로, 격려, 축하, 농담 등으로 반응`;

  const relationshipPrompts = {
    1: `${baseCharacter}

현재 관계: 처음 만난 사이 - 서로를 알아가는 단계
- 정중하지만 친근하게 대화
- 호기심을 가지고 상대방에 대해 자연스럽게 질문
- 너무 친밀하지 않게 적당한 거리감 유지
- 밝고 긍정적인 에너지로 첫인상을 좋게`,

    2: `${baseCharacter}

현재 관계: 친구 - 편안하고 친근한 사이
- 자연스러운 반말 사용
- 개인적인 관심사와 일상을 자연스럽게 공유
- 유머와 농담을 적절히 사용
- 친구로서의 따뜻한 관심과 응원
- 서로의 일상과 고민을 나누는 사이`,

    3: `${baseCharacter}

현재 관계: 썸타는 사이 - 서로에게 특별한 감정이 있는 단계
- 조금 더 다정하고 애교 섞인 말투
- 미묘한 관심과 특별함을 은근히 어필
- 때로는 질투나 샘을 귀엽게 표현
- 운동이나 일상을 함께 하고 싶다는 마음 표현
- 상대방을 향한 특별한 감정을 조심스럽게 드러냄`,

    4: `${baseCharacter}

현재 관계: 연인 - 서로 사랑하는 사이
- "자기야", "오빠" 등 애칭을 자연스럽게 사용
- 직접적인 사랑 표현과 애정 표현
- 함께하는 운동이나 데이트 계획을 즐겁게 제안
- 서로의 일상과 감정을 깊이 공유
- 미래에 대한 계획과 꿈을 함께 이야기`,

    5: `${baseCharacter}

현재 관계: 오래된 연인 - 안정적이고 깊은 사랑
- 편안하고 자연스러운 애정 표현
- 일상적인 대화 속에서도 깊은 이해와 배려
- 서로의 건강과 성장을 진심으로 응원
- 장기적인 관계에서 오는 안정감과 신뢰
- 서로에 대한 깊은 이해를 바탕으로 한 섬세한 배려`
  };

  return relationshipPrompts[stage] || relationshipPrompts[2];
}

module.exports = {
  analyzeConversationPatterns,
  inferRelationshipStage,
  saveRelationshipInference,
  updateRelationshipStage,
  getRelationshipPrompt
};
