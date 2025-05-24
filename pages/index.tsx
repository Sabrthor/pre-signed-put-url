// pages/index.tsx
import React, { ChangeEvent, useState } from "react";
import { uploadToS3 } from "../lib/uploadToS3"; // Adjust the path

function Upload() {
  const [message, setMessage] = useState("");

  async function handleSubmit(e: ChangeEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      setMessage("No file selected.");
      return;
    }

    const key = await uploadToS3(file);

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
        <input type="file" accept="*/*" name="file" />
        <button type="submit">Upload</button>
      </form>
      {message && <p>{message}</p>}
    </>
  );
}

export default Upload;
