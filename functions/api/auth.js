export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { identifier, password, loginType } = await request.json();

    if (!identifier || !password) {
      return new Response(JSON.stringify({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }), { status: 400 });
    }

    // 1. ค้นหาผู้ใช้จาก student_id, email หรือเบอร์โทร
    let user;
    if (loginType === 'student') {
      user = await env.DB.prepare(
        "SELECT id, student_id, name, email, password_hash, role, avatar_url FROM users WHERE student_id = ?"
      ).bind(identifier.trim()).first();
    } else {
      user = await env.DB.prepare(
        "SELECT id, student_id, name, email, password_hash, role, avatar_url FROM users WHERE email = ? OR student_id = ?"
      ).bind(identifier.trim(), identifier.trim()).first();
    }

    // กรณีทดสอบครั้งแรก หากยังไม่มีผู้ใช้ในระบบ ให้ Mock Auto-provision สำหรับทดสอบทันที
    if (!user) {
      const newUserId = "usr_" + Math.random().toString(36).substr(2, 9);
      const studentId = loginType === 'student' ? identifier.trim() : "KRU-" + Math.floor(1000 + Math.random() * 9000);
      const name = "ว่าที่ครูผู้ช่วย " + studentId;

      await env.DB.prepare(`
        INSERT INTO users (id, student_id, name, email, password_hash, role)
        VALUES (?, ?, ?, ?, ?, 'student')
      `).bind(newUserId, studentId, name, identifier.includes('@') ? identifier : null, password).run();

      user = { id: newUserId, student_id: studentId, name, role: 'student' };
    }

    // 2. สร้าง Single Session Token ใหม่
    const newSessionToken = "sess_" + crypto.randomUUID();

    // 3. บันทึก Session Token ล่าสุดลงใน D1 (ตัดสิทธิ์เครื่องเก่าอัตโนมัติ)
    await env.DB.prepare(
      "UPDATE users SET active_session_token = ? WHERE id = ?"
    ).bind(newSessionToken, user.id).run();

    return new Response(JSON.stringify({
      success: true,
      token: newSessionToken,
      user: {
        id: user.id,
        studentId: user.student_id,
        name: user.name,
        role: user.role
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}