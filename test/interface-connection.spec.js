/* eslint-env mocha */
'use strict'

var tape = require('tape')
var tests = require('interface-connection')
var conn = require('../src')

describe.skip('interface-connection', () => {
  it('works', (done) => {
    tests(tape, {
      setup (t, cb) {
        cb(null, conn)
      },
      teardown (t, cb) {
        done()
        cb()
      }
    })
  })
})
