const Collector = require('../');
const interval = 10000;

// https://github.com/facebook/jest/issues/3465
jest.mock('lodash.throttle', () => (fn, delay) => () => setTimeout(fn, delay));

jest.useFakeTimers();

describe('Collector', () => {
  let client;
  let collector;

  beforeEach(() => {
    client = {
      incrementBy: jest.fn(),
      decrementBy: jest.fn(),
    };
    collector = new Collector(client);
  });

  describe('increment', () => {
    describe('single call', () => {
      test('throttle calls', () => {
        collector.increment('test.metric');

        expect(client.incrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.incrementBy).toHaveBeenCalledTimes(1);
        expect(client.incrementBy).toHaveBeenCalledWith('test.metric', 1, undefined);
      });

      test('preserves tags', () => {
        collector.increment('test.metric', undefined, ['tag:first', 'tag:second']);
        jest.advanceTimersByTime(interval);
        expect(client.incrementBy).toHaveBeenCalledWith('test.metric', 1, ['tag:first', 'tag:second']);
      });

      test('compensates for sample rate', () => {
        collector.increment('test.metric', 1);
        jest.advanceTimersByTime(interval);
        expect(client.incrementBy).toHaveBeenCalledWith('test.metric', 1, undefined);

        collector.increment('test.metric', 0.5);
        jest.advanceTimersByTime(interval);
        expect(client.incrementBy).toHaveBeenCalledWith('test.metric', 2, undefined);

        collector.increment('test.metric', 0.2);
        jest.advanceTimersByTime(interval);
        expect(client.incrementBy).toHaveBeenCalledWith('test.metric', 5, undefined);
      });

      test('cleans up after flushes', () => {
        collector.increment('test.metric', 1);
        jest.advanceTimersByTime(interval);

        collector.increment('test.metric', 1, ['tag:second', 'tag:third']);
        jest.advanceTimersByTime(interval);

        collector.increment('test.metric', 1);
        jest.advanceTimersByTime(interval);

        expect(client.incrementBy).toHaveBeenCalledTimes(3);
        expect(client.incrementBy).toHaveBeenNthCalledWith(1, 'test.metric', 1, undefined);
        expect(client.incrementBy).toHaveBeenNthCalledWith(2, 'test.metric', 1, ['tag:second', 'tag:third']);
        expect(client.incrementBy).toHaveBeenNthCalledWith(3, 'test.metric', 1, undefined);
      });
    });

    describe('multiple calls', () => {
      test('throttle calls', () => {
        collector.increment('test.metric');
        collector.increment('test.metric');
        collector.increment('test.metric');
        collector.increment('test.metric');

        expect(client.incrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.incrementBy).toHaveBeenCalledTimes(1);
        expect(client.incrementBy).toHaveBeenCalledWith('test.metric', 4, undefined);
      });

      test('preserves tags', () => {
        collector.increment('test.metric', undefined, ['tag:first', 'tag:second']);
        collector.increment('test.metric', undefined, ['tag:first', 'tag:second']);
        collector.increment('test.metric', undefined, ['tag:second', 'tag:third']);
        collector.increment('test.metric', undefined, ['tag:second', 'tag:third']);
        collector.increment('test.metric', undefined, ['tag:third', 'tag:fourth']);

        expect(client.incrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.incrementBy).toHaveBeenCalledTimes(3);
        expect(client.incrementBy).toHaveBeenNthCalledWith(1, 'test.metric', 2, ['tag:first', 'tag:second']);
        expect(client.incrementBy).toHaveBeenNthCalledWith(2, 'test.metric', 2, ['tag:second', 'tag:third']);
        expect(client.incrementBy).toHaveBeenNthCalledWith(3, 'test.metric', 1, ['tag:third', 'tag:fourth']);
      });

      test('compensates for sample rate', () => {
        collector.increment('test.metric', 1, ['tag:first', 'tag:second']);
        collector.increment('test.metric', 0.5, ['tag:first', 'tag:second']);
        collector.increment('test.metric', undefined, ['tag:second', 'tag:third']);
        collector.increment('test.metric', 0.2, ['tag:second', 'tag:third']);
        collector.increment('test.metric', 0.25, ['tag:third', 'tag:fourth']);

        expect(client.incrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.incrementBy).toHaveBeenCalledTimes(3);
        expect(client.incrementBy).toHaveBeenNthCalledWith(1, 'test.metric', 3, ['tag:first', 'tag:second']);
        expect(client.incrementBy).toHaveBeenNthCalledWith(2, 'test.metric', 6, ['tag:second', 'tag:third']);
        expect(client.incrementBy).toHaveBeenNthCalledWith(3, 'test.metric', 4, ['tag:third', 'tag:fourth']);
      });

      test('cleans up after flushes', () => {
        collector.increment('test.metric');
        collector.increment('test.metric');
        jest.advanceTimersByTime(interval);

        collector.increment('test.metric', undefined, ['tag:second', 'tag:third']);
        collector.increment('test.metric', undefined, ['tag:second', 'tag:third']);
        jest.advanceTimersByTime(interval);

        collector.increment('test.metric');
        collector.increment('test.metric');
        jest.advanceTimersByTime(interval);

        expect(client.incrementBy).toHaveBeenCalledTimes(3);
        expect(client.incrementBy).toHaveBeenNthCalledWith(1, 'test.metric', 2, undefined);
        expect(client.incrementBy).toHaveBeenNthCalledWith(2, 'test.metric', 2, ['tag:second', 'tag:third']);
        expect(client.incrementBy).toHaveBeenNthCalledWith(3, 'test.metric', 2, undefined);
      });
    });
  });


  describe('incrementBy', () => {
    describe('single call', () => {
      test('throttle calls', () => {
        collector.incrementBy('test.metric');

        expect(client.incrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.incrementBy).toHaveBeenCalledTimes(1);
        expect(client.incrementBy).toHaveBeenCalledWith('test.metric', 1, undefined);
      });

      test('respects increment value', () => {
        collector.incrementBy('test.metric', 5);

        expect(client.incrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.incrementBy).toHaveBeenCalledTimes(1);
        expect(client.incrementBy).toHaveBeenCalledWith('test.metric', 5, undefined);
      })

      test('preserves tags', () => {
        collector.incrementBy('test.metric', undefined, ['tag:first', 'tag:second']);
        jest.advanceTimersByTime(interval);
        expect(client.incrementBy).toHaveBeenCalledWith('test.metric', 1, ['tag:first', 'tag:second']);
      });

      test('cleans up after flushes', () => {
        collector.incrementBy('test.metric', 1);
        jest.advanceTimersByTime(interval);

        collector.incrementBy('test.metric', 1, ['tag:second', 'tag:third']);
        jest.advanceTimersByTime(interval);

        collector.incrementBy('test.metric', 1);
        jest.advanceTimersByTime(interval);

        expect(client.incrementBy).toHaveBeenCalledTimes(3);
        expect(client.incrementBy).toHaveBeenNthCalledWith(1, 'test.metric', 1, undefined);
        expect(client.incrementBy).toHaveBeenNthCalledWith(2, 'test.metric', 1, ['tag:second', 'tag:third']);
        expect(client.incrementBy).toHaveBeenNthCalledWith(3, 'test.metric', 1, undefined);
      });
    });

    describe('multiple calls', () => {
      test('throttle calls', () => {
        collector.incrementBy('test.metric');
        collector.incrementBy('test.metric');
        collector.incrementBy('test.metric');
        collector.incrementBy('test.metric');

        expect(client.incrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.incrementBy).toHaveBeenCalledTimes(1);
        expect(client.incrementBy).toHaveBeenCalledWith('test.metric', 4, undefined);
      });

      test('respects increment value', () => {
        collector.incrementBy('test.metric', 1);
        collector.incrementBy('test.metric', 3);
        collector.incrementBy('test.metric', 5);
        collector.incrementBy('test.metric', 7);

        expect(client.incrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.incrementBy).toHaveBeenCalledTimes(1);
        expect(client.incrementBy).toHaveBeenCalledWith('test.metric', 16, undefined);
      });

      test('preserves tags', () => {
        collector.incrementBy('test.metric', undefined, ['tag:first', 'tag:second']);
        collector.incrementBy('test.metric', 1, ['tag:first', 'tag:second']);
        collector.incrementBy('test.metric', 3, ['tag:second', 'tag:third']);
        collector.incrementBy('test.metric', 5, ['tag:second', 'tag:third']);
        collector.incrementBy('test.metric', 7, ['tag:third', 'tag:fourth']);

        expect(client.incrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.incrementBy).toHaveBeenCalledTimes(3);
        expect(client.incrementBy).toHaveBeenNthCalledWith(1, 'test.metric', 2, ['tag:first', 'tag:second']);
        expect(client.incrementBy).toHaveBeenNthCalledWith(2, 'test.metric', 8, ['tag:second', 'tag:third']);
        expect(client.incrementBy).toHaveBeenNthCalledWith(3, 'test.metric', 7, ['tag:third', 'tag:fourth']);
      });

      test('cleans up after flushes', () => {
        collector.incrementBy('test.metric');
        collector.incrementBy('test.metric', 1);
        jest.advanceTimersByTime(interval);

        collector.incrementBy('test.metric', 3, ['tag:second', 'tag:third']);
        collector.incrementBy('test.metric', 5, ['tag:second', 'tag:third']);
        jest.advanceTimersByTime(interval);

        collector.incrementBy('test.metric', 7);
        collector.incrementBy('test.metric', 9);
        jest.advanceTimersByTime(interval);

        expect(client.incrementBy).toHaveBeenCalledTimes(3);
        expect(client.incrementBy).toHaveBeenNthCalledWith(1, 'test.metric', 2, undefined);
        expect(client.incrementBy).toHaveBeenNthCalledWith(2, 'test.metric', 8, ['tag:second', 'tag:third']);
        expect(client.incrementBy).toHaveBeenNthCalledWith(3, 'test.metric', 16, undefined);
      });
    });
  });

  describe('decrement', () => {
    describe('single call', () => {
      test('throttle calls', () => {
        collector.decrement('test.metric');

        expect(client.decrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.decrementBy).toHaveBeenCalledTimes(1);
        expect(client.decrementBy).toHaveBeenCalledWith('test.metric', 1, undefined);
      });

      test('preserves tags', () => {
        collector.decrement('test.metric', undefined, ['tag:first', 'tag:second']);
        jest.advanceTimersByTime(interval);
        expect(client.decrementBy).toHaveBeenCalledWith('test.metric', 1, ['tag:first', 'tag:second']);
      });

      test('compensates for sample rate', () => {
        collector.decrement('test.metric', 1);
        jest.advanceTimersByTime(interval);
        expect(client.decrementBy).toHaveBeenCalledWith('test.metric', 1, undefined);

        collector.decrement('test.metric', 0.5);
        jest.advanceTimersByTime(interval);
        expect(client.decrementBy).toHaveBeenCalledWith('test.metric', 2, undefined);

        collector.decrement('test.metric', 0.2);
        jest.advanceTimersByTime(interval);
        expect(client.decrementBy).toHaveBeenCalledWith('test.metric', 5, undefined);
      });

      test('cleans up after flushes', () => {
        collector.decrement('test.metric', 1);
        jest.advanceTimersByTime(interval);

        collector.decrement('test.metric', 1, ['tag:second', 'tag:third']);
        jest.advanceTimersByTime(interval);

        collector.decrement('test.metric', 1);
        jest.advanceTimersByTime(interval);

        expect(client.decrementBy).toHaveBeenCalledTimes(3);
        expect(client.decrementBy).toHaveBeenNthCalledWith(1, 'test.metric', 1, undefined);
        expect(client.decrementBy).toHaveBeenNthCalledWith(2, 'test.metric', 1, ['tag:second', 'tag:third']);
        expect(client.decrementBy).toHaveBeenNthCalledWith(3, 'test.metric', 1, undefined);
      });
    });

    describe('multiple calls', () => {
      test('throttle calls', () => {
        collector.decrement('test.metric');
        collector.decrement('test.metric');
        collector.decrement('test.metric');
        collector.decrement('test.metric');

        expect(client.decrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.decrementBy).toHaveBeenCalledTimes(1);
        expect(client.decrementBy).toHaveBeenCalledWith('test.metric', 4, undefined);
      });

      test('preserves tags', () => {
        collector.decrement('test.metric', undefined, ['tag:first', 'tag:second']);
        collector.decrement('test.metric', undefined, ['tag:first', 'tag:second']);
        collector.decrement('test.metric', undefined, ['tag:second', 'tag:third']);
        collector.decrement('test.metric', undefined, ['tag:second', 'tag:third']);
        collector.decrement('test.metric', undefined, ['tag:third', 'tag:fourth']);

        expect(client.decrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.decrementBy).toHaveBeenCalledTimes(3);
        expect(client.decrementBy).toHaveBeenNthCalledWith(1, 'test.metric', 2, ['tag:first', 'tag:second']);
        expect(client.decrementBy).toHaveBeenNthCalledWith(2, 'test.metric', 2, ['tag:second', 'tag:third']);
        expect(client.decrementBy).toHaveBeenNthCalledWith(3, 'test.metric', 1, ['tag:third', 'tag:fourth']);
      });

      test('compensates for sample rate', () => {
        collector.decrement('test.metric', 1, ['tag:first', 'tag:second']);
        collector.decrement('test.metric', 0.5, ['tag:first', 'tag:second']);
        collector.decrement('test.metric', undefined, ['tag:second', 'tag:third']);
        collector.decrement('test.metric', 0.2, ['tag:second', 'tag:third']);
        collector.decrement('test.metric', 0.25, ['tag:third', 'tag:fourth']);

        expect(client.decrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.decrementBy).toHaveBeenCalledTimes(3);
        expect(client.decrementBy).toHaveBeenNthCalledWith(1, 'test.metric', 3, ['tag:first', 'tag:second']);
        expect(client.decrementBy).toHaveBeenNthCalledWith(2, 'test.metric', 6, ['tag:second', 'tag:third']);
        expect(client.decrementBy).toHaveBeenNthCalledWith(3, 'test.metric', 4, ['tag:third', 'tag:fourth']);
      });

      test('cleans up after flushes', () => {
        collector.decrement('test.metric');
        collector.decrement('test.metric');
        jest.advanceTimersByTime(interval);

        collector.decrement('test.metric', undefined, ['tag:second', 'tag:third']);
        collector.decrement('test.metric', undefined, ['tag:second', 'tag:third']);
        jest.advanceTimersByTime(interval);

        collector.decrement('test.metric');
        collector.decrement('test.metric');
        jest.advanceTimersByTime(interval);

        expect(client.decrementBy).toHaveBeenCalledTimes(3);
        expect(client.decrementBy).toHaveBeenNthCalledWith(1, 'test.metric', 2, undefined);
        expect(client.decrementBy).toHaveBeenNthCalledWith(2, 'test.metric', 2, ['tag:second', 'tag:third']);
        expect(client.decrementBy).toHaveBeenNthCalledWith(3, 'test.metric', 2, undefined);
      });
    });
  });


  describe('decrementBy', () => {
    describe('single call', () => {
      test('throttle calls', () => {
        collector.decrementBy('test.metric');

        expect(client.decrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.decrementBy).toHaveBeenCalledTimes(1);
        expect(client.decrementBy).toHaveBeenCalledWith('test.metric', 1, undefined);
      });

      test('respects decrement value', () => {
        collector.decrementBy('test.metric', 5);

        expect(client.decrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.decrementBy).toHaveBeenCalledTimes(1);
        expect(client.decrementBy).toHaveBeenCalledWith('test.metric', 5, undefined);
      })

      test('preserves tags', () => {
        collector.decrementBy('test.metric', undefined, ['tag:first', 'tag:second']);
        jest.advanceTimersByTime(interval);
        expect(client.decrementBy).toHaveBeenCalledWith('test.metric', 1, ['tag:first', 'tag:second']);
      });

      test('cleans up after flushes', () => {
        collector.decrementBy('test.metric', 1);
        jest.advanceTimersByTime(interval);

        collector.decrementBy('test.metric', 1, ['tag:second', 'tag:third']);
        jest.advanceTimersByTime(interval);

        collector.decrementBy('test.metric', 1);
        jest.advanceTimersByTime(interval);

        expect(client.decrementBy).toHaveBeenCalledTimes(3);
        expect(client.decrementBy).toHaveBeenNthCalledWith(1, 'test.metric', 1, undefined);
        expect(client.decrementBy).toHaveBeenNthCalledWith(2, 'test.metric', 1, ['tag:second', 'tag:third']);
        expect(client.decrementBy).toHaveBeenNthCalledWith(3, 'test.metric', 1, undefined);
      });
    });

    describe('multiple calls', () => {
      test('throttle calls', () => {
        collector.decrementBy('test.metric');
        collector.decrementBy('test.metric');
        collector.decrementBy('test.metric');
        collector.decrementBy('test.metric');

        expect(client.decrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.decrementBy).toHaveBeenCalledTimes(1);
        expect(client.decrementBy).toHaveBeenCalledWith('test.metric', 4, undefined);
      });

      test('respects decrement value', () => {
        collector.decrementBy('test.metric', 1);
        collector.decrementBy('test.metric', 3);
        collector.decrementBy('test.metric', 5);
        collector.decrementBy('test.metric', 7);

        expect(client.decrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.decrementBy).toHaveBeenCalledTimes(1);
        expect(client.decrementBy).toHaveBeenCalledWith('test.metric', 16, undefined);
      });

      test('preserves tags', () => {
        collector.decrementBy('test.metric', undefined, ['tag:first', 'tag:second']);
        collector.decrementBy('test.metric', 1, ['tag:first', 'tag:second']);
        collector.decrementBy('test.metric', 3, ['tag:second', 'tag:third']);
        collector.decrementBy('test.metric', 5, ['tag:second', 'tag:third']);
        collector.decrementBy('test.metric', 7, ['tag:third', 'tag:fourth']);

        expect(client.decrementBy).not.toBeCalled();

        jest.advanceTimersByTime(interval);

        expect(client.decrementBy).toHaveBeenCalledTimes(3);
        expect(client.decrementBy).toHaveBeenNthCalledWith(1, 'test.metric', 2, ['tag:first', 'tag:second']);
        expect(client.decrementBy).toHaveBeenNthCalledWith(2, 'test.metric', 8, ['tag:second', 'tag:third']);
        expect(client.decrementBy).toHaveBeenNthCalledWith(3, 'test.metric', 7, ['tag:third', 'tag:fourth']);
      });

      test('cleans up after flushes', () => {
        collector.decrementBy('test.metric');
        collector.decrementBy('test.metric', 1);
        jest.advanceTimersByTime(interval);

        collector.decrementBy('test.metric', 3, ['tag:second', 'tag:third']);
        collector.decrementBy('test.metric', 5, ['tag:second', 'tag:third']);
        jest.advanceTimersByTime(interval);

        collector.decrementBy('test.metric', 7);
        collector.decrementBy('test.metric', 9);
        jest.advanceTimersByTime(interval);

        expect(client.decrementBy).toHaveBeenCalledTimes(3);
        expect(client.decrementBy).toHaveBeenNthCalledWith(1, 'test.metric', 2, undefined);
        expect(client.decrementBy).toHaveBeenNthCalledWith(2, 'test.metric', 8, ['tag:second', 'tag:third']);
        expect(client.decrementBy).toHaveBeenNthCalledWith(3, 'test.metric', 16, undefined);
      });
    });
  });
});
