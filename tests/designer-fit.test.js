import test from 'node:test';
import assert from 'node:assert/strict';
import { designerFrame, fitDesignerStage } from '../src/features/grove/camera.js';

// The Farm Designer always draws the farm flat from above, whatever the map's 3D/flat setting,
// so its letterbox must use the flat frame: farm + margin on every side (viewBox -m -m W+2m H+2m).
test('designer frame: flat overhead shape, not the tilted 3D one', () => {
  const f = designerFrame(90, 130);
  assert.equal(f.margin, 3);
  assert.equal(f.vbW, 96); assert.equal(f.vbH, 136);
});

// Reported 2026-11-07: a 90 x 130 m farm in a 1712 x 578 stage came out 764 x 1116 px (top and bottom cut off).
test('designer fit: whole map plus its bar fits the stage', () => {
  const ratio = 96 / 136, chromeW = 30, chromeH = 76;
  const r = fitDesignerStage({ availW: 1712, availH: 578, ratio, chromeW, chromeH });
  assert.ok(r.h <= 578, `height ${r.h} > 578`);
  assert.ok(r.w <= 1712);
  assert.ok(Math.abs((r.w - chromeW) / (r.h - chromeH) - ratio) < 0.01, 'map keeps its shape');
  assert.ok(r.h >= 570, 'uses the available height');
});

test('designer fit: wide farm in a tall stage is limited by width', () => {
  const r = fitDesignerStage({ availW: 360, availH: 600, ratio: 2, chromeW: 30, chromeH: 76 });
  assert.equal(r.w, 360);
  assert.ok(r.h <= 600);
  assert.ok(Math.abs((r.w - 30) / (r.h - 76) - 2) < 0.02);
});
