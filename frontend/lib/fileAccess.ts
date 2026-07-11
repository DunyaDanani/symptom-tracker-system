// Every uploaded file (doctor documents, study module resources, message
// attachments) is served through an authenticated download route, not a
// public /uploads mount — the API checks the requester actually owns/is
// party to the record before streaming anything back. A plain <a href>
// can't attach the Bearer token those routes require, so this fetches the
// file as a blob (with the token) and opens it in a new tab instead.
export async function openAuthenticatedFile(url: string) {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      let message = "Could not open this file.";
      try {
        const data = await res.json();
        message = data.message || message;
      } catch {
        // Response wasn't JSON — stick with the generic message.
      }
      alert(message);
      return;
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    // Give the browser time to actually open it before releasing the
    // object URL, without leaking memory by holding onto it forever.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (err) {
    console.error("Failed to open file", err);
    alert("Unable to reach the server.");
  }
}
