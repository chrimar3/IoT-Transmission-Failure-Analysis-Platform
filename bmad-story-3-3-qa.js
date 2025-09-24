/**
 * Execute BMAD QA Analysis for Story 3.3
 * Run with: node bmad-story-3-3-qa.js
 */

const { Story33AnalysisAgent } = require('./src/lib/bmad/story-3-3-analysis.ts');

async function runStory33QA() {
  console.log('🚀 BMAD Framework: Story 3.3 QA Analysis');
  console.log('==========================================\n');

  try {
    const analyzer = new Story33AnalysisAgent();
    const analysis = await analyzer.executeStory33Analysis();

    console.log('\n📊 ANALYSIS RESULTS:');
    console.log('====================');
    console.log(analysis.summary);

    console.log('\n🚨 CRITICAL ISSUES:');
    console.log('===================');
    analysis.criticalIssues.forEach(issue => {
      console.log(`❌ ${issue.title}`);
      console.log(`   Severity: ${issue.severity.toUpperCase()}`);
      console.log(`   Impact: ${issue.impact}`);
      console.log(`   Urgency: ${issue.urgency}`);
      console.log(`   Action: ${issue.recommendation}\n`);
    });

    console.log('💰 OPTIMIZATION OPPORTUNITIES:');
    console.log('==============================');
    analysis.opportunities.forEach(opp => {
      console.log(`✅ ${opp.title}`);
      console.log(`   Savings: $${opp.potentialSavings.toLocaleString()}`);
      console.log(`   Effort: ${opp.effort}, Timeframe: ${opp.timeframe}`);
      console.log(`   Confidence: ${opp.confidence}%\n`);
    });

    const totalSavings = analysis.opportunities.reduce((sum, o) => sum + o.potentialSavings, 0);
    const criticalCount = analysis.criticalIssues.filter(i => i.severity === 'critical').length;

    console.log('📈 EXECUTIVE SUMMARY:');
    console.log('=====================');
    console.log(`Overall Status: ${criticalCount > 0 ? 'CONDITIONAL PASS ⚠️' : 'PASS ✅'}`);
    console.log(`Critical Issues: ${criticalCount}`);
    console.log(`Total Opportunities: ${analysis.opportunities.length}`);
    console.log(`Total Savings Potential: $${totalSavings.toLocaleString()}`);
    console.log(`Confidence Score: ${analysis.confidenceScore}%`);

    if (criticalCount > 0) {
      console.log('\n🚫 DEPLOYMENT BLOCKED');
      console.log('Critical issues must be resolved before production deployment.');
    } else {
      console.log('\n✅ READY FOR DEPLOYMENT');
      console.log('All critical issues resolved, production deployment approved.');
    }

  } catch (error) {
    console.error('❌ BMAD Analysis Failed:', error.message);
    process.exit(1);
  }
}

// Execute the analysis
runStory33QA().catch(console.error);