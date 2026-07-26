"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RoleType = "Admin" | "Vendor" | "Supervisor";

type ToastType = {
  id: string;
  message: string;
  type: "success" | "error" | "info";
};

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  // Page fade-in
  const [pageOpacity, setPageOpacity] = useState(0);

  // Form states
  const [idValue, setIdValue] = useState("");
  const [idError, setIdError] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password flow states
  const [isInlineForgot, setIsInlineForgot] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal form states
  const [modalId, setModalId] = useState("");
  const [modalIdError, setModalIdError] = useState("");
  const [modalEmail, setModalEmail] = useState("");
  const [modalEmailError, setModalEmailError] = useState("");
  const [modalPhone, setModalPhone] = useState("");

  // Inline Forgot form states
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

  // Toast helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Handle Login Submit — connected to Supabase Auth
  const handleLoginSubmit = async (e: React.FormEvent) => {
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

    setIsLoading(true);
    triggerToast("INITIALIZING SECURE SESSION...", "info");

    try {
      // 1. Look up the profile by employee_id to find role, registered email, and active status
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("email, full_name, role, is_active")
        .eq("employee_id", idValue.trim())
        .single();

      if (profileError || !profileData) {
        triggerToast("ID NOT FOUND.", "error");
        setIdError("Invalid Employee ID.");
        setIsLoading(false);
        return;
      }

      if (!profileData.is_active) {
        triggerToast("ACCOUNT DISABLED. PLEASE CONTACT ADMIN IMMEDIATELY.", "error");
        setIdError("Account disabled. Contact admin immediately.");
        setIsLoading(false);
        return;
      }

      // 2. Sign in with resolved email + password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: profileData.email,
        password: passwordValue,
      });

      if (authError || !authData.user) {
        triggerToast("AUTHENTICATION FAILED. CHECK YOUR PASSWORD.", "error");
        setPasswordError("Incorrect password.");
        setIsLoading(false);
        return;
      }

      // 3. Store role in localStorage for client-side nav guards
      if (typeof window !== "undefined") {
        localStorage.setItem("userRole", profileData.role);
        localStorage.setItem("userName", profileData.full_name);
      }

      triggerToast(`WELCOME BACK, ${profileData.full_name.toUpperCase()}! SESSION ACTIVE.`, "success");

      // 4. Role-based redirect
      setTimeout(() => {
        if (profileData.role === "vendor") {
          router.push("/vendor");
        } else if (profileData.role === "supervisor") {
          router.push("/supervisor/dashboard");
        } else {
          router.push("/admin/dashboard");
        }
      }, 1000);

    } catch (err) {
      console.error("Login error:", err);
      triggerToast("SYSTEM ERROR. PLEASE TRY AGAIN.", "error");
    } finally {
      setIsLoading(false);
    }
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
          {/* Mobile Only: Mattel Logo & Subtitle */}
          <div className="lg:hidden flex flex-col items-center justify-center mb-4">
            <img
              alt="Mattel Logo"
              className="h-24 w-auto object-contain select-none pointer-events-none mb-1"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtLhmKKaxMWpfyIdxAxXT2PW77wSmdzuzitBMr0-qusXCw1bZvkr6MSvPAUclFOEfu8-3-E6_kMnbI0hd_tY7eE9RcTMU1_QxhGSNmLseWDGnkZSVDNctyE5eqi8yOT50NZfXcy3iU-9o9KVfajuilIs2PPixdr2NHKfKIHUQ-cgvzS3NHF215rAqCj7bbyyEOJ9qe7NCYSCUpYO_JlSSxrILPRlyAuehXMl8r4w1PCh7xD2K8cdjT4k5HPSiindss_p_NSQSNJRsJ"
            />
            <h2 className="font-headline-md text-lg text-black font-extrabold tracking-tight uppercase leading-none">MAINTAIN</h2>
            <p className="text-[8px] text-[#D32F2F] font-bold uppercase tracking-[0.2em] mt-1 leading-none">Industrial Precision</p>
          </div>

          <div className="content-transition">
            {!isInlineForgot ? (
              // LOGIN FORM STATE
              <>
                <header className="text-center space-y-stack-sm mb-4">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight uppercase">
                    Login Page
                  </h1>
                  <p className="font-body-md text-on-surface opacity-60 uppercase tracking-widest text-xs">
                    Maintain
                  </p>
                </header>

                <form className="space-y-stack-md" onSubmit={handleLoginSubmit}>
                  {/* ID Field */}
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-2 uppercase">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={idValue}
                      onChange={(e) => setIdValue(e.target.value)}
                      placeholder="e.g. ADM-001-Z, VND-772-K, ENT-992-X"
                      className={`w-full bg-white industrial-border rounded-[20px] py-4 px-6 font-body-md focus:ring-0 focus:outline-none placeholder:text-on-surface placeholder:opacity-30 text-on-surface ${idError ? "border-primary" : ""}`}
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
                        className={`w-full bg-white industrial-border rounded-[20px] py-4 px-6 font-body-md focus:ring-0 focus:outline-none text-on-surface pr-16 ${passwordError ? "border-primary" : ""
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
                      disabled={isLoading}
                      className="w-full bg-primary text-white py-5 rounded-[20px] font-headline-md text-headline-md flex items-center justify-center gap-stack-sm hover:brightness-110 transition-all active:scale-[0.98] industrial-border border-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <span className="material-symbols-outlined animate-spin">progress_activity</span>
                          AUTHENTICATING...
                        </>
                      ) : (
                        <>
                          INITIALIZE SESSION
                          <span className="material-symbols-outlined">arrow_forward</span>
                        </>
                      )}
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
                      Employee / Vendor ID
                    </label>
                    <input
                      type="text"
                      value={inlineId}
                      onChange={(e) => setInlineId(e.target.value)}
                      placeholder="e.g. ADM-001-Z, VND-772-K, ENT-992-X"
                      className={`w-full bg-white industrial-border rounded-[20px] py-4 px-6 font-body-md focus:ring-0 focus:outline-none placeholder:text-on-surface placeholder:opacity-30 text-on-surface ${inlineIdError ? "border-primary" : ""
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
                      className={`w-full bg-white industrial-border rounded-[20px] py-4 px-6 font-body-md focus:ring-0 focus:outline-none placeholder:text-on-surface placeholder:opacity-30 text-on-surface ${inlineEmailError ? "border-primary" : ""
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
      </section>

      {/* Right Section: Branding & Identity (Black Panel) */}
      <section className="hidden lg:flex flex-1 bg-black relative flex-col justify-center items-center text-white my-margin-desktop mr-margin-desktop p-margin-desktop rounded-[20px] overflow-hidden">
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
              MAINTAIN
            </h2>
            <p className="font-headline-md text-headline-md text-primary uppercase tracking-[0.2em] mt-2">
              PM Helper
            </p>
          </div>

        </div>
      </section>



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
              className={`material-symbols-outlined ${toast.type === "success"
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
