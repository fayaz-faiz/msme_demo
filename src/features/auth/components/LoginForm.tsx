"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getRloesIds, getUserProfileDataWeb, postGenerateOtp, postLogin } from "@/api";
import { loginSuccess } from "@/features/auth/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/features/cart/store/hooks";
import {
  clearRefreshToken,
  loginNameSlice,
  setAccessToken,
  setIsLoggedIn,
  setRefreshToken,
  setUserType,
} from "@/redux/slices";
import styles from "./LoginForm.module.css";

type LoginStep = "mobile" | "otp";

type FormValues = {
  mobileNumber: string;
  otp: string;
};

type FormErrors = {
  mobileNumber?: string;
  otp?: string;
};

type SnackbarType = "success" | "error" | "warning";

type ApiErrorLike = {
  status?: number;
  message?: string;
  response?: {
    status?: number;
    data?: {
      status?: boolean;
      message?: unknown;
      data?: unknown;
    };
  };
};

type RolesResponse = {
  data?: Array<{ role?: string; _id?: string }>;
};

type OtpGenerateResponse = {
  data?: {
    status?: boolean;
    message?: string;
    data?: { orderId?: string; message?: string };
  };
};

type LoginResponse = {
  data?: {
    status?: boolean;
    message?: string;
    data?: { accessToken?: string; refreshToken?: string; message?: string } | string;
  };
};

function normalizeMobileNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function mapProfileToAuthUser(profileResponse: unknown) {
  const typed = profileResponse as {
    data?: {
      full_name?: string;
      mobile_number?: string;
      profile_pic?: string;
      profilePic?: string;
    };
    full_name?: string;
    mobile_number?: string;
    profile_pic?: string;
    profilePic?: string;
  };

  const profile = typed?.data || typed;
  const fullName = String(profile?.full_name || "").trim();
  const mobileNumber = String(profile?.mobile_number || "").trim();
  const profilePic = String(profile?.profile_pic || "").trim();

  return {
    name: fullName || null,
    mobileNumber: mobileNumber || null,
    profilePic: profilePic || undefined,
  };
}

function validate(values: FormValues, step: LoginStep): FormErrors {
  const errors: FormErrors = {};
  const mobilePattern = /^[0-9]{10}$/;

  if (!values.mobileNumber.trim()) {
    errors.mobileNumber = "Mobile number is required.";
  } else if (!mobilePattern.test(normalizeMobileNumber(values.mobileNumber))) {
    errors.mobileNumber = "Enter a valid mobile number.";
  }

  if (step === "otp") {
    if (!values.otp.trim()) {
      errors.otp = "OTP is required.";
    } else if (!/^[0-9]{4}$/.test(values.otp.trim())) {
      errors.otp = "Enter the 4-digit OTP.";
    }
  }

  return errors;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const deviceInfo = useAppSelector((state) => state.deviceInfo);
  const [step, setStep] = useState<LoginStep>("mobile");
  const [orderId, setOrderId] = useState("");
  const [userRoleId, setUserRoleId] = useState("");
  const [values, setValues] = useState<FormValues>({
    mobileNumber: "",
    otp: "",
  });
  const [touched, setTouched] = useState({
    mobileNumber: false,
    otp: false,
  });
  const [pending, setPending] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type: SnackbarType }>({
    open: false,
    message: "",
    type: "success",
  });
  const nextPath = searchParams.get("next") || "/";

  const errors = useMemo(() => validate(values, step), [step, values]);
  const mobileNumber = normalizeMobileNumber(values.mobileNumber);
  const isMobileReady = mobileNumber.length === 10;

  function showSnackbar(message: string, type: SnackbarType = "error") {
    setSnackbar({
      open: true,
      message,
      type,
    });
    window.setTimeout(() => {
      setSnackbar((current) => ({ ...current, open: false }));
    }, 3200);
  }

  async function handleMobileSubmit() {
    try {
      let resolvedUserRoleId = userRoleId;
      if (!userRoleId) {
        const rolesResponse = await getRloesIds() as RolesResponse;
        const roles = rolesResponse?.data ?? [];
        const userRole = roles.find((item: { role?: string; _id?: string }) => item.role === "USER");
        if (!userRole?._id) {
          showSnackbar("Unable to find USER role. Please try again.", "error");
          return false;
        }
        resolvedUserRoleId = userRole._id;
        setUserRoleId(userRole._id);
      }

      const payload = {
        mobileNumber,
        countryCode: "+91",
        role: resolvedUserRoleId,
      };

      const response = await postGenerateOtp(payload) as OtpGenerateResponse;
      const isSuccess = response?.data?.status === true;
      const nextOrderId = response?.data?.data?.orderId;

      if (!isSuccess || !nextOrderId) {
        const serverMessage =
          response?.data?.message || response?.data?.data?.message || "Unable to send OTP.";
        showSnackbar(serverMessage, "warning");
        return false;
      }

      setOrderId(nextOrderId);
      showSnackbar(response?.data?.message || "OTP sent successfully.", "success");
      setStep("otp");
      setTouched((current) => ({
        ...current,
        otp: false,
      }));
      return true;
    } catch (error: unknown) {
      const typedError = error as ApiErrorLike;
      const status = typedError?.status || typedError?.response?.status;
      const serverMessage =
        typedError?.response?.data?.message || typedError?.response?.data?.data || typedError?.message || "Failed to send OTP.";
      showSnackbar(status ? `(${status}) ${String(serverMessage)}` : String(serverMessage), "error");
      return false;
    }
  }

  async function handleOtpSubmit() {
    try {
      if (!orderId) {
        showSnackbar("OTP session expired. Please resend OTP.", "warning");
        return false;
      }

      const payload = {
        orderId,
        otp: values.otp.trim(),
        deviceInfo,
      };
      const response = await postLogin(payload) as LoginResponse;
      const isSuccess = response?.data?.status === true;

      if (!isSuccess) {
        const payloadData = response?.data?.data;
        const serverMessage =
          response?.data?.message ||
          (typeof payloadData === "object" && payloadData ? payloadData.message : "") ||
          (typeof payloadData === "string" ? payloadData : "") ||
          "Invalid OTP.";
        showSnackbar(serverMessage, "warning");
        return false;
      }

      const tokens = (typeof response?.data?.data === "object" && response?.data?.data)
        ? response.data.data
        : {};
      const accessToken = tokens.accessToken ?? "";
      const refreshToken = tokens.refreshToken ?? "";

      dispatch(setAccessToken(accessToken));
      dispatch(clearRefreshToken());
      dispatch(setRefreshToken(refreshToken));
      dispatch(loginNameSlice("USER"));
      dispatch(setIsLoggedIn(true));
      dispatch(setUserType("USER"));
      if (typeof window !== "undefined") {
        window.localStorage.setItem("nearshop_access_token", accessToken);
        window.localStorage.setItem("nearshop_refresh_token", refreshToken);
        window.localStorage.setItem("nearshop_login_role", "USER");
      }

      const fallbackName = `User ${normalizeMobileNumber(mobileNumber).slice(-4)}`;
      let resolvedName = fallbackName;
      let resolvedMobile = mobileNumber;

      try {
        const profileResponse = await getUserProfileDataWeb();
        const profileUser = mapProfileToAuthUser(profileResponse);
        if (profileUser.name) {
          resolvedName = profileUser.name;
        }
        if (profileUser.mobileNumber) {
          resolvedMobile = profileUser.mobileNumber;
        }
      } catch (profileError) {
        console.error("Profile fetch after login failed:", profileError);
      }

      dispatch(
        loginSuccess({
          name: resolvedName,
          mobileNumber: resolvedMobile,
        }),
      );

      showSnackbar(response?.data?.message || "Logged in successfully.", "success");
      router.push(nextPath);
      return true;
    } catch (error: unknown) {
      const typedError = error as ApiErrorLike;
      const status = typedError?.status || typedError?.response?.status;
      if (status === 400) {
        setValues((current) => ({ ...current, otp: "" }));
        setTouched((current) => ({ ...current, otp: true }));
        const serverMessage =
          typedError?.response?.data?.data || typedError?.response?.data?.message || "otp is invalid !";
        showSnackbar(String(serverMessage), "error");
        return false;
      }
      if (status === 401) {
        showSnackbar(String(typedError?.response?.data?.data || "Unauthorized request."), "error");
        return false;
      }
      const serverMessage =
        typedError?.response?.data?.message || typedError?.response?.data?.data || typedError?.message || "OTP verification failed.";
      showSnackbar(String(serverMessage), "error");
      return false;
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({
      mobileNumber: true,
      otp: step === "otp",
    });

    if (errors.mobileNumber || errors.otp) {
      showSnackbar(errors.mobileNumber || errors.otp || "Please check your input.", "warning");
      return;
    }

    setPending(true);

    try {
      if (step === "mobile") {
        await handleMobileSubmit();
        return;
      }

      await handleOtpSubmit();
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.header}>
        <h1>Welcome Back</h1>
        <p>Log in with your mobile number and the OTP we send to you.</p>
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="mobileNumber">Mobile Number</label>
        <input
          id="mobileNumber"
          name="mobileNumber"
          type="text"
          inputMode="numeric"
          autoComplete="tel"
          value={values.mobileNumber}
          onChange={(event) => {
            setValues((prev) => ({ ...prev, mobileNumber: normalizeMobileNumber(event.target.value) }));
          }}
          onBlur={() => {
            setTouched((prev) => ({ ...prev, mobileNumber: true }));
          }}
          // placeholder="9876543210"
          aria-invalid={Boolean(touched.mobileNumber && errors.mobileNumber)}
          aria-describedby={errors.mobileNumber ? "mobileNumber-error" : undefined}
        />
        {touched.mobileNumber && errors.mobileNumber ? (
          <p id="mobileNumber-error" className={styles.error}>
            {errors.mobileNumber}
          </p>
        ) : null}
        <p className={styles.helperText}>Enter a 10-digit mobile number for OTP login.</p>
      </div>

      {step === "otp" ? (
        <div className={styles.inputGroup}>
          <div className={styles.stepHeader}>
            <label htmlFor="otp">Enter OTP</label>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => {
                setStep("mobile");
                setValues((current) => ({ ...current, otp: "" }));
                setTouched((current) => ({ ...current, otp: false }));
              }}
            >
              Change number
            </button>
          </div>
          <input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={values.otp}
            onChange={(event) => {
              setValues((prev) => ({ ...prev, otp: event.target.value.replace(/\D/g, "").slice(0, 4) }));
            }}
            onBlur={() => {
              setTouched((prev) => ({ ...prev, otp: true }));
            }}
            aria-invalid={Boolean(touched.otp && errors.otp)}
            aria-describedby={errors.otp ? "otp-error" : undefined}
            // placeholder="1234"
          />
          {touched.otp && errors.otp ? (
            <p id="otp-error" className={styles.error}>
              {errors.otp}
            </p>
          ) : null}
        </div>
      ) : null}

      <button type="submit" className={styles.primaryButton} disabled={pending || (step === "mobile" && !isMobileReady)}>
        {pending ? (step === "mobile" ? "Sending OTP..." : "Verifying OTP...") : step === "mobile" ? "Send OTP" : "Verify OTP & Sign In"}
      </button>

      <div className={styles.inlineActions}>
        {step === "otp" ? (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={async () => {
              setPending(true);

              try {
                await handleMobileSubmit();
              } finally {
                setPending(false);
              }
            }}
          >
            Resend OTP
          </button>
        ) : null}
      </div>

      {snackbar.open ? (
        <p
          className={`${styles.snackbar} ${
            snackbar.type === "error"
              ? styles.errorMessage
              : snackbar.type === "warning"
                ? styles.warningMessage
                : styles.successMessage
          }`}
          role="status"
          aria-live="polite"
        >
          {snackbar.message}
        </p>
      ) : null}
    </form>
  );
}
