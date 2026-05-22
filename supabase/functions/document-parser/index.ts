import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/middleware.ts";

interface DocumentParseRequest {
  file_path: string;
  user_id: string;
  conversation_id?: string;
  bucket?: string;
  target_table?: "chatbot_attachments" | "dashboard_files";
  record_id?: string;
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let parsedRequest: DocumentParseRequest | null = null;

  try {
    parsedRequest = await req.json();
    const { file_path, user_id, conversation_id, bucket, target_table, record_id } = parsedRequest;

    if (!file_path || !user_id) {
      return new Response(
        JSON.stringify({ error: "file_path and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const bucketName = bucket || "chatbot-attachments";
    const targetTable = target_table || "chatbot_attachments";

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(file_path);

    if (downloadError || !fileData) {
      throw new Error("Failed to download file");
    }

    const fileType = file_path.split(".").pop()?.toLowerCase() || "";
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let parsedDocument: ParsedDocument;

    if (fileType === "pdf") {
      parsedDocument = await parsePDF(uint8Array);
    } else if (fileType === "docx") {
      parsedDocument = await parseDocx(uint8Array);
    } else if (fileType === "doc") {
      parsedDocument = await parseDoc(uint8Array);
    } else if (fileType === "xlsx" || fileType === "xls") {
      parsedDocument = await parseExcel(uint8Array);
    } else if (fileType === "csv") {
      parsedDocument = await parseCSV(uint8Array);
    } else if (fileType === "txt" || fileType === "md") {
      parsedDocument = await parseText(uint8Array, fileType);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    let dashboardFileRecord: Record<string, unknown> | null = null;

    if (targetTable === "dashboard_files") {
      if (!record_id) {
        throw new Error("record_id is required for dashboard file parsing");
      }

      dashboardFileRecord = await updateDashboardFileRecord(supabase, record_id, {
        extracted_text: parsedDocument.text,
        preview_payload: {
          excerpt: buildPreviewExcerpt(parsedDocument.text),
          file_type: fileType,
          word_count: parsedDocument.metadata.word_count,
        },
        summary: buildPreviewExcerpt(parsedDocument.text),
        upload_status: "ready",
        updated_at: new Date().toISOString(),
      });
    } else {
      let embedding: number[] | null = null;
      try {
        const textForEmbedding = parsedDocument.text.substring(0, 8000);
        const embeddingResponse = await supabase.functions.invoke("embed-text", {
          body: { texts: textForEmbedding },
        });
        if (embeddingResponse.data?.embeddings && embeddingResponse.data.embeddings.length > 0) {
          embedding = embeddingResponse.data.embeddings[0];
        }
      } catch (e) {
        console.warn("Failed to generate embedding:", e);
      }

      const { data: attachment } = await supabase
        .from("chatbot_attachments")
        .select("id")
        .eq("storage_path", file_path)
        .single();

      if (attachment) {
        const { error: updateError } = await supabase
          .from("chatbot_attachments")
          .update({
            extracted_text: parsedDocument.text,
            ai_analysis: {
              metadata: parsedDocument.metadata,
              tables: parsedDocument.tables,
              embedding,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", attachment.id);

        if (updateError) {
          console.error("Error updating attachment:", updateError);
        }
      }

      if (parsedDocument.text && embedding) {
        await storeDocumentChunks(
          supabase,
          user_id,
          file_path,
          parsedDocument.text,
          embedding,
          parsedDocument.metadata,
          conversation_id,
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        document: {
          text: parsedDocument.text,
          tables: parsedDocument.tables,
          metadata: parsedDocument.metadata,
          word_count: parsedDocument.text.split(/\s+/).filter(Boolean).length,
        },
        dashboard_file: dashboardFileRecord,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Document parser error:", error);

    if (parsedRequest?.target_table === "dashboard_files" && parsedRequest.record_id) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        await updateDashboardFileRecord(supabase, parsedRequest.record_id, {
          upload_status: "failed",
          summary: "Preview unavailable right now.",
          preview_payload: {
            excerpt: "Preview unavailable right now.",
            file_type: parsedRequest.file_path.split(".").pop()?.toLowerCase() || "file",
          },
          updated_at: new Date().toISOString(),
        });
      } catch (updateError) {
        console.error("Failed to mark dashboard file as failed:", updateError);
      }
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to parse document" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function updateDashboardFileRecord(
  supabase: ReturnType<typeof createClient>,
  recordId: string,
  updates: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("dashboard_files")
    .update(updates)
    .eq("id", recordId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Record<string, unknown>;
}

function buildPreviewExcerpt(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.slice(0, 220);
}

async function parsePDF(data: Uint8Array): Promise<ParsedDocument> {
  const text = extractPdfText(data);

  return {
    text: text.trim() || "We uploaded this PDF, but its preview text is unavailable right now.",
    metadata: {
      word_count: text.trim() ? text.trim().split(/\s+/).length : 0,
      file_type: "pdf",
      extracted_at: new Date().toISOString(),
    },
  };
}

function extractPdfText(data: Uint8Array) {
  const decoded = new TextDecoder("latin1").decode(data);
  const literalStrings = [...decoded.matchAll(/\(([^()]|\\.){2,}\)/g)].map((match) =>
    match[0]
      .slice(1, -1)
      .replace(/\\([nrtbf()\\])/g, " ")
      .replace(/\\\d{3}/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

  const hexStrings = [...decoded.matchAll(/<([0-9A-Fa-f]{8,})>/g)].map((match) => {
    const hex = match[1];
    let output = "";
    for (let index = 0; index < hex.length - 1; index += 2) {
      const code = Number.parseInt(hex.slice(index, index + 2), 16);
      if (Number.isFinite(code) && code >= 32 && code <= 126) {
        output += String.fromCharCode(code);
      } else if (code === 10 || code === 13) {
        output += "\n";
      } else {
        output += " ";
      }
    }
    return output.replace(/\s+/g, " ").trim();
  });

  return [...literalStrings, ...hexStrings]
    .filter((segment) => /[A-Za-z]/.test(segment))
    .join("\n")
    .trim();
}

async function parseDocx(data: Uint8Array): Promise<ParsedDocument> {
  const documentXml = await extractDocxXml(data, "word/document.xml");
  const text = documentXml ? extractTextFromWordXml(documentXml) : "";

  return {
    text: text || "We uploaded this Word document, but its preview text is unavailable right now.",
    metadata: {
      word_count: text ? text.split(/\s+/).length : 0,
      file_type: "docx",
      extracted_at: new Date().toISOString(),
    },
  };
}

async function parseDoc(data: Uint8Array): Promise<ParsedDocument> {
  const text = extractLegacyWordText(data);

  return {
    text,
    metadata: {
      word_count: text ? text.split(/\s+/).length : 0,
      file_type: "doc",
      extracted_at: new Date().toISOString(),
    },
  };
}

function extractLegacyWordText(data: Uint8Array) {
  const decoded = new TextDecoder("latin1").decode(data);
  const matches = decoded.match(/[\x20-\x7E]{4,}/g) ?? [];
  const text = matches
    .map((segment) => segment.replace(/\s+/g, " ").trim())
    .filter((segment) => /[A-Za-z]/.test(segment))
    .join("\n");

  return text.trim() || "We uploaded this Word document, but its preview text is unavailable right now.";
}

async function extractDocxXml(data: Uint8Array, targetPath: string): Promise<string | null> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;

  while (offset + 30 <= view.byteLength) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x04034b50) {
      break;
    }

    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLength = view.getUint16(offset + 26, true);
    const extraFieldLength = view.getUint16(offset + 28, true);

    const fileNameStart = offset + 30;
    const fileNameEnd = fileNameStart + fileNameLength;
    const extraStart = fileNameEnd + extraFieldLength;
    const dataStart = extraStart;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd > view.byteLength) {
      return null;
    }

    const fileNameBytes = data.subarray(fileNameStart, fileNameEnd);
    const fileName = new TextDecoder("utf-8").decode(fileNameBytes);

    if (fileName === targetPath) {
      const fileBytes = data.subarray(dataStart, dataEnd);

      if (compressionMethod === 0) {
        return new TextDecoder("utf-8").decode(fileBytes);
      }

      if (compressionMethod === 8) {
        const decompressed = await inflateRaw(fileBytes);
        return new TextDecoder("utf-8").decode(decompressed);
      }

      return null;
    }

    offset = dataEnd;
  }

  return null;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

function extractTextFromWordXml(xml: string) {
  return xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function parseExcel(data: Uint8Array): Promise<ParsedDocument> {
  const text = "Excel parsing requires additional library. Table extraction placeholder.";

  return {
    text,
    tables: [],
    metadata: {
      word_count: text.split(/\s+/).length,
      file_type: "xlsx",
      extracted_at: new Date().toISOString(),
    },
  };
}

async function parseCSV(data: Uint8Array): Promise<ParsedDocument> {
  const decoder = new TextDecoder("utf-8");
  const csvText = decoder.decode(data);
  const lines = csvText.split("\n").filter((line) => line.trim());

  if (lines.length === 0) {
    return {
      text: "",
      tables: [],
      metadata: {
        word_count: 0,
        file_type: "csv",
        extracted_at: new Date().toISOString(),
      },
    };
  }

  const headers = lines[0].split(",").map((header) => header.trim());
  const rows = lines.slice(1).map((line) => line.split(",").map((cell) => cell.trim()));

  const text = `CSV Data:\nHeaders: ${headers.join(", ")}\nRows: ${rows.length} rows\n\n${rows
    .slice(0, 10)
    .map((row) => row.join(", "))
    .join("\n")}`;

  return {
    text,
    tables: [
      {
        headers,
        rows: rows.slice(0, 100),
      },
    ],
    metadata: {
      word_count: text.split(/\s+/).length,
      file_type: "csv",
      extracted_at: new Date().toISOString(),
    },
  };
}

async function parseText(data: Uint8Array, fileType: string): Promise<ParsedDocument> {
  const decoder = new TextDecoder("utf-8");
  const text = decoder.decode(data);

  return {
    text,
    metadata: {
      word_count: text ? text.split(/\s+/).length : 0,
      file_type: fileType,
      extracted_at: new Date().toISOString(),
    },
  };
}

async function storeDocumentChunks(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  filePath: string,
  text: string,
  embedding: number[],
  metadata: ParsedDocument["metadata"],
  conversationId?: string,
) {
  const chunkSize = 1200;
  const chunkOverlap = 200;
  const chunks: Array<{ text: string; start: number; end: number }> = [];

  for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
    const chunk = text.slice(i, i + chunkSize);
    if (chunk.trim().length > 0) {
      chunks.push({
        text: chunk,
        start: i,
        end: Math.min(i + chunkSize, text.length),
      });
    }
  }

  for (const chunk of chunks) {
    try {
      const embeddingResponse = await supabase.functions.invoke("embed-text", {
        body: { text: chunk.text },
      });

      if (embeddingResponse.data?.embeddings && embeddingResponse.data.embeddings.length > 0) {
        const chunkEmbedding = embeddingResponse.data.embeddings[0];
        await supabase
          .from("knowledge_chunks")
          .upsert(
            {
              source: "user_document",
              source_id: `${userId}_${filePath}_${chunk.start}`,
              title: `Document: ${filePath.split("/").pop()}`,
              body: chunk.text,
              embedding: chunkEmbedding,
              metadata: {
                user_id: userId,
                file_path: filePath,
                conversation_id: conversationId,
                chunk_index: chunks.indexOf(chunk),
                file_type: metadata.file_type,
                ...metadata,
              },
            },
            {
              onConflict: "source,source_id",
            },
          );
      }
    } catch (e) {
      console.warn(`Failed to process chunk ${chunk.start}-${chunk.end}:`, e);
    }
  }

  console.log(`Stored ${chunks.length} document chunks for RAG`);
}
