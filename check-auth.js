// ตรวจสอบสถานะการล็อกอินทุกครั้งที่เปิดหน้าใดๆ
(async function verifySession() {
  const currentPath = window.location.pathname;
  if (currentPath.endsWith('login.html')) return; // ยกเว้นหน้าล็อกอิน

  const token = localStorage.getItem('kru_active_session');
  const userInfo = JSON.parse(localStorage.getItem('kru_user_info') || '{}');

  if (!token || !userInfo.id) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userInfo.id, token: token })
    });
    const data = await res.json();
    if (!data.valid) {
      alert("บัญชีนี้มีการเข้าสู่ระบบจากอุปกรณ์อื่นแล้ว ระบบจะนำคุณออกจากระบบ");
      localStorage.clear();
      window.location.href = 'login.html';
    }
  } catch (e) {
    console.warn("Session check offline or error:", e);
  }
})();