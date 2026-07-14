import { SetPasswordForm } from "./set-password-form";

export const metadata = {
  title: "Set password — Jasper AI Admin",
};

export default function SetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-6 py-16">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[var(--gray-2)]">
        Jasper AI · Admin
      </p>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">
        Set your password
      </h1>
      <p className="mb-6 text-[var(--gray-2)]">
        This link came from your invite email. Choose a password for your
        admin account.
      </p>
      <SetPasswordForm />
    </main>
  );
}
