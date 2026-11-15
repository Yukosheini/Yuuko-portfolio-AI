(() => {
  'use strict';
  const endpoint = 'https://ukjfzgjtnplumgvylinb.supabase.co/functions/v1/login';
  const key = 'portfolio-session';
  const onLogin = location.pathname.endsWith('/login.html');
  const api = async body => {
    const response = await fetch(endpoint, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal:AbortSignal.timeout(15000)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Chưa thể đăng nhập. Vui lòng thử lại.');
    return data;
  };
  const readSession = () => {try {return sessionStorage.getItem(key);} catch {return null;}};
  const clear = () => {try {sessionStorage.removeItem(key);} catch { /* Storage may be disabled. */ }};
  if (!onLogin) {
    const token = readSession();
    if (!token) {location.replace('login.html'); return;}
    api({action:'session', token}).then(data => {
      const badge = document.createElement('div'); badge.className = 'auth-badge';
      const label = document.createElement('span'); label.textContent = data.role === 'admin' ? '◇ Quản trị viên' : '◉ Khách';
      const logout = document.createElement('button'); logout.type = 'button'; logout.textContent = 'Đăng xuất';
      logout.onclick = () => {clear(); location.replace('login.html');};
      badge.append(label, logout); document.body.append(badge);
    }).catch(() => {clear(); location.replace('login.html');});
    return;
  }
  let role = 'guest', challenge = null, busy = false, loading = false;
  const form = document.querySelector('#login-form'), status = document.querySelector('#login-status');
  const submit = document.querySelector('#login-submit'), answer = document.querySelector('#captcha-answer'), password = document.querySelector('#admin-password');
  async function refresh() {
    if (loading) return;
    loading = true; challenge = null; answer.value = ''; document.querySelector('#refresh-captcha').disabled = true;
    document.querySelector('#captcha-question').textContent = '…';
    try {const data = await api({action:'challenge'}); challenge = data.challenge; document.querySelector('#captcha-question').textContent = data.question;}
    catch {document.querySelector('#captcha-question').textContent = 'Chưa tải được'; status.textContent = 'Chưa kết nối được máy chủ đăng nhập. Hãy thử tải lại captcha.';}
    finally {loading = false; document.querySelector('#refresh-captcha').disabled = false;}
  }
  document.querySelectorAll('[data-role]').forEach(button => button.onclick = () => {
    if (busy) return;
    role = button.dataset.role; status.textContent = '';
    document.querySelectorAll('[data-role]').forEach(b => {b.classList.toggle('active',b === button); b.setAttribute('aria-pressed',String(b === button));});
    document.querySelector('#guest-fields').hidden = role !== 'guest'; document.querySelector('#admin-fields').hidden = role !== 'admin';
    answer.disabled = role !== 'guest'; answer.required = role === 'guest'; password.disabled = role !== 'admin'; password.required = role === 'admin'; password.value = '';
    submit.textContent = role === 'guest' ? 'Vào khám phá →' : 'Đăng nhập quản trị →';
    (role === 'guest' ? answer : password).focus();
  });
  document.querySelector('#refresh-captcha').onclick = refresh;
  form.onsubmit = async event => {
    event.preventDefault(); if (busy) return;
    if (role === 'guest' && !challenge) {status.textContent = 'Vui lòng tải lại captcha trước khi đăng nhập.'; return;}
    busy = true; submit.disabled = true; status.textContent = 'Đang xác minh…';
    try {
      const data = await api(role === 'guest' ? {action:'guest',challenge,answer:answer.value.trim()} : {action:'admin',password:password.value});
      password.value = ''; sessionStorage.setItem(key,data.token); location.replace('index.html');
    } catch (error) {password.value = ''; status.textContent = error.name === 'TypeError' || error.name === 'TimeoutError' ? 'Không kết nối được máy chủ. Vui lòng thử lại.' : error.message; if (role === 'guest') await refresh();}
    finally {busy = false; submit.disabled = false;}
  };
  refresh();
})();
