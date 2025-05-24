import axios from "axios";

const PART_SIZE = 100 * 1024 * 1024; // 100MB

interface UploadOptions {
  accountId: string;
  bucketName?: string;
  region?: string;
}

export async function uploadToS3(
  file: File,
  { accountId, bucketName, region }: UploadOptions
): Promise<string | null> {
  if (file.size <= 5 * 1024 * 1024 * 1024) {
    // Single PUT for files <= 5GB
    const { data } = await axios.post("/api/media", {
      accountId,
      bucketName,
      region,
      fileType: file.type,
      originalName: file.name,
    });

    const { uploadUrl, key } = data;

    await axios.put(uploadUrl, file, {
      headers: {
        "Content-Type": file.type,
      },
    });

    return key;
  } else {
    // Multipart upload for files > 5GB
    // 1. Initiate multipart upload
    const { data: initData } = await axios.post("/api/media?action=initiate", {
      accountId,
      bucketName,
      region,
      fileType: file.type,
      originalName: file.name,
    });
    const { uploadId, key } = initData;

    // 2. Split file and upload parts
    const partCount = Math.ceil(file.size / PART_SIZE);
    const etags: { ETag: string; PartNumber: number }[] = [];
    for (let partNumber = 1; partNumber <= partCount; partNumber++) {
      const start = (partNumber - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, file.size);
      const blob = file.slice(start, end);

      // Get presigned URL for this part
      const { data: presignData } = await axios.post("/api/media?action=presign", {
        accountId,
        bucketName,
        region,
        key,
        uploadId,
        partNumber,
        partSize: blob.size,
      });

      // Upload part
      const uploadRes = await axios.put(presignData.presignedUrl, blob, {
        headers: { "Content-Type": file.type },
      });
      const etag = uploadRes.headers.etag || uploadRes.headers.ETag;
      etags.push({ ETag: etag.replace(/"/g, ""), PartNumber: partNumber });
    }

    // 3. Complete multipart upload
    await axios.post("/api/media?action=complete", {
      accountId,
      bucketName,
      region,
      key,
      uploadId,
      parts: etags,
    });

    return key;
  }
}