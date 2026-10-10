(() => {
// A point is [GPU hours, passed tasks, completed tasks]. Values are right-continuous.
function valueAt(points, time, column = 1) {
  let low = 0, high = points.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (points[middle][0] <= time) low = middle + 1;
    else high = middle;
  }
  return low ? points[low - 1][column] : 0;
}
function aggregateRuns(runs) {
  const times = [...new Set(runs.flatMap(run => run.points.map(p => p[0])))].sort((a, b) => a - b);
  return times.map(time => {
    const values = runs.map(run => valueAt(run.points, time));
    return [time, values.reduce((a, b) => a + b, 0) / values.length, Math.min(...values), Math.max(...values)];
  });
}
function stepCoordinates(points, x, y, column = 1) {
  return points.flatMap((point, i) => i ? [[x(point[0]), y(points[i - 1][column])], [x(point[0]), y(point[column])]] : [[x(point[0]), y(point[column])]]);
}
function stepPath(points, x, y, column = 1) {
  return stepCoordinates(points, x, y, column).map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(3)},${b.toFixed(3)}`).join(' ');
}

window.AKVMath = { valueAt, aggregateRuns, stepCoordinates, stepPath };
})();
