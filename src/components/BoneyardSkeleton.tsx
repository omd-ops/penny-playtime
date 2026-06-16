import { Skeleton } from "@/components/ui/skeleton";

export function BoneyardSkeleton() {
  return (
    <div className="flex flex-col h-screen p-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mt-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="space-y-3 pt-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}
