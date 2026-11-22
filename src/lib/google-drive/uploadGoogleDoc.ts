export interface GoogleDriveDocument {
  id: string;
  name: string;
  webViewLink?: string;
}

export class GoogleDriveUploadError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GoogleDriveUploadError";
    this.status = status;
  }
}

export async function uploadGoogleDoc(
  accessToken: string,
  name: string,
  html: string,
): Promise<GoogleDriveDocument> {
  const boundary = `afterclass_${crypto.randomUUID()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  const metadata = {
    name,
    mimeType: "application/vnd.google-apps.document",
  };
  const body = new Blob([
    `--${boundary}\r\n`,
    "Content-Type: application/json; charset=UTF-8\r\n\r\n",
    JSON.stringify(metadata),
    delimiter,
    "Content-Type: text/html; charset=UTF-8\r\n\r\n",
    html,
    closeDelimiter,
  ]);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new GoogleDriveUploadError(
      payload?.error?.message ?? "Google Drive could not create the document.",
      response.status,
    );
  }

  return (await response.json()) as GoogleDriveDocument;
}
