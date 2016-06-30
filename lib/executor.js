'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const spawn = require('child_process').spawn;

const _ = require('lodash');
const async = require('neo-async');

const util = require('./util');

function resolve(base, map) {
  map = map || {};
  _.forEach(fs.readdirSync(base), filename => {
    let filepath = path.resolve(base, filename);
    if (fs.statSync(filepath).isDirectory()) {
      return resolve(filepath, map);
    }
    if (path.extname(filename) !== '.js') {
      return;
    }
    var name = path.basename(filename, '.js');
    map[name] = filepath;
  });
  return map;
}

function executor(opts) {
  opts = opts || {};
  let root = opts.root || process.env.PWD;
  let testdir = opts.dir || path.resolve(root, 'test');
  let mocha = path.resolve(root, 'node_modules', '.bin', '_mocha');
  let map = resolve(testdir);
  console.log(mocha);
  async.mapValuesLimit(map, os.cpus().length, iterator, callback);

  function iterator(filepath, filename, done) {
    let log = '';
    let test = spawn(mocha, ['--reporter', 'json', filepath])
      .on('error', done)
      .on('close', () => {
        log = JSON.parse(log);
        util.output(log);
        done(null, log);
      });
    test.stdout.on('data', data => {
      let buf = new Buffer(data, 'utf8');
      log += buf.toString();
    });
    test.stderr.on('data', data => {
      process.stdout.write(`${data}\n`);
    });
  }

  function callback(err, res) {
    if (err) {
      throw err;
    }
    util.outputResult(res);
  }
}

module.exports = executor;
