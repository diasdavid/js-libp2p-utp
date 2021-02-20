'use strict'

const debug = require('debug')
const log = debug('libp2p:libp2p:utp:socket')
log.error = debug('libp2p:libp2p:utp:socket:error')

const abortable = require('abortable-iterator')
const toIterable = require('stream-to-it')
const toMultiaddr = require('libp2p-utils/src/ip-port-to-multiaddr')

const { CLOSE_TIMEOUT } = require('./constants')

// Convert a stream into a MultiaddrConnection
// https://github.com/libp2p/interface-transport#multiaddrconnection
module.exports = (socket, options = {}) => {
  const { sink, source } = toIterable.duplex(socket)

  const maConn = {
    async sink (source) {
      if (options.signal) {
        source = abortable(source, options.signal)
      }

      try {
        await sink((async function * () {
          for await (const chunk of source) {
            // Convert BufferList to Buffer
            yield Buffer.isBuffer(chunk) ? chunk : chunk.slice()
          }
        })())
      } catch (err) {
        // If aborted we can safely ignore
        if (err.type !== 'aborted') {
          // If the source errored the socket will already have been destroyed by
          // toIterable.duplex(). If the socket errored it will already be
          // destroyed. There's nothing to do here except log the error & return.
          log.error(err)
        }
      }
    },

    source: options.signal ? abortable(source, options.signal) : source,

    conn: socket,

    localAddr: socket.localAddress && socket.localPort ? toMultiaddr(socket.localAddress, socket.localPort) : undefined,

    // If the remote address was passed, use it - it may have the peer ID encapsulated
    remoteAddr: options.remoteAddr || toMultiaddr(socket.remoteAddress, socket.remotePort),

    timeline: { open: Date.now() },

    close () {
      if (socket.destroyed) return

      return new Promise((resolve, reject) => {
        const start = Date.now()

        // Attempt to end the socket. If it takes longer to close than the
        // timeout, destroy it manually.
        const timeout = setTimeout(() => {
          const { host, port } = maConn.remoteAddr.toOptions()
          log('timeout closing socket to %s:%s after %dms, destroying it manually',
            host, port, Date.now() - start)

          if (socket.destroyed) {
            log('%s:%s is already destroyed', host, port)
          } else {
            socket.destroy()
          }

          resolve()
        }, CLOSE_TIMEOUT)

        socket.once('close', () => clearTimeout(timeout))
        socket.end(err => {
          maConn.timeline.close = Date.now()
          if (err) return reject(err)
          resolve()
        })
      })
    }
  }

  socket.once('end', () => socket.end())

  socket.once('close', () => {
    // In instances where `close` was not explicitly called,
    // such as an iterable stream ending, ensure we have set the close
    // timeline
    if (!maConn.timeline.close) {
      maConn.timeline.close = Date.now()
    }
  })

  return maConn
}