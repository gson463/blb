
import React, { useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import { Button } from '@/components/ui/button';
import { Download, FileImage, AlertCircle } from 'lucide-react';

const PaymentReceiptViewer = ({ record, filename, className = '' }) => {
  const [error, setError] = useState(false);

  if (!record || !filename) {
    return (
      <div className={`flex flex-col items-center justify-center bg-muted/30 rounded-lg border border-dashed p-6 ${className}`}>
        <FileImage className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No receipt attached</p>
      </div>
    );
  }

  const fileUrl = pb.files.getUrl(record, filename);
  const isPdf = filename.toLowerCase().endsWith('.pdf');

  const handleDownload = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(fileUrl, '_blank');
  };

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-destructive/5 rounded-lg border border-destructive/20 p-6 ${className}`}>
        <AlertCircle className="w-8 h-8 text-destructive mb-2" />
        <p className="text-sm text-destructive font-medium">Failed to load receipt</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" />
          Download Instead
        </Button>
      </div>
    );
  }

  return (
    <div className={`relative group rounded-lg overflow-hidden border bg-muted/10 ${className}`}>
      {isPdf ? (
        <div className="w-full h-full min-h-[300px] relative">
          <iframe 
            src={`${fileUrl}#toolbar=0`} 
            className="w-full h-full absolute inset-0"
            title="Receipt PDF Viewer"
            onError={() => setError(true)}
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black/5">
          <img 
            src={fileUrl} 
            alt="Payment Receipt" 
            className="max-w-full max-h-[400px] object-contain"
            onError={() => setError(true)}
          />
        </div>
      )}
      
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Button size="sm" variant="secondary" className="shadow-md" onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>
    </div>
  );
};

export default PaymentReceiptViewer;
