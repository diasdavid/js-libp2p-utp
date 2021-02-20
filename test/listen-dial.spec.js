/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const nativeUTP = require('utp-native')
const pipe = require('it-pipe')
const multiaddr = require('multiaddr')

const UTP = require('../src')
const isCI = process.env.CI

const mockUpgrader = {
  upgradeInbound: maConn => maConn,
  upgradeOutbound: maConn => maConn
}

describe('Listener (.createListener => listener)', () => {
  let utp

  function ma (port) {
    const base = '/ip4/127.0.0.1/udp/'
    return multiaddr(`${base}${port}/utp`)
  }

  beforeEach(() => {
    utp = new UTP({ upgrader: mockUpgrader })
  })

  it('.close with connections, through timeout', async () => {
    const listener = utp.createListener((conn) => pipe(conn, conn))

    const addr = ma(6000)
    const connectOptions = addr.toOptions()

    await listener.listen(addr)

    const socket1 = nativeUTP.connect(Number(connectOptions.port), connectOptions.host)
    const socket2 = nativeUTP.connect(Number(connectOptions.port), connectOptions.host)

    socket1.write('Some data that is never handled')
    socket1.end()

    socket1.on('error', (err) => expect(err).to.not.exist())
    socket2.on('error', (err) => expect(err).to.not.exist())

    await new Promise((resolve) => {
      socket1.on('connect', async () => {
        await listener.close()

        resolve()
      })
    })
  })

  it('.listen on port 0', async () => {
    const listener = utp.createListener((conn) => {})

    await listener.listen(ma(0))
    await listener.close()
  })

  // TODO: Get utp to work with IPv6 Addresses
  it.skip('.listen on IPv6 addr', async () => {
    if (isCI) { return this.skip() }

    const ma = multiaddr('/ip6/::/udp/12000/utp')

    const listener = utp.createListener((conn) => {})
    await listener.listen(ma)
    await listener.close()
  })

  it('.listen on any Interface', async () => {
    const listener = utp.createListener((conn) => {})
    const ma = multiaddr('/ip4/0.0.0.0/udp/12000/utp')

    await listener.listen(ma)
    await listener.close()
  })

  it('.getAddrs', async () => {
    const listener = utp.createListener((conn) => {})
    const addr = ma(12001)

    await listener.listen(addr)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
    expect(multiaddrs[0]).to.eql(addr)

    await listener.close()
  })

  it('.getAddrs on port 0 listen', async () => {
    const listener = utp.createListener((conn) => {})
    const addr = ma(0)

    await listener.listen(addr)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)

    await listener.close()
  })

  // TODO: Get utp to understand the meaning of 0.0.0.0
  it.skip('.getAddrs from listening on 0.0.0.0', async () => {
    const listener = utp.createListener((conn) => {})
    const addr = multiaddr('/ip4/0.0.0.0/udp/12000/utp')

    await listener.listen(addr)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(multiaddrs[0].toString().indexOf('0.0.0.0')).to.equal(-1)

    await listener.close()
  })

  // TODO: Get utp to understand the meaning of 0.0.0.0
  it.skip('.getAddrs from listening on 0.0.0.0 and port 0', async () => {
    const listener = utp.createListener((conn) => {})
    const addr = multiaddr('/ip4/0.0.0.0/udp/0/utp')

    await listener.listen(addr)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(multiaddrs[0].toString().indexOf('0.0.0.0')).to.equal(-1)

    await listener.close()
  })

  it('.getAddrs preserves IPFS Id', async () => {
    const ipfsId = '/p2p/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw'
    const addr = ma(9090).encapsulate(ipfsId)

    const listener = utp.createListener((conn) => {})

    await listener.listen(addr)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
    expect(multiaddrs[0]).to.eql(addr)

    await listener.close()
  })
})

/*
describe('Dialer (.dial)', () => {
  let utp

  beforeEach(() => {
    utp = new UTP()
  })

  it.skip('things', () => {
  })
})
*/
