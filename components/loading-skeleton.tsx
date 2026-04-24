import { Skeleton } from "./ui/skeleton";

export default function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#080c14] p-6">
      <div className="max-w-350 mx-auto space-y-6">
        <Skeleton className="h-16 w-72 bg-slate-800" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 bg-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48 bg-slate-800 rounded-xl" />
            ))}
          </div>
          <div className="col-span-8 space-y-4">
            <Skeleton className="h-64 bg-slate-800 rounded-xl" />
            <Skeleton className="h-48 bg-slate-800 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
