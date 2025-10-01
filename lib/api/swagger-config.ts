import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CU-BEMS IoT Transmission Failure Analysis Platform API',
      version: '1.0.0',
      description: 'Bangkok CU-BEMS IoT sensor data analytics and pattern detection API. Provides access to time-series data, statistical anomaly detection, pattern recognition, and export functionality.',
      contact: {
        name: 'API Support',
        url: 'https://cu-bems-analytics.com/support',
        email: 'support@cu-bems-analytics.com'
      },
      license: {
        name: 'Proprietary',
        url: 'https://cu-bems-analytics.com/license'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development Server'
      },
      {
        url: 'https://api.cu-bems-analytics.com',
        description: 'Production Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from NextAuth authentication'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for programmatic access (Professional tier only)'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            }
          }
        },
        TimeSeriesReading: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            sensor_id: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            value: { type: 'number' },
            quality: { type: 'string', enum: ['good', 'suspect', 'bad'] },
            transmission_status: { type: 'string', enum: ['success', 'failure', 'partial'] }
          }
        },
        Pattern: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['spike', 'drop', 'drift', 'oscillation', 'gap'] },
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            start_time: { type: 'string', format: 'date-time' },
            end_time: { type: 'string', format: 'date-time' },
            affected_sensors: { type: 'array', items: { type: 'string' } },
            description: { type: 'string' }
          }
        },
        StatisticalMetrics: {
          type: 'object',
          properties: {
            mean: { type: 'number' },
            median: { type: 'number' },
            stdDev: { type: 'number' },
            variance: { type: 'number' },
            min: { type: 'number' },
            max: { type: 'number' },
            pValue: { type: 'number', description: 'Statistical significance (p-value)' },
            confidenceInterval: {
              type: 'object',
              properties: {
                lower: { type: 'number' },
                upper: { type: 'number' },
                level: { type: 'number', description: 'Confidence level (e.g., 0.95 for 95%)' }
              }
            }
          }
        },
        ExportJob: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
            format: { type: 'string', enum: ['csv', 'excel', 'pdf'] },
            progress: { type: 'number', minimum: 0, maximum: 100 },
            created_at: { type: 'string', format: 'date-time' },
            completed_at: { type: 'string', format: 'date-time' },
            download_url: { type: 'string', format: 'uri' }
          }
        },
        SubscriptionTier: {
          type: 'string',
          enum: ['FREE', 'PROFESSIONAL', 'ENTERPRISE'],
          description: 'User subscription tier determining feature access'
        }
      }
    },
    security: [
      { bearerAuth: [] }
    ],
    tags: [
      {
        name: 'Readings',
        description: 'Time-series sensor data endpoints'
      },
      {
        name: 'Patterns',
        description: 'Pattern detection and anomaly identification'
      },
      {
        name: 'Export',
        description: 'Data export and report generation'
      },
      {
        name: 'Analytics',
        description: 'Statistical analysis and metrics'
      },
      {
        name: 'Professional API',
        description: 'Programmatic API access (Professional tier only)'
      },
      {
        name: 'Health',
        description: 'System health and monitoring'
      }
    ]
  },
  apis: [
    './app/api/**/*.ts',
    './app/api/**/**/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);