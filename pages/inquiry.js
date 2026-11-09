'use strict';
(() => {
  const dialog = document.querySelector('.quote-dialog');
  const review = dialog.querySelector('#quote-review');
  const form = document.createElement('form');
  form.hidden = true;
  form.innerHTML = `
    <label>Email for our reply <input type="email" name="email" maxlength="254" autocomplete="email" required></label>
    <label class="quote-check"><input type="checkbox" name="consent" required>
      I agree to the <a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a>
      and to sharing my inquiry with SUKHA.</label>
    <button type="submit" class="button">Submit inquiry to SUKHA</button>
    <p role="status" aria-live="polite"></p>`;
  review.querySelector('.quote-actions').before(form);
  const reviewNote = review.querySelector('p');
  const originalNote = reviewNote.textContent;
  const status = form.querySelector('[role="status"]');
  const button = form.querySelector('button');
  let previousDetails = '';
  let requestId = '';
  let lastResult;
  let submitting = false;

  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (link && dialog.open && link.hash === '#request-quote') {
      form.hidden = !link.hasAttribute('data-pages-inquiry');
      reviewNote.textContent = originalNote;
    }
  });
  function showResult(result) {
    reviewNote.textContent = 'Your inquiry has been saved.';
    status.textContent = result.emailSent
      ? `Inquiry ${result.reference}. The team’s email notification was accepted for delivery.`
      : `Inquiry ${result.reference}. The team’s email notification is pending. You can retry or use a contact option below.`;
    button.textContent = result.emailSent ? 'Inquiry submitted' : 'Retry email notification';
    button.disabled = result.emailSent;
  }
  dialog.querySelector('#quote-builder').addEventListener('submit', () => {
    if (submitting) return;
    reviewNote.textContent = originalNote;
    status.textContent = '';
    button.textContent = 'Submit inquiry to SUKHA';
    button.disabled = false;
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    const fields = new FormData(form);
    const details = {
      name: dialog.querySelector('[name="Name"]').value.trim(),
      email: String(fields.get('email')).trim().toLowerCase(),
      summary: dialog.querySelector('#quote-text').value,
      consent: fields.has('consent'),
    };
    const serialized = JSON.stringify(details);
    if (serialized !== previousDetails) {
      previousDetails = serialized;
      requestId = crypto.randomUUID();
      lastResult = undefined;
    }
    submitting = true;
    button.disabled = true;
    form.elements.email.readOnly = true;
    status.textContent = 'Submitting your inquiry…';
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...details, requestId }),
      });
      const result = await response.json();
      if (!response.ok || !result.saved) throw new Error(result.error);
      lastResult = result;
      showResult(result);
    } catch {
      status.textContent = lastResult
        ? `Inquiry ${lastResult.reference} is saved. Notification could not be confirmed. Retry or use a contact option below.`
        : 'We could not confirm your inquiry was saved. Retry with the same details or use a contact option below.';
      button.disabled = false;
    } finally {
      submitting = false;
      form.elements.email.readOnly = false;
    }
  });
})();
