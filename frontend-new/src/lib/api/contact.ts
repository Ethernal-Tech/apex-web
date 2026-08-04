import appSettings from "@/settings/appSettings";

export type CreateContactPayload = {
  name: string;
  email: string;
  phone?: string;
  message: string;
};

export async function submitContactForm(
  payload: CreateContactPayload,
): Promise<void> {
  const res = await fetch(`${appSettings.apiUrl}/contact`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to submit contact form (${res.status})`);
  }
}
