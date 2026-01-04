import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MemberData {
  uid: string;
  first_name: string;
  last_name: string;
  enrollment_number?: string | null;
  whatsapp_number?: string | null;
  college_name?: string | null;
  current_semester?: number | null;
}

interface ExportMembersListProps {
  members: MemberData[];
  title: string;
  eventName?: string;
  eventDate?: string;
  venue?: string;
}

export function ExportMembersList({
  members,
  title,
  eventName,
  eventDate,
  venue,
}: ExportMembersListProps) {
  const exportToCSV = () => {
    const headers = ['S.No', 'BSG ID', 'Name', 'Enrollment No.', 'Contact', 'College', 'Semester'];
    const rows = members.map((m, idx) => [
      idx + 1,
      m.uid,
      `${m.first_name} ${m.last_name}`,
      m.enrollment_number || '-',
      m.whatsapp_number || '-',
      m.college_name || '-',
      m.current_semester || '-',
    ]);

    const csvContent = [
      eventName ? `Event: ${eventName}` : '',
      eventDate ? `Date: ${eventDate}` : '',
      venue ? `Venue: ${venue}` : '',
      '',
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].filter(Boolean).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_members.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    // Create a simple HTML table that Excel can open
    const headers = ['S.No', 'BSG ID', 'Name', 'Enrollment No.', 'Contact', 'College', 'Semester'];
    const rows = members.map((m, idx) => [
      idx + 1,
      m.uid,
      `${m.first_name} ${m.last_name}`,
      m.enrollment_number || '-',
      m.whatsapp_number || '-',
      m.college_name || '-',
      m.current_semester || '-',
    ]);

    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head>
      <body>
        ${eventName ? `<h2>${eventName}</h2>` : ''}
        ${eventDate ? `<p>Date: ${eventDate}</p>` : ''}
        ${venue ? `<p>Venue: ${venue}</p>` : ''}
        <table border="1">
          <thead>
            <tr>${headers.map(h => `<th style="background:#f0f0f0;font-weight:bold;">${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <p>Total Members: ${members.length}</p>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_members.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #1a4d2e; margin-bottom: 5px; }
          .header h2 { color: #333; margin-bottom: 10px; }
          .info { margin-bottom: 20px; }
          .info p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #1a4d2e; color: white; padding: 10px; text-align: left; }
          td { border: 1px solid #ddd; padding: 8px; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          .total { margin-top: 20px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>The Bharat Scouts & Guides</h1>
          <h2>Silver Oak University</h2>
        </div>
        <div class="info">
          ${eventName ? `<p><strong>Event:</strong> ${eventName}</p>` : ''}
          ${eventDate ? `<p><strong>Date:</strong> ${eventDate}</p>` : ''}
          ${venue ? `<p><strong>Venue:</strong> ${venue}</p>` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>BSG ID</th>
              <th>Name</th>
              <th>Enrollment No.</th>
              <th>Contact</th>
              <th>College</th>
              <th>Sem</th>
            </tr>
          </thead>
          <tbody>
            ${members.map((m, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${m.uid}</td>
                <td>${m.first_name} ${m.last_name}</td>
                <td>${m.enrollment_number || '-'}</td>
                <td>${m.whatsapp_number || '-'}</td>
                <td>${m.college_name || '-'}</td>
                <td>${m.current_semester || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p class="total">Total Members: ${members.length}</p>
        <div class="footer">
          Generated on ${new Date().toLocaleDateString()} | BSG SOU Administration Portal
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (members.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={printPDF}>
          <Download className="h-4 w-4 mr-2" />
          Print / PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
