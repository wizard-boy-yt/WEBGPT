import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Generate and upload zip file to Supabase Storage
const uploadZipFile = async (
  userId: string,
  htmlContent: string,
  cssContent: string,
  jsContent: string
) => {
  try {
    const zip = new JSZip()
    const zipFilenameBase = `website-${Date.now()}` // Used for the storage path

    // Add files to zip root
    zip.file('index.html', htmlContent)
    zip.file('styles.css', cssContent)
    zip.file('script.js', jsContent)

    // Generate zip file
    const content = await zip.generateAsync({ type: 'blob' })

    // Upload to Supabase Storage
    const filePath = `history/${userId}/${zipFilenameBase}.zip` // Keep folder structure in storage path
    const { data, error } = await supabase.storage
      .from('user-history')
      .upload(filePath, content)
    
    if (error) {
       console.error('Supabase storage upload error details:', JSON.stringify(error, null, 2));
       throw new Error(`Failed to upload zip file: ${error.message || 'Unknown Supabase storage error'}`);
    }
    return filePath
  } catch (err) {
    console.error('Error in uploadZipFile function:', err instanceof Error ? err.message : err);
    throw err;
  }
}

// Save user history item
export const saveHistory = async (
  userId: string,
  prompt: string,
  htmlContent: string,
  cssContent: string,
  jsContent: string,
  imageData?: string
) => {
  try {
    console.log('Attempting to save history for user:', userId);
    console.log('Content lengths:', {
      html: htmlContent?.length,
      css: cssContent?.length,
      js: jsContent?.length
    });

    // Bucket 'user-history' is assumed to exist and be configured via Supabase dashboard.
    // Removed programmatic check/creation block.

    // Generate and upload zip file
    console.log('Starting zip file creation...');
    const zipFilePath = await uploadZipFile(userId, htmlContent, cssContent, jsContent);
    console.log('Zip file uploaded to:', zipFilePath);

    const { data, error } = await supabase
      .from('user_history')
      .insert({
        user_id: userId,
        prompt: prompt || 'No prompt provided',
        html_content: htmlContent || '<!-- Empty HTML -->',
        css_content: cssContent || '/* Empty CSS */',
        js_content: jsContent || '// Empty JS',
        image_data: imageData || null,
        zip_file_path: zipFilePath
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase saveHistory error:', error);
      throw error;
    }
    
    console.log('History saved successfully. ID:', data?.id);
    return data;
  } catch (err) {
    console.error('Error in saveHistory:', {
      error: err,
      userId,
      prompt,
      htmlContent: htmlContent?.substring(0, 50),
      cssContent: cssContent?.substring(0, 50),
      jsContent: jsContent?.substring(0, 50)
    });
    throw err;
  }
}

// Load user history with all fields
export const loadHistory = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_history')
    .select(`
      id,
      created_at,
      prompt,
      html_content,
      css_content, 
      js_content,
      image_data,
      zip_file_path,
      user_id
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading history:', JSON.stringify(error, null, 2)); // Stringify the error for more detail
        throw new Error(`Failed to load history: ${error.message || 'Unknown Supabase error'}`);
      }
  
  console.log('Loaded history items:', data?.map(item => ({
    id: item.id,
    has_html: !!item.html_content,
    has_css: !!item.css_content,
    has_js: !!item.js_content
  })));
  
  return data;
}

// Delete history item and associated zip file
export const deleteHistoryItem = async (id: string) => {
  try {
    // First get the item to access its zip_file_path
    const { data: item, error: fetchError } = await supabase
      .from('user_history')
      .select('zip_file_path')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    // Delete from storage if zip exists
    if (item?.zip_file_path) {
      const { error: storageError } = await supabase.storage
        .from('user-history')
        .remove([item.zip_file_path])

      if (storageError) {
        console.error('Error deleting zip file:', storageError)
        // Continue with DB deletion even if storage delete fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('user_history')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
    return true
  } catch (err) {
    console.error('Error in deleteHistoryItem:', err)
    throw err
  }
}

export const deleteAllHistory = async (userId: string) => {
  try {
    // First get all items to access their zip_file_paths
    const { data: items, error: fetchError } = await supabase
      .from('user_history')
      .select('zip_file_path')
      .eq('user_id', userId)

    if (fetchError) throw fetchError

    // Delete all zip files from storage
    const zipPaths = items
      .map(item => item.zip_file_path)
      .filter(Boolean) as string[]

    if (zipPaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('user-history')
        .remove(zipPaths)

      if (storageError) {
        console.error('Error deleting zip files:', storageError)
        // Continue with DB deletion even if storage delete fails
      }
    }

    // Delete all from database
    const { error: deleteError } = await supabase
      .from('user_history')
      .delete()
      .eq('user_id', userId)

    if (deleteError) throw deleteError
    return true
  } catch (err) {
    console.error('Error in deleteAllHistory:', err)
    throw err
  }
}
