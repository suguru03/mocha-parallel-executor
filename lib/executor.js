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
    const filepath = path.resolve(base, filename);
    if (fs.statSync(filepath).isDirectory()) {
      return resolve(filepath, map);
    }
    if (path.extname(filename) !== '.js') {
      return;
    }
    const name = path.basename(filename, '.js');
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
  const concurrency = opts.concurrency === false ? false : opts.concurrency || os.cpus().length;
  const testdir = opts.dir || path.resolve(root, 'test');
  const files = opts.file && [opts.file] || opts.files || resolve(testdir);
  const before = opts.before || _.noop;
  const watch = opts.watch || _.noop;
  const error = opts.error || _.noop;
  const after = opts.after || _.noop;
  util.setDebug(opts.debug);

  const env = _.assign({}, process.env, opts.env);
  const size = _.size(files);

  const stats = {
    current: 0,
    size: size,
    concurrency: concurrency,
    root: root,
    dir: testdir,
    env: env,
    log: '',
    timeout: timeout
  };
  const clone = dcp.define('stats', stats);

  util.start();

  if (concurrency && concurrency < size) {
    async.mapValuesLimit(files, concurrency, iterator, callback);
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
    const mocha = path.resolve(__dirname, 'mocha.js');
    const opts = { env: info.env };
    const test = spawn('node', [mocha, filepath], opts)
      .on('error', done)
      .on('close', (err) => {
        util.log(`end. [${filename}]`);
        if (util.debug()) {
          util.log(info.log);
          after(info);
        } else {
          try {
            info.log = JSON.parse(info.log);
            after(info);
            util.output(info.log);
          } catch(e) {
            console.log(`parse error: ${info.log}, ${e}, ${err}, filename:${filename}`);
            info.log = util.skip;
          }
        }
        done(null, info.log);
      });
    test.stdout.on('data', data => {
      const buf = new Buffer(data, 'utf8');
      let log = buf.toString();
      info.log += log;
      watch(log);
    });
    test.stderr.on('data', data => {
      const buf = new Buffer(data, 'utf8');
      let log = buf.toString();
      error(log);
    });
  }

  function callback(err, res) {
    if (!util.debug()) {
      util.exposeLog().outputResult(res);
    }
    done(err, res);
  }
}

module.exports = executor;
