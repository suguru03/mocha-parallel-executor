'use strict';

const _ = require('lodash');

const colors = _.mapValues({
  pass: 90,
  fail: 31,
  'bright pass': 92,
  'bright fail': 91,
  'bright yellow': 93,
  pending: 36,
  suite: 0,
  'error title': 0,
  'error message': 31,
  'error stack': 90,
  checkmark: 32,
  fast: 90,
  medium: 33,
  slow: 31,
  green: 32,
  light: 90,
  'diff gutter': 90,
  'diff added': 32,
  'diff removed': 31,
  reset: 0
}, code => {
  return '\u001b[%sm'.replace(/%s/, code);
});

const times = {
  fast: 40,
  slow: 80
};

let writer = process.stdout.write;

function removeLog() {
  process.stdout.write = _.noop;
  return this;
}

function exposeLog() {
  process.stdout.write = writer;
  return this;
}

let time;

function start() {
  time = Date.now();
  return this;
}

const skip = {
  __skip__: true
};

function outputResult(result) {
  let stats = {
    tests: 0,
    passes: 0,
    pending: 0,
    failures: 0,
    duration: 0
  };
  let errors = [];
  _.forEach(result, obj => {
    if (obj === skip) {
      return;
    }
    stats = _.mapValues(stats, (val, key) => {
      return val + obj.stats[key];
    });
    Array.prototype.push.apply(errors, obj.failures);
  });


  console.log('\n');
  let diff = Date.now() - time;
  console.log('  %s%d passing %s(%ds)', colors.green, stats.passes, colors.pass, Math.ceil(diff / 1000));
  if (stats.pending) {
    console.log('  %s%d pending', colors.pending, stats.pending);
  }
  if (stats.failures) {
    console.log('  %s%d failing%s', colors.fail, stats.failures, colors.reset);
  }

  _.forEach(errors, (obj, index) => {
    console.log('\n');
    console.log('  %d) %s\n', ++index, obj.fullTitle);
    let stack = obj.err.stack.split(/\n/);
    // TODO
    _.forEach(stack, msg => {
      console.log('\t%s%s%s', colors.fail, msg, colors.reset);
    });
  });
  console.log();
  return this;
}

function output(log) {
  let errorCount = 0;
  _.forEach(log.tests, obj => {
    if (!_.isEmpty(obj.err)) {
      return failure(obj);
    }
    if (obj.duration === undefined) {
      return pending(obj);
    }
    pass(obj);
  });


  function pass(obj) {
    let str = '';
    let duration = obj.duration;
    let color = duration >= times.slow ? colors.slow : colors.fast;
    // TODO
    if (duration >= times.fast) {
      str = '%s(%dms)'.replace(/%s/, color).replace(/%d/, duration);
    }
    console.log('\t%s✓ %s%s %s%s', colors.green, colors.pass, obj.fullTitle, str, colors.reset);
  }

  function pending(obj) {
    console.log('\t%s- %s%s', colors.pending, obj.fullTitle, colors.reset);
  }

  function failure(obj) {
    console.log('\t%s%d) %s%s', colors.fail, ++errorCount, obj.fullTitle, colors.reset);
  }
  return this;
}

exports.log = process.env.DEBUG ? console.log : _.noop;
exports.removeLog = removeLog;
exports.exposeLog = exposeLog;
exports.start = start;
exports.skip = skip;
exports.output = output;
exports.outputResult = outputResult;
