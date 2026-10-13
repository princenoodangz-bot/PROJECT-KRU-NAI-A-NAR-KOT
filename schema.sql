-- 1. ผู้ใช้งานและระบบ Single Session Token
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'student',
  avatar_url TEXT,
  active_session_token TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. การตั้งค่าระบบกลาง
CREATE TABLE IF NOT EXISTS system_configs (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO system_configs (key, value) VALUES 
('target_exam_date', '2026-11-20T09:00:00Z'),
('target_exam_title', 'สอบครูผู้ช่วย สพฐ. รอบทั่วไป'),
('daily_quote', 'ความสำเร็จไม่ได้มาจากสิ่งที่ทำเป็นครั้งคราว แต่มาจากสิ่งที่คุณทำอย่างสม่ำเสมอในทุก ๆ วัน');

-- 3. หมวดหมู่วิชา
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  color_gradient TEXT,
  icon_name TEXT DEFAULT 'school'
);

-- 4. ชุดข้อสอบ
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  subject_id TEXT,
  title TEXT NOT NULL,
  question_count INTEGER DEFAULT 20,
  time_limit_minutes INTEGER DEFAULT 30,
  time_per_question_seconds INTEGER DEFAULT 120,
  timer_mode TEXT DEFAULT 'countdown_total',
  shuffle_choices BOOLEAN DEFAULT 1,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- 5. ข้อสอบ
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  choice_a TEXT NOT NULL,
  choice_a_image_url TEXT,
  choice_b TEXT NOT NULL,
  choice_b_image_url TEXT,
  choice_c TEXT NOT NULL,
  choice_c_image_url TEXT,
  choice_d TEXT NOT NULL,
  choice_d_image_url TEXT,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  FOREIGN KEY (exam_id) REFERENCES exams(id)
);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);

-- 6. ประวัติการสอบ
CREATE TABLE IF NOT EXISTS exam_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  total_attempted INTEGER NOT NULL,
  total_correct INTEGER NOT NULL,
  score_percentage REAL NOT NULL,
  time_spent_seconds INTEGER NOT NULL,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (exam_id) REFERENCES exams(id)
);

-- 7. บันทึกข้อที่ตอบผิด
CREATE TABLE IF NOT EXISTS wrong_answers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  selected_answer TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  resolved BOOLEAN DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);