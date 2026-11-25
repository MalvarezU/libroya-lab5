import { Suspense } from "react";
import BookDetailClient from "./BookDetailClient";

async function BookDetailLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookDetailClient id={id} />;
}

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Cargando...</p>}>
      <BookDetailLoader params={params} />
    </Suspense>
  );
}