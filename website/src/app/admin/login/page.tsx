import { LoginForm } from "./login-form";

export const metadata = {
  title: "Log in — Jasper AI Admin",
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[var(--cream)] px-6 py-16">
      <div className="w-full max-w-md rounded-3xl bg-[var(--paper)] p-9">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[var(--ink)] text-sm font-semibold text-white">
            J
          </div>
          <p className="font-mono text-xs tracking-widest text-[var(--gray-2)] uppercase">
            Jasper AI · Admin
          </p>
        </div>
        <h1 className="mb-6 text-3xl font-semibold tracking-tight text-[var(--ink)]">
          Log in
        </h1>
        <LoginForm />
      </div>
    </main>
  );
}
