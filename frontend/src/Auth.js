import React, { useState } from "react";
import "./Auth.css";

const API_URL = "http://172.20.10.12:5000/api";

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const signup = mode === "signup";

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setForm({
      name: "",
      email: "",
      password: "",
      confirmPassword: ""
    });
  }

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (signup && form.password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/${signup ? "signup" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed.");
      }

      onAuth(data);
    } catch (error) {
      setMessage(
        error.message === "Failed to fetch"
          ? "Cannot connect to the backend. Make sure the server is running."
          : error.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <div className="auth-brand-icon">F</div>
          <span>FDR GUARDIAN</span>
        </div>

        <div className="auth-pitch">
          <span className="auth-eyebrow">INTELLIGENT DEPOSIT MANAGEMENT</span>
          <h1>
            Every deposit.
            <br />
            Every deadline.
            <br />
            <span>Under control.</span>
          </h1>

          <p>
            A centralized workspace for fixed deposits, security
            instruments, maturity tracking and lifecycle management.
          </p>

          <div className="auth-benefits">
            <div><span>01</span> Centralized FDR management</div>
            <div><span>02</span> Administrative priority monitoring</div>
            <div><span>03</span> Renewal and lifecycle tracking</div>
          </div>
        </div>

        <div className="auth-panel-footer">
          FDR GUARDIAN · FINANCIAL LIFECYCLE MANAGEMENT
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-card">
          <div className="auth-mobile-brand">FDR <span>GUARDIAN</span></div>

          <span className="auth-eyebrow">
            {signup ? "GET STARTED" : "WELCOME BACK"}
          </span>

          <h2>{signup ? "Create your account" : "Sign in to continue"}</h2>

          <p className="auth-subtitle">
            {signup
              ? "Create an account to access your workspace."
              : "Enter your details to access your workspace."}
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              className={!signup ? "selected" : ""}
              onClick={() => changeMode("login")}
            >
              Login
            </button>

            <button
              type="button"
              className={signup ? "selected" : ""}
              onClick={() => changeMode("signup")}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {signup && (
              <div className="auth-field">
                <label>FULL NAME</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="auth-field">
              <label>EMAIL ADDRESS</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label>PASSWORD</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder={signup ? "At least 8 characters" : "Enter password"}
                autoComplete={signup ? "new-password" : "current-password"}
                minLength={signup ? 8 : undefined}
                required
              />
            </div>

            {signup && (
              <div className="auth-field">
                <label>CONFIRM PASSWORD</label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            {message && <div className="auth-error">{message}</div>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : signup
                ? "Create Account →"
                : "Login to Dashboard →"}
            </button>
          </form>

          <p className="auth-switch">
            {signup ? "Already have an account?" : "Don't have an account?"}
            <button
              type="button"
              onClick={() => changeMode(signup ? "login" : "signup")}
            >
              {signup ? " Login" : " Sign up"}
            </button>
          </p>

          <p className="auth-note">
            Account passwords are securely hashed before storage.
          </p>
        </div>
      </section>
    </main>
  );
}