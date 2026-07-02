"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type RoleType = "Admin" | "Vendor" | "Supervisor";

type ToastType = {
  id: string;
  message: string;
  type: "success" | "error" | "info";
};

export default function LoginPage() {
  const router = useRouter();

  // Page fade-in
  const [pageOpacity, setPageOpacity] = useState(0);

  // Form states
  const [role, setRole] = useState<RoleType>("Supervisor");
  const [displayedRole, setDisplayedRole] = useState<RoleType>("Supervisor");
  const [isSwitching, setIsSwitching] = useState(false);

  const [idValue, setIdValue] = useState("");
  const [idError, setIdError] = useState("");
  const [passwordValue, setPasswordValue] = useState("••••••••••••");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password flow states
  const [isInlineForgot, setIsInlineForgot] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal form states
  const [modalRole, setModalRole] = useState<RoleType>("Supervisor");
  const [modalId, setModalId] = useState("");
  const [modalIdError, setModalIdError] = useState("");
  const [modalEmail, setModalEmail] = useState("");
  const [modalEmailError, setModalEmailError] = useState("");
  const [modalPhone, setModalPhone] = useState("");

  // Inline Forgot form states
  const [inlineRole, setInlineRole] = useState<RoleType>("Supervisor");
  const [inlineId, setInlineId] = useState("");
  const [inlineIdError, setInlineIdError] = useState("");
  const [inlineEmail, setInlineEmail] = useState("");
  const [inlineEmailError, setInlineEmailError] = useState("");

  // Toast states
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Trigger page fade-in
  useEffect(() => {
    setPageOpacity(1);
  }, []);

  // Handle role transition animation
  useEffect(() => {
    setIsSwitching(true);
    const timer = setTimeout(() => {
      setDisplayedRole(role);
      setIsSwitching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [role]);

  // Toast helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Get label and placeholder based on current displayed role
  const getRoleFields = (currentRole: RoleType) => {
    switch (currentRole) {
      case "Admin":
        return { label: "Admin ID", placeholder: "ADM-001-Z" };
      case "Vendor":
        return { label: "Vendor ID", placeholder: "VND-772-K" };
      case "Supervisor":
      default:
        return { label: "Supervisor ID", placeholder: "ENT-992-X" };
    }
  };

  const fields = getRoleFields(displayedRole);

  // Handle Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;

    if (!idValue.trim()) {
      setIdError("ID is required.");
      valid = false;
    } else {
      setIdError("");
    }

    if (!passwordValue) {
      setPasswordError("Password is required.");
      valid = false;
    } else {
      setPasswordError("");
    }

    if (!valid) {
      triggerToast("Please correct the verification errors.", "error");
      return;
    }


    // Success simulation
    triggerToast("INITIALIZING SECURE SESSION...", "info");
    setTimeout(() => {
      triggerToast(`WELCOME BACK, ${role === "Vendor" ? "APEX SERVICES" : role.toUpperCase()}! SESSION ACTIVE.`, "success");
      if (typeof window !== "undefined") {
        localStorage.setItem("userRole", role);
      }
      setTimeout(() => {
        if (role === "Vendor") {
          router.push("/vendor");
        } else if (role === "Supervisor") {
          router.push("/supervisor/dashboard");
        } else {
          router.push("/admin/dashboard");
        }
      }, 1000);
    }, 1200);
  };


  // Handle Modal Forgot Password Submit
  const handleModalSubmit = () => {
    let valid = true;

    if (!modalId.trim()) {
      setModalIdError("This field is required.");
      valid = false;
    } else {
      setModalIdError("");
    }

    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!modalEmail.trim() || !emailRegex.test(modalEmail)) {
      setModalEmailError("Please enter a valid email.");
      valid = false;
    } else {
      setModalEmailError("");
    }

    if (!valid) {
      triggerToast("Forgot Password request validation failed.", "error");
      return;
    }

    // Success reset trigger
    triggerToast(`RESET LINK DISPATCHED TO ${modalEmail.toUpperCase()}`, "success");
    setIsModalOpen(false);
    // Clear inputs
    setModalId("");
    setModalEmail("");
    setModalPhone("");
  };

  // Handle Inline Forgot Password Submit
  const handleInlineSubmit = () => {
    let valid = true;

    if (!inlineId.trim()) {
      setInlineIdError("This field is required.");
      valid = false;
    } else {
      setInlineIdError("");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!inlineEmail.trim() || !emailRegex.test(inlineEmail)) {
      setInlineEmailError("Please enter a valid email.");
      valid = false;
    } else {
      setInlineEmailError("");
    }

    if (!valid) {
      triggerToast("Reset request validation failed.", "error");
      return;
    }

    triggerToast(`RESET LINK DISPATCHED TO ${inlineEmail.toUpperCase()}`, "success");
    // Swap back to login
    setIsInlineForgot(false);
    // Reset inputs
    setInlineId("");
    setInlineEmail("");
  };

  return (
    <main
      className="flex h-screen w-full select-none"
      style={{
        opacity: pageOpacity,
        transition: "opacity 0.8s ease-out",
      }}
    >
      {/* Left Section: Login / Forgot Password form */}
      <section className="w-full lg:w-[45%] flex flex-col justify-center items-center px-gutter relative bg-white">
        <div className="w-full max-w-md flex flex-col space-y-stack-lg">
          <div className="content-transition">
            {!isInlineForgot ? (
              // LOGIN FORM STATE
              <>
                <header className="text-center space-y-stack-sm mb-4">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight uppercase">
                    AUTHORIZED ACCESS
                  </h1>
                  <p className="font-body-md text-on-surface opacity-60 uppercase tracking-widest text-xs">
                    Maintain AI Terminal 04-A
                  </p>
                </header>

                <form className="space-y-stack-md" onSubmit={handleLoginSubmit}>
                  {/* Role Dropdown */}
                  <div className="relative">
                    <label className="block font-label-md text-label-md text-on-surface mb-2 uppercase">
                      Role Identification
                    </label>
                    <div className="relative">
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as RoleType)}
                        className="w-full bg-white industrial-border rounded-[20px] py-4 px-6 appearance-none font-body-md focus:ring-0 focus:outline-none cursor-pointer text-on-surface pr-10"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Vendor">Vendor</option>
                        <option value="Supervisor">Supervisor</option>
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface flex items-center">
                        <span className="material-symbols-outlined">arrow_drop_down</span>
                      </div>
                    </div>
                  </div>

                  {/* ID Field */}
                  <div>
                    <label
                      className={`block font-label-md text-label-md text-on-surface mb-2 uppercase content-transition ${
                        isSwitching ? "switching" : ""
                      }`}
                    >
                      {fields.label}
                    </label>
                    <input
                      type="text"
                      value={idValue}
                      onChange={(e) => setIdValue(e.target.value)}
                      placeholder={fields.placeholder}
                      className={`w-full bg-white industrial-border rounded-[20px] py-4 px-6 font-body-md focus:ring-0 focus:outline-none placeholder:text-on-surface placeholder:opacity-30 text-on-surface content-transition ${
                        isSwitching ? "switching" : ""
                      } ${idError ? "border-primary" : ""}`}
                    />
                    {idError && <p className="text-primary text-xs mt-1 font-label-sm">{idError}</p>}
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-2 uppercase">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={passwordValue}
                        onChange={(e) => setPasswordValue(e.target.value)}
                        className={`w-full bg-white industrial-border rounded-[20px] py-4 px-6 font-body-md focus:ring-0 focus:outline-none text-on-surface pr-16 ${
                          passwordError ? "border-primary" : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-on-surface hover:text-primary transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-primary text-xs mt-1 font-label-sm">{passwordError}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full bg-primary text-white py-5 rounded-[20px] font-headline-md text-headline-md flex items-center justify-center gap-stack-sm hover:brightness-110 transition-all active:scale-[0.98] industrial-border border-primary cursor-pointer"
                    >
                      INITIALIZE SESSION
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                  </div>

                  {/* Trigger Modal Option */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      className="font-label-sm text-label-sm text-on-surface underline decoration-on-surface hover:text-primary transition-colors uppercase cursor-pointer"
                      onClick={() => setIsModalOpen(true)}
                    >
                      forgot password?
                    </button>
                  </div>

                </form>
              </>
            ) : (
              // SWAPPED INLINE FORGOT PASSWORD FORM (As defined in original script logic)
              <>
                <header className="text-center space-y-stack-sm mb-4">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight uppercase">
                    Forgot Password
                  </h1>
                  <p className="font-body-md text-on-surface opacity-60 uppercase tracking-widest text-xs">
                    Verify your account to reset your password.
                  </p>
                </header>

                <form className="space-y-stack-md" onSubmit={(e) => { e.preventDefault(); handleInlineSubmit(); }}>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-2 uppercase">
                      Role Identification
                    </label>
                    <div className="relative">
                      <select
                        value={inlineRole}
                        onChange={(e) => setInlineRole(e.target.value as RoleType)}
                        className="w-full bg-white industrial-border rounded-[20px] py-4 px-6 appearance-none font-body-md focus:ring-0 focus:outline-none cursor-pointer text-on-surface pr-10"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Vendor">Vendor</option>
                        <option value="Supervisor">Supervisor</option>
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface flex items-center">
                        <span className="material-symbols-outlined">arrow_drop_down</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-2 uppercase">
                      Employee / Vendor ID
                    </label>
                    <input
                      type="text"
                      value={inlineId}
                      onChange={(e) => setInlineId(e.target.value)}
                      placeholder={getRoleFields(inlineRole).placeholder}
                      className={`w-full bg-white industrial-border rounded-[20px] py-4 px-6 font-body-md focus:ring-0 focus:outline-none placeholder:text-on-surface placeholder:opacity-30 text-on-surface ${
                        inlineIdError ? "border-primary" : ""
                      }`}
                    />
                    {inlineIdError && (
                      <p className="text-primary text-xs mt-1 font-label-sm">{inlineIdError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-2 uppercase">
                      Registered Email
                    </label>
                    <input
                      type="email"
                      value={inlineEmail}
                      onChange={(e) => setInlineEmail(e.target.value)}
                      placeholder="email@example.com"
                      className={`w-full bg-white industrial-border rounded-[20px] py-4 px-6 font-body-md focus:ring-0 focus:outline-none placeholder:text-on-surface placeholder:opacity-30 text-on-surface ${
                        inlineEmailError ? "border-primary" : ""
                      }`}
                    />
                    {inlineEmailError && (
                      <p className="text-primary text-xs mt-1 font-label-sm">{inlineEmailError}</p>
                    )}
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full bg-primary text-white py-5 rounded-[20px] font-headline-md text-headline-md flex items-center justify-center gap-stack-sm hover:brightness-110 transition-all active:scale-[0.98] industrial-border border-primary cursor-pointer"
                    >
                      SEND RESET LINK
                    </button>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setIsInlineForgot(false)}
                      className="font-label-sm text-label-sm text-on-surface underline decoration-on-surface hover:text-primary transition-colors uppercase cursor-pointer"
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Security Badge Footer */}
        <footer className="absolute bottom-10 flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white industrial-border rounded-[20px]">
            <span
              className="material-symbols-outlined text-primary text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified_user
            </span>
            <span className="font-label-md text-label-md text-on-surface tracking-widest uppercase">
              System Security Active
            </span>
          </div>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        </footer>
      </section>

      {/* Right Section: Branding & Identity (Black Panel) */}
      <section className="hidden lg:flex flex-1 bg-[#1A1A1A] relative flex-col justify-center items-center text-white my-margin-desktop mr-margin-desktop p-margin-desktop rounded-[20px] overflow-hidden">
        {/* Atmospheric Grid Overlay */}
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              "linear-gradient(#D32F2F 1px, transparent 1px), linear-gradient(90deg, #D32F2F 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        ></div>

        <div className="z-10 text-center space-y-stack-md max-w-2xl">
          <div className="mb-12">
            <div className="mb-6 flex justify-center">
              <img
                alt="Mattel Logo"
                className="h-40 w-auto object-contain select-none pointer-events-none"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtLhmKKaxMWpfyIdxAxXT2PW77wSmdzuzitBMr0-qusXCw1bZvkr6MSvPAUclFOEfu8-3-E6_kMnbI0hd_tY7eE9RcTMU1_QxhGSNmLseWDGnkZSVDNctyE5eqi8yOT50NZfXcy3iU-9o9KVfajuilIs2PPixdr2NHKfKIHUQ-cgvzS3NHF215rAqCj7bbyyEOJ9qe7NCYSCUpYO_JlSSxrILPRlyAuehXMl8r4w1PCh7xD2K8cdjT4k5HPSiindss_p_NSQSNJRsJ"
              />
            </div>
            <h2 className="font-headline-xl text-headline-xl text-white leading-none tracking-tighter">
              MAINTAIN.AI
            </h2>
            <p className="font-headline-md text-headline-md text-primary uppercase tracking-[0.2em] mt-2">
              Industrial Precision
            </p>
          </div>

          <div className="bg-black/50 industrial-border border-white/20 p-stack-lg rounded-[20px]">
            <h3 className="font-body-lg text-body-lg text-white mb-2">
              Preventive Maintenance Verification System
            </h3>
            <p className="text-white/70 font-body-md">
              Deploying neural-enhanced diagnostics across 14 manufacturing nodes. <br />
              Stability Index: <span className="text-primary font-bold">99.98%</span>
            </p>
          </div>
        </div>

        {/* Background Decorative Image */}
        <div className="absolute inset-0 opacity-10 pointer-events-none grayscale invert overflow-hidden rounded-[20px]">
          <div
            className="w-full h-full bg-no-repeat bg-right-bottom bg-contain"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA89c2ev_gXhdP0IVVnljR9jFNRNwrlCA9eXC4pWYrArwFjSHiAagrAbWOzi6AV1PSmlpGq32AYtP71BZuE-RMMfXGn4KQfvLidilUTvo0dudYn9IFW8DF6-PaTrrw6TKJeiAwuD9lfkQVdWz_OLPOESW5fvGAZ5V84azBCJG2WkF2Smeedi8CCLFLlTr68EyVxrlrXUdMM4VQ41azVgODBZUVf1BnlluUNrFEFdW9chn3pz0yblJOBDVtMO8Uo5UtSlnUrqZgXA_b2')",
            }}
          ></div>
        </div>

        <div className="absolute top-10 right-10 flex gap-4">
          <div className="flex flex-col items-end opacity-40 text-white">
            <span className="text-[10px] font-bold tracking-widest">NETWORK_STATUS</span>
            <span className="text-[10px] text-primary">ENCRYPTED_AES_256</span>
          </div>
        </div>
      </section>

      {/* Forgot Password Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>

          {/* Modal Content */}
          <div className="relative bg-white w-full max-w-md p-margin-desktop rounded-[20px] industrial-border space-y-stack-lg z-10 mx-4">
            <header className="text-center space-y-stack-sm">
              <h2 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-tight">
                Forgot Password
              </h2>
              <p className="font-body-md text-on-surface opacity-60">
                Recover your account credentials by verifying your identity.
              </p>
            </header>

            <form
              className="space-y-stack-md"
              onSubmit={(e) => {
                e.preventDefault();
                handleModalSubmit();
              }}
            >
              {/* Role Dropdown */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-2 uppercase">
                  Role Identification
                </label>
                <div className="relative">
                  <select
                    value={modalRole}
                    onChange={(e) => setModalRole(e.target.value as RoleType)}
                    className="w-full bg-white industrial-border rounded-[20px] py-4 px-6 appearance-none font-body-md focus:ring-0 focus:outline-none cursor-pointer text-on-surface pr-10"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Vendor">Vendor</option>
                    <option value="Supervisor">Supervisor</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface flex items-center">
                    <span className="material-symbols-outlined">arrow_drop_down</span>
                  </div>
                </div>
              </div>

              {/* ID Input */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-2 uppercase">
                  Employee / Vendor ID
                </label>
                <input
                  type="text"
                  placeholder="Enter ID"
                  value={modalId}
                  onChange={(e) => setModalId(e.target.value)}
                  className={`w-full bg-white industrial-border rounded-[20px] py-4 px-6 font-body-md focus:ring-0 focus:outline-none placeholder:opacity-30 text-on-surface ${
                    modalIdError ? "border-primary" : ""
                  }`}
                />
                {modalIdError && (
                  <p className="text-primary text-xs mt-1 font-label-sm">{modalIdError}</p>
                )}
              </div>

              {/* Email Input */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-2 uppercase">
                  Registered Email
                </label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={modalEmail}
                  onChange={(e) => setModalEmail(e.target.value)}
                  className={`w-full bg-white industrial-border rounded-[20px] py-4 px-6 font-body-md focus:ring-0 focus:outline-none placeholder:opacity-30 text-on-surface ${
                    modalEmailError ? "border-primary" : ""
                  }`}
                />
                {modalEmailError && (
                  <p className="text-primary text-xs mt-1 font-label-sm">{modalEmailError}</p>
                )}
              </div>

              {/* Phone Input (Optional) */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-2 uppercase">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={modalPhone}
                  onChange={(e) => setModalPhone(e.target.value)}
                  className="w-full bg-white industrial-border rounded-[20px] py-4 px-6 font-body-md focus:ring-0 focus:outline-none placeholder:opacity-30 text-on-surface"
                />
              </div>

              <p className="text-xs text-on-surface opacity-60 italic">
                If the information matches your account, a password reset link or temporary password
                will be sent to your registered email.
              </p>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalIdError("");
                    setModalEmailError("");
                  }}
                  className="flex-1 py-4 industrial-border rounded-[20px] font-label-md uppercase hover:bg-on-surface/5 transition-colors text-primary border-primary cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-primary text-white rounded-[20px] font-label-md uppercase hover:brightness-110 transition-all cursor-pointer"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <div
        id="toastContainer"
        className="fixed top-10 right-10 z-[60] flex flex-col gap-3 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-[20px] industrial-border bg-white text-on-surface animate-in fade-in slide-in-from-top-4 duration-300`}
          >
            <span
              className={`material-symbols-outlined ${
                toast.type === "success"
                  ? "text-green-600"
                  : toast.type === "error"
                  ? "text-primary"
                  : "text-blue-500"
              }`}
            >
              {toast.type === "success"
                ? "check_circle"
                : toast.type === "error"
                ? "error"
                : "info"}
            </span>
            <span className="font-label-md uppercase">{toast.message}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
