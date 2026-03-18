import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: "image" | "raw" = "image",
): Promise<string> {
  // Configure lazily so dotenv has already loaded env vars by call time
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
  });

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve(result.secure_url);
      },
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}
