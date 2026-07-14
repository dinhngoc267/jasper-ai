import { LoginForm } from "./login-form";

export const metadata = {
  title: "Log in — Jasper AI Admin",
};

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-6 py-16">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[var(--gray-2)]">
        Jasper AI · Admin
      </p>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight text-[var(--ink)]">
        Log in
      </h1>
      <LoginForm />
    </main>
  );
}
