import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Mail, ThumbsDown, ThumbsUp, X } from 'lucide-react';

// Public contact address used by the visitor's email app.
export const feedbackEmail = 'scott+sites@photoloom.com';
export default function Feedback({ close }: { close: () => void }) {
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [opened, setOpened] = useState(false);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previous?.focus();
  }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!feedbackEmail || !comment.trim()) return;
    const body = `DynaDraw feedback\n\nRating: ${rating === 'up' ? 'Thumbs up' : rating === 'down' ? 'Thumbs down' : 'Not selected'}\n\n${comment.trim()}${replyTo.trim() ? `\n\nReply address: ${replyTo.trim()}` : ''}`;
    window.location.href = `mailto:${feedbackEmail}?subject=${encodeURIComponent('DynaDraw feedback')}&body=${encodeURIComponent(body)}`;
    setOpened(true);
  }
  return <div className="modal-backdrop" onClick={close}><section ref={panel} className="object-modal feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title" onClick={e => e.stopPropagation()} onKeyDown={e => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const controls = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, a[href]');
      const first = controls?.[0], last = controls?.[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  }}>
    <button className="icon-button modal-close" aria-label="Close feedback" onClick={close}><X size={20}/></button>
    <div className="eyebrow">A NOTE TO THE CREATOR</div><h2 id="feedback-title">Share your feedback</h2><p>Ideas, problems, or something you enjoyed—I’d love to hear from you.</p>
    <form onSubmit={submit}>
      <fieldset><legend>How’s DynaDraw working for you? <span>(optional)</span></legend><div className="feedback-ratings">
        <button type="button" aria-pressed={rating === 'up'} onClick={() => setRating(rating === 'up' ? null : 'up')}><ThumbsUp size={19}/> Enjoying it</button>
        <button type="button" aria-pressed={rating === 'down'} onClick={() => setRating(rating === 'down' ? null : 'down')}><ThumbsDown size={19}/> Needs work</button>
      </div></fieldset>
      <label htmlFor="feedback-comment">What would you like to tell me?</label><textarea id="feedback-comment" required maxLength={2000} rows={5} value={comment} onChange={e => { setComment(e.target.value); setOpened(false); }} placeholder="Tell me what you tried, or what you’d like to create…"/>
      <label htmlFor="feedback-email">Your email <span>(optional, if you’d like a reply)</span></label><input id="feedback-email" type="email" maxLength={254} autoComplete="email" value={replyTo} onChange={e => setReplyTo(e.target.value)}/>
      <p className="feedback-note">Opens a draft in your email app. Review it and press Send there. Your feedback goes privately to the creator.</p>
      <button className="save-button" type="submit" disabled={!feedbackEmail || !comment.trim()}><Mail size={16}/> Open email draft</button>
      {opened && <p role="status" className="feedback-status">Your email app was requested. Your feedback is sent only after you press Send there.</p>}
    </form>
  </section></div>;
}
