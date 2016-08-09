'use strict';

const util = require('./util');

const _ = require('lodash');
const Mocha = require('mocha');

const mocha = new Mocha();
util.removeLog();

process.on('uncaughtException', err => {
  try {
    util.writeError(JSON.stringify(err, null, 2));
  } catch(e) {
    util.writeError(e);
    util.writeError(err);
  }
});

const reporter = 'json';
mocha.reporter(reporter, {});
let runner;
mocha._reporter.prototype.done = (err, func) => {
  func && func(err);
  util.write(JSON.stringify(runner.testResults, null, 2));
  setTimeout(process.exit, 1000);
};

mocha.files = process.argv.slice(2);
mocha.suite.timeout(process.env.MOCHA_TIMEOUT);
runner = mocha.run(_.noop);
