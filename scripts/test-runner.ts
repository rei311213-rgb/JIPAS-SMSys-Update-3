/**
 * COMMAND-LINE TEST RUNNER PIPELINE (PHASE 18)
 * Executed after bootstrapping mock globals.
 */

import { runAutomatedTestSuite } from '../src/services/qaTestingService';

async function runCLI() {
  console.log('==================================================');
  console.log('JIPAS STUDENTS HUB — RUNNING AUTOMATED QA DIAGNOSTICS');
  console.log('==================================================');

  try {
    const summary = await runAutomatedTestSuite();
    
    console.log(`Executed At: ${summary.executedAt}`);
    console.log(`Total Duration: ${summary.totalDurationMs}ms\n`);

    console.log('INDIVIDUAL TEST CASE RESULTS:');
    summary.results.forEach((res, idx) => {
      const icon = res.status === 'PASS' ? '✅' : '❌';
      console.log(`${idx + 1}. [${res.category}] ${res.name} -> ${icon} ${res.status}`);
      if (res.message) {
        console.log(`   Error Details: ${res.message}`);
      }
    });

    console.log('\nSUMMARY STATS:');
    console.log(`- Total Executed: ${summary.executedCount}`);
    console.log(`- Total Passed:   \x1b[32m${summary.passedCount}\x1b[0m`);
    console.log(`- Total Failed:   \x1b[31m${summary.failedCount}\x1b[0m`);
    console.log(`- Total Blocked:  ${summary.blockedCount}`);
    console.log('==================================================');

    if (summary.failedCount > 0) {
      console.error('\x1b[31mTEST SUITE FAILED: Assertions failed.\x1b[0m');
      process.exit(1);
    } else {
      console.log('\x1b[32mTEST SUITE PASSED: All security, isolation, and workflow criteria met!\x1b[0m');
      process.exit(0);
    }
  } catch (error) {
    console.error('FATAL TEST EXCEPTION:', error);
    process.exit(1);
  }
}

runCLI();
