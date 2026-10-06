import axios from "axios";
import api from "@/api/api";
import type { ImagePickerAsset } from "expo-image-picker";

export const handleUpload = async (asset: ImagePickerAsset) => {
    try {
      const fileName = asset.fileName ?? asset.uri.split("/").pop() ?? "profile.jpg";
      const extension = fileName.split(".").pop() ?? "jpg";

      // 1. Get temporary upload URL from Spring Boot backend
      const res = await api.get("/api/images/presigned-profile-url",{params:{extension}});
      
      const {uploadUrl,filePath}=res.data
      // 2. Upload file directly to Supabase using the signed URL
    const blob: Blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new TypeError("Network request failed to read local image file"));
      xhr.responseType = "blob";
      xhr.open("GET", asset.uri, true);
      xhr.send(null);
    });
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": asset.mimeType ?? "image/jpeg",
      },
      body: blob,
    });
    if (!uploadResponse.ok) {
      throw new Error(`Supabase upload failed with status: ${uploadResponse.status}`);
    }
      
      return filePath as string;
    } catch (err) {
      console.error(err);
      throw err;
    } 
  };