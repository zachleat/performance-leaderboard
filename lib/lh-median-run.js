// oh so slightly modified from https://github.com/GoogleChrome/lighthouse/blob/159cb8428cfb91452b1561ecaa0e8415e9eba742/lighthouse-core/lib/median-run.js

/**
 * @license Copyright 2020 Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @param {LH.Result} lhr @param {string} auditName */
const getNumericValue = (run, auditName) => {
  return run[auditName] || NaN;
}
// (lhr.audits[auditName] && lhr.audits[auditName].numericValue) || NaN;

/**
 * @param {Array<number>} numbers
 * @return {number}
 */
function getMedianValue(numbers) {
  const sorted = numbers.slice().sort((a, b) => a - b);
  if (sorted.length % 2 === 1) return sorted[(sorted.length - 1) / 2];
  const lowerValue = sorted[sorted.length / 2 - 1];
  const upperValue = sorted[sorted.length / 2];
  return (lowerValue + upperValue) / 2;
}

/**
 * @param {LH.Result} lhr
 * @param {number} medianFcp
 * @param {number} medianInteractive
 * @param {number} medianLcp
 */
function getMedianSortValue(lhr, medianFcp, medianInteractive, medianLcp) {
  const distanceFcp =
    medianFcp - getNumericValue(lhr, 'firstContentfulPaint');
  const distanceInteractive =
    medianInteractive - getNumericValue(lhr, 'timeToInteractive');
  const distanceLcp =
    medianLcp - getNumericValue(lhr, 'largestContentfulPaint');

  return distanceFcp * distanceFcp + distanceInteractive * distanceInteractive + distanceLcp * distanceLcp;
}

/**
 * We want the run that's closest to the median of the FCP and the median of the TTI.
 * We're using the Euclidean distance for that (https://en.wikipedia.org/wiki/Euclidean_distance).
 * We use FCP and TTI because they represent the earliest and latest moments in the page lifecycle.
 * We avoid the median of single measures like the performance score because they can still exhibit
 * outlier behavior at the beginning or end of load.
 *
 * @param {Array<LH.Result>} runs
 * @return {LH.Result}
 */
function computeMedianRun(runs) {
  const missingFcp = runs.some(run =>
    Number.isNaN(getNumericValue(run, 'firstContentfulPaint'))
  );
  const missingLcp = runs.some(run =>
    Number.isNaN(getNumericValue(run, 'largestContentfulPaint'))
  );
  const missingTti = runs.some(run =>
    Number.isNaN(getNumericValue(run, 'timeToInteractive'))
  );

  if (!runs.length) throw new Error('No runs provided');
  if (missingFcp) throw new Error(`Some runs were missing an FCP value`);
  if (missingLcp) throw new Error(`Some runs were missing an LCP value`);
  if (missingTti) throw new Error(`Some runs were missing a TTI value`);

  const medianFcp = getMedianValue(
    runs.map(run => getNumericValue(run, 'firstContentfulPaint'))
  );

  const medianLcp = getMedianValue(
    runs.map(run => getNumericValue(run, 'largestContentfulPaint'))
  );

  const medianInteractive = getMedianValue(
    runs.map(run => getNumericValue(run, 'timeToInteractive'))
  );

  // console.log( { medianFcp, medianInteractive, medianLcp } );

  // Sort by proximity to the medians, breaking ties with the minimum TTI.
  const sortedByProximityToMedian = runs
    .slice()
    .sort(
      (a, b) =>
        getMedianSortValue(a, medianFcp, medianInteractive, medianLcp) -
          getMedianSortValue(b, medianFcp, medianInteractive, medianLcp) ||
        getNumericValue(a, 'timeToInteractive') - getNumericValue(b, 'timeToInteractive')
    );

  return sortedByProximityToMedian[0];
}

module.exports = {computeMedianRun};
