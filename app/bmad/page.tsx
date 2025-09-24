'use client';

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
    } catch (_err) {
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
                    ${report.roi.annualSavings.toLocaleString()}
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
                    ${report.roi.netSavings.toLocaleString()}
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

            {/* Recommendations */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Top Recommendations</h2>
              <div className="space-y-4">
                {report.recommendations.slice(0, 5).map((rec) => (
                  <div key={rec.id} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                        <p className="text-gray-600 text-sm mt-1">{rec.description}</p>
                        <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                          <span>Priority: <span className="font-medium">{rec.priority}</span></span>
                          <span>Timeframe: <span className="font-medium">{rec.timeframe}</span></span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-green-600">
                          ${rec.savings.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">Savings</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
}