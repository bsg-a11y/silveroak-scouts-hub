import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface MemberData {
  uid: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  enrollment_number?: string | null;
  whatsapp_number?: string | null;
  college_name?: string | null;
  current_semester?: number | null;
  gender?: string | null;
  date_of_birth?: string | null;
  course_duration?: string | null;
  academic_department?: string | null;
  class_coordinator_name?: string | null;
  hod_name?: string | null;
  principal_name?: string | null;
  aadhaar_number?: string | null;
  blood_group?: string | null;
  status?: string;
  role?: string;
  joining_date?: string | null;
  created_at?: string;
}

interface ExportMembersListProps {
  members: MemberData[];
  title: string;
  eventName?: string;
  eventDate?: string;
  venue?: string;
  showAllDetailsOption?: boolean;
}

export function ExportMembersList({
  members,
  title,
  eventName,
  eventDate,
  venue,
  showAllDetailsOption = false,
}: ExportMembersListProps) {
  const [includeAllDetails, setIncludeAllDetails] = useState(false);

  // Helper to format date
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  // Helper to escape CSV values
  const escapeCSV = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const getBasicHeaders = () => ['S.No', 'BSG ID', 'Name', 'Enrollment No.', 'Contact', 'College', 'Semester'];
  
  const getAllHeaders = () => [
    'S.No', 'BSG ID', 'First Name', 'Middle Name', 'Last Name', 'Full Name',
    'Gender', 'Date of Birth', 'Blood Group', 'WhatsApp Number',
    'College', 'Academic Department', 'Course Duration', 'Semester', 'Enrollment No.',
    'Class Coordinator', 'HOD Name', 'Principal Name',
    'Status', 'Role', 'Joining Date', 'Created At'
  ];

  const getBasicRow = (m: MemberData, idx: number) => [
    idx + 1,
    m.uid,
    `${m.first_name} ${m.last_name}`,
    m.enrollment_number || '-',
    m.whatsapp_number || '-',
    m.college_name || '-',
    m.current_semester || '-',
  ];

  const getAllRow = (m: MemberData, idx: number) => [
    idx + 1,
    m.uid,
    m.first_name,
    m.middle_name || '-',
    m.last_name,
    `${m.first_name} ${m.middle_name || ''} ${m.last_name}`.replace(/\s+/g, ' ').trim(),
    m.gender || '-',
    formatDate(m.date_of_birth),
    m.blood_group || '-',
    m.whatsapp_number || '-',
    m.college_name || '-',
    m.academic_department || '-',
    m.course_duration || '-',
    m.current_semester || '-',
    m.enrollment_number || '-',
    m.class_coordinator_name || '-',
    m.hod_name || '-',
    m.principal_name || '-',
    m.status || '-',
    m.role || '-',
    formatDate(m.joining_date),
    formatDate(m.created_at),
  ];

  const exportToCSV = () => {
    const headers = includeAllDetails ? getAllHeaders() : getBasicHeaders();
    const rows = members.map((m, idx) => 
      includeAllDetails ? getAllRow(m, idx) : getBasicRow(m, idx)
    );

    const csvContent = [
      eventName ? `Event: ${eventName}` : '',
      eventDate ? `Date: ${eventDate}` : '',
      venue ? `Venue: ${venue}` : '',
      '',
      headers.map(h => escapeCSV(h)).join(','),
      ...rows.map(row => row.map(cell => escapeCSV(cell)).join(',')),
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
    const headers = includeAllDetails ? getAllHeaders() : getBasicHeaders();
    const rows = members.map((m, idx) => 
      includeAllDetails ? getAllRow(m, idx) : getBasicRow(m, idx)
    );

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
    const headers = includeAllDetails 
      ? ['S.No', 'BSG ID', 'Name', 'Gender', 'DOB', 'Blood', 'Contact', 'College', 'Dept', 'Sem', 'Enrollment', 'Status']
      : ['S.No', 'BSG ID', 'Name', 'Enrollment No.', 'Contact', 'College', 'Sem'];
    
    const getRow = (m: MemberData, idx: number) => {
      if (includeAllDetails) {
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${m.uid}</td>
            <td>${m.first_name} ${m.middle_name || ''} ${m.last_name}</td>
            <td>${m.gender || '-'}</td>
            <td>${formatDate(m.date_of_birth)}</td>
            <td>${m.blood_group || '-'}</td>
            <td>${m.whatsapp_number || '-'}</td>
            <td>${m.college_name || '-'}</td>
            <td>${m.academic_department || '-'}</td>
            <td>${m.current_semester || '-'}</td>
            <td>${m.enrollment_number || '-'}</td>
            <td>${m.status || '-'}</td>
          </tr>
        `;
      }
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${m.uid}</td>
          <td>${m.first_name} ${m.last_name}</td>
          <td>${m.enrollment_number || '-'}</td>
          <td>${m.whatsapp_number || '-'}</td>
          <td>${m.college_name || '-'}</td>
          <td>${m.current_semester || '-'}</td>
        </tr>
      `;
    };

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
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${members.map((m, idx) => getRow(m, idx)).join('')}
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
          Export{includeAllDetails ? ' (All Details)' : ''}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {showAllDetailsOption && (
          <>
            <div className="px-2 py-2 flex items-center gap-2">
              <Switch
                id="all-details"
                checked={includeAllDetails}
                onCheckedChange={setIncludeAllDetails}
                className="scale-75"
              />
              <Label htmlFor="all-details" className="text-xs cursor-pointer">
                Include all details
              </Label>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="h-4 w-4 mr-2" />
          Export as CSV{includeAllDetails ? ' (Full)' : ''}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as Excel{includeAllDetails ? ' (Full)' : ''}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={printPDF}>
          <Download className="h-4 w-4 mr-2" />
          Print / PDF{includeAllDetails ? ' (Full)' : ''}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
