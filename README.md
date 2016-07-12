# mocha-parallel-executor

This module supports executing test in parallel.

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

$ ./node_modules/.bin/mocha-p --file ./test/xxx.js
```

## options

|option|description|
|---|---|
|debug|be able to see all logs but don't write specs|
|timeout|mocha' option. (default:2000ms)|
|concurrency|If `false` were specified, all test cases will be executed in parallel. (default: os.cpus().length)|
|root|target repository path. (default: process.env.PWD)|
|dir|target test directory (default: `./test`)|
|file|a target file|
|files|some target files|
|before|execute function to edit environment|
|watch|to see mocha json logs|
|error|to see error logs|
|after|execute function to edit result|

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

