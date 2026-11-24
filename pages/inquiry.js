'use strict';
(() => {
  const dialog = document.querySelector('.quote-dialog');
  if(!dialog)return;
  const review = dialog.querySelector('#quote-review');
  const form=dialog.querySelector('#quote-builder');
  const send=form.querySelector('[type="submit"]');
  send.textContent='Review my inquiry';
  send.insertAdjacentHTML('beforebegin',`
    <label>Email address (required) <input type="email" name="email" maxlength="254" autocomplete="email" required></label>
    <label class="quote-check"><input type="checkbox" name="consent" required>
      <span>I agree to the <a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a> and to sharing my inquiry with SUKHA.</span></label>`);
  const actions=review.querySelector('.quote-actions');
  const backup=window.SukhaInquiry.backupContacts(review,[...actions.querySelectorAll('a,#quote-copy'),review.querySelector('#quote-copy-status')]);
  const status=document.createElement('p');status.setAttribute('role','status');actions.before(status);
  const button=document.createElement('button');button.type='button';button.textContent='Retry submission';actions.prepend(button);
  const reviewNote = review.querySelector('p');
  const heading=review.querySelector('h3');heading.tabIndex=-1;
  heading.after(reviewNote,status,actions);
  button.className='inquiry-confirm';
  let previousDetails = '';
  let requestId = '';
  let lastResult;
  let submitting = false;

  function showResult(result) {
    heading.textContent=result.emailSent?'✓ Inquiry sent to SUKHA':'Inquiry saved — email pending';
    heading.className=result.emailSent?'inquiry-sent':'';
    reviewNote.textContent = result.emailSent?'Thank you. Our team will follow up by email. No additional message is needed.':'Your inquiry has been saved.';
    status.textContent = result.emailSent
      ? `Your reference: ${result.reference}`
      : `Inquiry ${result.reference}. The team’s email notification is pending. You can retry or use a contact option below.`;
    button.textContent = result.emailSent ? 'Inquiry submitted' : 'Retry email notification';
    button.disabled = result.emailSent;
    button.hidden=result.emailSent;backup.open=!result.emailSent;
    heading.focus();
  }
  function readyToReview(){
    heading.className='';heading.textContent='Review your inquiry';
    reviewNote.textContent='Nothing has been sent yet. Check your details, then confirm to email our travel team.';
    status.textContent='';backup.open=false;button.hidden=false;button.disabled=false;button.textContent='Confirm & Send Inquiry';heading.focus();
  }
  form.addEventListener('submit',readyToReview);
  const cruise=document.getElementById('cruise-inquiry');let cruiseDetails;
  if(cruise){
    dialog.querySelector('#quote-heading').textContent=cruise.dataset.type==='rail'?'Your train inquiry':'Your cruise inquiry';
    dialog.querySelector('#quote-heading + p').hidden=true;
    cruise.addEventListener('cruise-review',event=>{
      if(submitting)return;
      cruiseDetails=event.detail;dialog.querySelector('#quote-text').value=cruiseDetails.summary;
      dialog.querySelector('#quote-whatsapp').href=window.SukhaInquiry.whatsappUrl(cruiseDetails.summary);
      form.hidden=true;review.hidden=false;dialog.showModal();readyToReview();
    });
    dialog.querySelector('#quote-edit').onclick=()=>{dialog.close();cruise.elements.departure.focus();};
  }
  button.addEventListener('click',sendInquiry);
  async function sendInquiry(event){
    event.preventDefault();
    if (submitting) return;
    const fields = new FormData(form);
    const details = cruiseDetails || {
      name: dialog.querySelector('[name="Name"]').value.trim(),
      email: String(fields.get('email')).trim().toLowerCase(),
      summary: dialog.querySelector('#quote-text').value,
      consent: fields.has('consent'),
      type:location.pathname.startsWith('/silk-road-luxury-trains/')?'rail':location.pathname.startsWith('/yangtze-river-cruises/')?'cruise':'private',
    };
    const product=location.pathname.match(/^\/journeys\/([a-z0-9-]+)\/?$/);
    if(product||/^\/private-china-tours\/(destinations|travel-styles|signature-journeys)(?:\/|$)/.test(location.pathname)){
      const entry=new URL(location.href).searchParams.get('via')||location.pathname;
      const source=/^\/private-china-tours\/(destinations|travel-styles|signature-journeys)\/(?:[a-z0-9-]+\/)?$/.test(entry)?entry:location.pathname.replace(/\/?$/,'/');
      details.type='private';details.source={page:source,product:product?.[1]||''};
      details.summary+='\nSource page: '+source+(product?'\nProduct ID: '+product[1]:'');
    }
    const serialized = JSON.stringify(details);
    if (serialized !== previousDetails) {
      previousDetails = serialized;
      requestId = crypto.randomUUID();
      lastResult = undefined;
    }
    submitting = true;
    button.disabled = true;button.textContent='Sending…';heading.textContent='Sending your inquiry…';send.disabled=true;dialog.querySelector('#quote-edit').disabled=true;backup.open=false;
    reviewNote.textContent='Please wait for your inquiry reference.';
    form.elements.email.readOnly = true;
    status.textContent = 'Submitting your inquiry…';
    try {
      const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(serialized)))).map(b=>b.toString(16).padStart(2,'0')).join('');
      let cached;try{cached=JSON.parse(sessionStorage.getItem('sukha-product-inquiry-id'));}catch{}
      if(cached?.fingerprint===fingerprint)requestId=cached.requestId;
      try{sessionStorage.setItem('sukha-product-inquiry-id',JSON.stringify({fingerprint,requestId}));}catch{}
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...details, requestId }),
      });
      const result = await response.json();
      if (!response.ok || result.saved!==true || !result.reference) throw new Error(result.error);
      try{globalThis.SukhaAnalytics?.lead(result);}catch{}
      lastResult = result;
      showResult(result);
    } catch {
      heading.textContent=lastResult?'Inquiry saved — email unconfirmed':'Sending not confirmed';heading.focus();
      reviewNote.textContent=lastResult?'Your inquiry has been saved.':'Unable to confirm submission.';
      status.textContent = lastResult
        ? `Inquiry ${lastResult.reference} is saved. Notification could not be confirmed. Retry or use a contact option below.`
        : 'We could not confirm your inquiry was saved. Retry with the same details or use a contact option below.';
      button.textContent='Retry submission';button.hidden=false;button.disabled=false;backup.open=true;
    } finally {
      submitting = false;
      form.elements.email.readOnly = false;
      send.disabled=false;dialog.querySelector('#quote-edit').disabled=false;
    }
  }
})();
