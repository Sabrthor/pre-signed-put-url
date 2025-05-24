// lib/uploadToS3.ts
import axios from "axios";

export async function uploadToS3(file: File): Promise<string | null> {
  try {
    const fileType = encodeURIComponent(file.type);

    const { data } = await axios.get(`/api/media?fileType=${fileType}`);
    const { uploadUrl, key } = data;

    await axios.put(uploadUrl, file, {
      headers: {
        "Content-Type": file.type,
      },
    });

    return key;
  } catch (error) {
    console.error("Upload failed:", error);
    return null;
  }
}
