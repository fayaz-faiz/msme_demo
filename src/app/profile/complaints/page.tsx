"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
    getIssueCategoryData,
    postCreateIssueData,
    postIgmUploadImage,
    postIssueSubCategoryData,
    postOrderbyIdData,
} from "@/api";
import { notifyOrAlert } from "@/shared/lib/notify";
import styles from "./page.module.css";

type OrderItem = {
    item_id: string;
    item_name: string;
    item_symbol?: string;
    count?: number;
    item_quantity?: string;
};

type AddressObject = {
    locality?: string;
    street?: string;
    city?: string;
    area_code?: string;
    state?: string;
    [key: string]: string | undefined;
};

type OrderRecord = {
    order_id?: string;
    provider_name?: string | AddressObject;
    provider_address?: string | AddressObject;
    store_name?: string;
    items?: OrderItem[];
};

type IssueCategory = {
    name?: string;
};

type IssueSubCategory = {
    subCategory?: string;
};

type ImagePayload = {
    mimetype: string;
    base64: string;
};

type ComplaintForm = {
    category: string;
    subCategory: string;
    shortDescription: string;
    longDescription: string;
    email: string;
    fileName: string;
    files: File[];
    fileData: ImagePayload[];
    uploadedImgs: unknown[];
    isImgUpload: boolean;
};

const initialComplaintForm: ComplaintForm = {
    category: "",
    subCategory: "",
    shortDescription: "",
    longDescription: "",
    email: "",
    fileName: "No file chosen",
    files: [],
    fileData: [],
    uploadedImgs: [],
    isImgUpload: false,
};

function toReadableMessage(value: unknown): string {
    if (!value) return "";
    if (typeof value === "string") return value.trim();
    if (Array.isArray(value)) {
        return value
            .map((entry) => toReadableMessage(entry))
            .filter(Boolean)
            .join(" ")
            .trim();
    }
    if (typeof value === "object") {
        const obj = value as Record<string, unknown>;
        return (
            toReadableMessage(obj.message) ||
            toReadableMessage(obj.error) ||
            toReadableMessage(obj.detail) ||
            toReadableMessage(obj.reason) ||
            ""
        );
    }
    return "";
}

function getErrorMessage(value: unknown, fallback: string) {
    const typed = value as {
        response?: { data?: { message?: unknown; data?: { message?: unknown } } };
        message?: unknown;
        data?: { message?: unknown; data?: { message?: unknown } };
    };

    return (
        toReadableMessage(typed?.response?.data?.message) ||
        toReadableMessage(typed?.response?.data?.data?.message) ||
        toReadableMessage(typed?.message) ||
        toReadableMessage(typed?.data?.message) ||
        fallback
    );
}

function formatAddress(value?: string | AddressObject): string {
    if (!value) {
        return "";
    }
    if (typeof value === "string") {
        return value;
    }
    const pieces = [
        value.street,
        value.locality,
        value.city,
        value.state,
        value.area_code,
    ]
        .filter(Boolean)
        .map(String);
    return pieces.join(", ");
}

function toStringValue(value: unknown, fallback = ""): string {
    if (!value) {
        return fallback;
    }
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    if (typeof value === "object") {
        const obj = value as Record<string, unknown>;
        if (typeof obj.name === "string" && obj.name.trim()) {
            return obj.name.trim();
        }
        if (typeof obj.provider_name === "string" && obj.provider_name.trim()) {
            return obj.provider_name.trim();
        }
        if (typeof obj.store_name === "string" && obj.store_name.trim()) {
            return obj.store_name.trim();
        }
        return formatAddress(obj as AddressObject) || fallback;
    }
    return fallback;
}

export default function ComplaintsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get("orderId") ?? "";
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [order, setOrder] = useState<OrderRecord | null>(null);
    const [categories, setCategories] = useState<IssueCategory[]>([]);
    const [subCategories, setSubCategories] = useState<IssueSubCategory[]>([]);
    const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
    const [complaint, setComplaint] = useState<ComplaintForm>(initialComplaintForm);
    const [message, setMessage] = useState<string>("");
    const [messageType, setMessageType] = useState<"success" | "error" | "warning" | "">("");

    const orderNumber = toStringValue(order?.order_id, orderId);
    const providerName = toStringValue(order?.provider_name || order?.store_name, "Provider");
    const providerAddress = formatAddress(order?.provider_address);
    const itemList = Array.isArray(order?.items) ? order.items : [];
    const hasOrderItems = itemList.length > 0;

    const fetchOrder = async () => {
        if (!orderId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await postOrderbyIdData({ order_id: orderId });
            const payload = response?.data?.data;
            const firstOrder = Array.isArray(payload) ? payload[0] : payload;
            setOrder(firstOrder ?? null);
            setSelectedItems([]);
        } catch (error) {
            const errorMessage = getErrorMessage(error, "Unable to load order details.");
            notifyOrAlert(errorMessage, "error");
            setMessage(errorMessage);
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await getIssueCategoryData();
            const payload = response?.data;
            if (Array.isArray(payload)) {
                setCategories(payload);
                return;
            }
            const fallback = "Unable to load complaint categories.";
            const errorMessage = String(response?.data?.message || response?.data?.data || fallback);
            notifyOrAlert(errorMessage, "error");
            setMessage(errorMessage);
            setMessageType("error");
        } catch (error) {
            const errorMessage = getErrorMessage(error, "Unable to load complaint categories.");
            notifyOrAlert(errorMessage, "error");
            setMessage(errorMessage);
            setMessageType("error");
        }
    };

    const fetchSubCategories = async (categoryName: string) => {
        if (!categoryName) {
            setSubCategories([]);
            return;
        }
        try {
            const response = await postIssueSubCategoryData({ category: categoryName });
            const payload = response?.data?.data;
            if (payload?.subCategories && Array.isArray(payload.subCategories)) {
                setSubCategories(payload.subCategories);
            } else if (Array.isArray(response?.data?.data)) {
                setSubCategories(response.data.data);
            } else {
                setSubCategories([]);
            }
        } catch (error) {
            const errorMessage = getErrorMessage(error, "Unable to load subcategories.");
            notifyOrAlert(errorMessage, "error");
            setMessage(errorMessage);
            setMessageType("error");
        }
    };

    useEffect(() => {
        void fetchOrder();
        void fetchCategories();
    }, [orderId]);

    const handleToggleItem = (item: OrderItem) => {
        const exists = selectedItems.some((selected) => selected.item_id === item.item_id);
        setSelectedItems((previous) =>
            exists ? previous.filter((selected) => selected.item_id !== item.item_id) : [...previous, item],
        );
    };

    const handleToggleAll = () => {
        if (selectedItems.length === itemList.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(itemList);
        }
    };

    const handleInputChange = (field: keyof ComplaintForm, value: string) => {
        setComplaint((prev) => ({ ...prev, [field]: value }));
        if (field === "category") {
            setComplaint((prev) => ({ ...prev, subCategory: "" }));
            void fetchSubCategories(value);
        }
    };

    const convertToBase64 = (file: File) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result;
                if (typeof dataUrl === "string") {
                    resolve(dataUrl.split(",")[1] || "");
                } else {
                    reject(new Error("Unable to read file."));
                }
            };
            reader.onerror = () => reject(new Error("Unable to read file."));
            reader.readAsDataURL(file);
        });

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) {
            return;
        }

        if (files.length > 4) {
            const warning = "Please upload up to 4 images.";
            notifyOrAlert(warning, "warning");
            setMessage(warning);
            setMessageType("warning");
            setComplaint((prev) => ({ ...prev, files: [], fileData: [], fileName: "No file chosen" }));
            return;
        }

        const fileArray = Array.from(files);
        const fileData: ImagePayload[] = [];
        try {
            for (const file of fileArray) {
                const base64 = await convertToBase64(file);
                fileData.push({ mimetype: file.type || "image/png", base64 });
            }
            setComplaint((prev) => ({
                ...prev,
                files: fileArray,
                fileData,
                fileName: fileArray.length === 1 ? fileArray[0].name : `${fileArray.length} files selected`,
            }));
            setMessage("");
            setMessageType("");
        } catch (error) {
            const errorMessage = getErrorMessage(error, "Unable to prepare attached images.");
            setMessage(errorMessage);
            setMessageType("error");
        }
    };

    const uploadImages = async () => {
        if (complaint.fileData.length === 0) {
            setMessage("Please choose images before uploading.");
            setMessageType("warning");
            return;
        }
        setUploading(true);
        try {
            const response = await postIgmUploadImage({ images: complaint.fileData });
            if (response?.data?.status === 200) {
                setComplaint((prev) => ({
                    ...prev,
                    uploadedImgs: response.data.data ?? [],
                    isImgUpload: true,
                }));
                setMessage("Images uploaded successfully.");
                setMessageType("success");
            } else {
                const errorMessage = response?.data?.message || "Unable to upload images.";
                notifyOrAlert(errorMessage, "error");
                setMessage(errorMessage);
                setMessageType("error");
            }
        } catch (error) {
            const errorMessage = getErrorMessage(error, "Unable to upload images.");
            notifyOrAlert(errorMessage, "error");
            setMessage(errorMessage);
            setMessageType("error");
        } finally {
            setUploading(false);
        }
    };

    const validateForm = (): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!orderId) {
            setMessage("No order selected for the complaint.");
            setMessageType("warning");
            return false;
        }
        if (selectedItems.length === 0) {
            setMessage("Please choose at least one item for this complaint.");
            setMessageType("warning");
            return false;
        }
        if (!complaint.category) {
            const warning = "Please select a category.";
            notifyOrAlert(warning, "warning");
            setMessage(warning);
            setMessageType("warning");
            return false;
        }
        if (!complaint.subCategory) {
            const warning = "Please select a subcategory.";
            notifyOrAlert(warning, "warning");
            setMessage(warning);
            setMessageType("warning");
            return false;
        }
        if (!complaint.shortDescription) {
            const warning = "Please enter a short description.";
            notifyOrAlert(warning, "warning");
            setMessage(warning);
            setMessageType("warning");
            return false;
        }
        if (!complaint.longDescription) {
            const warning = "Please enter a detailed description.";
            notifyOrAlert(warning, "warning");
            setMessage(warning);
            setMessageType("warning");
            return false;
        }
        if (!complaint.email) {
            const warning = "Please enter your email address.";
            notifyOrAlert(warning, "warning");
            setMessage(warning);
            setMessageType("warning");
            return false;
        }
        if (!emailRegex.test(complaint.email)) {
            const warning = "Please enter a valid email address.";
            notifyOrAlert(warning, "warning");
            setMessage(warning);
            setMessageType("warning");
            return false;
        }
        setMessage("");
        setMessageType("");
        return true;
    };

    const handleCancel = () => {
        setComplaint(initialComplaintForm);
        setSelectedItems([]);
        setSubCategories([]);
        setMessage("");
        setMessageType("");
    };

    const isAllSelected = useMemo(
        () => selectedItems.length > 0 && selectedItems.length === itemList.length,
        [itemList.length, selectedItems.length],
    );

    const filteredCategories = useMemo(() => {
        if (selectedItems.length === 0) {
            return categories;
        }
        if (isAllSelected) {
            return categories.filter((cat) => cat.name?.toLowerCase() !== "item");
        }
        return categories.filter(
            (cat) => cat.name?.toLowerCase() === "item" || cat.name?.toLowerCase() === "payment",
        );
    }, [categories, selectedItems.length, isAllSelected]);

    const handleSubmit = async () => {
        if (!validateForm()) {
            notifyOrAlert("Please fill in all required fields and select at least one item before submitting your complaint.", "warning");
            return;
        }
        setSaving(true);
        try {
            const formattedItems = selectedItems.map((item) => ({
                id: item.item_id,
                name: item.item_name,
                quantity: Number(item.count ?? 1),
                quantityInUnits: item.item_quantity || "",
                itemImageUrl: item.item_symbol,
            }));

            const payload = {
                order_id: orderId,
                items: formattedItems,
                description_short_desc: complaint.shortDescription,
                description_long_desc: complaint.longDescription,
                category: complaint.category,
                sub_category: complaint.subCategory,
                issue_type: "ISSUE",
                status: "OPEN",
                description_url: "https://interfacing.app/addtional-details/img1.png",
                description_content_type: "text/plain",
                description_images: complaint.uploadedImgs,
                description_additional_desc_url: "https://interfacing.app/addtional-details/img1.png",
                description_additional_desc_content_type: "text/plain",
                additional_info_required: [
                    {
                        info_provided: {
                            description: {
                                short_desc: "",
                                long_desc: "",
                                images: ["https://interfacing.app/addtional-details/img1.png"],
                            },
                            updated_at: new Date(),
                            message_id: "",
                        },
                    },
                ],
            };

            const response = await postCreateIssueData(payload);
            if (response?.data?.status && response?.data?.data !== undefined) {
                notifyOrAlert("Your complaint has been submitted. We will update you soon.", "success");
                router.push("/profile/my-complains");
                return;
            }
            const messageText = String(response?.data?.message || response?.data?.data || "Unable to submit complaint. Please try again.");
            notifyOrAlert(messageText, "error");
            setMessage(messageText);
            setMessageType("error");
        } catch (error) {
            const errorMessage = getErrorMessage(error, "Unable to submit complaint.");
            notifyOrAlert(errorMessage, "error");
            setMessage(errorMessage);
            setMessageType("error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.hero}>
                <h1 className={styles.title}>Raise a complaint</h1>
                <div className={styles.heroActions}>
                    <Link href={orderId ? `/orders/${orderId}` : "/profile"} className={styles.smallButton}>
                        Back to order
                    </Link>
                </div>
            </div>

            <section className={styles.card}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>Order details</h2>
                        <p className={styles.sectionSubtitle}>Review the order and select affected item(s).</p>
                    </div>
                    <div className={styles.orderMeta}>
                        <span className={styles.orderLabel}>Order</span>
                        <strong>{orderNumber || "—"}</strong>
                    </div>
                </div>

                <div className={styles.orderSummary}>
                    <div>
                        <span className={styles.metaLabel}>Provider</span>
                        <p>{providerName}</p>
                    </div>
                    {providerAddress ? (
                        <div>
                            <span className={styles.metaLabel}>Delivery location</span>
                            <p>{providerAddress}</p>
                        </div>
                    ) : null}
                </div>

                <div className={styles.listHeader}>
                    <div>
                        <h3 className={styles.subTitle}>Affected items</h3>
                        <p className={styles.helperText}>Choose one or more items from this order.</p>
                    </div>
                    {hasOrderItems ? (
                        <button type="button" className={styles.linkButton} onClick={handleToggleAll}>
                            {isAllSelected ? "Unselect all" : "Select all"}
                        </button>
                    ) : null}
                </div>

                <div className={styles.itemList}>
                    {hasOrderItems ? (
                        itemList.map((item) => {
                            const checked = selectedItems.some((selected) => selected.item_id === item.item_id);
                            return (
                                <button
                                    key={item.item_id}
                                    type="button"
                                    className={`${styles.itemCard} ${checked ? styles.itemCardActive : ""}`}
                                    onClick={() => handleToggleItem(item)}
                                >
                                    <span className={styles.itemCheckbox} aria-hidden="true">
                                        {checked ? "✓" : ""}
                                    </span>
                                    <div className={styles.itemDetails}>
                                        <span className={styles.itemName}>{item.item_name}</span>
                                        <span className={styles.itemMeta}>{item.item_quantity || "1 unit"}</span>
                                    </div>
                                </button>
                            );
                        })
                    ) : (
                        <div className={styles.emptyState}>
                            <p>No order items were found. Please go back to the order details.</p>
                        </div>
                    )}
                </div>
            </section>

            <section className={styles.card}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>Complaint details</h2>
                        <p className={styles.sectionSubtitle}>Help us understand your issue with more context.</p>
                    </div>
                </div>

                <div className={styles.formGrid}>
                    <label className={styles.fieldGroup}>
                        <span className={styles.fieldLabel}>Category</span>
                        <select
                            className={styles.select}
                            value={complaint.category}
                            onChange={(event) => handleInputChange("category", event.target.value)}
                            disabled={selectedItems.length === 0}
                        >
                            <option value="">Select category</option>
                            {filteredCategories.map((option, index) => (
                                <option key={index} value={option.name || ""}>
                                    {option.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.fieldGroup}>
                        <span className={styles.fieldLabel}>Subcategory</span>
                        <select
                            className={styles.select}
                            value={complaint.subCategory}
                            onChange={(event) => handleInputChange("subCategory", event.target.value)}
                            disabled={!complaint.category}
                        >
                            <option value="">Select subcategory</option>
                            {subCategories.map((option, index) => (
                                <option key={index} value={option.subCategory || ""}>
                                    {option.subCategory}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.fieldGroup}>
                        <span className={styles.fieldLabel}>Short description</span>
                        <input
                            className={styles.input}
                            type="text"
                            value={complaint.shortDescription}
                            onChange={(event) => handleInputChange("shortDescription", event.target.value)}
                            placeholder="Enter a brief description"
                        />
                    </label>

                    <label className={styles.fieldGroup}>
                        <span className={styles.fieldLabel}>Long description</span>
                        <textarea
                            className={styles.textarea}
                            value={complaint.longDescription}
                            onChange={(event) => handleInputChange("longDescription", event.target.value)}
                            placeholder="Describe the issue in detail"
                            rows={5}
                        />
                    </label>

                    <label className={styles.fieldGroup}>
                        <span className={styles.fieldLabel}>Email</span>
                        <input
                            className={styles.input}
                            type="email"
                            value={complaint.email}
                            onChange={(event) => handleInputChange("email", event.target.value)}
                            placeholder="your@email.com"
                        />
                    </label>

                    <div className={styles.fieldGroup}>
                        <span className={styles.fieldLabel}>Attachments</span>
                        <div className={styles.fileRow}>
                            <label className={styles.uploadLabel}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileChange}
                                    className={styles.fileInput}
                                />
                                {" "}Choose images
                            </label>
                            <span className={styles.fileStatus}>{complaint.fileName}</span>
                        </div>
                        <div className={styles.fileActions}>
                            <button
                                type="button"
                                className={styles.uploadButton}
                                onClick={uploadImages}
                                disabled={uploading || complaint.fileData.length === 0}
                            >
                                {uploading ? "Uploading..." : "Upload images"}
                            </button>
                            <span className={styles.helperText}>Up to 4 images. Optional.</span>
                        </div>
                    </div>
                </div>
            </section>

            <div className={styles.buttonGroup}>
                <button type="button" className={styles.secondaryButton} onClick={handleCancel} disabled={saving || loading}>
                    Reset
                </button>
                <button type="button" className={styles.primaryButton} onClick={handleSubmit} disabled={saving || loading}>
                    {saving ? "Submitting..." : "Submit complaint"}
                </button>
            </div>
        </div>
    );
}
