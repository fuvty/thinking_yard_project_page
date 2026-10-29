import test from 'node:test';
import assert from 'node:assert/strict';
import {selectStoryChapter} from '../hub/story-chapters.mjs';

test('the chart follows the chapter visible below the mobile sticky figure', () => {
  assert.equal(selectStoryChapter([{top:100,bottom:450},{top:520,bottom:1100}], 500, 820, 0), 1);
});

test('chapter transitions hold through whitespace and small boundary movements', () => {
  assert.equal(selectStoryChapter([{top:-500,bottom:-100},{top:920,bottom:1400}], 76, 868, 0), 0);
  assert.equal(selectStoryChapter([{top:0,bottom:400},{top:780,bottom:1180}], 200, 1000, 0), 0);
  assert.equal(selectStoryChapter([{top:-150,bottom:250},{top:630,bottom:1030}], 200, 1000, 0), 1);
});

test('long translations are readable without switching early and scrolling back works', () => {
  assert.equal(selectStoryChapter([{top:200,bottom:1200},{top:1300,bottom:1600}], 500, 820, 0), 0);
  assert.equal(selectStoryChapter([{top:100,bottom:700},{top:900,bottom:1400}], 76, 868, 1), 0);
});

test('direct section links select the visible chapter on first render', () => {
  assert.equal(selectStoryChapter([{top:-1700,bottom:-1200},{top:-800,bottom:-300},{top:150,bottom:700}], 128, 868, -1), 2);
});
