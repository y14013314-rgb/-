export async function uploadPhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw new Error('请选择 20 MB 以内的 JPG、PNG 或 WebP 图片。');
 const bitmap=await createImageBitmap(file),scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 let blob;for(const quality of [.85,.7,.5]){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=512*1024)break;}
 if(!blob||blob.type!=='image/webp'||blob.size>512*1024)throw new Error('图片压缩失败，请选择较小的图片或填写图片地址。');
 const result=await fetch('/api/team/upload',{method:'POST',headers:{'Content-Type':'image/webp'},body:blob}),data=await result.json();if(!result.ok)throw new Error(data.error||'上传失败');return data.url;
}
