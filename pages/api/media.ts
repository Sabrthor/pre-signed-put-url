// pages/api/media.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3Client = new S3Client({
  region: process.env.REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY!,
    secretAccessKey: process.env.SECRET_KEY!,
  },
});

export default async function mediaHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const fileType = (req.query.fileType as string) || "application/octet-stream";
    const extension = fileType.split("/")[1] || "bin";

    const Key = `${randomUUID()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    console.log("uploadUrl", uploadUrl);

    res.status(200).json({
      uploadUrl,
      key: Key,
    });
  } catch (error) {
    console.error("Error generating signed URL", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
}
