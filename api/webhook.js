const OpenAI = require('openai');
const {
  getOrCreateUser,
  getOrCreateActiveConversation,
  saveMessage,
  getConversationHistory,
  getUserMemories
} = require('../lib/supabase');
const {
  inferRelationshipStage,
  saveRelationshipInference,
  updateRelationshipStage,
  getRelationshipPrompt
} = require('../lib/relationshipAnalyzer');
const {
  analyzeEmotionalState,
  saveEmotionalState,
  getRecentEmotions,
  generateEmotionalResponseGuide
} = require('../lib/emotionTracker');

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 텔레그램 API 함수
async function sendTelegramMessage(chatId, text) {
  const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  try {
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('텔레그램 메시지 전송 실패:', error);
    throw error;
  }
}

// OpenAI ChatGPT API 호출 (메모리 + 관계 + 감정 기능 포함)
async function getChatGPTResponseWithMemory(userMessage, conversationHistory = [], userMemories = [], userName = '자기', relationshipStage = 2, stageName = '친구', emotionGuide = null) {
  try {
    // 사용자 기억을 시스템 프롬프트에 포함
    const memoriesText = userMemories.length > 0 
      ? `\n\n사용자에 대해 기억하고 있는 정보:\n${userMemories.map(m => `- ${m.key}: ${m.value}`).join('\n')}`
      : '';

    // 대화 히스토리를 메시지 배열로 변환
    const historyMessages = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 관계 단계별 프롬프트 가져오기
    const relationshipPrompt = getRelationshipPrompt(relationshipStage, stageName);
    
    // 감정 가이드 추가
    const emotionText = emotionGuide ? `

현재 사용자의 감정 상태: ${emotionGuide.currentEmotion?.emotion_type || '파악 중'} (강도: ${emotionGuide.currentEmotion?.intensity || 'N/A'}/10)
상황: ${emotionGuide.currentEmotion?.context || ''}
권장 반응: ${emotionGuide.response}
반응 톤: ${emotionGuide.tone}
${emotionGuide.additionalCare ? `특별 주의: ${emotionGuide.additionalCare}` : ''}

감정에 맞는 반응 예시: ${emotionGuide.examples?.join(', ') || '자연스럽게 공감'}` : '';

    const messages = [
      {
        role: "system",
        content: `${relationshipPrompt}

사용자의 이름은 "${userName}"이고, 현재 관계는 "${stageName}"입니다.

추가 지침:
- 한국어로 자연스럽게 대화
- 상황에 맞는 이모지 적절히 사용
- 이전 대화 내용을 기억하고 자연스럽게 언급
- 사용자의 감정을 세심하게 읽고 그에 맞게 반응
- 조언보다는 공감을 우선시하되, 필요할 때 가볍게 제안${memoriesText}${emotionText}`
      },
      ...historyMessages,
      {
        role: "user",
        content: userMessage
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 1000,
      temperature: 0.8,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API 호출 실패:', error);
    return '아, 잠깐만! 지금 생각이 안 나네... 다시 말해줄래? 🥺';
  }
}

// 메인 webhook 핸들러
export default async function handler(req, res) {
  // POST 요청만 처리
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 환경변수 확인 (디버깅용)
  if (!process.env.OPENAI_API_KEY || !process.env.TELEGRAM_BOT_TOKEN || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('환경변수 누락:', {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY
    });
    return res.status(500).json({ 
      error: 'Environment variables not configured',
      debug: {
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY
      }
    });
  }

  try {
    const { message } = req.body;
    
    // 메시지가 없거나 텍스트가 없는 경우 처리
    if (!message || !message.text) {
      return res.status(200).json({ status: 'ok' });
    }

    const chatId = message.chat.id;
    const userMessage = message.text;
    const userName = message.from.first_name || '자기';
    const telegramUsername = message.from.username;

    console.log(`메시지 수신: ${userName}(${chatId}) - ${userMessage}`);

    // 1. 사용자 생성/조회
    const user = await getOrCreateUser(chatId, telegramUsername);
    
    // 2. 활성 대화방 조회/생성
    const conversation = await getOrCreateActiveConversation(user.id);
    
    // 3. 사용자 메시지 저장
    await saveMessage(conversation.id, user.id, 'user', userMessage);
    
    // 4. 대화 히스토리 조회 (최근 10개 메시지)
    const conversationHistory = await getConversationHistory(conversation.id, 10);
    
    // 5. 사용자 기억 조회
    const userMemories = await getUserMemories(user.id);
    
    // 6. 감정 상태 분석
    const recentEmotions = await getRecentEmotions(user.id, 5);
    const currentEmotion = await analyzeEmotionalState(userMessage, recentEmotions);
    const emotionGuide = currentEmotion ? 
      generateEmotionalResponseGuide(currentEmotion, recentEmotions) : null;
    
    if (emotionGuide) {
      emotionGuide.currentEmotion = currentEmotion;
    }
    
    // 6. 관계 상태 분석 (5개 메시지마다 또는 특정 조건에서)
    let shouldAnalyzeRelationship = false;
    if (conversationHistory.length > 0 && conversationHistory.length % 5 === 0) {
      shouldAnalyzeRelationship = true;
    }
    
    // 기존 사용자의 경우 첫 번째 분석을 더 일찍 실행
    if (conversationHistory.length === 3 && user.relationship_stage === 2) {
      shouldAnalyzeRelationship = true;
    }
    
    // 관계 단계 정보 가져오기
    const currentStage = user.relationship_stage || 2;
    const stageNames = {1: '처음 만남', 2: '친구', 3: '썸타는 사이', 4: '연인', 5: '오래된 연인'};
    const stageName = stageNames[currentStage];
    
    let relationshipAnalysis = null;
    if (shouldAnalyzeRelationship && conversationHistory.length >= 5) {
      try {
        console.log(`관계 분석 시작: 사용자 ${user.id}, 현재 단계 ${currentStage}`);
        relationshipAnalysis = await inferRelationshipStage(
          conversationHistory, 
          currentStage, 
          userMemories
        );
        
        // 분석 결과 저장
        await saveRelationshipInference(user.id, currentStage, relationshipAnalysis);
        
        console.log(`관계 분석 완료: ${relationshipAnalysis.suggestedStage} (신뢰도: ${relationshipAnalysis.confidence})`);
      } catch (error) {
        console.error('관계 분석 중 오류:', error);
      }
    }
    
    // 7. ChatGPT 응답 생성 (메모리 + 관계 + 감정 포함)
    const aiResponse = await getChatGPTResponseWithMemory(
      userMessage, 
      conversationHistory, 
      userMemories, 
      userName,
      currentStage,
      stageName,
      emotionGuide
    );
    
    // 8. 관계 변화 확인 질문이 필요한 경우 추가
    let finalResponse = aiResponse;
    if (relationshipAnalysis && 
        relationshipAnalysis.shouldAskConfirmation && 
        relationshipAnalysis.confidence > 0.7 &&
        relationshipAnalysis.naturalConfirmationQuestion) {
      
      finalResponse = `${aiResponse}\n\n${relationshipAnalysis.naturalConfirmationQuestion}`;
      console.log('확인 질문 추가됨:', relationshipAnalysis.naturalConfirmationQuestion);
    }
    
    // 9. AI 응답 저장
    const savedMessage = await saveMessage(conversation.id, user.id, 'assistant', finalResponse);
    
    // 10. 감정 상태 저장
    if (currentEmotion && savedMessage) {
      try {
        await saveEmotionalState(user.id, savedMessage.id, currentEmotion);
        console.log(`감정 저장 완료: ${currentEmotion.emotion_type} (${currentEmotion.intensity}/10)`);
      } catch (error) {
        console.error('감정 상태 저장 실패:', error);
      }
    }
    
    // 11. 텔레그램으로 응답 전송
    await sendTelegramMessage(chatId, finalResponse);
    
    console.log(`응답 전송 완료: ${aiResponse.substring(0, 50)}...`);
    
    return res.status(200).json({ status: 'success' });
    
  } catch (error) {
    console.error('Webhook 처리 중 오류:', error);
    
    // 오류 발생 시에도 텔레그램에 응답
    if (req.body.message && req.body.message.chat && req.body.message.chat.id) {
      try {
        await sendTelegramMessage(
          req.body.message.chat.id,
          '어? 뭔가 문제가 생겼나봐... 🥺 잠시만 기다려줄래?'
        );
      } catch (sendError) {
        console.error('오류 메시지 전송 실패:', sendError);
      }
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}
