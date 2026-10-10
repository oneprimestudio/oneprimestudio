/*
 * The studio's dither pixel. `5.png` is a 4×4 ordered-dither tile whose grey levels are Bayer ranks
 * (15, 31, 46 … 255 = (rank + 1)·16 − 1). That matrix, verbatim, is the threshold map:
 *
 *   a dot at (i, j) lights when  value(i, j) > THRESHOLD[j mod 4][i mod 4]
 */
const RANKS = [
  [0, 12, 3, 15],
  [8, 4, 11, 7],
  [2, 14, 1, 13],
  [10, 6, 9, 5],
];

export const THRESHOLD = RANKS.map((row) => row.map((rank) => (rank + 0.5) / 16));
