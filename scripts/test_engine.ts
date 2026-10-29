import { SEBENTA_PRESETS } from '../src/presets/sebentaPresets';
import { buildSymbolicAnalysis } from '../src/engine/index';
import { fmtNum } from '../src/engine/expr';

console.log('=== VALIDATING ALL 15 SEBENTA EXERCISES ===\n');

let allPassed = true;

SEBENTA_PRESETS.forEach((preset) => {
  const res = buildSymbolicAnalysis(preset);
  console.log(`[Ex. ${preset.num}] ${preset.title}`);
  console.log(`  DOFs: ${res.nDof}`);
  console.log(`  Solve Error: ${res.solveError || 'None'}`);

  if (res.displacements) {
    const dispStr = res.displacements.map((u, i) => `u${i + 1}=${fmtNum(u)}`).join(', ');
    console.log(`  Displacements: ${dispStr}`);
  }

  if (preset.num === 1) {
    // Ex 1: K11 ~ 3.707, K12 ~ -0.707, K22 ~ 1.707; u1 ~ 0.4645, u2 ~ -0.3934; sigma2 ~ -0.8586
    const k11 = res.Knum[0][0];
    const k12 = res.Knum[0][1];
    const k22 = res.Knum[1][1];
    const u1 = res.displacements![0];
    const u2 = res.displacements![1];
    const s2 = res.barStresses[1]?.sigma;
    console.log(`  Check: K11=${fmtNum(k11)}, K12=${fmtNum(k12)}, K22=${fmtNum(k22)}`);
    console.log(`  Check: u1=${fmtNum(u1)}, u2=${fmtNum(u2)}, sigma(2)=${fmtNum(s2)}`);
    if (Math.abs(k11 - 3.7071) > 0.01 || Math.abs(u1 - 0.4645) > 0.01) {
      console.error('  FAIL on Ex 1 values');
      allPassed = false;
    }
  }

  if (preset.num === 7) {
    // Ex 7: u1 = thetaB = 2/15 ~ 0.1333
    const u1 = res.displacements![0];
    console.log(`  Check Ex 7: thetaB=${fmtNum(u1)} (expected 2/15 = 0.1333)`);
    if (Math.abs(u1 - 2 / 15) > 0.005) {
      console.error('  FAIL on Ex 7 values');
      allPassed = false;
    }
  }

  if (preset.num === 8) {
    // Ex 8: u1 = thetaA = -5/24 = -0.2083, u2 = vMeio = -2/15 = -0.1333
    const u1 = res.displacements![0];
    const u2 = res.displacements![1];
    console.log(`  Check Ex 8: thetaA=${fmtNum(u1)} (expected -5/24 = -0.2083), vMeio=${fmtNum(u2)} (expected -2/15 = -0.1333)`);
    if (Math.abs(u1 - (-5 / 24)) > 0.005 || Math.abs(u2 - (-2 / 15)) > 0.005) {
      console.error('  FAIL on Ex 8 values');
      allPassed = false;
    }
  }

  if (preset.num === 9) {
    // Ex 9: reaction at B RB = 11/20 = 0.55
    const rb = Object.values(res.reactions)[0];
    console.log(`  Check Ex 9: RB=${fmtNum(rb)} (expected 11/20 = 0.55)`);
    if (Math.abs(rb - 11 / 20) > 0.01) {
      console.error('  FAIL on Ex 9 reaction');
      allPassed = false;
    }
  }

  if (preset.num === 14) {
    // Ex 14: u1 = 2, u2 = 2.5
    const u1 = res.displacements![0];
    const u2 = res.displacements![1];
    console.log(`  Check Ex 14: u1=${fmtNum(u1)} (expected 2), u2=${fmtNum(u2)} (expected 2.5)`);
    if (Math.abs(u1 - 2) > 0.01 || Math.abs(u2 - 2.5) > 0.01) {
      console.error('  FAIL on Ex 14 values');
      allPassed = false;
    }
  }

  console.log('');
});

if (allPassed) {
  console.log('>>> ALL 15 PRESETS PASSED EXACT MATHEMATICAL VALIDATION! <<<');
} else {
  console.error('>>> SOME PRESETS FAILED VALIDATION <<<');
  process.exit(1);
}
