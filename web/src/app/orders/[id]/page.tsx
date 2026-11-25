import { Suspense } from "react";
import OrderDetailClient from "./OrderDetailClient";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-zinc-500">Cargando...</p>}>
      <OrderDetailClient id={id} />
    </Suspense>
  );
}