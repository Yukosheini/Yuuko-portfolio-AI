import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes, pbkdf2Sync} from 'node:crypto';

let handler;
const password = randomBytes(24).toString('hex');
const salt = randomBytes(24).toString('hex');
const env = {ADMIN_PASSWORD_SALT:salt, ADMIN_PASSWORD_HASH:pbkdf2Sync(password,salt,600000,32,'sha256').toString('hex'), LOGIN_SESSION_SECRET:randomBytes(48).toString('hex')};
env.SUPABASE_URL='https://test.invalid'; env.SUPABASE_SERVICE_ROLE_KEY='test';
globalThis.Deno={env:{get:name=>env[name]},serve:fn=>{handler=fn;}};
const counters=new Map(), nonces=new Set();
globalThis.fetch=async(url,init)=>{
 const body=JSON.parse(init.body); let allowed;
 if(url.endsWith('/consume_login_attempt')) {const n=(counters.get(body.p_bucket)||0)+1;counters.set(body.p_bucket,n);allowed=n<=body.p_limit;}
 else {allowed=!nonces.has(body.p_nonce);nonces.add(body.p_nonce);}
 return new Response(JSON.stringify(allowed));
};
await import('../supabase/functions/login/index.ts');
async function call(body,origin='http://localhost:8000') {const res=await handler(new Request('https://test.invalid',{method:'POST',headers:{origin,'x-forwarded-for':'127.0.0.1'},body:JSON.stringify(body)}));return {status:res.status,data:await res.json()};}
test('guest captcha, single use, session and token tampering',async()=>{
 const challenge=await call({action:'challenge'});assert.equal(challenge.status,200);
 const nums=challenge.data.question.match(/\d+/g).map(Number);
 const input={action:'guest',challenge:challenge.data.challenge,answer:String(nums[0]+nums[1])};
 const guest=await call(input);assert.equal(guest.status,200);
 assert.equal((await call({action:'session',token:guest.data.token})).data.role,'guest');
 assert.equal((await call(input)).status,401);
 assert.equal((await call({action:'session',token:guest.data.token.slice(0,-8)+'AAAAAAAA'})).status,401);
});
test('wrong captcha fails',async()=>{const c=await call({action:'challenge'});assert.equal((await call({action:'guest',challenge:c.data.challenge,answer:'999'})).status,401);});
test('admin password, role and brute force limit',async()=>{
 const admin=await call({action:'admin',password:password});assert.equal(admin.status,200);
 assert.equal((await call({action:'session',token:admin.data.token})).data.role,'admin');
 for(let i=0;i<4;i++) assert.equal((await call({action:'admin',password:'incorrect'})).status,401);
 assert.equal((await call({action:'admin',password:password})).status,429);
});
test('rejects unsupported origins and missing configuration',async()=>{
 assert.equal((await call({action:'challenge'},'https://evil.invalid')).status,403);
 const secret=env.LOGIN_SESSION_SECRET;delete env.LOGIN_SESSION_SECRET;
 assert.equal((await call({action:'challenge'})).status,503);env.LOGIN_SESSION_SECRET=secret;
});
