import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Mirrors BookDetails.tsx's two-column layout so the page doesn't jump when
// real content swaps in.
export function BookDetailsSkeleton() {
  return (
    <div>
      <Skeleton className="h-9 w-24 mb-6" />

      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        <div className="space-y-4">
          <Skeleton className="aspect-[2/3] w-full rounded-lg" />
          <Skeleton className="h-9 w-full" />
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
          <Skeleton className="h-9 w-full" />
        </div>

        <div className="space-y-6">
          <div>
            <Skeleton className="h-9 w-2/3 mb-2" />
            <Skeleton className="h-5 w-1/3" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
