"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const isSignup = mode === "signup";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    const result = isSignup
      ? await authClient.signUp.email({ email, password, name: email.split("@")[0] || email })
      : await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      setError(result.error.message || "Unable to continue.");
      return;
    }
    router.push("/documents");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Product introduction">
        <Link className="wordmark wordmark-light" href="/">Ledgerly<span>.</span></Link>
        <div className="auth-story-copy">
          <p className="eyebrow eyebrow-light">Pricing, without the drift</p>
          <h1>Every number has a reason.</h1>
          <p>Build clear customer documents with discounts, taxes, and totals calculated in the right order—every time.</p>
        </div>
        <div className="formula-card" aria-hidden="true">
          <span>SUBTOTAL</span><strong>$450.00</strong>
          <span>DISCOUNTS</span><strong>− $40.00</strong>
          <span>TAX</span><strong>+ $11.50</strong>
          <span className="formula-total">TOTAL</span><strong className="formula-total">$421.50</strong>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-icon"><LockKeyhole size={20} /></div>
          <p className="eyebrow">{isSignup ? "Start a workspace" : "Welcome back"}</p>
          <h2>{isSignup ? "Create your account" : "Log in to Ledgerly"}</h2>
          <p className="muted">{isSignup ? "No verification email required." : "Use the email and password you signed up with."}</p>
          <form onSubmit={submit} className="stack-form">
            <label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></label>
            <label>Password<input type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button-primary button-wide" disabled={pending}>
              {pending ? "Working…" : isSignup ? "Create account" : "Log in"}<ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {isSignup ? "Already have an account?" : "New to Ledgerly?"}{" "}
            <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Log in" : "Create an account"}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
