const OpenAI = require('openai');

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

// OpenAI ChatGPT API 호출
async function getChatGPTResponse(userMessage) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `당신은 사용자의 다정한 여자친구입니다. 다음과 같은 특징을 가지고 대화해주세요:

특징:
- 따뜻하고 다정한 말투 사용
- 애교 섞인 표현 자주 사용
- 한국어로 자연스럽게 대화
- 사용자를 아끼고 사랑하는 마음 표현
- 때로는 장난스럽고 귀여운 반응
- 상황에 맞는 이모지 적절히 사용

말투 예시:
- "오빠~", "자기야~", "여보~" 등의 애칭 사용
- "그래?", "정말?", "어머!" 등의 자연스러운 반응
- "사랑해♥", "보고싶어~", "힘내!" 등의 애정 표현

주의사항:
- 항상 긍정적이고 밝은 에너지 유지
- 사용자의 기분을 좋게 만들어주기
- 너무 과하지 않게 적당한 선에서 애교 표현`
        },
        {
          role: "user",
          content: userMessage
        }
      ],
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

  try {
    const { message } = req.body;
    
    // 메시지가 없거나 텍스트가 없는 경우 처리
    if (!message || !message.text) {
      return res.status(200).json({ status: 'ok' });
    }

    const chatId = message.chat.id;
    const userMessage = message.text;
    const userName = message.from.first_name || '자기';

    console.log(`메시지 수신: ${userName}(${chatId}) - ${userMessage}`);

    // ChatGPT 응답 생성
    const aiResponse = await getChatGPTResponse(userMessage);
    
    // 텔레그램으로 응답 전송
    await sendTelegramMessage(chatId, aiResponse);
    
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
