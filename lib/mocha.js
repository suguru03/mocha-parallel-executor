'use strict';

const _ = require('lodash');
const Mocha = require('mocha');
const mocha = new Mocha();
const util = require('./util');
util.removeLog();

const reporter = 'json';
mocha.reporter(reporter, {});
mocha.files = process.argv.slice(2);
const runner = mocha.run(_.noop);
runner.on('end', () => {
  util.exposeLog();
  console.log(JSON.stringify(runner.testResults, null, 2));
});
