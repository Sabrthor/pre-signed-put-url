import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { S3Client, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

// Dynamic allow-list cache with TTL
let allowedAccountsCache: string[] | null = null;
let allowedAccountsCacheTime = 0;
const ALLOW_LIST_TTL_MS = 60 * 1000; // 60 seconds

function getAllowedAccounts(): string[] {
  const now = Date.now();
  if (
    !allowedAccountsCache ||
    now - allowedAccountsCacheTime > ALLOW_LIST_TTL_MS
  ) {
    const allowListPath = path.join(process.cwd(), "allowedAccounts.json");
    try {
      allowedAccountsCache = JSON.parse(fs.readFileSync(allowListPath, "utf-8"));
    } catch {
      allowedAccountsCache = [];
    }
    allowedAccountsCacheTime = now;
  }
  return allowedAccountsCache as string[];
}

function isValidAccountId(accountId: string): boolean {
  return /^\d{12}$/.test(accountId);
}

async function getS3Client(accountId: string, region: string, roleName: string) {
  const roleArn = `arn:aws:iam::${accountId}:role/${roleName}`;
  const sts = new STSClient({ region });
  const assumed = await sts.send(new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: "presigned-url-session",
    DurationSeconds: 900,
  }));
  return new S3Client({
    region,
    credentials: {
      accessKeyId: assumed.Credentials!.AccessKeyId!,
      secretAccessKey: assumed.Credentials!.SecretAccessKey!,
      sessionToken: assumed.Credentials!.SessionToken!,
    },
  });
}

export default async function mediaHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { accountId, fileType, bucketName, region, originalName, key, uploadId, partNumber, parts, partSize } = req.body;
    const roleName = "apt-aghosh-pe-s3-fullaccess";
    const action = req.query.action;

    // Validate accountId presence and format
    if (!accountId) {
      return res.status(400).json({ error: "accountId is required" });
    }
    if (!isValidAccountId(accountId)) {
      return res.status(400).json({ error: "Invalid AWS accountId format." });
    }

    // Check allow-list
    const allowedAccounts = getAllowedAccounts();
    if (!allowedAccounts.includes(accountId)) {
      return res.status(403).json({ error: "This accountId is not allowed." });
    }

    // Use provided or default region/bucket
    const s3Region = region || process.env.REGION;
    const s3Bucket = bucketName || process.env.BUCKET_NAME;

    // --- MULTIPART UPLOAD HANDLING ---
    if (req.method === "POST" && action === "initiate") {
      // Initiate multipart upload
      const s3 = await getS3Client(accountId, s3Region, roleName);
      const Key = originalName || `${randomUUID()}`;
      const command = new CreateMultipartUploadCommand({
        Bucket: s3Bucket,
        Key,
        ContentType: fileType,
      });
      const result = await s3.send(command);
      return res.status(200).json({ uploadId: result.UploadId, key: Key });
    }

    if (req.method === "POST" && action === "presign") {
      // Presign URL for a part
      const s3 = await getS3Client(accountId, s3Region, roleName);
      const command = new UploadPartCommand({
        Bucket: s3Bucket,
        Key: key,
        PartNumber: partNumber,
        UploadId: uploadId,
        ContentLength: partSize,
      });
      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
      return res.status(200).json({ presignedUrl });
    }

    if (req.method === "POST" && action === "complete") {
      // Complete multipart upload
      const s3 = await getS3Client(accountId, s3Region, roleName);
      const command = new CompleteMultipartUploadCommand({
        Bucket: s3Bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      });
      await s3.send(command);
      return res.status(200).json({ success: true });
    }

    if (req.method === "POST" && action === "abort") {
      // Abort multipart upload
      const s3 = await getS3Client(accountId, s3Region, roleName);
      const command = new AbortMultipartUploadCommand({
        Bucket: s3Bucket,
        Key: key,
        UploadId: uploadId,
      });
      await s3.send(command);
      return res.status(200).json({ success: true });
    }

    // --- SINGLE PUT (for files ≤ 5GB) ---
    if (req.method === "POST" && !action) {
      const s3 = await getS3Client(accountId, s3Region, roleName);
      const contentType = fileType || "application/octet-stream";
      const extension = contentType.split("/")[1] || "bin";
      const Key = originalName || `${randomUUID()}.${extension}`;

      const command = new PutObjectCommand({
        Bucket: s3Bucket,
        Key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

      return res.status(200).json({
        uploadUrl,
        key: Key,
      });
    }

    // If no valid action
    return res.status(400).json({ error: "Invalid request" });
  } catch (error: any) {
    console.error("Error in media API:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
}