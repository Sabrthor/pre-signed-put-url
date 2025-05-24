import React, { useState } from "react";
import { uploadToS3 } from "../lib/uploadToS3";

function Upload() {
  const [message, setMessage] = useState("");
  const [roleArn, setRoleArn] = useState("");
  const [bucketName, setBucketName] = useState("");
  const [region, setRegion] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!file) {
      setMessage("No file selected.");
      return;
    }

    if (!roleArn) {
      setMessage("Role ARN is required.");
      return;
    }

    const key = await uploadToS3(file, { roleArn, bucketName, region });

    if (key) {
      setMessage(`Upload successful. S3 Key: ${key}`);
    } else {
      setMessage("Upload failed.");
    }
  }

  return (
    <>
      <p>Please select file to upload</p>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Role ARN:
            <input
              type="text"
              value={roleArn}
              onChange={(e) => setRoleArn(e.target.value)}
              required
              placeholder="arn:aws:iam::123456789012:role/YourRole"
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