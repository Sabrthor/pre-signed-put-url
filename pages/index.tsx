import React, { useState } from "react";
import { uploadToS3 } from "../lib/uploadToS3";

function Upload() {
  const [message, setMessage] = useState("");
  const [accountId, setAccountId] = useState("");
  const [bucketName, setBucketName] = useState("");
  const [region, setRegion] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!file) {
      setMessage("No file selected.");
      return;
    }

    if (!accountId) {
      setMessage("AWS Account ID is required.");
      return;
    }

    setMessage("Uploading...");
    try {
      const key = await uploadToS3(file, { accountId, bucketName, region });
      setMessage(`Upload successful. S3 Key: ${key}`);
    } catch (err: any) {
      setMessage("Upload failed: " + (err?.message || "Unknown error"));
    }
  }

  return (
    <>
      <p>Please select file to upload</p>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            AWS Account ID:
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              placeholder="851725590437"
              style={{ width: "400px" }}
            />
          </label>
        </div>
        <div>
          <label>
            Bucket Name (optional):
            <input
              type="text"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="my-bucket"
            />
          </label>
        </div>
        <div>
          <label>
            Region (optional):
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="us-east-1"
            />
          </label>
        </div>
        <div>
          <input
            type="file"
            accept="*/*"
            name="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
        <button type="submit">Upload</button>
      </form>
      {message && <p>{message}</p>}
    </>
  );
}

export default Upload;