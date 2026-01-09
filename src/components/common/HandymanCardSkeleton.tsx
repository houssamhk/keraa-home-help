import { Skeleton } from '@/components/ui/skeleton';

export function HandymanCardSkeleton() {
  return (
    <div className="glass-card p-4">
      <div className="flex gap-4">
        {/* Avatar skeleton */}
        <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />

        {/* Info skeleton */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>

          {/* Specialties skeleton */}
          <div className="flex gap-1">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          {/* Description skeleton */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />

          {/* Price & Actions skeleton */}
          <div className="flex items-center justify-between mt-3">
            <Skeleton className="h-5 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
