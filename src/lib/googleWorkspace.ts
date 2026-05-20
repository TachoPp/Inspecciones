/**
 * Google Workspace APIs Integration Client
 * Handles direct REST requests for Google Drive and Gmail
 */

/**
 * Converts a base64 string to a Blob
 */
export function base64ToBlob(base64: string, contentType: string): Blob {
  const parts = base64.split(",");
  const base64Data = parts.length > 1 ? parts[1] : parts[0];
  const byteCharacters = atob(base64Data);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
}

/**
 * Uploads a text, base64 data, or raw Blob to Google Drive
 */
export async function uploadToDrive(
  token: string,
  fileName: string,
  contentType: string,
  content: string | Blob
): Promise<{ id: string; webViewLink: string }> {
  // If content is base64 string, convert to blob
  let contentBlob: Blob;
  if (typeof content === "string") {
    if (content.startsWith("data:")) {
      contentBlob = base64ToBlob(content, contentType);
    } else {
      contentBlob = new Blob([content], { type: contentType });
    }
  } else {
    contentBlob = content;
  }

  const metadata = {
    name: fileName,
    mimeType: contentType
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", contentBlob);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error al subir a Google Drive: ${errText}`);
  }

  return response.json();
}

/**
 * Lists the files in the user's Google Drive
 */
export async function listDriveFiles(
  token: string,
  pageSize = 10
): Promise<Array<{ id: string; name: string; mimeType: string; webViewLink?: string; createdTime?: string }>> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&fields=files(id,name,mimeType,webViewLink,createdTime)&orderBy=createdTime%20desc`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error al listar archivos de Drive: ${errText}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Sends an HTML email via Gmail API
 */
export async function sendGmail(
  token: string,
  to: string,
  subject: string,
  htmlContent: string
): Promise<{ id: string; threadId: string }> {
  const utf8Subject = `=?utf-8?B?${btoa(encodeURIComponent(subject).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))))}?=`;
  
  const envelope = [
    `To: ${to}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${utf8Subject}`,
    "",
    htmlContent
  ].join("\r\n");

  const base64Encoded = btoa(encodeURIComponent(envelope).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        raw: base64Encoded
      })
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error al enviar por Gmail: ${errText}`);
  }

  return response.json();
}
