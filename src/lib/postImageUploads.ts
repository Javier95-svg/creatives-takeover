import { supabase } from '@/integrations/supabase/client';
import { validatePostImage } from '@/lib/profilePosts';

export async function uploadPostImages(userId: string, images: { file?: File; path?: string }[]) {
  if (images.length > 4) throw new Error('You can attach up to 4 images per post.');
  const paths: string[] = [];
  const uploaded: string[] = [];
  try {
    for (const image of images) {
      if (!image.file) { if (image.path) paths.push(image.path); continue; }
      const validation = validatePostImage(image.file);
      if (validation) throw new Error(validation);
      const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
      const path = `${userId}/${crypto.randomUUID()}.${extensions[image.file.type]}`;
      const { error } = await supabase.storage.from('profile-posts').upload(path, image.file);
      if (error) throw error;
      uploaded.push(path);
      paths.push(path);
    }
    return { paths, uploaded };
  } catch (error) {
    if (uploaded.length) await supabase.storage.from('profile-posts').remove(uploaded);
    throw error;
  }
}
