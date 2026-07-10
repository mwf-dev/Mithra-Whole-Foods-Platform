import {
  AbstractFileProviderService,
  MedusaError,
  Modules,
  ModuleProvider,
} from "@medusajs/framework/utils";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import { v4 as uuid } from "uuid";

interface CloudinaryProviderOptions {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folderName?: string;
  secure?: boolean;
}

class CloudinaryFileProviderService extends AbstractFileProviderService {
  static identifier = "cloudinary";
  
  protected logger_: any;
  protected options_: CloudinaryProviderOptions;

  constructor({ logger }: { logger: any }, options: CloudinaryProviderOptions) {
    super();
    this.logger_ = logger;
    this.options_ = options;

    cloudinary.config({
      cloud_name: options.cloudName,
      api_key: options.apiKey,
      api_secret: options.apiSecret,
      secure: options.secure ?? true,
    });
  }

  static validateOptions(options: CloudinaryProviderOptions) {
    if (!options.apiKey || !options.apiSecret || !options.cloudName) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "API key, API secret or Cloud Name is required in the cloudinary provider's options."
      );
    }
  }

  async upload(file: { filename: string; content: string | Buffer }): Promise<{ url: string; key: string }> {
    const publicId = this.generatePublicId(file.filename);
    
    // Robust decoding logic to handle base64 strings, base64 buffers, or raw binary buffers
    let buffer: Buffer;
    if (typeof file.content === "string") {
      const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(file.content) && file.content.length % 4 === 0;
      if (isBase64) {
        buffer = Buffer.from(file.content, "base64");
      } else {
        buffer = Buffer.from(file.content, "binary");
      }
    } else if (Buffer.isBuffer(file.content)) {
      const str = file.content.toString("utf8");
      const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(str) && str.length % 4 === 0;
      if (isBase64) {
        buffer = Buffer.from(str, "base64");
      } else {
        buffer = file.content;
      }
    } else {
      buffer = Buffer.from(file.content as any);
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          public_id: publicId,
          folder: this.options_?.folderName || undefined,
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error("No result returned from Cloudinary upload."));
          resolve({
            url: result.secure_url,
            key: result.public_id,
          });
        }
      );
      Readable.from(buffer).pipe(uploadStream);
    });
  }

  async delete(file: { fileKey: string }): Promise<void> {
    await cloudinary.uploader.destroy(file.fileKey, { resource_type: "auto" });
  }

  async getAsBuffer(file: { fileKey: string }): Promise<Buffer> {
    const url = cloudinary.url(file.fileKey, { secure: true });
    const response = await fetch(url);
    return Buffer.from(await response.arrayBuffer());
  }

  async getDownloadStream(file: { fileKey: string }): Promise<Readable> {
    const url = cloudinary.url(file.fileKey, { secure: true });
    const response = await fetch(url);
    if (!response.body) {
      throw new Error(`Failed to fetch file stream for key: ${file.fileKey}`);
    }
    return Readable.fromWeb(response.body as any);
  }

  async getPresignedDownloadUrl(file: { fileKey: string }): Promise<string> {
    return cloudinary.url(file.fileKey, { secure: true });
  }

  private cleanFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.\-_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase();
  }

  private generatePublicId(filename: string): string {
    const cleaned = this.cleanFilename(filename);
    const unique = uuid();
    return `${unique}_${cleaned}`;
  }
}

export default ModuleProvider(Modules.FILE, {
  services: [CloudinaryFileProviderService],
});
