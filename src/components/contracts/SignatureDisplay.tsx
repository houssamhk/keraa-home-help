interface SignatureDisplayProps {
  signatureData: string | null;
  signerName: string;
  signedAt?: string | null;
  label: string;
}

export function SignatureDisplay({ signatureData, signerName, signedAt, label }: SignatureDisplayProps) {
  if (!signatureData) {
    return (
      <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 min-h-[80px]">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xs text-destructive mt-1">في انتظار التوقيع</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-3 rounded-lg border border-primary/20 bg-card min-h-[80px]">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <img
        src={signatureData}
        alt={`توقيع ${signerName}`}
        className="h-12 object-contain max-w-full"
      />
      <p className="text-[10px] text-green-500 mt-1">✓ {signerName}</p>
      {signedAt && (
        <p className="text-[10px] text-muted-foreground">
          {new Date(signedAt).toLocaleDateString('ar-DZ')}
        </p>
      )}
    </div>
  );
}
