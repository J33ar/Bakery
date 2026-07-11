import { Loader2 } from "lucide-react";

export function LoadingSpinner({ className, size = 24 }: { className?: string, size?: number }) {
  return (
    <Loader2 
      className={`animate-spin text-primary ${className}`} 
      size={size} 
    />
  );
}

export function FullScreenLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size={48} />
        <p className="text-muted-foreground font-medium animate-pulse">جاري التحميل...</p>
      </div>
    </div>
  );
}

export function ErrorState({ title = "حدث خطأ", message = "تعذر تحميل البيانات", onRetry }: { title?: string, message?: string, onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl bg-destructive/5 border border-destructive/20 max-w-md mx-auto">
      <div className="bg-destructive/10 p-3 rounded-full mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h3 className="text-lg font-bold text-destructive mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 text-sm">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md font-medium text-sm hover:bg-destructive/90 transition-colors"
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: { 
  icon?: any, 
  title: string, 
  description: string,
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed bg-card/50">
      {Icon && (
        <div className="bg-primary/10 p-4 rounded-full mb-5 text-primary">
          <Icon size={32} />
        </div>
      )}
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
