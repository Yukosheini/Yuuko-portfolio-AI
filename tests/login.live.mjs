import assert from 'node:assert/strict';
const endpoint = 'https://ukjfzgjtnplumgvylinb.supabase.co/functions/v1/login';
const origin = 'https://yukosheini.github.io';
async function call(body, requestOrigin=origin) {
 const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:requestOrigin},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 return {status:res.status,data:await res.json()};
}
const captcha = await call({action:'challenge'}); assert.equal(captcha.status,200);
const values = captcha.data.question.match(/\d+/g).map(Number);
const input = {action:'guest',challenge:captcha.data.challenge,answer:String(values[0]+values[1])};
const guest=await call(input); assert.equal(guest.status,200);
assert.equal((await call({action:'session',token:guest.data.token})).data.role,'guest');
assert.equal((await call(input)).status,401);
console.log('PASS: guest login, session validation, captcha replay rejection');
assert.equal((await call({action:'session',token:guest.data.token.slice(0,-8)+'AAAAAAAA'})).status,401);
assert.equal((await call({action:'challenge'},'https://invalid.example')).status,403);
console.log('PASS: tampered tokens and unapproved origins rejected');
if(process.env.LOGIN_TEST_PASSWORD) {
 assert.equal((await call({action:'admin',password:'wrong-password-for-test'})).status,401);
 const admin=await call({action:'admin',password:process.env.LOGIN_TEST_PASSWORD}); assert.equal(admin.status,200);
 assert.equal((await call({action:'session',token:admin.data.token})).data.role,'admin');
 console.log('PASS: admin password verification and admin session');
}
