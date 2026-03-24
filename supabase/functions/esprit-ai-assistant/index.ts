import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// NOTE: Hardcoding the API key here temporarily so the user can test immediately in development.
const GEMINI_API_KEY = "AIzaSyA_PrnQ2yCLXX2ImzC0c1Uw5uN4cfGOgd8";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message } = await req.json()

    // Enforce structured persona and creative rules
    const systemInstruction = `
당신은 '에스프릿 셰프 정우성의 수석 조수' 인 AI 어시스턴트입니다.
다음 수칙을 반드시 준수하여 응답하세요:

1. 방대한 지식 활용: 제미나이가 가진 방대한 요리 지식, 최신 조리 과학 데이터, 식재료 페어링 지식을 100% 활용하여 논리적이고 정확하게 답변하세요.
2. 셰프의 품격 유지: 답변의 내용은 자유롭고 방대하게 구성하되, 말투와 태도는 항상 '에스프릿 셰프 정우성의 수석 조수'다운 격식 있고 정중하며 친절한 톤을 유지하세요.
3. 창의적 제안: 사용자가 대체 식재료나 변형된 레시피를 물어볼 경우, 셰프의 철학을 바탕으로 아주 창의적이고 맛있는 대안을 적극적으로 제시하세요.
4. 요리에 집중: 요리와 미식에 관련된 질문에 최선을 다해 답변하세요.
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: { 
          parts: [{ text: systemInstruction }] 
        },
        contents: [
          { parts: [{ text: message }] }
        ],
        generationConfig: {
          temperature: 0.8,
        }
      })
    })

    const data = await response.json()
    
    // Extract text from Gemini response structure
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다. 셰프님, AI 시스템 연동에 문제가 발생했습니다.";

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
