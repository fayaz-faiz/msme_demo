type AuthResult = {
  ok: boolean;
  message: string;
  displayName?: string;
};

const DEMO_OTP = "123456";

async function simulateLatency() {
  await new Promise((resolve) => {
    setTimeout(resolve, 500);
  });
}

function normalizeMobileNumber(mobileNumber: string) {
  return mobileNumber.replace(/\D/g, "");
}

function isValidMobileNumber(mobileNumber: string) {
  return /^[0-9]{10}$/.test(normalizeMobileNumber(mobileNumber));
}

function maskMobileNumber(mobileNumber: string) {
  const digits = normalizeMobileNumber(mobileNumber).replace(/^\+/, "");

  if (digits.length <= 4) {
    return digits;
  }

  return `******${digits.slice(-4)}`;
}

export async function sendLoginOtp(mobileNumber: string): Promise<AuthResult> {
  await simulateLatency();

  if (!mobileNumber) {
    return {
      ok: false,
      message: "Mobile number is required.",
    };
  }

  if (!isValidMobileNumber(mobileNumber)) {
    return {
      ok: false,
      message: "Enter a valid mobile number.",
    };
  }

  return {
    ok: true,
    message: `OTP sent to ${maskMobileNumber(mobileNumber)}. Use 123456 to continue in this demo.`,
    displayName: `User ${normalizeMobileNumber(mobileNumber).slice(-4)}`,
  };
}

export async function verifyLoginOtp(mobileNumber: string, otp: string): Promise<AuthResult> {
  await simulateLatency();

  if (!mobileNumber || !otp) {
    return {
      ok: false,
      message: "Mobile number and OTP are required.",
    };
  }

  if (!isValidMobileNumber(mobileNumber)) {
    return {
      ok: false,
      message: "Enter a valid mobile number.",
    };
  }

  if (otp.trim() !== DEMO_OTP) {
    return {
      ok: false,
      message: "Invalid OTP. Use 123456 for this demo.",
    };
  }

  return {
    ok: true,
    message: "Logged in successfully.",
    displayName: `User ${normalizeMobileNumber(mobileNumber).slice(-4)}`,
  };
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  await simulateLatency();

  if (!name || !email || !password) {
    return {
      ok: false,
      message: "All fields are required.",
    };
  }

  return {
    ok: true,
    message: "Account created successfully.",
    displayName: name.split(" ")[0] || name || "Guest",
  };
}
