import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

/**
 * Upload an image to the Supabase 'community-photos' bucket.
 * 
 * @param base64Image The base64 string representation of the image.
 * @param extension The file extension (e.g., 'jpeg', 'png').
 * @returns The public URL of the uploaded image.
 */
export async function uploadPostImage(base64Image: string, extension: string = 'jpeg'): Promise<string> {
  try {
    const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    const filePath = `${fileName}`;

    // Decode the base64 string to an ArrayBuffer for Supabase Storage
    const arrayBuffer = decode(base64Image);

    const { data, error } = await supabase.storage
      .from('community-photos')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${extension}`,
        upsert: true,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw error;
    }

    // Get the public URL for the uploaded file
    const { data: publicData } = supabase.storage
      .from('community-photos')
      .getPublicUrl(filePath);

    return publicData.publicUrl;
  } catch (err) {
    console.error('Failed to upload image:', err);
    throw err;
  }
}
