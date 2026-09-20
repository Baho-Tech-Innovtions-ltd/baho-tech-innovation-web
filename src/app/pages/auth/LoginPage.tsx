import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { LogIn } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import i18n from "../../i18n";
import { FormAlert } from "../../components/auth/FormAlert";
import { AuthSplitLayout } from "../../components/auth/AuthSplitLayout";
import { getDashboardPathForDisability } from "../../utils/disability";

function toErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (error && typeof error === "object") {
    const payload = error as { message?: unknown; error?: unknown };
    if (typeof payload.message === "string" && payload.message.trim()) return payload.message.trim();
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error.trim();
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      // Ignore serialization errors and fall back to a generic message.
    }
  }

  return "Login failed. Please try again.";
}

type LocationState = {
  from?: {
    pathname?: string;
  };
  message?: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const { login } = useAuth();
  const state = location.state as LocationState | null;
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const user = await login(form);
      if (user.preferredLanguage) {
        window.localStorage.setItem("baho_language", user.preferredLanguage);
        await i18n.changeLanguage(user.preferredLanguage);
      }
      const requestedPath = state?.from?.pathname;
      const nextPath =
        requestedPath && requestedPath !== "/login"
          ? requestedPath
          : user.role === "admin"
            ? "/admin/dashboard"
            : getDashboardPathForDisability(user.disabilityCategory);
      navigate(nextPath, { replace: true });
    } catch (apiError) {
      setError(toErrorMessage(apiError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout
      eyebrow="Welcome back"
      title="Accessible technology starts with the right workspace."
      description="Login to continue to the dashboard assigned to your role and disability profile."
    >
        <form
          onSubmit={handleSubmit}
          className="w-full"
          aria-label="Login form"
        >
          <div className="mb-6">
            <h1 className="text-4xl font-semibold text-gray-950">{t("auth.loginTitle")}</h1>
            <p className="mt-2 text-gray-600">{t("auth.loginIntro")}</p>
          </div>

          <div className="space-y-5">
            {state?.message && <FormAlert tone="success">{state.message}</FormAlert>}
            {error && <FormAlert tone="error">{error}</FormAlert>}

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-800">
                {t("auth.email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-gray-950 outline-none transition focus:border-[#1A4F8D] focus:ring-4 focus:ring-[#1A4F8D]/15"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-800">
                {t("auth.password")}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-gray-950 outline-none transition focus:border-[#1A4F8D] focus:ring-4 focus:ring-[#1A4F8D]/15"
              />
            </div>

            <div className="flex justify-end">
              <a href="mailto:support@bahotech.com" className="text-sm font-semibold text-[#1A4F8D] underline-offset-4 hover:underline">
                {t("auth.forgotPassword")}
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1A4F8D] px-6 font-semibold text-white transition hover:bg-[#1C5B78] focus:outline-none focus:ring-4 focus:ring-[#1A4F8D]/25 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <LogIn className="h-5 w-5" aria-hidden="true" />
              {isSubmitting ? "Signing in..." : t("auth.signIn")}
            </button>
          </div>

          <p className="mt-6 text-center text-gray-600">
            {t("auth.noAccount")}{" "}
          </p>
        </form>
    </AuthSplitLayout>
  );
}
