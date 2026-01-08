import { forwardRef } from 'react';
import { format } from 'date-fns';
import bsgLogo from '@/assets/bsg-logo.png';

interface ReceiptData {
  receipt_number: string;
  donor_type: 'internal' | 'external';
  donor_name?: string;
  donor_college?: string;
  donor_whatsapp?: string;
  member?: {
    uid: string;
    first_name: string;
    last_name: string;
    whatsapp_number: string | null;
    academic_department: string | null;
    college_name: string | null;
  } | null;
  item_type: string;
  quantity: number;
  unit: string | null;
  notes?: string | null;
  collection_date: string;
  drive?: {
    name: string;
  } | null;
}

interface CollectionReceiptProps {
  data: ReceiptData;
}

export const CollectionReceipt = forwardRef<HTMLDivElement, CollectionReceiptProps>(
  ({ data }, ref) => {
    const donorName = data.donor_type === 'internal' 
      ? `${data.member?.first_name || ''} ${data.member?.last_name || ''}`.trim()
      : data.donor_name || 'Unknown';

    const donorDetails = data.donor_type === 'internal'
      ? {
          uid: data.member?.uid || '-',
          whatsapp: data.member?.whatsapp_number || '-',
          department: data.member?.academic_department || '-',
          college: data.member?.college_name || '-',
        }
      : {
          uid: '-',
          whatsapp: data.donor_whatsapp || '-',
          department: '-',
          college: data.donor_college || '-',
        };

    return (
      <div 
        ref={ref} 
        className="bg-white p-6 w-[400px] font-sans text-black"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header with Logo */}
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          <img 
            src={bsgLogo} 
            alt="BSG Logo" 
            className="h-16 mx-auto mb-2"
          />
          <h1 className="text-lg font-bold">THE BHARAT SCOUTS & GUIDES</h1>
          <p className="text-sm">Silver Oak University</p>
          <p className="text-xs text-gray-600">Collection Drive Receipt</p>
        </div>

        {/* Receipt Info */}
        <div className="flex justify-between text-sm mb-4">
          <div>
            <span className="font-semibold">Receipt No:</span>
            <span className="ml-2">{data.receipt_number}</span>
          </div>
          <div>
            <span className="font-semibold">Date:</span>
            <span className="ml-2">{format(new Date(data.collection_date), 'dd/MM/yyyy')}</span>
          </div>
        </div>

        {/* Drive Name */}
        {data.drive?.name && (
          <div className="bg-gray-100 p-2 rounded text-center mb-4">
            <span className="font-semibold">{data.drive.name}</span>
          </div>
        )}

        {/* Donor Details */}
        <div className="border border-gray-300 rounded p-3 mb-4">
          <h3 className="font-semibold text-sm border-b pb-1 mb-2">
            Donor Details ({data.donor_type === 'internal' ? 'Member' : 'External'})
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex">
              <span className="w-24 text-gray-600">Name:</span>
              <span className="font-medium">{donorName}</span>
            </div>
            {data.donor_type === 'internal' && (
              <div className="flex">
                <span className="w-24 text-gray-600">UID:</span>
                <span>{donorDetails.uid}</span>
              </div>
            )}
            <div className="flex">
              <span className="w-24 text-gray-600">WhatsApp:</span>
              <span>{donorDetails.whatsapp}</span>
            </div>
            {data.donor_type === 'internal' && (
              <div className="flex">
                <span className="w-24 text-gray-600">Department:</span>
                <span>{donorDetails.department}</span>
              </div>
            )}
            <div className="flex">
              <span className="w-24 text-gray-600">College:</span>
              <span>{donorDetails.college}</span>
            </div>
          </div>
        </div>

        {/* Items Received */}
        <div className="border border-gray-300 rounded p-3 mb-4">
          <h3 className="font-semibold text-sm border-b pb-1 mb-2">Items Received</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Item</th>
                <th className="text-right py-1">Qty</th>
                <th className="text-right py-1">Unit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1">{data.item_type}</td>
                <td className="text-right py-1">{data.quantity}</td>
                <td className="text-right py-1">{data.unit || 'pieces'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {data.notes && (
          <div className="text-sm mb-4">
            <span className="font-semibold">Notes:</span>
            <p className="text-gray-600 mt-1">{data.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-black pt-4 mt-4">
          <div className="flex justify-between text-sm">
            <div>
              <p className="text-gray-600">Received By:</p>
              <div className="w-32 border-b border-black mt-8"></div>
              <p className="text-xs text-gray-500 mt-1">Signature</p>
            </div>
            <div className="text-right">
              <p className="text-gray-600">Official Stamp</p>
              <div className="w-20 h-20 border border-dashed border-gray-400 mt-2"></div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          Thank you for your contribution!
        </p>
      </div>
    );
  }
);

CollectionReceipt.displayName = 'CollectionReceipt';
