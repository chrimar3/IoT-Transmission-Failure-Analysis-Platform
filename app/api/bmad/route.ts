import { NextRequest, NextResponse } from 'next/server';
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
}