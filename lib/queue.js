function pLimit(concurrency) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new TypeError('Concurrency must be a positive integer');
  }

  const queue = [];
  let activeCount = 0;

  const next = () => {
    if (activeCount >= concurrency) {
      return;
    }
    const item = queue.shift();
    if (!item) {
      return;
    }
    activeCount += 1;
    const { fn, resolve, reject } = item;
    fn()
      .then(resolve, reject)
      .finally(() => {
        activeCount -= 1;
        next();
      });
  };

  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
}

module.exports = { pLimit };
