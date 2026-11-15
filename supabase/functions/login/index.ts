const origins = new Set(['https://yukosheini.github.io', 'https://managerial-pink-tbxiaktl.edgeone.dev', 'http://localhost:8000', 'http://127.0.0.1:8000']);
const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const decode = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const headers = {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':origins.has(origin) ? origin : 'https://yukosheini.github.io','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
  const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers});
  if (origin && !origins.has(origin)) return reply({error:'Tên miền chưa được hỗ trợ.'},403);
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (req.method !== 'POST') return reply({error:'Chỉ hỗ trợ POST.'},405);
  try {
    const raw = await req.text();
    if (raw.length > 4096) return reply({error:'Dữ liệu quá dài.'},413);
    let body; try {body = JSON.parse(raw);} catch {return reply({error:'Dữ liệu không hợp lệ.'},400);}
    const sessionSecret = Deno.env.get('LOGIN_SESSION_SECRET');
    const passwordHash = Deno.env.get('ADMIN_PASSWORD_HASH');
    const salt = Deno.env.get('ADMIN_PASSWORD_SALT');
    if (!sessionSecret || !passwordHash || !salt) return reply({error:'Máy chủ đăng nhập chưa được cấu hình.'},503);
    const key = await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',encoder.encode(sessionSecret)), 'AES-GCM',false,['encrypt','decrypt']);
    const seal = async (data: unknown) => {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(JSON.stringify(data))));
      return encode(new Uint8Array([...iv,...encrypted]));
    };
    const open = async (token: unknown) => {
      if (typeof token !== 'string' || token.length > 2048) throw new Error('invalid');
      const bytes = decode(token);
      const data = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},key,bytes.slice(12))));
      if (!data.exp || data.exp < Date.now()) throw new Error('expired');
      return data;
    };
    if (body?.action === 'session') {
      try {const data = await open(body.token); if (data.type !== 'session' || !['admin','guest'].includes(data.role)) throw new Error(); return reply({role:data.role});}
      catch {return reply({error:'Phiên đăng nhập đã hết hạn.'},401);}
    }
    if (!['challenge','guest','admin'].includes(body?.action)) return reply({error:'Yêu cầu không hợp lệ.'},400);
    const url = Deno.env.get('SUPABASE_URL');
    const secrets = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const serviceKey = secrets.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return reply({error:'Máy chủ chưa sẵn sàng.'},503);
    const rpc = async (name: string, data: unknown) => {
      const response = await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(10000)});
      if (!response.ok) throw new Error('database');
      return response.json();
    };
    // Supabase gateway supplies the client address. Store only a keyed digest.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const bucket = hex(await crypto.subtle.digest('SHA-256',encoder.encode(`${sessionSecret}:${ip}:${body.action}`)));
    if (!await rpc('consume_login_attempt',{p_bucket:bucket,p_limit:body.action === 'admin' ? 5 : 60})) return reply({error:'Bạn đã thử quá nhiều lần. Vui lòng quay lại sau 15 phút.'},429);
    if (body.action === 'challenge') {
      const random = crypto.getRandomValues(new Uint32Array(2));
      const a = random[0] % 20 + 1, b = random[1] % 20 + 1;
      return reply({question:`${a} + ${b} = ?`,challenge:await seal({type:'captcha',answer:String(a+b),nonce:crypto.randomUUID(),exp:Date.now()+120000})});
    }
    let role = 'guest';
    if (body.action === 'guest') {
      try {
        const data = await open(body.challenge);
        if (data.type !== 'captcha' || !await rpc('consume_login_challenge',{p_nonce:data.nonce}) || typeof body.answer !== 'string' || body.answer !== data.answer) throw new Error();
      } catch {return reply({error:'Captcha sai, đã dùng hoặc hết hạn. Vui lòng nhập mã mới.'},401);}
    } else {
      if (typeof body.password !== 'string' || body.password.length > 128) return reply({error:'Mật khẩu không đúng.'},401);
      const material = await crypto.subtle.importKey('raw',encoder.encode(body.password),'PBKDF2',false,['deriveBits']);
      const digest = hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:600000},material,256));
      let difference = digest.length ^ passwordHash.length;
      for (let i=0;i<digest.length;i++) difference |= digest.charCodeAt(i) ^ (passwordHash.charCodeAt(i) || 0);
      if (difference !== 0) return reply({error:'Mật khẩu không đúng.'},401);
      role = 'admin';
    }
    return reply({token:await seal({type:'session',role,exp:Date.now()+(role === 'admin' ? 3600000 : 28800000),nonce:crypto.randomUUID()})});
  } catch {return reply({error:'Máy chủ tạm thời chưa sẵn sàng. Vui lòng thử lại.'},503);}
});
