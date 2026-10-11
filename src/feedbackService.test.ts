import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendFeedback } from './feedbackService';
const endpoint = 'https://formspree.io/f/testform';
const submission = { rating: 'up' as const, comment: '  Lovely dragons!  ', email: 'test@example.com', website: '' };
test('feedback sends only the intended fields and requires confirmation', async () => {
  await sendFeedback(endpoint, submission, (async (url, options) => {
    assert.equal(url, endpoint);
    assert.equal(options?.method, 'POST');
    assert.equal(options?.credentials, 'omit');
    const body = options?.body as FormData;
    assert.deepEqual([...body.keys()], ['subject', 'message', 'rating', 'email', '_gotcha']);
    assert.equal(body.get('message'), 'Lovely dragons!');
    assert.equal(body.get('rating'), 'Thumbs up');
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch);
});
test('feedback rejects wrong endpoints and blank comments before any request', async () => {
  const noRequest = (async () => { assert.fail('Must not send'); }) as typeof fetch;
  await assert.rejects(sendFeedback('https://example.com/collect', submission, noRequest), /not connected/);
  await assert.rejects(sendFeedback(endpoint, { ...submission, comment: '  ' }, noRequest), /enter a comment/);
});
test('feedback does not report success for rate limits, errors, or unconfirmed responses', async () => {
  for (const [status, body] of [[429, { error: 'limit' }], [400, { ok: false }], [200, { error: 'not accepted' }]] as const) {
    await assert.rejects(sendFeedback(endpoint, submission, (async () => new Response(JSON.stringify(body), { status })) as typeof fetch));
  }
  await assert.rejects(sendFeedback(endpoint, submission, (async () => { throw new Error('offline'); }) as typeof fetch), /couldn’t confirm delivery/);
});
