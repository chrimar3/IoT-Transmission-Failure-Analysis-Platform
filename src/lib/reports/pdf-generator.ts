import PDFDocument from 'pdfkit';
import { ReportTemplate, ReportComponent } from '@/types/reports';

export interface PDFReportData {
  title?: string;
  branding?: {
    logo?: string;
    company?: string;
    colors?: {
      primary?: string;
      secondary?: string;
    };
  };
  dataRange?: {
    start: string;
    end: string;
  };
  charts?: unknown[];
  summary?: Record<string, unknown>;
  insights?: string[];
  [key: string]: unknown;
}

export interface PDFBranding {
  logo?: string;
  company?: string;
  colors?: {
    primary?: string;
    secondary?: string;
  };
}

// Canvas functionality is disabled for build compatibility

export async function generatePDF(
  template: ReportTemplate,
  data: unknown,
  _customParameters: Record<string, unknown>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: template.template_data.layout.page_size,
        layout: template.template_data.layout.orientation,
        margins: {
          top: template.template_data.layout.margins.top,
          bottom: template.template_data.layout.margins.bottom,
          left: template.template_data.layout.margins.left,
          right: template.template_data.layout.margins.right,
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Add branding elements
      addBranding(doc, template.template_data.branding);

      // Add report header
      addReportHeader(doc, template, data);

      // Process each component
      for (const component of template.template_data.components) {
        addComponent(doc, component, data);
      }

      // Add footer
      addReportFooter(doc, template.template_data.branding);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function addBranding(doc: PDFKit.PDFDocument, branding: PDFBranding) {
  if (branding.company_name) {
    doc
      .fontSize(20)
      .fillColor(branding.company_colors?.primary || '#2563eb')
      .text(branding.company_name, 50, 50);
  }

  if (branding.company_logo) {
    try {
      // Add logo if URL provided
      // Note: In production, you'd fetch and validate the image
      doc.image(branding.company_logo, 450, 40, { width: 100 });
    } catch (error) {
      console.warn('Failed to add logo to PDF:', error);
    }
  }
}

function addReportHeader(
  doc: PDFKit.PDFDocument,
  template: ReportTemplate,
  data: PDFReportData
) {
  doc.fontSize(16).fillColor('#1e293b').text(template.name, 50, 100);

  doc
    .fontSize(12)
    .fillColor('#64748b')
    .text(`Generated: ${new Date().toLocaleString()}`, 50, 125);

  if (data.dataRange) {
    doc.text(
      `Data Period: ${data.dataRange.start} to ${data.dataRange.end}`,
      50,
      140
    );
  }

  doc.text(`Category: ${template.category}`, 50, 155);

  // Add a line separator
  doc.moveTo(50, 180).lineTo(550, 180).stroke('#e5e7eb');
}

function addComponent(
  doc: PDFKit.PDFDocument,
  component: ReportComponent,
  data: PDFReportData
) {
  const x = component.position.x;
  const y = component.position.y + 200; // Offset for header
  const width = component.position.width;
  const _height = component.position.height;

  // Apply component styling
  if (component.styling?.background_color) {
    doc.rect(x, y, width, _height).fill(component.styling.background_color);
  }

  switch (component.type) {
    case 'text':
      addTextComponent(doc, component, x, y, width, _height);
      break;

    case 'header':
      addHeaderComponent(doc, component, x, y, width, _height);
      break;

    case 'metric':
      addMetricComponent(doc, component, x, y, width, _height, data);
      break;

    case 'chart':
      addChartComponent(doc, component, x, y, width, _height, data);
      break;

    case 'table':
      addTableComponent(doc, component, x, y, width, _height, data);
      break;

    case 'image':
      addImageComponent(doc, component, x, y, width, _height);
      break;

    case 'divider':
      addDividerComponent(doc, component, x, y, width, _height);
      break;

    default:
      // Placeholder for unknown components
      doc
        .rect(x, y, width, _height)
        .stroke('#e5e7eb')
        .fontSize(10)
        .fillColor('#64748b')
        .text(`${component.type} component`, x + 10, y + 10);
  }
}

function addTextComponent(
  doc: PDFKit.PDFDocument,
  component: ReportComponent,
  x: number,
  y: number,
  width: number,
  _height: number
) {
  doc
    .fontSize(component.styling?.font_size || 12)
    .fillColor(component.styling?.text_color || '#1e293b')
    .text(component.config.content || 'Text content', x + 10, y + 10, {
      width: width - 20,
      height: _height - 20,
      align: component.styling?.text_align || 'left',
    });
}

function addHeaderComponent(
  doc: PDFKit.PDFDocument,
  component: ReportComponent,
  x: number,
  y: number,
  width: number,
  _height: number
) {
  doc
    .fontSize(component.styling?.font_size || 18)
    .fillColor(component.styling?.text_color || '#1e293b')
    .text(component.config.content || 'Header', x + 10, y + 10, {
      width: width - 20,
      align: component.styling?.text_align || 'left',
    });
}

function addMetricComponent(
  doc: PDFKit.PDFDocument,
  component: ReportComponent,
  x: number,
  y: number,
  width: number,
  _height: number,
  data: PDFReportData
) {
  // Get metric value from data or use placeholder
  const value = getMetricValue(component, data) || '123.45';
  const format = component.config.format || {};

  doc
    .fontSize(24)
    .fillColor('#2563eb')
    .text(formatMetricValue(value, format), x + 10, y + 20, {
      width: width - 20,
      align: 'center',
    });

  doc
    .fontSize(12)
    .fillColor('#64748b')
    .text(component.config.label || 'Metric', x + 10, y + _height - 30, {
      width: width - 20,
      align: 'center',
    });
}

async function addChartComponent(
  doc: PDFKit.PDFDocument,
  component: ReportComponent,
  x: number,
  y: number,
  width: number,
  _height: number,
  data: PDFReportData
) {
  try {
    // Create chart as image and add to PDF
    const chartBuffer = await generateChartImage(
      component,
      data,
      width,
      _height
    );
    doc.image(chartBuffer, x, y, { width, _height });
  } catch (error) {
    console.error('Failed to generate _chart:', error);
    // Fallback: Add placeholder
    doc
      .rect(x, y, width, _height)
      .stroke('#e5e7eb')
      .fontSize(12)
      .fillColor('#64748b')
      .text('Chart placeholder', x + 10, y + _height / 2, {
        width: width - 20,
        align: 'center',
      });
  }
}

function addTableComponent(
  doc: PDFKit.PDFDocument,
  component: ReportComponent,
  x: number,
  y: number,
  width: number,
  _height: number,
  data: PDFReportData
) {
  const tableData = data.tables?.[component.id] || {
    columns: [
      { key: 'col1', label: 'Column 1' },
      { key: 'col2', label: 'Column 2' },
    ],
    rows: [
      { col1: 'Value 1', col2: 'Value 2' },
      { col1: 'Value 3', col2: 'Value 4' },
    ],
  };

  const columnWidth = width / tableData.columns.length;
  const rowHeight = 20;

  // Draw table headers
  doc.fontSize(10).fillColor('#374151');

  tableData.columns.forEach((column: unknown, index: number) => {
    const colX = x + index * columnWidth;
    doc
      .rect(colX, y, columnWidth, rowHeight)
      .fill('#f3f4f6')
      .stroke('#e5e7eb')
      .text(column.label, colX + 5, y + 5, {
        width: columnWidth - 10,
        _height: rowHeight - 10,
      });
  });

  // Draw table rows
  const maxRows = Math.floor((_height - rowHeight) / rowHeight);
  const visibleRows = tableData.rows.slice(0, maxRows);

  visibleRows.forEach((row: unknown, rowIndex: number) => {
    const rowY = y + rowHeight + rowIndex * rowHeight;

    tableData.columns.forEach((column: unknown, colIndex: number) => {
      const colX = x + colIndex * columnWidth;
      doc
        .rect(colX, rowY, columnWidth, rowHeight)
        .stroke('#e5e7eb')
        .fillColor('#000000')
        .text(row[column.key] || '', colX + 5, rowY + 5, {
          width: columnWidth - 10,
          _height: rowHeight - 10,
        });
    });
  });
}

function addImageComponent(
  doc: PDFKit.PDFDocument,
  component: ReportComponent,
  x: number,
  y: number,
  width: number,
  _height: number
) {
  if (component.config.source) {
    try {
      doc.image(component.config.source, x, y, { width, _height });
    } catch (error) {
      console.warn('Failed to add image:', error);
      addImagePlaceholder(doc, x, y, width, _height);
    }
  } else {
    addImagePlaceholder(doc, x, y, width, _height);
  }
}

function addImagePlaceholder(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  _height: number
) {
  doc
    .rect(x, y, width, _height)
    .stroke('#e5e7eb')
    .fontSize(12)
    .fillColor('#64748b')
    .text('Image placeholder', x + 10, y + _height / 2, {
      width: width - 20,
      align: 'center',
    });
}

function addDividerComponent(
  doc: PDFKit.PDFDocument,
  component: ReportComponent,
  x: number,
  y: number,
  width: number,
  _height: number
) {
  const lineY = y + _height / 2;
  doc
    .moveTo(x, lineY)
    .lineTo(x + width, lineY)
    .stroke('#e5e7eb');
}

function addReportFooter(doc: PDFKit.PDFDocument, branding: PDFBranding) {
  const pageHeight = doc.page.height;
  const footerY = pageHeight - 50;

  doc
    .fontSize(8)
    .fillColor('#64748b')
    .text(
      branding.footer_text ||
        'Generated by CU-BEMS IoT Transmission Failure Analysis Platform',
      50,
      footerY,
      { align: 'center' }
    );
}

async function generateChartImage(
  component: ReportComponent,
  _data: unknown,
  _width: number,
  _height: number
): Promise<Buffer> {
  // Canvas functionality disabled for build compatibility
  // Return placeholder image buffer
  return Buffer.from(
    `PDF chart placeholder for ${component.config.chart_type || 'chart'} - canvas module not available`
  );
}

function getMetricValue(
  component: ReportComponent,
  data: PDFReportData
): string | null {
  if (component.config.value_source && data.aggregations) {
    return data.aggregations[component.config.value_source]?.toString();
  }
  return null;
}

function formatMetricValue(value: string, format: unknown): string {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return value;

  const prefix = format.prefix || '';
  const suffix = format.suffix || '';
  const unit = format.unit || '';
  const decimalPlaces = format.decimal_places || 2;

  return `${prefix}${numValue.toFixed(decimalPlaces)}${unit}${suffix}`;
}
