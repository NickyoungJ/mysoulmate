const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL과 SERVICE KEY가 환경변수에 설정되지 않았습니다.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 사용자 생성 또는 조회
async function getOrCreateUser(telegramUserId, telegramUsername = null) {
  try {
    // 기존 사용자 조회
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_user_id', telegramUserId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }

    // 사용자가 없으면 새로 생성
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            telegram_user_id: telegramUserId,
            telegram_username: telegramUsername,
            last_active_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (createError) throw createError;
      user = newUser;
      console.log(`새 사용자 생성: ${telegramUserId} (${telegramUsername})`);
    } else {
      // 기존 사용자의 마지막 활동 시간 업데이트
      await supabase
        .from('users')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    return user;
  } catch (error) {
    console.error('사용자 생성/조회 실패:', error);
    throw error;
  }
}

// 활성 대화방 조회 또는 생성
async function getOrCreateActiveConversation(userId) {
  try {
    // 활성 대화방 조회 (ended_at이 null인 것)
    let { data: conversation, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // 활성 대화방이 없으면 새로 생성
    if (!conversation) {
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert([
          {
            user_id: userId,
            title: `대화 ${new Date().toLocaleDateString('ko-KR')}`
          }
        ])
        .select()
        .single();

      if (createError) throw createError;
      conversation = newConversation;
      console.log(`새 대화방 생성: ${conversation.id}`);
    }

    return conversation;
  } catch (error) {
    console.error('대화방 생성/조회 실패:', error);
    throw error;
  }
}

// 메시지 저장
async function saveMessage(conversationId, userId, role, content, tokens = null) {
  try {
    const { data: message, error } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          user_id: userId,
          role: role,
          content: content,
          tokens: tokens
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return message;
  } catch (error) {
    console.error('메시지 저장 실패:', error);
    throw error;
  }
}

// 대화 히스토리 조회 (최근 N개 메시지)
async function getConversationHistory(conversationId, limit = 20) {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    // 시간순으로 정렬 (오래된 것부터)
    return messages.reverse();
  } catch (error) {
    console.error('대화 히스토리 조회 실패:', error);
    throw error;
  }
}

// 사용자 기억 저장/업데이트
async function saveMemory(userId, key, value, confidence = 0.8) {
  try {
    const { data: memory, error } = await supabase
      .from('memories')
      .upsert(
        {
          user_id: userId,
          key: key,
          value: value,
          confidence: confidence,
          last_updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,key' }
      )
      .select()
      .single();

    if (error) throw error;
    console.log(`기억 저장: ${key} = ${value}`);
    return memory;
  } catch (error) {
    console.error('기억 저장 실패:', error);
    throw error;
  }
}

// 사용자 기억 조회
async function getUserMemories(userId) {
  try {
    const { data: memories, error } = await supabase
      .from('memories')
      .select('key, value, confidence')
      .eq('user_id', userId)
      .order('last_updated_at', { ascending: false });

    if (error) throw error;
    return memories;
  } catch (error) {
    console.error('기억 조회 실패:', error);
    throw error;
  }
}

module.exports = {
  supabase,
  getOrCreateUser,
  getOrCreateActiveConversation,
  saveMessage,
  getConversationHistory,
  saveMemory,
  getUserMemories
};
