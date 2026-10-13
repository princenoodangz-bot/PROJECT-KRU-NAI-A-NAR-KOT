export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { questionId } = await request.json();
    if (!questionId) {
      return new Response(JSON.stringify({ error: "ไม่พบรหัสคำถาม" }), { status: 400 });
    }

    // ดึงเฉลยและคำอธิบายเฉพาะข้อที่ร้องขอจาก D1
    const question = await env.DB.prepare(
      "SELECT correct_answer, explanation FROM questions WHERE id = ?"
    ).bind(questionId).first();

    if (!question) {
      return new Response(JSON.stringify({ error: "ไม่พบข้อสอบในระบบ" }), { status: 404 });
    }

    return new Response(JSON.stringify({
      success: true,
      correctAnswer: question.correct_answer,
      explanation: question.explanation || "ไม่มีคำอธิบายเพิ่มเติมสำหรับข้อนี้"
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}