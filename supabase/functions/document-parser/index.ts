import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.2.67/legacy/build/pdf.mjs";
import { corsHeaders } from '../_shared/response.ts';

interface DocumentParseRequest {
  file_path: string;
  user_id: string;
  conversation_id?: string;
  bucket?: string;
}

interface ParsedDocument {
  text: string;
  tables?: Array<{
    headers: string[];
    rows: string[][];
  }>;
  metadata: {
    page_count?: number;
    word_count: number;
    file_type: string;
    extracted_at: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_path, user_id, conversation_id, bucket }: DocumentParseRequest = await req.json();

    if (!file_path || !user_id) {
      return new Response(
        JSON.stringify({ error: 'file_path and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const bucketName = bucket || 'chatbot-attachments';

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(file_path);

    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get file metadata
    const { data: fileInfo } = await supabase.storage
      .from(bucketName)
      .list(user_id, {
        search: file_path.split('/').pop()
      });

    const fileType = file_path.split('.').pop()?.toLowerCase() || '';
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let parsedDocument: ParsedDocument;

    // Parse based on file type
    if (fileType === 'pdf') {
      parsedDocument = await parsePDF(uint8Array);
    } else if (fileType === 'docx' || fileType === 'doc') {
      parsedDocument = await parseWord(uint8Array);
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      parsedDocument = await parseExcel(uint8Array);
    } else if (fileType === 'csv') {
      parsedDocument = await parseCSV(uint8Array);
    } else if (fileType === 'txt' || fileType === 'md') {
      parsedDocument = await parseText(uint8Array);
    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported file type: ${fileType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate embedding for semantic search
    let embedding: number[] | null = null;
    try {
      const textForEmbedding = parsedDocument.text.substring(0, 8000); // Limit to 8000 chars for embedding
      const embeddingResponse = await supabase.functions.invoke('embed-text', {
        body: { texts: textForEmbedding }
      });
      if (embeddingResponse.data?.embeddings && embeddingResponse.data.embeddings.length > 0) {
        embedding = embeddingResponse.data.embeddings[0]; // Get first embedding
      }
    } catch (e) {
      console.warn('Failed to generate embedding:', e);
    }

    // Save parsed document to database
    const { data: attachment, error: attachmentError } = await supabase
      .from('chatbot_attachments')
      .select('id')
      .eq('storage_path', file_path)
      .single();

    if (attachment) {
      // Update existing attachment
      const { error: updateError } = await supabase
        .from('chatbot_attachments')
        .update({
          extracted_text: parsedDocument.text,
          ai_analysis: {
            metadata: parsedDocument.metadata,
            tables: parsedDocument.tables,
            embedding: embedding
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', attachment.id);

      if (updateError) {
        console.error('Error updating attachment:', updateError);
      }
    }

    // Store document chunks in knowledge_chunks for RAG
    if (parsedDocument.text && embedding) {
      await storeDocumentChunks(
        supabase,
        user_id,
        file_path,
        parsedDocument.text,
        embedding,
        parsedDocument.metadata,
        conversation_id
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        document: {
          text: parsedDocument.text,
          tables: parsedDocument.tables,
          metadata: parsedDocument.metadata,
          word_count: parsedDocument.text.split(/\s+/).length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Document parser error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to parse document' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Parse PDF files
async function parsePDF(data: Uint8Array): Promise<ParsedDocument> {
  const loadingTask = pdfjsLib.getDocument({ data, disableWorker: true });
  const pdf = await loadingTask.promise;

  let text = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) {
      text += `${pageText}\n`;
    }
  }

  return {
    text: text.trim(),
    metadata: {
      page_count: pdf.numPages,
      word_count: text.trim() ? text.trim().split(/\s+/).length : 0,
      file_type: 'pdf',
      extracted_at: new Date().toISOString()
    }
  };
}

// Parse Word documents
async function parseWord(data: Uint8Array): Promise<ParsedDocument> {
  // Word document parsing requires a library like mammoth or docx
  // For MVP, we'll use a placeholder
  const text = 'Word document parsing requires additional library. Text extraction placeholder.';
  
  return {
    text,
    metadata: {
      word_count: text.split(/\s+/).length,
      file_type: 'docx',
      extracted_at: new Date().toISOString()
    }
  };
}

// Parse Excel files
async function parseExcel(data: Uint8Array): Promise<ParsedDocument> {
  // Excel parsing requires a library like xlsx
  // For MVP, we'll use a placeholder
  const text = 'Excel parsing requires additional library. Table extraction placeholder.';
  
  return {
    text,
    tables: [],
    metadata: {
      word_count: text.split(/\s+/).length,
      file_type: 'xlsx',
      extracted_at: new Date().toISOString()
    }
  };
}

// Parse CSV files
async function parseCSV(data: Uint8Array): Promise<ParsedDocument> {
  const decoder = new TextDecoder('utf-8');
  const csvText = decoder.decode(data);
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return {
      text: '',
      tables: [],
      metadata: {
        word_count: 0,
        file_type: 'csv',
        extracted_at: new Date().toISOString()
      }
    };
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => 
    line.split(',').map(cell => cell.trim())
  );

  const text = `CSV Data:\nHeaders: ${headers.join(', ')}\nRows: ${rows.length} rows\n\n${rows.slice(0, 10).map(r => r.join(', ')).join('\n')}`;

  return {
    text,
    tables: [{
      headers,
      rows: rows.slice(0, 100) // Limit to 100 rows
    }],
    metadata: {
      word_count: text.split(/\s+/).length,
      file_type: 'csv',
      extracted_at: new Date().toISOString()
    }
  };
}

// Parse plain text files
async function parseText(data: Uint8Array): Promise<ParsedDocument> {
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(data);

  return {
    text,
    metadata: {
      word_count: text.split(/\s+/).length,
      file_type: 'txt',
      extracted_at: new Date().toISOString()
    }
  };
}

// Store document chunks in knowledge_chunks for RAG
async function storeDocumentChunks(
  supabase: any,
  userId: string,
  filePath: string,
  text: string,
  embedding: number[],
  metadata: ParsedDocument['metadata'],
  conversationId?: string
) {
  // Split text into chunks (max 1200 chars per chunk with 200 char overlap)
  const chunkSize = 1200;
  const chunkOverlap = 200;
  const chunks: Array<{ text: string; start: number; end: number }> = [];

  for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
    const chunk = text.slice(i, i + chunkSize);
    if (chunk.trim().length > 0) {
      chunks.push({
        text: chunk,
        start: i,
        end: Math.min(i + chunkSize, text.length)
      });
    }
  }

  // Generate embeddings for each chunk
  for (const chunk of chunks) {
    try {
      const embeddingResponse = await supabase.functions.invoke('embed-text', {
        body: { text: chunk.text }
      });

      if (embeddingResponse.data?.embeddings && embeddingResponse.data.embeddings.length > 0) {
        const chunkEmbedding = embeddingResponse.data.embeddings[0]; // Get first embedding
        // Store in knowledge_chunks
        await supabase
          .from('knowledge_chunks')
          .upsert({
            source: 'user_document',
            source_id: `${userId}_${filePath}_${chunk.start}`,
            title: `Document: ${filePath.split('/').pop()}`,
            body: chunk.text,
            embedding: chunkEmbedding,
            metadata: {
              user_id: userId,
              file_path: filePath,
              conversation_id: conversationId,
              chunk_index: chunks.indexOf(chunk),
              file_type: metadata.file_type,
              ...metadata
            }
          }, {
            onConflict: 'source,source_id'
          });
      }
    } catch (e) {
      console.warn(`Failed to process chunk ${chunk.start}-${chunk.end}:`, e);
    }
  }

  console.log(`Stored ${chunks.length} document chunks for RAG`);
}

