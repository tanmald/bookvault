import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function BookCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[2/3] relative">
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>
      <CardContent className="p-4">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

export function BookGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function BookKanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((col) => (
        <div key={col} className="flex flex-col">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="ml-auto h-5 w-8 rounded-full" />
          </div>
          <div className="flex flex-col gap-4">
            {Array.from({ length: col === 2 ? 2 : 3 }).map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
