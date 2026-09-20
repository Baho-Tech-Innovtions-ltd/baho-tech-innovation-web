import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { UserPlus } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { AuthSplitLayout } from "../../components/auth/AuthSplitLayout";
import { FormAlert } from "../../components/auth/FormAlert";
import {
  disabilityCategories,
  disabilityDescriptions,
  disabilityLabels,
  type DisabilityCategory,
} from "../../utils/disability";

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

  return "Registration failed. Please try again.";
}

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  disabilityCategory: "blind" as DisabilityCategory,
  preferredLanguage: "en",
  phone: "",
  location: "",
};

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register(form);
      window.localStorage.setItem("baho_language", form.preferredLanguage);
      await i18n.changeLanguage(form.preferredLanguage);
      navigate("/login", {
        replace: true,
        state: { message: "Registration successful. Please log in to continue." },
      });
    } catch (apiError) {
      setError(toErrorMessage(apiError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout
      eyebrow="Create account"
      title="Every user lands on the service designed for them."
      description="Choose your disability category during signup so Baho Tech can route you to the correct assistive solution."
    >
        <form
          onSubmit={handleSubmit}
          className="w-full"
          aria-label="Registration form"
        >
          <div className="mb-6">
            <h1 className="text-4xl font-semibold text-gray-950">{t("auth.signupTitle")}</h1>
            <p className="mt-2 text-gray-600">{t("auth.signupIntro")}</p>
          </div>

          <div className="space-y-5">
            {error && <FormAlert tone="error">{error}</FormAlert>}

            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm font-semibold text-gray-800">
                {t("auth.fullName")}
              </label>
              <input
                id="fullName"
                name="fullName"
                autoComplete="name"
                required
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-gray-950 outline-none transition focus:border-[#1A4F8D] focus:ring-4 focus:ring-[#1A4F8D]/15"
              />
            </div>

            <div>
              <label htmlFor="registerEmail" className="mb-2 block text-sm font-semibold text-gray-800">
                {t("auth.email")}
              </label>
              <input
                id="registerEmail"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-gray-950 outline-none transition focus:border-[#1A4F8D] focus:ring-4 focus:ring-[#1A4F8D]/15"
              />
            </div>

            <fieldset>
              <legend className="mb-3 block text-sm font-semibold text-gray-800">{t("auth.disabilityCategory")}</legend>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Disability category">
                {disabilityCategories.map((category) => (
                  <label
                    key={category}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      form.disabilityCategory === category
                        ? "border-[#1A4F8D] bg-[#eef5f9] ring-4 ring-[#1A4F8D]/10"
                        : "border-gray-200 bg-white hover:border-[#1A4F8D]/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="disabilityCategory"
                      value={category}
                      checked={form.disabilityCategory === category}
                      onChange={() => setForm((current) => ({ ...current, disabilityCategory: category }))}
                      className="sr-only"
                    />
                    <span className="block font-semibold text-gray-950">{disabilityLabels[category]}</span>
                    <span className="mt-1 block text-sm leading-6 text-gray-600">{disabilityDescriptions[category]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="preferredLanguage" className="mb-2 block text-sm font-semibold text-gray-800">
                {t("auth.preferredLanguage")}
              </label>
              <select
                id="preferredLanguage"
                name="preferredLanguage"
                value={form.preferredLanguage}
                onChange={(event) => setForm((current) => ({ ...current, preferredLanguage: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-gray-950 outline-none transition focus:border-[#1A4F8D] focus:ring-4 focus:ring-[#1A4F8D]/15"
              >
                {["en", "rw", "fr", "sw"].map((language) => (
                  <option key={language} value={language}>
                    {t(`languages.${language}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-gray-800">
                  Phone <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-gray-950 outline-none transition focus:border-[#1A4F8D] focus:ring-4 focus:ring-[#1A4F8D]/15"
                />
              </div>
              <div>
                <label htmlFor="location" className="mb-2 block text-sm font-semibold text-gray-800">
                  Location <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  id="location"
                  name="location"
                  autoComplete="address-level2"
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-gray-950 outline-none transition focus:border-[#1A4F8D] focus:ring-4 focus:ring-[#1A4F8D]/15"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="registerPassword" className="mb-2 block text-sm font-semibold text-gray-800">
                  {t("auth.password")}
                </label>
                <input
                  id="registerPassword"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-gray-950 outline-none transition focus:border-[#1A4F8D] focus:ring-4 focus:ring-[#1A4F8D]/15"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-gray-800">
                  {t("auth.confirmPassword")}
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={form.confirmPassword}
                  onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-gray-950 outline-none transition focus:border-[#1A4F8D] focus:ring-4 focus:ring-[#1A4F8D]/15"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1A4F8D] px-6 font-semibold text-white transition hover:bg-[#1C5B78] focus:outline-none focus:ring-4 focus:ring-[#1A4F8D]/25 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <UserPlus className="h-5 w-5" aria-hidden="true" />
              {isSubmitting ? "Creating account..." : t("auth.createAccount")}
            </button>
          </div>

          <p className="mt-6 text-center text-gray-600">
            {t("auth.hasAccount")}{" "}
          </p>
        </form>
    </AuthSplitLayout>
  );
}
