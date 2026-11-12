import {session,response} from './auth.mjs';
export async function notify(env, host, notification, inquiry, reference) {
  if (notification.status === 'sent') return true;

  const localSink = host === '127.0.0.1' && env.INQUIRY_LOCAL_MAIL === '1';
  if (!notification.recipient || !env.INQUIRY_FROM || (!localSink && !env.RESEND_API_KEY)) return false;

  const lease='sending:'+Date.now()+':'+crypto.randomUUID();
  const claimed=await env.DB.prepare("UPDATE notifications SET status=? WHERE id=? AND (status='pending' OR (status LIKE 'sending:%' AND CAST(substr(status,9) AS INTEGER)<?)) RETURNING id")
    .bind(lease,notification.id,Date.now()-60000).first();
  if(!claimed)return (await env.DB.prepare('SELECT status FROM notifications WHERE id=?').bind(notification.id).first())?.status==='sent';

  try {
    const response = await fetch(localSink ? 'http://127.0.0.1:8789/emails' : 'https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': reference,
        ...(localSink ? {} : { Authorization: 'Bearer ' + env.RESEND_API_KEY }),
      },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        from: env.INQUIRY_FROM,
        to: [notification.recipient],
        subject: 'SUKHA inquiry ' + reference,
        text: [reference, inquiry.name, inquiry.email, inquiry.summary].join('\n\n'),
      }),
    });
    if (!response.ok) throw new Error('Notification not accepted');

    await env.DB.prepare("UPDATE notifications SET status='sent' WHERE id=? AND status=?")
      .bind(notification.id,lease).run();
    return true;
  } catch {
    await env.DB.prepare("UPDATE notifications SET status='pending' WHERE id=? AND status=?").bind(notification.id,lease).run();
    return false;
  }
}

export async function onInquiryNotifications({request,env}){
 if(!env.TEAM_DB||!env.DB)return response({error:'询盘服务暂不可用。'},503);
 const user=await session(request,env);if(!user)return response({error:'请先登录。'},401);
 if(user.role!=='admin')return response({error:'仅管理员可处理询盘通知。'},403);
 if(request.method==='GET'){
  const rows=await env.DB.prepare("SELECT n.inquiry_id AS reference,n.status,n.created_at,i.name,i.email,i.payload FROM notifications n JOIN inquiries i ON i.id=n.inquiry_id WHERE n.status!='sent' ORDER BY n.created_at LIMIT 100").all();
  return response({notifications:rows.results.map(r=>({reference:r.reference,status:r.status.startsWith('sending:')?'sending':'pending',createdAt:r.created_at,name:r.name,email:r.email,summary:JSON.parse(r.payload).summary||''}))});
 }
 if(request.method!=='POST')return response({error:'Method not allowed'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return response({error:'Invalid origin'},403);
 if(env.TEAM_PUBLISH!=='1')return response({error:'测试环境不能发送正式通知。'},403);
 if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')return response({error:'JSON required'},415);
 let raw='';const reader=request.body?.getReader();if(!reader)return response({error:'Invalid request'},400);
 for(;;){const {value,done}=await reader.read();if(done)break;if(raw.length+value.length>1000){await reader.cancel();return response({error:'Request too large'},413);}raw+=new TextDecoder().decode(value);}
 let reference;try{reference=JSON.parse(raw).reference;}catch{return response({error:'Invalid JSON'},400);}
 if(typeof reference!=='string'||!/^INQ-[A-F0-9]{8}(?:-[A-F0-9]{4}){3}-[A-F0-9]{12}$/.test(reference))return response({error:'询盘编号无效。'},400);
 const row=await env.DB.prepare('SELECT n.id,n.recipient,n.status,i.name,i.email,i.payload FROM notifications n JOIN inquiries i ON i.id=n.inquiry_id WHERE n.inquiry_id=?').bind(reference).first();
 if(!row)return response({error:'询盘通知不存在。'},404);
 if(!row.recipient&&env.INQUIRY_EMAIL){await env.DB.prepare("UPDATE notifications SET recipient=? WHERE id=? AND recipient=''").bind(env.INQUIRY_EMAIL,row.id).run();row.recipient=env.INQUIRY_EMAIL;}
 const emailSent=await notify(env,new URL(request.url).hostname,row,{name:row.name,email:row.email,summary:JSON.parse(row.payload).summary||''},reference);
 return response({reference,emailSent});
}

