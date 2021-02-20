'use strict'

const debug = require('debug')
const log = debug('libp2p:utp:listen')
const logError = debug('libp2p:utp:listen:error')

const { EventEmitter } = require('events')

const multiaddr = require('multiaddr')
const utp = require('utp-native')

const toConnection = require('./socket-to-conn')
const { CODE_P2P } = require('./constants')

module.exports = ({ handler, upgrader }) => {
  const listener = new EventEmitter()

  const server = utp.createServer(async (socket) => {
    // Avoid uncaught errors cause by unstable connections
    socket.on('error', (err) => {
      logError('socket error' + err)
    })

    const maConn = toConnection(socket)
    log('new inbound connection %s', maConn.remoteAddr)

    const conn = await upgrader.upgradeInbound(maConn)
    log('inbound connection %s upgraded', maConn.remoteAddr)

    trackSocket(server, maConn)

    handler && handler(conn)
    listener.emit('connection', conn)
  })

  server.on('listening', () => listener.emit('listening'))
  server.on('error', (err) => listener.emit('error', err))
  server.on('close', () => listener.emit('close'))

  // Keep track of open connections to destroy in case of timeout
  server.__connections = []

  listener.close = async () => {
    if (!server._inited) return

    await Promise.all(server.__connections.map(maConn => maConn.close()))

    return new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err)
        return resolve()
      })
    })
  }

  let ipfsId
  let listeningAddr

  listener.listen = (ma) => {
    listeningAddr = ma
    if (ma.protoCodes().includes(CODE_P2P)) {
      ipfsId = getIpfsId(ma)
      listeningAddr = ma.decapsulate('p2p')
    }

    const lOpts = listeningAddr.toOptions()

    return new Promise((resolve, reject) => {
      server.listen(Number(lOpts.port), lOpts.host, (err) => {
        if (err) {
          return reject(err)
        }

        log('Listening on %s %s', lOpts.port, lOpts.host)
        resolve()
      })
    })
  }

  listener.getAddrs = () => {
    const multiaddrs = []
    const addr = server.address()

    if (!addr) {
      throw new Error('Listener is not ready yet')
    }

    let ma
    if (addr.family === 'IPv6') {
      ma = multiaddr(`/ip6/${addr.address}/udp/${addr.port}/utp`)
    } else if (addr.family === 'IPv4') {
      /* eslint-disable no-console */
      console.log(`/ip4/${addr.address}/udp/${addr.port}/utp`)
      /* eslint-enable no-console */
      ma = multiaddr(`/ip4/${addr.address}/udp/${addr.port}/utp`)
    }

    if (ipfsId) {
      ma = ma.encapsulate('/p2p/' + ipfsId)
    }

    multiaddrs.push(ma)

    return multiaddrs
  }

  return listener
}

function getIpfsId (ma) {
  return ma.stringTuples().filter((tuple) => {
    return tuple[0] === CODE_P2P
  })[0][1]
}

function trackSocket (server, maConn) {
  server.__connections.push(maConn)

  const untrackConn = () => {
    server.__connections = server.__connections.filter(c => c !== maConn)
  }

  maConn.conn.once('close', untrackConn)
}
