'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const spawn = require('child_process').spawn;

const _ = require('lodash');
const dcp = require('dcp');
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
    let name = path.basename(filename, '.js');
    map[name] = filepath;
  });
  return map;
}

function executor(opts, done) {
  if (typeof opts === 'function') {
    done = opts;
    opts = done;
  }
  opts = opts || {};
  done = done || _.noop;
  // mocha config
  const timeout = opts.timeout || 2000;
  // other opts
  const root = opts.root || process.env.PWD;
  const limit = opts.limit === false ? false : opts.limit || os.cpus().length;
  const testdir = opts.dir || path.resolve(root, 'test');
  let files = opts.files || resolve(testdir);
  // files = _.pick(files, 'test.concat');
  const before = opts.before || _.noop;
  const watch = opts.watch || _.noop;
  const after = opts.after || _.noop;
  const env = _.assign({}, process.env, opts.env);
  const size = _.size(files);

  const stats = {
    current: 0,
    size: size,
    limit: limit,
    root: root,
    dir: testdir,
    env: env,
    log: '',
    timeout: timeout
  };
  const clone = dcp.define('stats', stats);

  util.start();

  if (limit && limit < size) {
    async.mapValuesLimit(files, limit, iterator, callback);
  } else {
    async.mapValues(files, iterator, callback);
  }

  function iterator(filepath, filename, done) {
    stats.current++;
    util.log(`executing... [${filename}]`);
    let info = clone(stats);
    info.filename = filename;
    info.filepath = filepath;
    info.env.MOCHA_TIMEOUT = timeout;
    before(info);
    let mocha = path.resolve(__dirname, 'mocha.js');
    let opts = { env: info.env };
    let test = spawn('node', [mocha, filepath], opts)
      .on('error', done)
      .on('close', () => {
        util.log(`end. [${filename}]`);
        try {
          info.log = JSON.parse(info.log);
        } catch(e) {
          console.log('catch', info.log, e, filename);
          info.log = util.skip;
        }
        after(info);
        util.output(info.log);
        done(null, info.log);
      });
    test.stdout.on('data', data => {
      let buf = new Buffer(data, 'utf8');
      let log = buf.toString();
      info.log += log;
      watch(log);
    });
    test.stderr.on('data', data => {
      let buf = new Buffer(data, 'utf8');
      let log = buf.toString();
      watch(log);
    });
  }

  function callback(err, res) {
    util.exposeLog().outputResult(res);
    done(err, res);
  }
}

module.exports = executor;
