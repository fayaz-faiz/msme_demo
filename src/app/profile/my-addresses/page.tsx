"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAddressDataWeb, getAddressWeb } from "@/api";
import { useAppDispatch } from "@/features/cart/store/hooks";
import { useLocation } from "@/features/location/context/location-context";
import { selectedAddress, setCurrentLoc, setselectedGps } from "@/redux/slices";
import { notifyOrAlert } from "@/shared/lib/notify";
import styles from "./page.module.css";

type AddressItem = {
  _id: string;
  building?: string;
  locality?: string;
  city?: string;
  state?: string;
  area_code?: string;
  country?: string;
  gps?: string;
  name?: string;
  mobileNumber?: string;
  email?: string;
};

function extractAddresses(response: unknown): AddressItem[] {
  const typed = response as {
    data?: unknown;
    message?: unknown;
  };

  if (Array.isArray(typed?.data)) {
    return typed.data as AddressItem[];
  }
  if (Array.isArray((typed?.data as { data?: unknown })?.data)) {
    return (typed.data as { data?: AddressItem[] }).data || [];
  }
  if (Array.isArray(typed?.message)) {
    return typed.message as AddressItem[];
  }
  return [];
}

function parseGps(gps?: string) {
  const [latStr, lngStr] = String(gps || "").split(",");
  return {
    lat: Number(latStr || 0),
    lng: Number(lngStr || 0),
  };
}

export default function MyAddressesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { setLocation } = useLocation();
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAddressId, setBusyAddressId] = useState("");
  const [pendingDeleteAddress, setPendingDeleteAddress] = useState<AddressItem | null>(null);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const response = await getAddressWeb();
      setAddresses(extractAddresses(response));
    } catch (error) {
      console.error(error);
      notifyOrAlert("Unable to load addresses.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAddresses();
  }, []);

  const handleSelect = (address: AddressItem) => {
    const gps = parseGps(address.gps);
    dispatch(selectedAddress(address));
    dispatch(setselectedGps(address.gps || `${gps.lat},${gps.lng}`));
    dispatch(
      setCurrentLoc({
        city: address.city || "",
        pincode: address.area_code || "",
        latitude: gps.lat,
        longitude: gps.lng,
      }),
    );
    setLocation({
      city: address.city || "City",
      pincode: address.area_code || "000000",
      label: `${address.locality || address.building || address.city || "Address"}, ${address.area_code || "000000"}`,
      lat: gps.lat,
      lng: gps.lng,
    });
    notifyOrAlert("Address selected successfully.", "success");
    router.push("/");
  };

  const handleDelete = async (address: AddressItem) => {
    setBusyAddressId(address._id);
    try {
      const response = await deleteAddressDataWeb({ id: address._id }) as {
        data?: { status?: boolean; data?: { message?: string } };
      };
      if (response?.data?.status === true) {
        notifyOrAlert(response?.data?.data?.message || "Address deleted Successfully", "success");
        await loadAddresses();
      } else {
        notifyOrAlert("Unable to delete address.", "error");
      }
    } catch (error) {
      console.error(error);
      notifyOrAlert("Unable to delete address.", "error");
    } finally {
      setBusyAddressId("");
      setPendingDeleteAddress(null);
    }
  };

  return (
    <section className={styles.page}>
      <article className={styles.card}>
        <div className={styles.topRow}>
          <div>
            <p className={styles.kicker}>Profile</p>
            <h1>My Addresses</h1>
          </div>
          <Link href="/profile" className={styles.backButton}>Back to Profile</Link>
        </div>

        {loading ? <p className={styles.helperText}>Loading addresses...</p> : null}
        {!loading && addresses.length === 0 ? <p className={styles.helperText}>No addresses found.</p> : null}

        {addresses.length > 0 ? (
          <div className={styles.addressList}>
            {addresses.map((address) => (
              <article key={address._id} className={styles.addressCard}>
                <div className={styles.addressHeader}>
                  <strong>{address.name || address.building || "Saved Address"}</strong>
                  <span>{address.mobileNumber || "-"}</span>
                </div>
                <p>{`${address.building || ""}, ${address.locality || ""}, ${address.city || ""}, ${address.state || ""} - ${address.area_code || ""}`}</p>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.selectButton}
                    onClick={() => handleSelect(address)}
                    disabled={busyAddressId === address._id}
                  >
                    Select
                  </button>
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() => router.push(`/profile/my-addresses/edit/${address._id}`)}
                    disabled={busyAddressId === address._id}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => setPendingDeleteAddress(address)}
                    disabled={busyAddressId === address._id}
                  >
                    {busyAddressId === address._id ? "Removing..." : "Remove"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        <button type="button" className={styles.addNewButton} onClick={() => router.push("/profile/my-addresses/add")}>
          Add New Address
        </button>
      </article>

      {pendingDeleteAddress ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setPendingDeleteAddress(null)}>
          <div className={styles.modalCard} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>Remove this address?</h3>
            <p>Are you sure you want to remove this address?</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.editButton} onClick={() => setPendingDeleteAddress(null)} disabled={busyAddressId === pendingDeleteAddress._id}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => void handleDelete(pendingDeleteAddress)}
                disabled={busyAddressId === pendingDeleteAddress._id}
              >
                {busyAddressId === pendingDeleteAddress._id ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
