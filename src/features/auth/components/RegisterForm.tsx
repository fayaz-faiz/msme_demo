"use client";

import { FormEvent, useState, useTransition } from "react";
import { register } from "@/features/auth/data/auth-service";

export function RegisterForm() {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "");
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    startTransition(async () => {
      const result = await register(name, email, password);
      setMessage(result.message);
    });
  }

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <h1>Create Account</h1>
      <label htmlFor="name">Full Name</label>
      <input id="name" name="name" type="text" required />

      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" required />

      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" minLength={8} required />

      <button type="submit" className="button" disabled={pending}>
        {pending ? "Creating..." : "Create Account"}
      </button>
      {message ? <p>{message}</p> : null}
    </form>
  );
}
