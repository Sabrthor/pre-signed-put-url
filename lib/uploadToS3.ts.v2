// lib/uploadToS3.ts
import axios from "axios";

interface UploadOptions {
  roleArn: string;
  bucketName?: string;
  region?: string;
}

export async function uploadToS3(
  file: File,
  { roleArn, bucketName, region }: UploadOptions
): Promise<string | null> {
  try {
    // Request a pre-signed URL from the backend
    const { data } = await axios.post("/api/media", {
      roleArn,
      bucketName,
      region,
      fileType: file.type,
      originalName: file.name,
    });

    const { uploadUrl, key } = data;

    // Upload the file to S3 using the pre-signed URL
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