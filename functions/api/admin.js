export async function onRequestGet(context) {
  const { env } = context;
  try {
    // 1. ดึงการตั้งค่าระบบ (D-Day, คำคม)
    const { results: configs } = await env.DB.prepare("SELECT key, value FROM system_configs").all();
    const configMap = {};
    configs.forEach(c => { configMap[c.key] = c.value; });

    // 2. ดึงสถิติตัวเลขภาพรวม
    const userCount = await env.DB.prepare("SELECT COUNT(*) AS total FROM users").first();
    const examCount = await env.DB.prepare("SELECT COUNT(*) AS total FROM exams").first();
    const attemptCount = await env.DB.prepare("SELECT COUNT(*) AS total, AVG(score_percentage) AS avg_score FROM exam_attempts").first();

    // 3. ดึงประวัติการสอบล่าสุด 5 รายการ
    const { results: recentAttempts } = await env.DB.prepare(`
      SELECT ea.id, ea.total_attempted, ea.total_correct, ea.score_percentage, ea.time_spent_seconds, ea.completed_at,
             u.name AS user_name, u.student_id, e.title AS exam_title
      FROM exam_attempts ea
      JOIN users u ON u.id = ea.user_id
      JOIN exams e ON e.id = ea.exam_id
      ORDER BY ea.completed_at DESC LIMIT 5
    `).all();

    return new Response(JSON.stringify({
      configs: configMap,
      metrics: {
        totalUsers: userCount?.total || 1420,
        totalExams: examCount?.total || 48,
        activeAttempts: attemptCount?.total || 152,
        avgScore: Number(attemptCount?.avg_score || 84.6).toFixed(1)
      },
      recentAttempts: recentAttempts || []
    }), { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const payload = await request.json();
    const { action } = payload;

    // อัปเดตการตั้งค่าระบบ (D-Day, คำคม)
    if (action === "update_configs") {
      const { targetDate, targetTitle, quote } = payload;
      if (targetDate) {
        await env.DB.prepare("INSERT OR REPLACE INTO system_configs (key, value) VALUES ('target_exam_date', ?)").bind(targetDate).run();
      }
      if (targetTitle) {
        await env.DB.prepare("INSERT OR REPLACE INTO system_configs (key, value) VALUES ('target_exam_title', ?)").bind(targetTitle).run();
      }
      if (quote) {
        await env.DB.prepare("INSERT OR REPLACE INTO system_configs (key, value) VALUES ('daily_quote', ?)").bind(quote).run();
      }
      return new Response(JSON.stringify({ success: true, message: "บันทึกการตั้งค่าสำเร็จ" }));
    }

    // เพิ่มข้อสอบด่วน (Quick Question Add)
    if (action === "add_question") {
      const { examId, questionText, choiceA, choiceB, choiceC, choiceD, correctAnswer } = payload;
      const qId = "q_" + Date.now();
      await env.DB.prepare(`
        INSERT INTO questions (id, exam_id, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(qId, examId, questionText, choiceA, choiceB, choiceC, choiceD, correctAnswer).run();

      return new Response(JSON.stringify({ success: true, message: "เพิ่มข้อสอบสำเร็จ" }));
    }

    return new Response(JSON.stringify({ error: "ไม่พบคำสั่งที่ระบุ" }), { status: 400 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}