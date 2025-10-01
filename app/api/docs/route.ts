import { NextResponse } from 'next/server';
import { swaggerSpec } from '@/lib/api/swagger-config';

/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: Get OpenAPI specification
 *     description: Returns the complete OpenAPI/Swagger specification for the CU-BEMS API
 *     tags:
 *       - Documentation
 *     responses:
 *       200:
 *         description: OpenAPI specification returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET() {
  return NextResponse.json(swaggerSpec);
}