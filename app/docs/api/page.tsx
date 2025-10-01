'use client';

import { useEffect, useRef } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function APIDocumentationPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Custom styles for swagger UI to match application theme
    const style = document.createElement('style');
    style.textContent = `
      .swagger-ui {
        font-family: var(--font-sans);
      }
      .swagger-ui .topbar {
        display: none;
      }
      .swagger-ui .info {
        margin: 20px 0;
      }
      .swagger-ui .scheme-container {
        background: #fafafa;
        box-shadow: none;
        border: 1px solid #e5e7eb;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
          <p className="mt-2 text-gray-600">
            Complete reference for the CU-BEMS IoT Transmission Failure Analysis Platform API
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Authentication</h2>
          <p className="text-sm text-blue-800 mb-3">
            This API uses two authentication methods:
          </p>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
            <li>
              <strong>JWT Bearer Token:</strong> For web application access (obtained via NextAuth)
            </li>
            <li>
              <strong>API Key:</strong> For programmatic access (Professional tier only)
            </li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">Rate Limits</h2>
          <p className="text-sm text-yellow-800">
            Rate limits vary by subscription tier:
          </p>
          <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1 mt-2">
            <li><strong>Free:</strong> 100 requests/hour</li>
            <li><strong>Professional:</strong> 1,000 requests/hour</li>
            <li><strong>Enterprise:</strong> 10,000 requests/hour</li>
          </ul>
        </div>

        <div ref={containerRef} className="swagger-container">
          <SwaggerUI
            url="/api/docs"
            docExpansion="list"
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={1}
            displayRequestDuration={true}
            filter={true}
            showExtensions={true}
            showCommonExtensions={true}
            tryItOutEnabled={true}
          />
        </div>

        <div className="mt-8 border-t pt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/dashboard"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
            >
              <h3 className="font-semibold text-gray-900">Dashboard</h3>
              <p className="text-sm text-gray-600 mt-1">Access the analytics dashboard</p>
            </a>
            <a
              href="/api/health"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
            >
              <h3 className="font-semibold text-gray-900">API Health</h3>
              <p className="text-sm text-gray-600 mt-1">Check API system status</p>
            </a>
            <a
              href="/docs/help"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
            >
              <h3 className="font-semibold text-gray-900">Help Center</h3>
              <p className="text-sm text-gray-600 mt-1">Browse documentation and guides</p>
            </a>
            <a
              href="/dashboard/reports"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
            >
              <h3 className="font-semibold text-gray-900">Reports</h3>
              <p className="text-sm text-gray-600 mt-1">Generate custom reports</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}