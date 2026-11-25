import { Suspense } from "react";
import OrderDetailClient from "./OrderDetailClient";

async function OrderDetailLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetailClient id={id} />;
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Cargando...</p>}>
      <OrderDetailLoader params={params} />
    </Suspense>
  );
}