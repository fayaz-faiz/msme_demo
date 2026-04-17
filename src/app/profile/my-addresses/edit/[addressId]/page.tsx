"use client";

import { useParams } from "next/navigation";
import { AddressEditor } from "@/features/location/components/AddressEditor";

export default function EditAddressPage() {
  const params = useParams<{ addressId: string }>();
  const addressId = String(params?.addressId || "");
  return <AddressEditor mode="edit" addressId={addressId} />;
}
