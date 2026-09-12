(function () {
  'use strict'
  var script = document.currentScript
  var origin = new URL(script.src, window.location.href).origin
  var frame = null
  var open = false
  var fullscreen = false
  var ready = false
  var config = null
  var optionsState = null
  var sessionVersion = 0
  var hiddenForAuthentication = false

  function randomId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID().replaceAll('-', '')
    var bytes = new Uint8Array(24)
    window.crypto.getRandomValues(bytes)
    return Array.from(bytes, function (value) { return value.toString(16).padStart(2, '0') }).join('')
  }

  function visitorId(channelKey) {
    var key = 'support-chat-visitor:' + channelKey
    var value = window.localStorage.getItem(key)
    if (!value) { value = randomId(); window.localStorage.setItem(key, value) }
    return value
  }

  function parseJson(value) {
    if (!value) return null
    try { return JSON.parse(value) } catch (_) { return null }
  }

  function parseJwt(token) {
    var parts = String(token || '').split('.')
    if (parts.length < 2) return null
    try {
      var encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      encoded += '='.repeat((4 - encoded.length % 4) % 4)
      return JSON.parse(decodeURIComponent(Array.prototype.map.call(window.atob(encoded), function (char) {
        return '%' + char.charCodeAt(0).toString(16).padStart(2, '0')
      }).join('')))
    } catch (_) { return null }
  }

  function firstValue(source, keys) {
    if (!source) return null
    for (var index = 0; index < keys.length; index += 1) {
      var value = source[keys[index]]
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim()
    }
    return null
  }

  function authenticatedIdentity(channelKey) {
    var authenticationMode = optionsState.authenticationMode || script.dataset.authMode || 'mixed'
    if (authenticationMode === 'anonymous') return null
    var tokenKey = optionsState.authStorageKey || script.dataset.authStorageKey || 'token'
    var token = window.localStorage.getItem(tokenKey)
    if (!token && optionsState.authenticated !== true) return null

    var userKey = optionsState.userStorageKey || script.dataset.userStorageKey || 'user'
    var storedUser = optionsState.user || parseJson(window.localStorage.getItem(userKey)) || {}
    var claims = parseJwt(token) || {}
    var firstName = firstValue(storedUser, ['firstName', 'userFirstName', 'name']) || firstValue(claims, ['firstName', 'userFirstName', 'given_name', 'name'])
    var lastName = firstValue(storedUser, ['lastName', 'userLastName']) || firstValue(claims, ['lastName', 'userLastName', 'family_name'])
    var name = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Usuario autenticado'
    var email = firstValue(storedUser, ['email', 'userEmail']) || firstValue(claims, ['email', 'userEmail'])
    var id = firstValue(storedUser, ['id', 'userId', 'userID']) || firstValue(claims, ['sub', 'userId', 'id', 'email', 'userEmail']) || visitorId(channelKey)

    return { id: id.slice(0, 255), name: name.slice(0, 120), email: email ? email.slice(0, 255) : null }
  }

  function resize(value, useFullscreen) {
    if (!frame) return
    open = value
    fullscreen = Boolean(value && useFullscreen)
    var mobile = window.matchMedia('(max-width: 640px)').matches
    frame.style.width = fullscreen ? '100vw' : (value ? (mobile ? '100vw' : 'min(420px, 100vw)') : '100px')
    frame.style.height = fullscreen ? '100dvh' : (value ? (mobile ? '100dvh' : 'min(680px, 100dvh)') : '100px')
    frame.style.right = fullscreen || value || mobile ? '0' : '12px'
    frame.style.bottom = fullscreen || value || mobile ? '0' : '12px'
  }

  function send(type, data) {
    if (!frame || !ready) return
    frame.contentWindow.postMessage(Object.assign({ type: type }, data || {}), origin)
  }

  function setFrameVisible(value) {
    if (!frame) return
    frame.style.display = value ? 'block' : 'none'
  }

  async function requestSession() {
    var version = ++sessionVersion
    var channelKey = String(optionsState.channelKey || script.dataset.channelKey || '')
    var apiUrl = String(optionsState.apiUrl || script.dataset.apiUrl || origin).replace(/\/$/, '')
    var assertion = optionsState.assertion || null
    var identity = authenticatedIdentity(channelKey)
    var body = { channelKey: channelKey }
    if (assertion) body.assertion = assertion
    else {
      body.visitorId = visitorId(channelKey)
      if (identity) body.identity = identity
    }

    try {
      var response = await window.fetch(apiUrl + '/api/widget/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      var payload = await response.json()
      if (response.status === 401 && !assertion) {
        if (version !== sessionVersion) return
        hiddenForAuthentication = true
        config = null
        setFrameVisible(false)
        return
      }
      if (!response.ok) throw new Error(payload.error || 'Widget session rejected')
      if (version !== sessionVersion) return
      hiddenForAuthentication = false
      setFrameVisible(true)
      resize(open, fullscreen)
      config = { sessionToken: payload.token, user: payload.user }
      send('SUPPORT_CHAT_CONFIG', config)
    } catch (error) {
      if (version !== sessionVersion) return
      hiddenForAuthentication = false
      setFrameVisible(true)
      config = { sessionError: error.message || 'No se pudo iniciar el chat' }
      send('SUPPORT_CHAT_CONFIG', config)
    }
  }

  function init(options) {
    options = options || {}
    optionsState = Object.assign({}, optionsState || {}, options)
    var requireAuth = optionsState.requireAuth === true || optionsState.authenticationMode === 'authenticated' || script.dataset.requireAuth === 'true' || script.dataset.authMode === 'authenticated'
    var channelKey = String(options.channelKey || optionsState.channelKey || script.dataset.channelKey || '')
    if (requireAuth && !optionsState.assertion && !authenticatedIdentity(channelKey)) return null
    if (frame) {
      if (options.channelKey || options.assertion || options.apiUrl) requestSession()
      return frame
    }
    if (!channelKey) throw new Error('SupportChat requires data-channel-key')
    frame = document.createElement('iframe')
    frame.src = origin + '/embed'
    frame.title = options.title || 'Chat de soporte'
    frame.setAttribute('allow', 'microphone; clipboard-read; clipboard-write')
    frame.style.cssText = 'position:fixed;display:none;border:0;background:transparent;z-index:2147483647;color-scheme:normal;'
    resize(false)
    document.body.appendChild(frame)
    requestSession()
    return frame
  }

  function refreshAuth() {
    var requireAuth = optionsState?.requireAuth === true || optionsState?.authenticationMode === 'authenticated' || script.dataset.requireAuth === 'true' || script.dataset.authMode === 'authenticated'
    var channelKey = String(optionsState?.channelKey || script.dataset.channelKey || '')
    var authenticated = Boolean(optionsState?.assertion) || Boolean(authenticatedIdentity(channelKey))
    var canRender = !requireAuth || authenticated
    if (canRender && !frame) init(optionsState || {})
    if (!canRender && frame) {
      frame.remove()
      frame = null
      ready = false
    }
    if (canRender && frame) requestSession()
    return Boolean(authenticated)
  }

  var api = window.SupportChat = {
    init: init,
    setAssertion: function (assertion) {
      optionsState = Object.assign({}, optionsState || {}, { assertion: assertion || null })
      if (frame) requestSession()
      else refreshAuth()
    },
    setAuthenticated: function (authenticated, user) {
      optionsState = Object.assign({}, optionsState || {}, {
        authenticated: Boolean(authenticated),
        user: user || optionsState?.user || null
      })
      return refreshAuth()
    },
    refreshAuth: refreshAuth,
    identify: function (user) {
      optionsState = Object.assign({}, optionsState || {}, { user: user || null })
      if (frame) requestSession()
    },
    open: function () { resize(true); send('SUPPORT_CHAT_COMMAND', { command: 'open' }) },
    close: function () { send('SUPPORT_CHAT_COMMAND', { command: 'close' }) },
    openHistory: function () { resize(true, true); send('SUPPORT_CHAT_COMMAND', { command: 'history' }) }
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== origin || event.source !== (frame && frame.contentWindow)) return
    if (event.data && event.data.type === 'SUPPORT_CHAT_READY') { ready = true; send('SUPPORT_CHAT_CONFIG', config) }
    if (event.data && event.data.type === 'SUPPORT_CHAT_RESIZE') resize(Boolean(event.data.open), Boolean(event.data.history))
  })
  window.addEventListener('resize', function () { resize(open, fullscreen) })
  window.addEventListener('focus', refreshAuth)
  window.addEventListener('storage', refreshAuth)
  if (!script.hasAttribute('data-manual')) {
    var start = function () {
      init({
        requireAuth: script.dataset.requireAuth === 'true',
        authenticationMode: script.dataset.authMode || 'mixed',
        apiUrl: script.dataset.apiUrl || '',
        authStorageKey: script.dataset.authStorageKey || 'token',
        userStorageKey: script.dataset.userStorageKey || 'user'
      })
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
    else start()
  }
})()
