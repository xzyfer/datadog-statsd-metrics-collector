const throttle = require('lodash.throttle');

const reMetricTags = new RegExp(/^([^[]+)(\[([^\]]*)\])?$/);

const serialise = (metric, tags) => {
  if (!(Array.isArray(tags) && tags.length)) {
    return metric;
  }
  return `${metric}[${tags.join(',')}]`;
};

const deserialise = (metric) => {
  const matches = reMetricTags.exec(metric);

  if (!matches) return null;

  return {
    metric: matches[1],
    tags: matches[3] && matches[3].split(','),
  };
};

class Collector {
  constructor(client, delayMilliseconds) {
    this.client = client;
    this.delay = delayMilliseconds || 10000;
    this._increment = throttle(this._increment.bind(this), this.delay, { leading: false });
    this._decrement = throttle(this._decrement.bind(this), this.delay, { leading: false });
    this.collection = {
      increment: {},
      decrement: {},
    };
  }

  increment(metric, sample, tags) {
    if (!this.client) return;

    const key = serialise(metric, tags);
    const value = 1 / (sample || 1);
    this.incrementBy(metric, value, tags);
  }

  incrementBy(metric, value, tags) {
    if (!this.client) return;

    const key = serialise(metric, tags);
    this.collection.increment[key] = (this.collection.increment[key] || 0) + (value || 1);
    this._increment();
  }

  decrement(metric, sample, tags) {
    if (!this.client) return;

    const key = serialise(metric, tags);
    const value = 1 / (sample || 1);
    this.decrementBy(metric, value, tags);
  }

  decrementBy(metric, value, tags) {
    if (!this.client) return;

    const key = serialise(metric, tags);
    this.collection.decrement[key] = (this.collection.decrement[key] || 0) + (value || 1);
    this._decrement();
  }

  _increment() {
    Object.keys(this.collection.increment).forEach((key) => {
      const value = this.collection.increment[key];
      const { metric, tags } = deserialise(key) || {};

      if (metric && value) {
        this.client.incrementBy(metric, value, tags);
        this.collection.increment[key] = 0;
      }
    });
  }

  _decrement() {
    Object.keys(this.collection.decrement).forEach((key) => {
      const value = this.collection.decrement[key];
      const { metric, tags } = deserialise(key) || {};

      if (metric && value) {
        this.client.decrementBy(metric, value, tags);
        this.collection.decrement[key] = 0;
      }
    });
  }

  timing(...args) {
    if (!this.client) return;
    this.client.timing(...args);
  }

  gauge(...args) {
    if (!this.client) return;
    this.client.gauge(...args);
  }

  histogram(...args) {
    if (!this.client) return;
    this.client.histogram(...args);
  }

  set(...args) {
    if (!this.client) return;
    this.client.set(...args);
  }
}

module.exports = Collector;
