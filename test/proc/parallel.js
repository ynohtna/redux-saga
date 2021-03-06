import test from 'tape';
import proc from '../../src/internal/proc'
import { deferred, arrayOfDeffered } from '../../src/utils'
import * as io from '../../src/effects'

const DELAY = 50
const delay = (ms) => () => new Promise(resolve => setTimeout(resolve, ms))

test('processor array of effects handling', assert => {
  assert.plan(1);

  let actual;
  const def = deferred()

  let cpsCb = {}
  const cps = (val, cb) => cpsCb = {val, cb}

  const input = cb => {
    Promise.resolve(1)
      .then(() => def.resolve(1))
      .then(() => cpsCb.cb(null, cpsCb.val))
      .then(() => delay(0))
      .then(() => cb({type: 'action'}))
    return () => {}
  }

  function* genFn() {
    actual = yield [
      def.promise,
      io.cps(cps, 2),
      io.take('action')
    ]
  }

  proc(genFn(), input).done.catch(err => assert.fail(err))

  const expected = [1,2, {type: 'action'}];

  setTimeout(() => {
    assert.deepEqual(actual, expected,
      "processor must fullfill parallel effects"
    );
    assert.end();
  }, DELAY)

});

test('processor empty array', assert => {
  assert.plan(1);

  let actual;

  const input = () => {
    return () => {}
  }

  function* genFn() {
    actual = yield []
  }

  proc(genFn(), input).done.catch(err => assert.fail(err))

  const expected = [];

  setTimeout(() => {
    assert.deepEqual(actual, expected,
      "processor must fullfill empty parallel effects with an empty array"
    );
    assert.end();
  }, DELAY)

});

test('processor array of effect: handling errors', assert => {
  assert.plan(1);

  let actual;
  const defs = arrayOfDeffered(2)

  Promise.resolve(1)
    .then(() => defs[0].reject('error'))
    .then(() => defs[1].resolve(1))

  function* genFn() {
    try {
      actual = yield [
        defs[0].promise,
        defs[1].promise
      ]
    } catch(err) {
      actual = [err]
    }
  }

  proc(genFn()).done.catch(err => assert.fail(err))

  const expected = ['error'];

  setTimeout(() => {
    assert.deepEqual(actual, expected,
      "processor must catch the first error in parallel effects"
    );
    assert.end();
  }, DELAY)

});
