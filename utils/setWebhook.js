// 텔레그램 봇 Webhook 설정 유틸리티 스크립트
// 사용법: node utils/setWebhook.js <VERCEL_URL>

const https = require('https');

async function setTelegramWebhook(botToken, webhookUrl) {
  const telegramUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;
  
  const data = JSON.stringify({
    url: webhookUrl
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(telegramUrl, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('사용법: node utils/setWebhook.js <VERCEL_URL>');
    console.error('예시: node utils/setWebhook.js https://your-app.vercel.app');
    process.exit(1);
  }

  const vercelUrl = args[0];
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error('오류: TELEGRAM_BOT_TOKEN 환경 변수가 설정되지 않았습니다.');
    console.error('.env.local 파일에 TELEGRAM_BOT_TOKEN을 설정하세요.');
    process.exit(1);
  }

  const webhookUrl = `${vercelUrl}/api/webhook`;

  try {
    console.log(`Webhook 설정 중: ${webhookUrl}`);
    const result = await setTelegramWebhook(botToken, webhookUrl);
    
    if (result.ok) {
      console.log('✅ Webhook 설정 성공!');
      console.log(`봇 URL: https://t.me/${result.result?.url || 'your-bot-username'}`);
    } else {
      console.error('❌ Webhook 설정 실패:', result.description);
    }
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }
}

// 직접 실행된 경우에만 main 함수 호출
if (require.main === module) {
  main();
}

module.exports = { setTelegramWebhook };
