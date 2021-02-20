'use strict'

const assert = require('assert')
const debug = require('debug')
const log = debug('libp2p:utp')
const errcode = require('err-code')

const utp = require('utp-native')
const mafmt = require('mafmt')
const withIs = require('class-is')
const { AbortError } = require('abortable-iterator')

const { CODE_CIRCUIT, CODE_P2P, CLOSE_TIMEOUT } = require('./constants')
const createListener = require('./listener.js')
const toConnection = require('./socket-to-conn')

function noop () {}

/**
 * @class UTP
 */
class UTP {
  /**
   * @constructor
   * @param {object} options
   * @param {Upgrader} options.upgrader
   */
  constructor ({ upgrader }) {
    assert(upgrader, 'An upgrader must be provided. See https://github.com/libp2p/interface-transport#upgrader.')
    this._upgrader = upgrader
  }

  /**
   * @async
   * @param {Multiaddr} ma
   * @param {object} options
   * @param {AbortSignal} options.signal Used to abort dial requests
   * @returns {Connection} An upgraded Connection
   */
  async dial (ma, options = {}) {
    const rawConn = await this._connect(ma, options)
    const maConn = toConnection(rawConn, { remoteAddr: ma, signal: options.signal })
    log('new outbound connection %s', maConn.remoteAddr)
    const conn = await this._upgrader.upgradeOutbound(maConn)
    log('outbound connection %s upgraded', maConn.remoteAddr)
    return conn
  }

  /**
   * @private
   * @param {Multiaddr} ma
   * @param {object} options
   * @param {AbortSignal} options.signal Used to abort dial requests
   * @returns {Promise<UTP>} Resolves a UTP Socket
   */
  _connect (ma, options = {}) {
    if (options.signal && options.signal.aborted) {
      throw new AbortError()
    }

    const cOpts = ma.toOptions()
    log('dialing %s:%s', cOpts.host, cOpts.port)

    return new Promise((resolve, reject) => {
      const start = Date.now()
      const rawSocket = utp.connect(Number(cOpts.port), cOpts.host)

      const onError = (err) => {
        err.message = `connection error ${cOpts.host}:${cOpts.port}: ${err.message}`
        done(err)
      }

      const onTimeout = () => {
        log('connnection timeout %s:%s', cOpts.host, cOpts.port)
        const err = errcode(new Error(`connection timeout after ${Date.now() - start}ms`), 'ERR_CONNECT_TIMEOUT')
        // Note: this will result in onError() being called
        rawSocket.emit('error', err)
      }

      const onConnect = () => {
        log('connection opened %s:%s', cOpts.host, cOpts.port)
        done(null)
      }

      const onAbort = () => {
        log('connection aborted %s:%s', cOpts.host, cOpts.port)
        done(new AbortError())
      }

      const done = (err) => {
        rawSocket.removeListener('error', onError)
        rawSocket.removeListener('timeout', onTimeout)
        rawSocket.removeListener('connect', onConnect)
        options.signal && options.signal.removeEventListener('abort', onAbort)

        err ? reject(err) : resolve(rawSocket)
      }

      rawSocket.once('error', onError)
      rawSocket.once('connect', onConnect)
      rawSocket.setTimeout(CLOSE_TIMEOUT, onTimeout)
      options.signal && options.signal.addEventListener('abort', onAbort)
    })
  }

  /**
   * Creates a UTP listener. The provided `handler` function will be called
   * anytime a new incoming Connection has been successfully upgraded via
   * `upgrader.upgradeInbound`.
   * @param {object} [options]
   * @param {function (Connection)} handler
   * @returns {Listener} A UTP listener
   */
  createListener (options, handler) {
    if (typeof options === 'function') {
      handler = options
      options = {}
    }

    handler = handler || noop

    return createListener({ handler, upgrader: this._upgrader }, options)
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid UTP addresses
   * @param {Multiaddr[]} multiaddrs
   * @returns {Multiaddr[]} Valid UTP multiaddrs
   */
  filter (multiaddrs) {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    return multiaddrs.filter((ma) => {
      if (ma.protoCodes().includes(CODE_CIRCUIT)) {
        return false
      }

      return mafmt.UTP.matches(ma.decapsulateCode(CODE_P2P))
    })
  }
}

module.exports = withIs(UTP, { className: 'UTP', symbolName: '@libp2p/js-libp2p-utp/utp' })
