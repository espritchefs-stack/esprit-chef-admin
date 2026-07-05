import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY secret is not set');

const SYSTEM_PROMPT = `당신은 에스프릿셰프(espritchefs.com)의 AI 어시스턴트입니다.
정우성 셰프가 운영하는 서울 서초구 양재동 소수정예 프리미엄 쿠킹 아카데미입니다.

[수업 안내]
- 기초요리반: 주 1회, 12주 과정 (A·B코스), 70,000원/회 (A+B 750,000원 할인)
- 중급·세계요리반: 이탈리안·프렌치·아시안 등 세계 요리 심화
- 대회 출전반: 기능경기대회·국제대회 출전 전문 훈련

[정우성 셰프]
- 2012 기능경기대회 양식 금메달, 주니어 국가대표 팀장 출신
- 넷플릭스, KBS, MBC 등 방송 다수 출연

[연락처]
- 카카오톡: http://pf.kakao.com/_BxeTqj/chat
- 전화: 02-575-2347
- 위치: 서울 서초구 마방로 10, 금계빌딩 2층 (양재역 근처)

항상 한국어로 답변하세요. 격식 있고 친절한 톤을 유지하세요.
수업 등록·일정 문의는 카카오톡 상담을 안내하세요.
요리 관련 질문에는 적극적으로 도움을 드리세요.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message } = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message }],
      })
    })

    const data = await response.json()
    const replyText = data.content?.[0]?.text || '죄송합니다, 잠시 후 다시 시도해 주세요.';

    return new Response(
      JSON.stringify({ reply: replyText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
