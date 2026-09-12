import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const source = readFileSync(new URL('../public/chat-widget.js', import.meta.url), 'utf8')

function fixture({ manual = false, loading = false } = {}) {
  const handlers = {}
  const frames = []
  const messages = []
  const storage = new Map()
  const sessionRequests = []
  let mobile = false
  const window = {
    location: { href: 'https://external.example/page', origin: 'https://external.example' },
    matchMedia: () => ({ matches: mobile }),
    addEventListener: (name, handler) => { handlers[name] = handler },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    crypto: { randomUUID: () => '12345678-1234-1234-1234-123456789012' },
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    fetch: async (url, options) => {
      sessionRequests.push({ url, body: JSON.parse(options.body) })
      return { ok: true, json: async () => ({ token: 'chat-token', user: { id: 9, name: 'Visitante', role: 'client' } }) }
    },
  }
  const document = {
    readyState: loading ? 'loading' : 'complete',
    currentScript: {
      src: 'https://chat.example/chat-widget.js',
      dataset: { channelKey: 'ch_12345678901234567890123456789012', apiUrl: 'https://api.chat.example' },
      hasAttribute: () => manual,
    },
    body: { appendChild: frame => frames.push(frame) },
    addEventListener: (name, handler) => { handlers[name] = handler },
    createElement: (tagName) => ({
      tagName,
      style: {},
      setAttribute() {},
      remove() {},
      contentWindow: { postMessage: (data, origin) => messages.push({ data, origin }) },
    }),
  }
  runInNewContext(source, { window, document, URL })
  return {
    window, frames, messages, handlers, sessionRequests,
    setStorage: (key, value) => storage.set(key, value),
    removeStorage: key => storage.delete(key),
    setMobile: value => { mobile = value },
    emit: (data, origin = 'https://chat.example', sender = frames[0]?.contentWindow) =>
      handlers.message({ data, origin, source: sender }),
  }
}

test('auto installation uses the script origin, not the host origin', () => {
  const f = fixture()
  assert.equal(f.frames.length, 1)
  assert.equal(f.frames[0].src, 'https://chat.example/embed')
  assert.equal(f.frames[0].style.width, '100px')
})

test('manual installation requests a channel-scoped session without exposing the visitor id to the iframe', async () => {
  const f = fixture({ manual: true })
  assert.equal(f.frames.length, 0)
  const frame = f.window.SupportChat.init({ channelKey: 'ch_orka1234567890123456789012345678' })
  assert.equal(f.window.SupportChat.init(), frame)
  assert.equal(f.frames.length, 1)
  assert.equal(frame.src, 'https://chat.example/embed')
  await new Promise(resolve => setImmediate(resolve))
  f.emit({ type: 'SUPPORT_CHAT_READY' })
  assert.equal(f.messages[0].origin, 'https://chat.example')
  assert.equal(f.messages[0].data.sessionToken, 'chat-token')
  assert.equal(f.messages[0].data.visitorId, undefined)
  assert.equal(f.sessionRequests[0].url, 'https://api.chat.example/api/widget/session')
  assert.deepEqual(f.sessionRequests[0].body, {
    channelKey: 'ch_orka1234567890123456789012345678',
    visitorId: '12345678123412341234123456789012'
  })
})

test('messages from another origin or another window cannot resize or request tokens', () => {
  const f = fixture({ manual: true })
  f.window.SupportChat.init({ channelKey: 'ch_orka1234567890123456789012345678' })
  f.emit({ type: 'SUPPORT_CHAT_READY' }, 'https://untrusted.example')
  f.emit({ type: 'SUPPORT_CHAT_READY' }, 'https://chat.example', {})
  f.emit({ type: 'SUPPORT_CHAT_RESIZE', open: true }, 'https://untrusted.example')
  f.emit({ type: 'SUPPORT_CHAT_RESIZE', open: true }, 'https://chat.example', {})
  assert.equal(f.messages.length, 0)
  assert.equal(f.frames[0].style.width, '100px')
})

test('open state survives responsive resizing and close restores the compact frame', () => {
  const f = fixture()
  f.emit({ type: 'SUPPORT_CHAT_RESIZE', open: true })
  assert.equal(f.frames[0].style.width, 'min(420px, 100vw)')
  f.setMobile(true)
  f.handlers.resize()
  assert.equal(f.frames[0].style.width, '100vw')
  assert.equal(f.frames[0].style.height, '100dvh')
  f.emit({ type: 'SUPPORT_CHAT_RESIZE', open: false })
  assert.equal(f.frames[0].style.width, '100px')
  assert.equal(f.frames[0].style.height, '100px')
})

test('history expands across the viewport so its backdrop and modal are centered on the page', () => {
  const f = fixture()
  f.emit({ type: 'SUPPORT_CHAT_RESIZE', open: true, history: true })
  assert.equal(f.frames[0].style.width, '100vw')
  assert.equal(f.frames[0].style.height, '100dvh')
  assert.equal(f.frames[0].style.right, '0')
  assert.equal(f.frames[0].style.bottom, '0')
})

test('automatic installation waits for DOMContentLoaded when loaded in the head', () => {
  const f = fixture({ loading: true })
  assert.equal(f.frames.length, 0)
  f.handlers.DOMContentLoaded()
  assert.equal(f.frames.length, 1)
})

test('authenticated mode stays hidden until a signed assertion exists', () => {
  const f = fixture({ manual: true })
  assert.equal(f.window.SupportChat.init({ channelKey: 'ch_orka1234567890123456789012345678', requireAuth: true }), null)
  assert.equal(f.frames.length, 0)
  f.window.SupportChat.setAssertion('signed.external.assertion')
  assert.equal(f.frames.length, 1)
  assert.equal(f.sessionRequests[0].body.assertion, 'signed.external.assertion')
  assert.equal(f.sessionRequests[0].body.visitorId, undefined)
})

test('authenticated mode reads the host token and sends the authenticated user without exposing the token', async () => {
  const f = fixture({ manual: true })
  f.setStorage('token', 'opaque-host-token')
  f.setStorage('user', JSON.stringify({ userId: 'orka-42', firstName: 'Luis', lastName: 'Tapia', email: 'LUIS@example.com' }))
  f.window.SupportChat.init({
    channelKey: 'ch_orka1234567890123456789012345678',
    requireAuth: true,
    authStorageKey: 'token',
    userStorageKey: 'user'
  })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(f.frames.length, 1)
  assert.deepEqual(f.sessionRequests[0].body, {
    channelKey: 'ch_orka1234567890123456789012345678',
    visitorId: '12345678123412341234123456789012',
    identity: { id: 'orka-42', name: 'Luis Tapia', email: 'LUIS@example.com' }
  })
  assert.equal(JSON.stringify(f.sessionRequests[0].body).includes('opaque-host-token'), false)
})

test('mixed mode identifies a logged-in user and falls back to a visitor without a token', async () => {
  const anonymous = fixture({ manual: true })
  anonymous.window.SupportChat.init({ channelKey: 'ch_orka1234567890123456789012345678' })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(anonymous.sessionRequests[0].body.visitorId, '12345678123412341234123456789012')
  assert.equal(anonymous.sessionRequests[0].body.identity, undefined)

  const authenticated = fixture({ manual: true })
  authenticated.setStorage('token', 'opaque-host-token')
  authenticated.setStorage('user', JSON.stringify({ id: 7, name: 'Ana', email: 'ana@example.com' }))
  authenticated.window.SupportChat.init({ channelKey: 'ch_orka1234567890123456789012345678' })
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(authenticated.sessionRequests[0].body.identity, {
    id: '7', name: 'Ana', email: 'ana@example.com'
  })
  assert.equal(authenticated.sessionRequests[0].body.visitorId, '12345678123412341234123456789012')
})
