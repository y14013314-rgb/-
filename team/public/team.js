const $=id=>document.getElementById(id);let challenge;
async function api(action,body){const r=await fetch('/api/team/'+action,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const v=await r.json();if(!r.ok)throw new Error(v.error||'操作失败，请稍后再试。');return v;}
function showUser(user){$('send').hidden=true;$('verify').hidden=true;$('workspace').hidden=false;$('identity').textContent=user.email;$('message').textContent='';}
async function action(form,fn){const buttons=form.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);$('message').textContent='正在处理…';try{await fn();}catch(e){$('message').textContent=e.message;}finally{buttons.forEach(b=>b.disabled=false);}}
$('send').onsubmit=e=>{e.preventDefault();action(e.target,async()=>{const v=await api('request-code',{email:$('email').value});challenge=v.challenge;$('send').hidden=true;$('verify').hidden=false;$('message').textContent='验证码邮件已提交发送，请检查收件箱和垃圾邮件。10 分钟内有效。';$('code').focus();});};
$('verify').onsubmit=e=>{e.preventDefault();action(e.target,async()=>showUser(await api('verify',{challenge,code:$('code').value})));};
$('back').onclick=()=>{challenge=null;$('code').value='';$('verify').hidden=true;$('send').hidden=false;$('message').textContent='';};
$('logout').onclick=()=>action($('workspace'),async()=>{await api('logout',{});location.reload();});
api('me').then(showUser).catch(()=>{});
