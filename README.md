# js-libp2p-utp

:warning: Not actively maintained.

👉 If you are looking for libp2p transports check [js-libp2p/doc/CONFIGURATION.md#transport](https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md#transport).

If you would like to help getting this module updated check [js-libp2p-utp#81](https://github.com/libp2p/js-libp2p-utp/pull/81)

---

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)

[![](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-utp.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-utp)
[![](https://img.shields.io/travis/libp2p/js-libp2p-utp.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-utp)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-utp.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-utp)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)
![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)

> Node.js implementation of the `µTP` module that `libp2p` uses, which implements the [interface-transport](https://github.com/libp2p/interface-transport) interface for dial/listen. Connections follow [interface-connection](https://github.com/libp2p/interface-connection).

## Lead Maintainer

[Vasco Santos](https://github.com/vasco-santos).

## Table of Contents

- [Install](#install)
  - [npm](#npm)
- [Usage](#usage)
- [API](#api)
- [Contribute](#contribute)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Install

### npm

```sh
> npm install libp2p-utp
```

```js
const UTP = require('libp2p-utp')
const multiaddr = require('multiaddr')
const pipe = require('it-pipe')
const { collect } = require('streaming-iterables')

// A simple upgrader that just returns the MultiaddrConnection
const upgrader = {
  upgradeInbound: maConn => maConn,
  upgradeOutbound: maConn => maConn
}

const utp = new UTP({ upgrader })

const listener = utp.createListener((socket) => {
  console.log('new connection opened')
  pipe(
    ['hello'],
    socket
  )
})

const addr = multiaddr('/ip4/127.0.0.1/udp/6000/utp')
await listener.listen(addr)
console.log('listening')

const socket = await utp.dial(addr)
const values = await pipe(
  socket,
  collect
)
console.log(`Value: ${values.toString()}`)

// Close connection after reading
await listener.close()
```

Outputs:

```sh
listening
new connection opened
Value: hello
```

## API

### Transport

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)

### Connection

[![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)](https://github.com/libp2p/interface-connection)

## Contribute

Contributions are welcome! The libp2p implementation in JavaScript is a work in progress. As such, there's a few things you can do right now to help out:

- [Check out the existing issues](//github.com/libp2p/js-libp2p-utp/issues).
- **Perform code reviews**.
- **Add tests**. There can never be enough tests.

Please be aware that all interactions related to libp2p are subject to the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

# Acknowledgements

`js-libp2p-utp` is a wrapper on top on [utp](https://github.com/mafintosh/utp) originally developed by [Mathias Buus](https://github.com/mafintosh)

## License

[MIT](LICENSE) © Protocol Labs Inc.
