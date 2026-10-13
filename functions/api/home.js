export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") || "usr_guest";

  try {
    // 1. ดึงการตั้งค่าระบบ (วันสอบเป้าหมาย, คำคมประจำวัน)
    const { results: configs } = await env.DB.prepare(
      "SELECT key, value FROM system_configs"
    ).all();

    const configMap = {};
    configs.forEach(c => { configMap[c.key] = c.value; });

    // 2. ดึงสถิติคอร์สและวิชาของผู้ใช้ (จำนวนข้อที่ทำแล้ว และคะแนนล่าสุด)
    const { results: courses } = await env.DB.prepare(`
      SELECT 
        s.id, s.code, s.title, s.color_gradient,
        COALESCE(SUM(ea.total_attempted), 0) AS total_answered,
        COALESCE(
          (SELECT score_percentage FROM exam_attempts 
           WHERE exam_id IN (SELECT id FROM exams WHERE subject_id = s.id) 
             AND user_id = ? 
           ORDER BY completed_at DESC LIMIT 1), 
          0
        ) AS latest_score
      FROM subjects s
      LEFT JOIN exams e ON e.subject_id = s.id
      LEFT JOIN exam_attempts ea ON ea.exam_id = e.id AND ea.user_id = ?
      GROUP BY s.id
    `).bind(userId, userId).all();

    return new Response(JSON.stringify({
      targetExamDate: configMap.target_exam_date || "2026-11-20T09:00:00Z",
      targetExamTitle: configMap.target_exam_title || "สอบครูผู้ช่วย สพฐ. รอบทั่วไป",
      dailyQuote: configMap.daily_quote || "ความสำเร็จไม่ได้มาจากสิ่งที่ทำเป็นครั้งคราว แต่มาจากสิ่งที่คุณทำอย่างสม่ำเสมอในทุก ๆ วัน",
      courses: courses.length > 0 ? courses : [
        { id: "sub_eng", code: "ENG", title: "ภาษาอังกฤษ", total_answered: 104, latest_score: 81.25, color_gradient: "from-[#9333ea] via-[#a855f7] to-[#c026d3]" },
        { id: "sub_soc", code: "SOC", title: "สังคมศึกษา", total_answered: 0, latest_score: 0, color_gradient: "from-[#ea580c] via-[#f97316] to-[#fb923c]" }
      ]
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}