import assert from 'node:assert';
import { interpolateCompression } from '../src/utils/compressionMath.js';

console.log('================================================================');
console.log('  TEST SUITE: CompressionSlider Piecewise Linear Interpolation');
console.log('================================================================');

// Test 1: Anchor point s = 0 (Extreme)
const s0 = interpolateCompression(0);
assert.strictEqual(s0.quality, 0.40, 's=0 quality must be 0.40');
assert.strictEqual(s0.maxDimension, 800, 's=0 maxDimension must be 800');
assert.strictEqual(s0.minSavings, 0.02, 's=0 minSavings must be 0.02');
assert.strictEqual(s0.activePresetId, 'extreme');
assert.strictEqual(s0.isPresetAnchor, true);
console.log('✅ PASS: Anchor s=0 matches Extreme preset parameters');

// Test 2: Anchor point s = 33 (High)
const s33 = interpolateCompression(33);
assert.strictEqual(s33.quality, 0.55, 's=33 quality must be 0.55');
assert.strictEqual(s33.maxDimension, 1000, 's=33 maxDimension must be 1000');
assert.strictEqual(s33.minSavings, 0.04, 's=33 minSavings must be 0.04');
assert.strictEqual(s33.activePresetId, 'high');
assert.strictEqual(s33.isPresetAnchor, true);
console.log('✅ PASS: Anchor s=33 matches High preset parameters');

// Test 3: Anchor point s = 66 (Balanced - Default)
const s66 = interpolateCompression(66);
assert.strictEqual(s66.quality, 0.68, 's=66 quality must be 0.68');
assert.strictEqual(s66.maxDimension, 1400, 's=66 maxDimension must be 1400');
assert.strictEqual(s66.minSavings, 0.05, 's=66 minSavings must be 0.05');
assert.strictEqual(s66.activePresetId, 'balanced');
assert.strictEqual(s66.isPresetAnchor, true);
console.log('✅ PASS: Anchor s=66 matches Balanced preset parameters');

// Test 4: Anchor point s = 100 (High Quality)
const s100 = interpolateCompression(100);
assert.strictEqual(s100.quality, 0.82, 's=100 quality must be 0.82');
assert.strictEqual(s100.maxDimension, 2000, 's=100 maxDimension must be 2000');
assert.strictEqual(s100.minSavings, 0.08, 's=100 minSavings must be 0.08');
assert.strictEqual(s100.activePresetId, 'high-quality');
assert.strictEqual(s100.isPresetAnchor, true);
console.log('✅ PASS: Anchor s=100 matches High Quality preset parameters');

// Test 5: Monotonic progression of parameters
let prevQuality = 0;
let prevMaxDim = 0;
let prevMinSav = 0;
for (let s = 0; s <= 100; s++) {
  const cur = interpolateCompression(s);
  assert.ok(cur.quality >= prevQuality, `Quality at s=${s} (${cur.quality}) must be >= previous (${prevQuality})`);
  assert.ok(cur.maxDimension >= prevMaxDim, `maxDimension at s=${s} (${cur.maxDimension}) must be >= previous (${prevMaxDim})`);
  assert.ok(cur.minSavings >= prevMinSav, `minSavings at s=${s} (${cur.minSavings}) must be >= previous (${prevMinSav})`);
  prevQuality = cur.quality;
  prevMaxDim = cur.maxDimension;
  prevMinSav = cur.minSavings;
}
console.log('✅ PASS: Quality, maxDimension, and minSavings are monotonically non-decreasing from s=0 to s=100');

// Test 6: Boundary clamping
const under = interpolateCompression(-50);
assert.strictEqual(under.sliderValue, 0);
assert.strictEqual(under.quality, 0.40);
const over = interpolateCompression(150);
assert.strictEqual(over.sliderValue, 100);
assert.strictEqual(over.quality, 0.82);
console.log('✅ PASS: Out-of-bounds slider values clamp safely to [0, 100]');

console.log('================================================================');
console.log('ALL COMPRESSION SLIDER TESTS PASSED (6/6)');
console.log('================================================================');
