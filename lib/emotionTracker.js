const { supabase } = require('./supabase');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 감정 상태 감지 및 분석
async function analyzeEmotionalState(message, previousEmotions = []) {
  try {
    const recentEmotions = previousEmotions.slice(-3).map(e => 
      `${e.created_at}: ${e.emotion_type} (${e.intensity}/10) - ${e.context}`
    ).join('\n');

    const prompt = `다음 메시지에서 사용자의 감정 상태를 분석해주세요.

사용자 메시지: "${message}"

최근 감정 기록:
${recentEmotions || '없음'}

다음 형식으로 응답해주세요 (JSON):
{
  "emotion_type": "기쁨|슬픔|분노|불안|피곤|설렘|스트레스|만족|우울|흥미|놀람|실망",
  "intensity": 1-10,
  "context": "구체적인 상황이나 원인",
  "keywords": ["감정을", "나타내는", "키워드들"],
  "suggestion": "적절한 반응 방향 (공감|위로|격려|축하|경청|조언)"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 감정 분석 전문가입니다. 텍스트에서 사용자의 감정을 정확히 파악하고 적절한 반응을 제안해주세요."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const response = completion.choices[0].message.content;
    
    try {
      const analysis = JSON.parse(response);
      return {
        ...analysis,
        confidence: analysis.intensity >= 6 ? 'high' : analysis.intensity >= 3 ? 'medium' : 'low'
      };
    } catch (parseError) {
      console.error('감정 분석 응답 파싱 실패:', parseError, response);
      return {
        emotion_type: '중립',
        intensity: 5,
        context: '분석 중 오류 발생',
        keywords: [],
        suggestion: '경청',
        confidence: 'low'
      };
    }

  } catch (error) {
    console.error('감정 분석 실패:', error);
    return null;
  }
}

// 감정 기록 저장
async function saveEmotionalState(userId, messageId, emotionAnalysis) {
  try {
    const { data, error } = await supabase
      .from('user_emotions')
      .insert([
        {
          user_id: userId,
          message_id: messageId,
          emotion_type: emotionAnalysis.emotion_type,
          intensity: emotionAnalysis.intensity,
          context: emotionAnalysis.context,
          keywords: emotionAnalysis.keywords,
          suggestion: emotionAnalysis.suggestion,
          confidence: emotionAnalysis.confidence
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('감정 상태 저장 실패:', error);
    throw error;
  }
}

// 사용자의 최근 감정 기록 조회
async function getRecentEmotions(userId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('user_emotions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('감정 기록 조회 실패:', error);
    return [];
  }
}

// 감정 기반 맞춤 응답 가이드 생성
function generateEmotionalResponseGuide(currentEmotion, recentEmotions) {
  const emotionResponses = {
    '기쁨': {
      response: '함께 기뻐하고 축하해주기',
      tone: '밝고 활기찬',
      examples: ['정말 좋겠다!', '축하해!', '나도 덩달아 기분이 좋아져']
    },
    '슬픔': {
      response: '공감하고 위로해주기',
      tone: '따뜻하고 다정한',
      examples: ['많이 힘들겠다', '괜찮아, 나도 그런 적 있어', '충분히 슬플 만해']
    },
    '분노': {
      response: '감정을 인정하고 차분히 들어주기',
      tone: '차분하고 이해하는',
      examples: ['정말 화나겠다', '그럴 만도 해', '충분히 이해해']
    },
    '피곤': {
      response: '휴식을 권하고 건강 챙기기',
      tone: '걱정스럽고 배려하는',
      examples: ['많이 피곤해 보여', '좀 쉬어야겠다', '몸 조심해']
    },
    '스트레스': {
      response: '스트레스 해소법 제안하고 공감',
      tone: '이해하고 도움을 주려는',
      examples: ['스트레스 많이 받겠다', '러닝이라도 같이 할까?', '힘내']
    },
    '설렘': {
      response: '함께 설레고 응원해주기',
      tone: '설레고 기대하는',
      examples: ['나도 설레!', '어떻게 될지 궁금하다', '잘 될 것 같아']
    }
  };

  const guide = emotionResponses[currentEmotion?.emotion_type] || {
    response: '자연스럽게 공감하고 경청하기',
    tone: '따뜻하고 친근한',
    examples: ['그렇구나', '어떤 기분인지 알 것 같아', '더 얘기해봐']
  };

  // 최근 감정 패턴 고려
  if (recentEmotions.length > 0) {
    const recentNegative = recentEmotions.filter(e => 
      ['슬픔', '분노', '스트레스', '우울', '불안'].includes(e.emotion_type)
    ).length;
    
    if (recentNegative >= 2) {
      guide.additionalCare = '최근 힘든 시간을 보내고 있으니 더 세심한 관심과 위로 필요';
    }
  }

  return guide;
}

module.exports = {
  analyzeEmotionalState,
  saveEmotionalState,
  getRecentEmotions,
  generateEmotionalResponseGuide
};
