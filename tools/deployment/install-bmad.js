#!/usr/bin/env node

/**
 * BMAD Framework Installation Script
 * Installs and configures the Build, Measure, Analyze, Decide framework
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Installing BMAD Framework...\n');

async function installBMAD() {
  try {
    // 1. Verify directory structure
    console.log('📁 Verifying directory structure...');
    const bmadDir = path.join(process.cwd(), 'src/lib/bmad');
    if (!fs.existsSync(bmadDir)) {
      fs.mkdirSync(bmadDir, { recursive: true });
      console.log('  ✅ Created BMAD directory');
    } else {
      console.log('  ✅ BMAD directory exists');
    }

    // 2. Check BMAD files
    console.log('\n📊 Checking BMAD components...');
    const requiredFiles = [
      'index.ts',
      'types.ts',
      'build-phase.ts',
      'measure-phase.ts',
      'analyze-phase.ts',
      'decide-phase.ts'
    ];

    let missingFiles = [];
    for (const file of requiredFiles) {
      const filePath = path.join(bmadDir, file);
      if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${file}`);
      } else {
        console.log(`  ❌ ${file} - MISSING`);
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      console.log(`\n⚠️  Missing ${missingFiles.length} BMAD files. Please complete implementation.`);
      return;
    }

    // 3. Create BMAD API endpoint
    console.log('\n🔌 Setting up BMAD API endpoint...');
    const apiDir = path.join(process.cwd(), 'app/api/bmad');
    if (!fs.existsSync(apiDir)) {
      fs.mkdirSync(apiDir, { recursive: true });
      console.log('  ✅ Created BMAD API directory');
    }

    const apiRoute = path.join(apiDir, 'route.ts');
    if (!fs.existsSync(apiRoute)) {
      const apiContent = `import { NextRequest, NextResponse } from 'next/server';
import { BMADFramework } from '../../../src/lib/bmad';

export async function GET() {
  try {
    const bmad = new BMADFramework();
    const report = await bmad.execute();

    return NextResponse.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('BMAD execution error:', error);
    return NextResponse.json(
      { success: false, error: 'BMAD execution failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const config = await request.json();
    const bmad = new BMADFramework(config);
    const dashboardData = await bmad.getDashboardData();

    return NextResponse.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('BMAD dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Dashboard data generation failed' },
      { status: 500 }
    );
  }
}`;
      fs.writeFileSync(apiRoute, apiContent);
      console.log('  ✅ Created BMAD API route');
    } else {
      console.log('  ✅ BMAD API route exists');
    }

    // 4. Create BMAD dashboard page
    console.log('\n📊 Setting up BMAD dashboard page...');
    const bmadPageDir = path.join(process.cwd(), 'app/bmad');
    if (!fs.existsSync(bmadPageDir)) {
      fs.mkdirSync(bmadPageDir, { recursive: true });
      console.log('  ✅ Created BMAD page directory');
    }

    const dashboardPage = path.join(bmadPageDir, 'page.tsx');
    if (!fs.existsSync(dashboardPage)) {
      const pageContent = `'use client';

import { useState, useEffect } from 'react';
import { BmadReport } from '../../src/lib/bmad/types';

export default function BMADDashboard() {
  const [report, setReport] = useState<BmadReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBMADReport();
  }, []);

  const fetchBMADReport = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bmad');
      const result = await response.json();

      if (result.success) {
        setReport(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load BMAD report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Executing BMAD Framework...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center text-red-600">
        <p className="text-lg">Error: {error}</p>
        <button
          onClick={fetchBMADReport}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            🏗️ BMAD Framework Report
          </h1>
          <p className="text-gray-600 mt-2">
            Build, Measure, Analyze, Decide - IoT Platform Analysis
          </p>
        </header>

        {report && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Executive Summary</h2>
              <pre className="whitespace-pre-wrap text-gray-700 text-sm">
                {report.executiveSummary}
              </pre>
            </div>

            {/* ROI Metrics */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Return on Investment</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    $${report.roi.annualSavings.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Annual Savings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {report.roi.roi}
                  </div>
                  <div className="text-sm text-gray-500">ROI</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {report.roi.paybackPeriod}
                  </div>
                  <div className="text-sm text-gray-500">Payback Period</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    $${report.roi.netSavings.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Net Savings</div>
                </div>
              </div>
            </div>

            {/* Key Findings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Key Findings</h2>
              <ul className="space-y-2">
                {report.keyFindings.map((finding, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span className="text-gray-700">{finding}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Next Steps */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
              <ol className="space-y-2">
                {report.nextSteps.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded mr-3">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}`;
      fs.writeFileSync(dashboardPage, pageContent);
      console.log('  ✅ Created BMAD dashboard page');
    } else {
      console.log('  ✅ BMAD dashboard page exists');
    }

    // 5. Installation complete
    console.log('\n✅ BMAD Framework installation complete!');
    console.log('\n🎯 Next steps:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Visit: http://localhost:3000/bmad');
    console.log('  3. API available at: http://localhost:3000/api/bmad');
    console.log('\n📊 BMAD Framework is ready to analyze your IoT data!');

  } catch (error) {
    console.error('\n❌ Installation failed:', error.message);
    process.exit(1);
  }
}

installBMAD();