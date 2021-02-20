/* eslint-env mocha */
'use strict'

const sinon = require('sinon')
const tests = require('interface-transport')
const multiaddr = require('multiaddr')
const utpNative = require('utp-native')
const UP = require('../src')

describe('interface-transport compliance', () => {
  tests({
    setup ({ upgrader }) {
      const utp = new UP({ upgrader })
      const addrs = [
        multiaddr('/ip4/127.0.0.1/udp/6000/utp'),
        multiaddr('/ip4/127.0.0.1/udp/6001/utp'),
        multiaddr('/ip4/127.0.0.1/udp/6002/utp')
      ]

      // Used by the dial tests to simulate a delayed connect
      const connector = {
        delay (delayMs) {
          const netConnect = utpNative.connect
          sinon.replace(utpNative, 'connect', (opts) => {
            const socket = netConnect(opts)
            const socketEmit = socket.emit.bind(socket)
            sinon.replace(socket, 'emit', (...args) => {
              const time = args[0] === 'connect' ? delayMs : 0
              setTimeout(() => socketEmit(...args), time)
            })
            return socket
          })
        },
        restore () {
          sinon.restore()
        }
      }

      return { transport: utp, addrs, connector }
    }
  })
})
