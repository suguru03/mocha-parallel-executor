'use strict';

const _ = require('lodash');
const Mocha = require('mocha');

const mocha = new Mocha();
const util = require('./util');
util.removeLog();

process.on('uncaughtException', (err) => {
  util.writeError(JSON.stringify(err, null, 2));
});

const reporter = 'json';
mocha.reporter(reporter, {});
let runner;
mocha._reporter.prototype.done = (err, func) => {
  func && func(err);
  util.write(JSON.stringify(runner.testResults, null, 2));
};

mocha.files = process.argv.slice(2);
mocha.suite.timeout(process.env.MOCHA_TIMEOUT);
runner = mocha.run(_.noop);
