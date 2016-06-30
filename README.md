# mocha-parallel-executor

This module supports test executing in parallel.

## Installation

```bash
$ npm install -D mocha-parallel-executor
```

### Node.js

```js
const exec = require('mocha-parallel-executor');
exec(); // resolve path automatically
```

### bash

```bash
$ ./node_modules/.bin/mocha-p
```

### example

```bash
$ git clone https://github.com/suguru03/neo-async.git
$ cd neo-async
$ npm install
$ gulp test
/*
 * 1072 passing (32s)
 */

 $ gulp test:fast // using this module
/*
 * 1072 passing (12s)
 */
```

