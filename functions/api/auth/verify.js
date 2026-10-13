export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { userId, token } = await request.json();
    const user = await env.DB.prepare(
      "SELECT active_session_token FROM users WHERE id = ?"
    ).bind(userId).first();

    const isValid = user && user.active_session_token === token;
    return new Response(JSON.stringify({ valid: !!isValid }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ valid: false }), { status: 500 });
  }
}