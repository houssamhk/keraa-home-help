import jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';

interface ContractData {
  id: string;
  title: string;
  description?: string;
  contract_type: 'rental' | 'service';
  start_date: string;
  end_date?: string;
  monthly_amount?: number;
  total_amount?: number;
  terms?: string;
  landlord_signed: boolean;
  tenant_signed: boolean;
  landlord_signed_at?: string;
  tenant_signed_at?: string;
  status: string;
  created_at: string;
}

interface PartyInfo {
  name: string;
  phone?: string;
  role: 'landlord' | 'tenant';
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('ar-DZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateEn = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export async function exportContractToPdf(
  contract: ContractData,
  landlordInfo: PartyInfo,
  tenantInfo: PartyInfo,
  landlordSignatureData?: string,
  tenantSignatureData?: string
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = 0;

  // ========= Page 1: Header & Contract Info =========

  // Gold header band
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Gold accent line
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 45, pageWidth, 2, 'F');

  // Logo text
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('SAKANI', pageWidth / 2, 18, { align: 'center' });

  // Subtitle
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Digital Contract Platform', pageWidth / 2, 26, { align: 'center' });

  // Contract type
  const contractTypeLabel = contract.contract_type === 'rental' ? 'RENTAL CONTRACT' : 'SERVICE CONTRACT';
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(contractTypeLabel, pageWidth / 2, 38, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  yPos = 58;

  // Contract title box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPos, contentWidth, 18, 3, 3, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(contract.title, pageWidth / 2, yPos + 11, { align: 'center' });
  yPos += 28;

  // Contract reference & date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Ref: ${contract.id.slice(0, 8).toUpperCase()}`, margin, yPos);
  doc.text(`Date: ${formatDateEn(contract.created_at)}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 10;

  // Divider
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // ========= Contract Details Section =========
  const drawSectionTitle = (title: string, y: number): number => {
    doc.setFillColor(212, 175, 55);
    doc.rect(margin, y, 4, 8, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 26, 26);
    doc.text(title, margin + 8, y + 6);
    return y + 14;
  };

  const drawField = (label: string, value: string, y: number, x: number = margin): number => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(label, x, y);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(value, x, y + 5);
    return y + 12;
  };

  yPos = drawSectionTitle('CONTRACT DETAILS', yPos);

  // Two-column layout
  const colWidth = contentWidth / 2;
  const leftX = margin;
  const rightX = margin + colWidth;

  let leftY = yPos;
  let rightY = yPos;

  // Status
  const statusLabels: Record<string, string> = {
    pending: 'Pending Signature',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
    disputed: 'Disputed',
    signed: 'Signed',
  };
  leftY = drawField('Status', statusLabels[contract.status] || contract.status, leftY, leftX);

  // Start date
  leftY = drawField('Start Date', formatDateEn(contract.start_date), leftY, leftX);

  // End date
  if (contract.end_date) {
    leftY = drawField('End Date', formatDateEn(contract.end_date), leftY, leftX);
  }

  // Monthly amount
  if (contract.monthly_amount) {
    rightY = drawField('Monthly Amount', `${contract.monthly_amount.toLocaleString()} DZD`, rightY, rightX);
  }

  // Total amount
  if (contract.total_amount) {
    rightY = drawField('Total Amount', `${contract.total_amount.toLocaleString()} DZD`, rightY, rightX);
  }

  // Duration
  if (contract.start_date && contract.end_date) {
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    rightY = drawField('Duration', `${months} months`, rightY, rightX);
  }

  yPos = Math.max(leftY, rightY) + 8;

  // ========= Parties Section =========
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  yPos = drawSectionTitle('CONTRACT PARTIES', yPos);

  // Party boxes
  const partyBoxWidth = (contentWidth - 10) / 2;
  const partyBoxHeight = 30;

  // Landlord box
  doc.setFillColor(250, 248, 240);
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftX, yPos, partyBoxWidth, partyBoxHeight, 2, 2, 'FD');

  const landlordLabel = contract.contract_type === 'rental' ? 'LANDLORD' : 'PROVIDER';
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 175, 55);
  doc.text(landlordLabel, leftX + 5, yPos + 6);
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(landlordInfo.name, leftX + 5, yPos + 14);
  if (landlordInfo.phone) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(landlordInfo.phone, leftX + 5, yPos + 20);
  }

  // Tenant box
  const tenantBoxX = leftX + partyBoxWidth + 10;
  doc.setFillColor(250, 248, 240);
  doc.roundedRect(tenantBoxX, yPos, partyBoxWidth, partyBoxHeight, 2, 2, 'FD');

  const tenantLabel = contract.contract_type === 'rental' ? 'TENANT' : 'CLIENT';
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 175, 55);
  doc.text(tenantLabel, tenantBoxX + 5, yPos + 6);
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(tenantInfo.name, tenantBoxX + 5, yPos + 14);
  if (tenantInfo.phone) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(tenantInfo.phone, tenantBoxX + 5, yPos + 20);
  }

  yPos += partyBoxHeight + 12;

  // ========= Terms Section =========
  if (contract.terms) {
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    yPos = drawSectionTitle('TERMS & CONDITIONS', yPos);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    
    const termsLines = doc.splitTextToSize(contract.terms, contentWidth);
    for (const line of termsLines) {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += 5;
    }
  }

  // ========= Description Section =========
  if (contract.description) {
    yPos += 5;
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }
    
    yPos = drawSectionTitle('DESCRIPTION', yPos);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    
    const descLines = doc.splitTextToSize(contract.description, contentWidth);
    for (const line of descLines) {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += 5;
    }
  }

  // ========= Signatures Section =========
  if (yPos > pageHeight - 70) {
    doc.addPage();
    yPos = margin;
  } else {
    yPos += 10;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
  }

  yPos = drawSectionTitle('DIGITAL SIGNATURES', yPos);

  const sigBoxWidth = (contentWidth - 10) / 2;
  const sigBoxHeight = 35;

  // Landlord signature
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftX, yPos, sigBoxWidth, sigBoxHeight, 2, 2, 'D');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text(landlordLabel, leftX + 5, yPos + 6);
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(landlordInfo.name, leftX + 5, yPos + 14);

  if (contract.landlord_signed) {
    doc.setTextColor(34, 139, 34);
    doc.setFontSize(9);
    doc.text('✓ Digitally Signed', leftX + 5, yPos + 22);
    if (landlordSignatureData) {
      try {
        doc.addImage(landlordSignatureData, 'PNG', leftX + 5, yPos + 24, sigBoxWidth - 15, 8);
      } catch { /* ignore image errors */ }
    }
    if (contract.landlord_signed_at) {
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(formatDateEn(contract.landlord_signed_at), leftX + 5, yPos + 33);
    }
  } else {
    doc.setTextColor(200, 50, 50);
    doc.setFontSize(9);
    doc.text('Awaiting Signature', leftX + 5, yPos + 22);
  }

  // Tenant signature
  const sigTenantX = leftX + sigBoxWidth + 10;
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(sigTenantX, yPos, sigBoxWidth, sigBoxHeight, 2, 2, 'D');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text(tenantLabel, sigTenantX + 5, yPos + 6);
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(tenantInfo.name, sigTenantX + 5, yPos + 14);

  if (contract.tenant_signed) {
    doc.setTextColor(34, 139, 34);
    doc.setFontSize(9);
    doc.text('✓ Digitally Signed', sigTenantX + 5, yPos + 22);
    if (contract.tenant_signed_at) {
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(formatDateEn(contract.tenant_signed_at), sigTenantX + 5, yPos + 28);
    }
  } else {
    doc.setTextColor(200, 50, 50);
    doc.setFontSize(9);
    doc.text('Awaiting Signature', sigTenantX + 5, yPos + 22);
  }

  // ========= Footer =========
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Footer line
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    doc.setFontSize(7);
    doc.setTextColor(130, 130, 130);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated by Sakani Platform | ${new Date().toLocaleDateString('en-US')} | This is a legally binding digital document`,
      pageWidth / 2,
      pageHeight - 12,
      { align: 'center' }
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
  }

  // Save the PDF - handle mobile differently
  const fileName = `contract_${contract.id.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;

  if (Capacitor.isNativePlatform()) {
    // On mobile, create a blob and trigger download via a data URL
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);
    }, 1000);
  } else {
    doc.save(fileName);
  }
}
