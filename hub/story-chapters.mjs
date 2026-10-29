/**
 * Follow readable copy rather than the centers of variably sized chapters.
 * Retain the current chapter through whitespace and small boundary movements.
 * @param {Array<{top:number,bottom:number}>} chapters
 * @param {number} top
 * @param {number} bottom
 * @param {number} current
 */
export function selectStoryChapter(chapters, top, bottom, current) {
  const scores = chapters.map(chapter => {
    const visible = Math.max(0, Math.min(chapter.bottom, bottom) - Math.max(chapter.top, top));
    return visible / Math.max(1, Math.min(chapter.bottom - chapter.top, bottom - top));
  });
  const next = scores.reduce((best, score, index) => score > scores[best] ? index : best, 0);
  const previous = current >= 0 && current < chapters.length ? current : 0;
  return !scores[next] || scores[next] - scores[previous] < .12 ? previous : next;
}
