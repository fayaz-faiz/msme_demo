"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getRloesIds, getUserProfileDataWeb, postGenerateOtp, postLogin } from "@/api";
import { loginSuccess } from "@/features/auth/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/features/cart/store/hooks";
import { notifyOrAlert } from "@/shared/lib/notify";
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
    statusCode?: number;
    message?: string;
    data?: { orderId?: string; message?: string };
  };
};

type LoginResponse = {
  data?: {
    status?: boolean;
    statusCode?: number;
    message?: string;
    data?: { accessToken?: string; refreshToken?: string; message?: string } | string;
  };
};

type ProfileResponse = {
  data?: {
    full_name?: string;
    mobile_number?: string;
    profile_pic?: string;
  };
};

function normalizeMobileNumber(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

function toReadableMessage(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map((entry) => toReadableMessage(entry)).filter(Boolean).join(" ").trim();
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return (
      toReadableMessage(obj.message) ||
      toReadableMessage(obj.error) ||
      toReadableMessage(obj.reason) ||
      toReadableMessage(obj.detail) ||
      ""
    );
  }
  return "";
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
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const verifyButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastAutoSubmittedOtpRef = useRef("");
  const nextPath = searchParams.get("next") || "/";

  const errors = useMemo(() => validate(values, step), [step, values]);
  const mobileNumber = normalizeMobileNumber(values.mobileNumber);
  const isMobileReady = mobileNumber.length === 10;

  function showNotice(
    message: string,
    type: "success" | "error" | "warning" | "info" = "error",
  ) {
    const nextMessage = message.trim();
    if (!nextMessage) {
      return;
    }
    notifyOrAlert(nextMessage, type);
  }

  useEffect(() => {
    if (step === "otp") {
      otpInputRefs.current[0]?.focus();
    }
  }, [step]);

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setResendCountdown((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  async function handleMobileSubmit() {
    try {
      let resolvedUserRoleId = userRoleId;
      if (!userRoleId) {
        const rolesResponse = await getRloesIds() as RolesResponse;
        const roles = rolesResponse?.data ?? [];
        const userRole = roles.find((item: { role?: string; _id?: string }) => item.role === "USER");
        if (!userRole?._id) {
          showNotice("Unable to find USER role. Please try again.", "error");
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
      const isSuccess = response?.data?.status === true || response?.data?.statusCode === 200;
      const nextOrderId = response?.data?.data?.orderId;

      if (!isSuccess || !nextOrderId) {
        const serverMessage =
          toReadableMessage(response?.data?.message) ||
          toReadableMessage(response?.data?.data?.message) ||
          "Unable to send OTP.";
        showNotice(serverMessage, "warning");
        return false;
      }

      setOrderId(nextOrderId);
      setResendCountdown(30);
      setValues((current) => ({ ...current, otp: "" }));
      showNotice(
        toReadableMessage(response?.data?.message) ||
          toReadableMessage(response?.data?.data?.message) ||
          "OTP sent successfully.",
        "success",
      );
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
        toReadableMessage(typedError?.response?.data?.message) ||
        toReadableMessage(typedError?.response?.data?.data) ||
        toReadableMessage(typedError?.message) ||
        "Failed to send OTP.";
      showNotice(status ? `(${status}) ${String(serverMessage)}` : String(serverMessage), "error");
      return false;
    }
  }

  async function handleOtpSubmit() {
    try {
      if (!orderId) {
        showNotice("OTP session expired. Please resend OTP.", "warning");
        return false;
      }

      const payload = {
        orderId,
        otp: values.otp.trim(),
        deviceInfo,
      };
      const response = await postLogin(payload) as LoginResponse;
      const isSuccess = response?.data?.status === true || response?.data?.statusCode === 200;

      if (!isSuccess) {
        const payloadData = response?.data?.data;
        const serverMessage =
          toReadableMessage(response?.data?.message) ||
          toReadableMessage(payloadData) ||
          "Invalid OTP.";
        showNotice(serverMessage, "warning");
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
      let resolvedProfilePic = "";

      try {
        const profileResponse = await getUserProfileDataWeb() as ProfileResponse;
        const profile = profileResponse?.data;
        resolvedName = String(profile?.full_name || "").trim() || fallbackName;
        resolvedMobile = String(profile?.mobile_number || "").trim() || mobileNumber;
        resolvedProfilePic = String(profile?.profile_pic || "").trim();
      } catch (profileError) {
        console.error("Profile fetch after login failed:", profileError);
      }

      dispatch(
        loginSuccess({
          name: resolvedName,
          mobileNumber: resolvedMobile,
          ...(resolvedProfilePic ? { profilePic: resolvedProfilePic } : {}),
        }),
      );

      showNotice(response?.data?.message || "Logged in successfully.", "success");
      router.replace(nextPath);
      return true;
    } catch (error: unknown) {
      const typedError = error as ApiErrorLike;
      const status = typedError?.status || typedError?.response?.status;
      if (status === 400) {
        setValues((current) => ({ ...current, otp: "" }));
        setTouched((current) => ({ ...current, otp: true }));
        window.requestAnimationFrame(() => {
          otpInputRefs.current[0]?.focus();
        });
        const serverMessage =
          toReadableMessage(typedError?.response?.data?.data) ||
          toReadableMessage(typedError?.response?.data?.message) ||
          "OTP is invalid!";
        showNotice(String(serverMessage), "error");
        return false;
      }
      if (status === 401) {
        showNotice(
          toReadableMessage(typedError?.response?.data?.data) || "Unauthorized request.",
          "error",
        );
        return false;
      }
      const serverMessage =
        toReadableMessage(typedError?.response?.data?.message) ||
        toReadableMessage(typedError?.response?.data?.data) ||
        toReadableMessage(typedError?.message) ||
        "OTP verification failed.";
      showNotice(String(serverMessage), "error");
      return false;
    }
  }

  const otpDigits = useMemo(
    () => Array.from({ length: 4 }, (_, index) => values.otp[index] || ""),
    [values.otp],
  );

  const handleOtpInputChange = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = digit;
    const otp = nextDigits.join("");
    setValues((prev) => ({ ...prev, otp }));
    if (digit && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      if (otpDigits[index]) {
        event.preventDefault();
        const nextDigits = [...otpDigits];
        nextDigits[index] = "";
        setValues((prev) => ({ ...prev, otp: nextDigits.join("") }));
        lastAutoSubmittedOtpRef.current = "";
        return;
      }
      if (index > 0) {
        event.preventDefault();
        const nextDigits = [...otpDigits];
        nextDigits[index - 1] = "";
        setValues((prev) => ({ ...prev, otp: nextDigits.join("") }));
        lastAutoSubmittedOtpRef.current = "";
        otpInputRefs.current[index - 1]?.focus();
      }
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < 3) {
      event.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) {
      return;
    }
    event.preventDefault();
    setValues((prev) => ({ ...prev, otp: pasted }));
    lastAutoSubmittedOtpRef.current = "";
    const focusIndex = Math.min(pasted.length, 4) - 1;
    otpInputRefs.current[Math.max(focusIndex, 0)]?.focus();
  };

  useEffect(() => {
    if (step !== "otp" || pending || values.otp.length !== 4) {
      return;
    }
    if (lastAutoSubmittedOtpRef.current === values.otp) {
      return;
    }
    lastAutoSubmittedOtpRef.current = values.otp;
    verifyButtonRef.current?.click();
  }, [step, pending, values.otp]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({
      mobileNumber: true,
      otp: step === "otp",
    });

    if (errors.mobileNumber || errors.otp) {
      showNotice(errors.mobileNumber || errors.otp || "Please check your input.", "warning");
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

      {step === "mobile" ? (
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
      ) : null}

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
            type="hidden"
            value={values.otp}
          />
          <div className={styles.otpGrid} role="group" aria-label="One time password">
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  otpInputRefs.current[index] = node;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                className={styles.otpInput}
                value={digit}
                maxLength={1}
                onChange={(event) => {
                  handleOtpInputChange(index, event.target.value);
                  lastAutoSubmittedOtpRef.current = "";
                }}
                onKeyDown={(event) => handleOtpKeyDown(index, event)}
                onPaste={handleOtpPaste}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, otp: true }));
                }}
                aria-invalid={Boolean(touched.otp && errors.otp)}
                aria-label={`OTP digit ${index + 1}`}
              />
            ))}
          </div>
          {touched.otp && errors.otp ? (
            <p id="otp-error" className={styles.error}>
              {errors.otp}
            </p>
          ) : null}
          <p className={styles.otpHint}>Enter the 4-digit OTP sent to {mobileNumber || "your mobile"}.</p>
        </div>
      ) : null}

      {step === "mobile" ? (
        <button
          ref={verifyButtonRef}
          type="submit"
          className={styles.primaryButton}
          disabled={pending || !isMobileReady}
        >
          {pending ? "Sending OTP..." : "Send OTP"}
        </button>
      ) : (
        <button
          ref={verifyButtonRef}
          type="submit"
          className={styles.primaryButton}
          disabled={pending}
        >
          {pending ? "Verifying OTP..." : "Verify OTP & Sign In"}
        </button>
      )}

      <div className={styles.inlineActions}>
        {step === "otp" ? (
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={pending || resendCountdown > 0}
            onClick={async () => {
              setPending(true);

              try {
                await handleMobileSubmit();
              } finally {
                setPending(false);
              }
            }}
          >
            {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : "Resend OTP"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
