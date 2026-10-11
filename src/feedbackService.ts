// Public form endpoint; contains no API key or Slack credential.
export const feedbackEndpoint: string = 'https://formspree.io/f/xaeqbbaw';
export type FeedbackSubmission = { rating: 'up' | 'down' | null; comment: string; email: string; website: string };
export async function sendFeedback(endpoint: string, submission: FeedbackSubmission, request: typeof fetch = fetch) {
  if (!/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint)) throw new Error('Feedback is not connected yet. Please try again later.');
  const message = submission.comment.trim();
  if (!message || message.length > 2000 || submission.email.length > 254) throw new Error('Please enter a comment of up to 2,000 characters.');
  const body = new FormData();
  body.set('subject', 'DynaDraw feedback');
  body.set('message', message);
  body.set('rating', submission.rating === 'up' ? 'Thumbs up' : submission.rating === 'down' ? 'Thumbs down' : 'Not selected');
  if (submission.email.trim()) body.set('email', submission.email.trim());
  body.set('_gotcha', submission.website);
  let response: Response;
  try {
    response = await request(endpoint, { method: 'POST', body, headers: { Accept: 'application/json' }, credentials: 'omit', signal: AbortSignal.timeout(20000) });
  } catch {
    throw new Error('We couldn’t confirm delivery. Your message is still here. Check your connection before trying again.');
  }
  const result = await response.json().catch(() => null);
  if (response.status === 429) throw new Error('Feedback is temporarily busy. Please wait a few minutes before trying again.');
  if (!response.ok || result?.ok !== true) throw new Error('Your feedback wasn’t confirmed. Your message is still here; please try again later.');
}
