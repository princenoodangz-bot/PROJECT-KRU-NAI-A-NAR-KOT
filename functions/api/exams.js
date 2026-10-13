export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const category = url.searchParams.get("category") || "all";

  try {
    // 1. ดึงข้อมูลวิชาหลักและสถิติสะสม
    let subjectQuery = `
      SELECT 
        s.id, s.code, s.title, s.color_gradient, s.icon_name,
        COALESCE(SUM(ea.total_attempted), 0) AS answered_count,
        COALESCE(MAX(ea.score_percentage), 0) AS latest_score
      FROM subjects s
      LEFT JOIN exams e ON e.subject_id = s.id
      LEFT JOIN exam_attempts ea ON ea.exam_id = e.id
    `;
    const params = [];

    if (search) {
      subjectQuery += ` WHERE s.title LIKE ? OR s.code LIKE ? `;
      params.push(`%${search}%`, `%${search}%`);
    }

    subjectQuery += ` GROUP BY s.id ORDER BY s.title ASC`;

    const { results: courses } = await env.DB.prepare(subjectQuery).bind(...params).all();

    // 2. ดึงข้อสอบแนะนำประจำวัน
    const { results: recommended } = await env.DB.prepare(`
      SELECT e.id, e.title, e.question_count, e.time_limit_minutes, s.title AS subject_title
      FROM exams e
      LEFT JOIN subjects s ON s.id = e.subject_id
      WHERE e.is_active = 1
      LIMIT 5
    `).all();

    return new Response(JSON.stringify({
      courses: courses.length > 0 ? courses : [
        { id: "sub_eng", code: "ENG", title: "ภาษาอังกฤษ", color_gradient: "from-[#983BE5] via-[#C834A8] to-[#E83E8C]", icon_name: "fa-language", answered_count: 104, latest_score: 81.25 },
        { id: "sub_soc", code: "SOC", title: "สังคมศึกษา", color_gradient: "from-[#FF5238] via-[#FF7528] to-[#FFA238]", icon_name: "fa-earth-americas", answered_count: 0, latest_score: 0 },
        { id: "sub_math", code: "MATH", title: "คณิตศาสตร์", color_gradient: "from-[#2B5876] to-[#4E4376]", icon_name: "fa-calculator", answered_count: 75, latest_score: 90.00 }
      ],
      recommended: recommended.length > 0 ? recommended : [
        { id: "rec_1", title: "Relative pronouns (ชุดที่ 3)", subtitle: "(e.g. which, that)", question_count: 5, tag: "จุดอ่อน", tag_color: "rose" },
        { id: "rec_2", title: "ความรู้รอบตัว & รัฐธรรมนูญไทย", subtitle: "(เตรียมสอบ ก.พ.)", question_count: 20, time_limit_minutes: 25, tag: "ยอดนิยม", tag_color: "amber" }
      ]
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}