import { Suspense } from "react";
import { VaultScreen } from "@/components/vault/vault-screen";
import { Skeleton } from "@/components/ui/skeleton";

export default async function VaultPage({ params }: PageProps<"/vault/[address]">) {
  const { address } = await params;
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-10 sm:px-6">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <VaultScreen address={address} />
    </Suspense>
  );
}
