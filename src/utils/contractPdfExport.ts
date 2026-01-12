import jsPDF from 'jspdf';

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

export async function exportContractToPdf(
  contract: ContractData,
  landlordInfo: PartyInfo,
  tenantInfo: PartyInfo
): Promise<void> {
  // Create PDF with RTL support
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Add Arabic font support - using built-in font with manual RTL handling
  doc.setFont('helvetica', 'normal');
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Helper function for RTL text (reverse for display)
  const rtlText = (text: string) => text.split('').reverse().join('');
  
  // Helper function to add centered text
  const addCenteredText = (text: string, y: number, fontSize: number = 12) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  // Helper function to add right-aligned text
  const addRightText = (text: string, y: number, fontSize: number = 11) => {
    doc.setFontSize(fontSize);
    doc.text(text, pageWidth - margin, y, { align: 'right' });
  };

  // Header - Logo area
  doc.setFillColor(212, 175, 55); // Gold color
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  addCenteredText('SAKANI', 15);
  
  doc.setFontSize(14);
  addCenteredText('Digital Contract', 28);

  // Reset text color
  doc.setTextColor(0, 0, 0);
  yPos = 50;

  // Contract Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  addCenteredText(contract.title, yPos);
  yPos += 15;

  // Contract Type Badge
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const contractType = contract.contract_type === 'rental' ? 'Rental Contract' : 'Service Contract';
  addCenteredText(`[ ${contractType} ]`, yPos);
  yPos += 15;

  // Divider
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Contract Details Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  addRightText('Contract Details', yPos, 14);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  // Contract ID
  addRightText(`Contract ID: ${contract.id.slice(0, 8)}...`, yPos);
  yPos += 8;

  // Status
  const statusLabels: Record<string, string> = {
    pending: 'Pending Signature',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
    disputed: 'Disputed'
  };
  addRightText(`Status: ${statusLabels[contract.status] || contract.status}`, yPos);
  yPos += 8;

  // Dates
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  addRightText(`Start Date: ${formatDate(contract.start_date)}`, yPos);
  yPos += 8;

  if (contract.end_date) {
    addRightText(`End Date: ${formatDate(contract.end_date)}`, yPos);
    yPos += 8;
  }

  // Financial Details
  if (contract.monthly_amount) {
    addRightText(`Monthly Amount: ${contract.monthly_amount.toLocaleString()} DZD`, yPos);
    yPos += 8;
  }

  if (contract.total_amount) {
    addRightText(`Total Amount: ${contract.total_amount.toLocaleString()} DZD`, yPos);
    yPos += 8;
  }

  yPos += 5;

  // Parties Section
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  addRightText('Contract Parties', yPos, 14);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  // Landlord/Provider
  const landlordLabel = contract.contract_type === 'rental' ? 'Landlord' : 'Service Provider';
  addRightText(`${landlordLabel}: ${landlordInfo.name}`, yPos);
  yPos += 8;
  if (landlordInfo.phone) {
    addRightText(`Phone: ${landlordInfo.phone}`, yPos);
    yPos += 8;
  }

  yPos += 5;

  // Tenant/Client
  const tenantLabel = contract.contract_type === 'rental' ? 'Tenant' : 'Client';
  addRightText(`${tenantLabel}: ${tenantInfo.name}`, yPos);
  yPos += 8;
  if (tenantInfo.phone) {
    addRightText(`Phone: ${tenantInfo.phone}`, yPos);
    yPos += 8;
  }

  yPos += 5;

  // Terms Section
  if (contract.terms) {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    addRightText('Terms & Conditions', yPos, 14);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    // Split terms into lines
    const termsLines = doc.splitTextToSize(contract.terms, pageWidth - 2 * margin);
    termsLines.forEach((line: string) => {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, pageWidth - margin, yPos, { align: 'right' });
      yPos += 6;
    });
  }

  // Description
  if (contract.description) {
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    addRightText('Description', yPos, 14);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const descLines = doc.splitTextToSize(contract.description, pageWidth - 2 * margin);
    descLines.forEach((line: string) => {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, pageWidth - margin, yPos, { align: 'right' });
      yPos += 6;
    });
  }

  // Signatures Section
  yPos = Math.max(yPos + 15, pageHeight - 55);
  
  if (yPos > pageHeight - 55) {
    doc.addPage();
    yPos = margin + 20;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  addCenteredText('Digital Signatures', yPos);
  yPos += 15;

  // Signature boxes
  const boxWidth = (pageWidth - 3 * margin) / 2;
  const boxHeight = 25;
  const leftBoxX = margin;
  const rightBoxX = pageWidth - margin - boxWidth;

  // Tenant signature box (left)
  doc.setDrawColor(150, 150, 150);
  doc.rect(leftBoxX, yPos, boxWidth, boxHeight);
  doc.setFontSize(10);
  doc.text(tenantLabel, leftBoxX + 5, yPos + 8);
  doc.text(tenantInfo.name, leftBoxX + 5, yPos + 16);
  
  if (contract.tenant_signed) {
    doc.setTextColor(0, 150, 0);
    doc.text('✓ Signed', leftBoxX + 5, yPos + 22);
    if (contract.tenant_signed_at) {
      doc.setFontSize(8);
      doc.text(formatDate(contract.tenant_signed_at), leftBoxX + boxWidth - 5, yPos + 22, { align: 'right' });
    }
  } else {
    doc.setTextColor(200, 0, 0);
    doc.text('✗ Not Signed', leftBoxX + 5, yPos + 22);
  }
  doc.setTextColor(0, 0, 0);

  // Landlord signature box (right)
  doc.rect(rightBoxX, yPos, boxWidth, boxHeight);
  doc.setFontSize(10);
  doc.text(landlordLabel, rightBoxX + 5, yPos + 8);
  doc.text(landlordInfo.name, rightBoxX + 5, yPos + 16);
  
  if (contract.landlord_signed) {
    doc.setTextColor(0, 150, 0);
    doc.text('✓ Signed', rightBoxX + 5, yPos + 22);
    if (contract.landlord_signed_at) {
      doc.setFontSize(8);
      doc.text(formatDate(contract.landlord_signed_at), rightBoxX + boxWidth - 5, yPos + 22, { align: 'right' });
    }
  } else {
    doc.setTextColor(200, 0, 0);
    doc.text('✗ Not Signed', rightBoxX + 5, yPos + 22);
  }
  doc.setTextColor(0, 0, 0);

  // Footer
  yPos = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  addCenteredText(`Generated by Sakani Platform - ${new Date().toLocaleString()}`, yPos);
  addCenteredText('This is a digital document. For legal purposes, please verify with the platform.', yPos + 5);

  // Save the PDF
  const fileName = `contract_${contract.id.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
