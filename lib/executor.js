'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const spawn = require('child_process').spawn;

const _ = require('lodash');
const dcp = require('dcp');
const async = require('neo-async');
const glob = require('glob');

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
  let parallelism = opts.parallelism !== undefined ? opts.parallelism : opts.concurrency;
  parallelism = parallelism === false ? false : parallelism || os.cpus().length;
  const root = opts.root || process.env.PWD;
  const testdir = opts.dir || path.resolve(root, 'test');
  if(opts.files && typeof opts.files === 'string'){
      opts.files = glob.sync(opts.files)
  }
  const files = opts.file && [opts.file] || opts.files || resolve(testdir);
  const retry = opts.retry || 0;
  const delay = opts.delay || 0;
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
    parallelism: parallelism,
    root: root,
    dir: testdir,
    env: env,
    log: '',
    error: '',
    retry: retry,
    delay: delay,
    timeout: timeout
  };
  const clone = dcp.define('stats', stats);

  util.start();

  const tasks = [];
  const result = {};
  const queue = async.queue(worker, parallelism);
  queue.error = callback;
  queue.drain = callback;
  _.forOwn(files, (filepath, filename) => {
    queue.push({
      filepath: filepath,
      filename: filename
    });
  });

  process.once('SIGINT', () => {
    console.log('closing...');
    queue.pause();
    _.forEach(tasks, test => {
      test.stdin.pause();
      test.kill();
    });
  });

  function worker(data, next) {
    const filepath = data.filepath;
    const filename = data.filename;
    stats.current++;
    util.log(`executing... [${filename}]`);
    let count = 0;
    let info = clone(stats);
    info.filename = filename;
    info.filepath = filepath;
    info.env.MOCHA_TIMEOUT = timeout;
    info.env.DEBUG = util.isDebug();
    before(info);
    const mocha = path.resolve(__dirname, 'mocha.js');
    const opts = { env: info.env };
    const test = spawn('node', [mocha, filepath], opts)
      .on('error', done)
      .on('close', err => {
        _.remove(tasks, test);
        if (err) {
          if (count++ < retry) {
            after(info);
            util.error(`retrying... ${filename} [${count}/${retry}]`);
            return queue.push(data);
          }
          util.error(info);
        }
        util.log(`end. [${filename}]`);
        let log;
        if (!info.log.length) {
          info.log = util.skip;
          log = 'no logs';
          util.error(`no logs ${filename}`);
        } else if (util.isDebug()) {
          log = info.log;
        } else {
          try {
            info.log = JSON.parse(info.log);
          } catch(e) {
            console.log(`parse error, e:${e}, err:${err}, filename:${filename}`, info.log);
            info.log = util.skip;
          }
        }
        after(info);
        if (!util.isDebug()) {
          util.output(info);
        }
        if (log) {
          util.log(log);
        }
        var cb = next;
        next = _.noop;
        result[filename] = info.log;
        setTimeout(cb, delay);
      });
    tasks.push(test);
    test.stdout.on('data', data => {
      const buf = new Buffer(data, 'utf8');
      let log = buf.toString();
      info.log += log;
      watch(info.log);
    });
    test.stderr.on('data', data => {
      const buf = new Buffer(data, 'utf8');
      let log = buf.toString();
      info.error += log;
      error(log);
    });
  }

  function callback(err) {
    if (!util.isDebug()) {
      util.exposeLog().outputResult(result);
    }
    done(err, result);
  }
}

module.exports = executor;
