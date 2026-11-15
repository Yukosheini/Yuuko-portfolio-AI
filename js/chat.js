(() => {
  'use strict';
  const endpoint = 'https://ukjfzgjtnplumgvylinb.supabase.co/functions/v1/chat';
  // Publishable key: intended for browsers. Database tables remain protected by RLS.
  const publicKey = 'sb_publishable_VYNLr0l85yrKahIVofhIQg_t4kAQ9Ea';
  const root = document.createElement('aside');
  root.id = 'portfolio-chat';
  root.setAttribute('aria-label', 'Trợ lý AI');
  root.innerHTML = `
    <section class="chat-panel" id="chat-panel" role="dialog" aria-label="Trò chuyện với trợ lý AI" aria-describedby="chat-disclaimer" hidden>
      <header class="chat-header"><div><strong>✦ Trợ lý của Đức</strong><small>Hồ sơ · Thành tựu · Lịch học</small></div><button type="button" class="chat-close" aria-label="Đóng cửa sổ chat">×</button></header>
      <div class="chat-messages" role="log" aria-label="Tin nhắn" aria-live="polite" aria-relevant="additions text"></div>
      <div class="chat-suggestions"><button type="button">Đức học trường nào?</button><button type="button">Lịch học kì 2?</button></div>
      <form class="chat-form"><textarea rows="2" maxlength="1000" aria-label="Câu hỏi của bạn" placeholder="Hỏi về Đức…" required></textarea><button type="submit" class="chat-send">Gửi</button></form>
      <p class="chat-disclaimer" id="chat-disclaimer">AI có thể trả lời sai, không cung cấp thông tin cá nhân cho AI</p>
    </section>
    <button type="button" class="chat-launcher" aria-controls="chat-panel" aria-expanded="false">💬 Hỏi AI</button>`;
  document.body.appendChild(root);
  const panel = root.querySelector('.chat-panel');
  const launcher = root.querySelector('.chat-launcher');
  const input = root.querySelector('textarea');
  const send = root.querySelector('.chat-send');
  const log = root.querySelector('.chat-messages');
  const history = [];
  let pending = false;
  const add = (text, kind = '') => {
    const bubble = document.createElement('p');
    bubble.className = `chat-message ${kind}`;
    bubble.textContent = text;
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;
    return bubble;
  };
  add('Chào bạn! Mình có thể giải đáp về hồ sơ, thành tựu và lịch học của Đức. Bạn muốn tìm hiểu điều gì?');
  const toggle = open => {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    if (open) input.focus(); else launcher.focus();
  };
  launcher.addEventListener('click', () => toggle(panel.hidden));
  root.querySelector('.chat-close').addEventListener('click', () => toggle(false));
  root.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) toggle(false); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); root.querySelector('form').requestSubmit(); }
  });
  root.querySelectorAll('.chat-suggestions button').forEach(button => button.addEventListener('click', () => {
    if (pending) return;
    input.value = button.textContent;
    root.querySelector('form').requestSubmit();
  }));
  root.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const message = input.value.trim();
    if (pending || !message) return;
    pending = true; send.disabled = true;
    root.querySelector('.chat-suggestions').hidden = true;
    add(message, 'user');
    input.value = '';
    const status = add('Đang trả lời…');
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: {'Content-Type': 'application/json', apikey: publicKey},
        body: JSON.stringify({message, history: history.slice(-6)}),
        signal: AbortSignal.timeout(45000),
      });
      const data = await response.json();
      if (!response.ok || typeof data.answer !== 'string') throw new Error(data.error || 'Chat tạm thời chưa sẵn sàng.');
      status.textContent = data.answer;
      if (!data.private) history.push({role: 'user', text: message}, {role: 'model', text: data.answer});
      history.splice(0, Math.max(0, history.length - 6));
    } catch (error) {
      status.textContent = error.name === 'TimeoutError' || error.name === 'TypeError'
        ? 'Không kết nối được AI. Bạn kiểm tra mạng và thử lại nhé.' : error.message;
      status.classList.add('error');
      input.value = message;
    } finally {
      pending = false; send.disabled = false;
      log.scrollTop = log.scrollHeight;
      if (!panel.hidden) input.focus();
    }
  });
})();
