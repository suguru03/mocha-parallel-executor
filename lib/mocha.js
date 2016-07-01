'use strict';

const _ = require('lodash');
const Mocha = require('mocha');

const mocha = new Mocha();
const util = require('./util');
util.removeLog();

const reporter = 'json';
mocha.reporter(reporter, {});
let runner;
mocha._reporter.prototype.done = (err, func) => {
  func && func(err);
  let str = JSON.stringify(runner.testResults, null, 2);
  util.write(str);
  // TODO
  setTimeout(process.exit, Math.floor(str.length / 40));
};


mocha.files = process.argv.slice(2);
mocha.suite.timeout(process.env.MOCHA_TIMEOUT);
runner = mocha.run(_.noop);
