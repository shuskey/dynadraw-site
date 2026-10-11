import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Send, CheckCircle2, ThumbsDown, ThumbsUp, X } from 'lucide-react';

import { feedbackEndpoint, sendFeedback } from './feedbackService';
import { track } from './analytics';
export default function Feedback({ close }: { close: () => void }) {
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  const [website, setWebsite] = useState('');
  const inFlight = useRef(false);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previous?.focus();
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || !comment.trim() || status === 'sent') return;
    inFlight.current = true; setStatus('sending'); setError('');
    try {
      await sendFeedback(feedbackEndpoint, { rating, comment, email: replyTo, website });
      setStatus('sent'); track('Feedback submitted');
    } catch (error) {
      setStatus('idle'); setError(error instanceof Error ? error.message : 'Feedback could not be sent. Please try again later.');
    } finally { inFlight.current = false; }
  }
  function dismiss() { if (!inFlight.current) close(); }
  return <div className="modal-backdrop" onClick={dismiss}><section ref={panel} className="object-modal feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title" onClick={e => e.stopPropagation()} onKeyDown={e => {
    if (e.key === 'Escape') dismiss();
    if (e.key === 'Tab') {
      const controls = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, a[href]');
      const first = controls?.[0], last = controls?.[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  }}>
    <button className="icon-button modal-close" aria-label="Close feedback" disabled={status === 'sending'} onClick={dismiss}><X size={20}/></button>
    <div className="eyebrow">A NOTE TO THE CREATOR</div><h2 id="feedback-title">Share your feedback</h2><p>Ideas, problems, or something you enjoyed—I’d love to hear from you.</p>
    {status === 'sent' ? <div className="feedback-success" role="status"><CheckCircle2 size={32}/><h3>Thanks for your feedback!</h3><p>Your message has been received. If you left your email, I can reply there.</p><button className="save-button" onClick={close}>Back to drawing</button></div> : <form onSubmit={submit} aria-busy={status === 'sending'}>
      <fieldset disabled={status === 'sending'} className="feedback-fields">
      <fieldset><legend>How’s DynaDraw working for you? <span>(optional)</span></legend><div className="feedback-ratings">
        <button type="button" aria-pressed={rating === 'up'} onClick={() => setRating(rating === 'up' ? null : 'up')}><ThumbsUp size={19}/> Enjoying it</button>
        <button type="button" aria-pressed={rating === 'down'} onClick={() => setRating(rating === 'down' ? null : 'down')}><ThumbsDown size={19}/> Needs work</button>
      </div></fieldset>
      <label htmlFor="feedback-comment">What would you like to tell me?</label><textarea id="feedback-comment" required maxLength={2000} rows={5} value={comment} onChange={e => { setComment(e.target.value); }} placeholder="Tell me what you tried, or what you’d like to create…"/>
      <label htmlFor="feedback-email">Your email <span>(optional, if you’d like a reply)</span></label><input id="feedback-email" type="email" maxLength={254} autoComplete="email" value={replyTo} onChange={e => setReplyTo(e.target.value)}/>
      <label className="feedback-honeypot" aria-hidden="true">Leave this empty<input name="_gotcha" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)}/></label>
      <p className="feedback-note">Your comment and optional email are sent privately through Formspree to the creator. They are never included in analytics.</p>
      {!feedbackEndpoint && <p className="feedback-note" role="status">Feedback delivery is being connected. Please check back soon.</p>}
      {error && <p role="alert" className="feedback-error">{error}</p>}
      <button className="save-button" type="submit" disabled={!feedbackEndpoint || !comment.trim() || status === 'sending'}><Send size={16}/> {status === 'sending' ? 'Sending…' : 'Send feedback'}</button>
      </fieldset>
    </form>}
  </section></div>;
}
