/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const UTP = require('../src')

const mockUpgrader = {
  upgradeInbound: maConn => maConn,
  upgradeOutbound: maConn => maConn
}

describe('Constructor', () => {
  it('create an instance', () => {
    const utp = new UTP({ upgrader: mockUpgrader })
    expect(utp).to.exist()
  })
})
