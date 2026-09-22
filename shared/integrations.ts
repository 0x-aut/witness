export const INTEGRATIONS = {
  gmail: {
    name: "Gmail",
    logo: "/integrations/gmail.svg",
    composioToolkit: "gmail",

    shortDescription:
      "Access and work with email relevant to your cases.",

    description:
      "Connect Gmail so Witness can find relevant correspondence, retrieve important emails, and use information from your inbox while working on your cases.",
  },

  "google-drive": {
    name: "Google Drive",
    logo: "/integrations/google-drive.svg",
    composioToolkit: "googledrive",

    shortDescription:
      "Access documents and files relevant to your cases.",

    description:
      "Connect Google Drive so Witness can find, read, and work with documents and files that may help resolve your cases.",
  },
} as const;

export type IntegrationProvider =
  keyof typeof INTEGRATIONS;

export function getIntegration(
  provider: string,
) {
  return INTEGRATIONS[
    provider as IntegrationProvider
  ];
}