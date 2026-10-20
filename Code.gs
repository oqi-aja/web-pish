const ROOT_FOLDER_ID = "1F39t93GB5QMoh2jJgtDjubwZQ6fyDEwd";
const MAX_VIDEO_BYTES = 8 * 1024 * 1024;

function doGet() {
  return jsonResponse({
    ok: true,
    service: "campish-video-upload",
    folderId: ROOT_FOLDER_ID
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Request body kosong.");
    }

    const data = JSON.parse(e.postData.contents);
    if (data.type !== "video") throw new Error("Tipe data tidak valid.");
    if (!data.base64) throw new Error("Data video kosong.");

    const mimeType = String(data.mimeType || "video/webm").toLowerCase();
    if (!/^video\/(webm|mp4|ogg)(;|$)/.test(mimeType)) {
      throw new Error("Format video tidak didukung.");
    }

    const bytes = Utilities.base64Decode(String(data.base64));
    if (!bytes.length) throw new Error("Video kosong.");
    if (bytes.length > MAX_VIDEO_BYTES) {
      throw new Error("Ukuran video melebihi 8 MB.");
    }

    const extension = (mimeType.split("/")[1] || "webm").split(";")[0];
    const timestamp = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyyMMdd-HHmmss"
    );
    const fileName = "rekaman-" + timestamp + "-" + Date.now() + "." + extension;
    const file = DriveApp
      .getFolderById(ROOT_FOLDER_ID)
      .createFile(Utilities.newBlob(bytes, mimeType, fileName));

    return jsonResponse({
      ok: true,
      fileId: file.getId(),
      fileName: file.getName(),
      url: file.getUrl()
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: String(error.message || error)
    });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}