import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Available genres with their slugs for AI matching
const GENRES = [
  { slug: "autoajuda", name: "Autoajuda" },
  { slug: "biografia", name: "Biografia" },
  { slug: "ciencia", name: "Ciência" },
  { slug: "drama", name: "Drama" },
  { slug: "fantasia", name: "Fantasia" },
  { slug: "ficcao", name: "Ficção" },
  { slug: "ficcao-cientifica", name: "Ficção Científica" },
  { slug: "historia", name: "História" },
  { slug: "horror", name: "Horror" },
  { slug: "misterio", name: "Mistério" },
  { slug: "nao-ficcao", name: "Não-Ficção" },
  { slug: "poesia", name: "Poesia" },
  { slug: "romance", name: "Romance" },
  { slug: "tecnologia", name: "Tecnologia" },
  { slug: "thriller", name: "Thriller" },
];

// Supported languages for detection
const LANGUAGES = [
  { code: "pt", name: "Português" },
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "nl", name: "Nederlands" },
  { code: "ru", name: "Русский" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
];

interface ExtractedMetadata {
  title: string | null;
  author: string | null;
  description: string | null;
  year: number | null;
  coverBase64: string | null;
  genreSlug: string | null;
  detectedLanguage: string | null;
  isbn: string | null;
}

// Parse XML and extract text content from a tag
function getTagContent(xml: string, tagName: string): string | null {
  const patterns = [
    new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, "i"),
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

// Get language attribute from XML
function getLanguageAttr(xml: string): string | null {
  // Look for dc:language tag
  const langContent = getTagContent(xml, "dc:language") || getTagContent(xml, "language");
  if (langContent) {
    // Normalize language code (e.g., "en-US" -> "en", "pt-BR" -> "pt")
    const code = langContent.toLowerCase().split("-")[0].split("_")[0];
    if (LANGUAGES.some((l) => l.code === code)) {
      return code;
    }
  }
  return null;
}

// Extract year from date string
function extractYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

async function detectWithAI(
  title: string | null,
  author: string | null,
  description: string | null,
  textSample: string | null
): Promise<{ genreSlug: string | null; language: string | null }> {
  const result = { genreSlug: null as string | null, language: null as string | null };
  
  if (!title && !description && !textSample) return result;

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    console.log("OPENAI_API_KEY not configured, skipping AI detection");
    return result;
  }

  try {
    const genreList = GENRES.map((g) => g.slug).join(", ");
    const langList = LANGUAGES.map((l) => l.code).join(", ");

    const bookInfo = [
      title ? `Título: ${title}` : "",
      author ? `Autor: ${author}` : "",
      description ? `Descrição: ${description.substring(0, 300)}` : "",
      textSample ? `Amostra de texto: ${textSample.substring(0, 500)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Você é um classificador de livros. Dado informações sobre um livro, classifique o género e detecte a língua do conteúdo.

Géneros disponíveis: ${genreList}
Línguas disponíveis: ${langList}

Analise o texto fornecido para determinar a língua baseando-se no conteúdo, não apenas nos metadados.`,
            },
            {
              role: "user",
              content: bookInfo,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "classify_book",
                description: "Classifica o género e detecta a língua do livro",
                parameters: {
                  type: "object",
                  properties: {
                    genre_slug: {
                      type: "string",
                      enum: GENRES.map((g) => g.slug),
                      description: "O slug do género do livro",
                    },
                    language_code: {
                      type: "string",
                      enum: LANGUAGES.map((l) => l.code),
                      description: "O código ISO da língua do conteúdo do livro",
                    },
                  },
                  required: ["genre_slug", "language_code"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "classify_book" } },
        }),
      }
    );

    if (!response.ok) {
      console.error("AI detection failed:", response.status);
      return result;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      
      // Validate genre slug
      if (args.genre_slug && GENRES.some((g) => g.slug === args.genre_slug)) {
        result.genreSlug = args.genre_slug;
      }
      
      // Validate language code
      if (args.language_code && LANGUAGES.some((l) => l.code === args.language_code)) {
        result.language = args.language_code;
      }
    }

    return result;
  } catch (error) {
    console.error("Error with AI detection:", error);
    return result;
  }
}

// Extract text sample from EPUB for language detection
async function extractTextSample(zip: JSZip, opfPath: string, opfContent: string): Promise<string | null> {
  try {
    // Find first content file (usually chapter 1)
    const itemMatches = [...opfContent.matchAll(/<item[^>]*href="([^"]+)"[^>]*media-type="application\/xhtml\+xml"/gi)];
    
    if (itemMatches.length === 0) return null;
    
    const opfDir = opfPath.substring(0, opfPath.lastIndexOf("/") + 1);
    
    // Try the first few content files to get a text sample
    for (let i = 0; i < Math.min(3, itemMatches.length); i++) {
      const href = itemMatches[i][1];
      const contentPath = href.startsWith("/") ? href.substring(1) : opfDir + href;
      
      const contentFile = zip.file(contentPath);
      if (contentFile) {
        const content = await contentFile.async("string");
        // Strip HTML tags and get text
        const textContent = content
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        
        if (textContent.length > 100) {
          return textContent.substring(0, 1000);
        }
      }
    }
  } catch (error) {
    console.error("Error extracting text sample:", error);
  }
  return null;
}

async function extractEpubMetadata(
  fileBuffer: ArrayBuffer
): Promise<ExtractedMetadata> {
  const result: ExtractedMetadata = {
    title: null,
    author: null,
    description: null,
    year: null,
    coverBase64: null,
    genreSlug: null,
    detectedLanguage: null,
    isbn: null,
  };

  let textSample: string | null = null;

  try {
    const zip = await JSZip.loadAsync(fileBuffer);

    const containerFile = zip.file("META-INF/container.xml");
    if (!containerFile) {
      console.log("No container.xml found");
      return result;
    }

    const containerXml = await containerFile.async("string");
    const rootfileMatch = containerXml.match(/full-path="([^"]+)"/);
    if (!rootfileMatch) {
      console.log("No rootfile path found");
      return result;
    }

    const opfPath = rootfileMatch[1];
    const opfFile = zip.file(opfPath);
    if (!opfFile) {
      console.log("OPF file not found:", opfPath);
      return result;
    }

    const opfContent = await opfFile.async("string");

    result.title =
      getTagContent(opfContent, "dc:title") ||
      getTagContent(opfContent, "title");
    result.author =
      getTagContent(opfContent, "dc:creator") ||
      getTagContent(opfContent, "creator");
    result.description =
      getTagContent(opfContent, "dc:description") ||
      getTagContent(opfContent, "description");

    const dateStr =
      getTagContent(opfContent, "dc:date") || getTagContent(opfContent, "date");
    result.year = extractYear(dateStr);

    // Extract ISBN from dc:identifier tags
    const identifierMatches = [...opfContent.matchAll(/<dc:identifier[^>]*>([^<]+)<\/dc:identifier>/gi)];
    for (const match of identifierMatches) {
      const identifierText = match[1].trim();
      // Check if this is an ISBN (13-digit starting with 978/979 or 10-digit)
      const cleanIsbn = identifierText.replace(/[-\s]/g, '');
      if (/^(97[89])?\d{9}[\dX]$/i.test(cleanIsbn)) {
        result.isbn = cleanIsbn;
        break;
      }
    }

    // Also check for identifier with scheme attribute
    if (!result.isbn) {
      const schemeMatches = [...opfContent.matchAll(/<(?:dc:)?identifier[^>]*(?:opf:scheme|scheme)=["']isbn["'][^>]*>([^<]+)</gi)];
      for (const match of schemeMatches) {
        const identifierText = match[1].trim();
        const cleanIsbn = identifierText.replace(/[-\s]/g, '');
        if (/^(97[89])?\d{9}[\dX]$/i.test(cleanIsbn)) {
          result.isbn = cleanIsbn;
          break;
        }
      }
    }

    // Try to get language from metadata first
    result.detectedLanguage = getLanguageAttr(opfContent);

    // Extract text sample for AI language detection
    textSample = await extractTextSample(zip, opfPath, opfContent);

    // Try to find cover image
    const coverIdMatch = opfContent.match(
      /<meta[^>]*name="cover"[^>]*content="([^"]+)"/i
    );
    let coverId = coverIdMatch ? coverIdMatch[1] : null;

    if (!coverId) {
      const coverItemMatch = opfContent.match(
        /<item[^>]*id="([^"]*cover[^"]*)"[^>]*href="([^"]+)"/i
      );
      if (coverItemMatch) {
        coverId = coverItemMatch[1];
      }
    }

    if (coverId) {
      const itemMatch = opfContent.match(
        new RegExp(`<item[^>]*id="${coverId}"[^>]*href="([^"]+)"`, "i")
      );
      if (itemMatch) {
        const coverHref = itemMatch[1];
        const opfDir = opfPath.substring(0, opfPath.lastIndexOf("/") + 1);
        const coverPath = coverHref.startsWith("/")
          ? coverHref.substring(1)
          : opfDir + coverHref;

        const coverFile = zip.file(coverPath);
        if (coverFile) {
          const coverData = await coverFile.async("base64");
          const ext = coverPath.split(".").pop()?.toLowerCase() || "jpg";
          const mimeType =
            ext === "png"
              ? "image/png"
              : ext === "gif"
              ? "image/gif"
              : "image/jpeg";
          result.coverBase64 = `data:${mimeType};base64,${coverData}`;
        }
      }
    }

    if (!result.coverBase64) {
      const files = Object.keys(zip.files);

      // Strategy 1: Look for files with "cover" in the name
      let coverFile = files.find(
        (f) => /cover/i.test(f) && /\.(jpg|jpeg|png|gif)$/i.test(f)
      );

      // Strategy 2: If we have a cover ID, try to find a matching image file
      if (!coverFile && coverId) {
        // Remove common prefixes like "x", "cover", etc and try to match
        const cleanCoverId = coverId.replace(/^(x|cover[-_]?)/i, '');

        coverFile = files.find(f => {
          if (!/\.(jpg|jpeg|png|gif)$/i.test(f)) return false;
          const fileName = f.split('/').pop() || '';
          return fileName.toLowerCase().includes(cleanCoverId.toLowerCase()) ||
                 cleanCoverId.toLowerCase().includes(fileName.toLowerCase().replace(/\.(jpg|jpeg|png|gif)$/i, ''));
        });
      }

      // Strategy 3: Try first image file in common cover locations
      if (!coverFile) {
        const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
        // Prefer images in common cover directories
        coverFile = imageFiles.find(f => /\/(images?|img|cover|graphics)\//i.test(f)) || imageFiles[0];
      }

      if (coverFile) {
        const file = zip.file(coverFile);
        if (file) {
          const coverData = await file.async("base64");
          const ext = coverFile.split(".").pop()?.toLowerCase() || "jpg";
          const mimeType =
            ext === "png"
              ? "image/png"
              : ext === "gif"
              ? "image/gif"
              : "image/jpeg";
          result.coverBase64 = `data:${mimeType};base64,${coverData}`;
        }
      }
    }
  } catch (error) {
    console.error("Error extracting EPUB metadata:", error);
  }

  // Use AI to detect genre and language (if not found in metadata)
  if (result.title || result.description || textSample) {
    const aiResult = await detectWithAI(
      result.title,
      result.author,
      result.description,
      textSample
    );
    
    if (aiResult.genreSlug) {
      result.genreSlug = aiResult.genreSlug;
    }
    
    // Prefer AI-detected language if metadata didn't have one
    if (!result.detectedLanguage && aiResult.language) {
      result.detectedLanguage = aiResult.language;
    }
  }

  return result;
}

async function extractPdfMetadata(
  fileBuffer: ArrayBuffer
): Promise<ExtractedMetadata> {
  const result: ExtractedMetadata = {
    title: null,
    author: null,
    description: null,
    year: null,
    coverBase64: null,
    genreSlug: null,
    detectedLanguage: null,
    isbn: null,
  };

  try {
    const pdfDoc = await PDFDocument.load(fileBuffer, {
      ignoreEncryption: true,
    });

    result.title = pdfDoc.getTitle() || null;
    result.author = pdfDoc.getAuthor() || null;
    result.description = pdfDoc.getSubject() || null;

    const creationDate = pdfDoc.getCreationDate();
    if (creationDate) {
      result.year = creationDate.getFullYear();
    }

    // Extract ISBN from PDF metadata (keywords or subject fields)
    const keywords = pdfDoc.getKeywords();
    const subject = pdfDoc.getSubject();

    // Check keywords field for ISBN
    if (keywords) {
      const isbnMatch = keywords.match(/(?:ISBN[:\s-]*)?(?:97[89])?\d{9}[\dX]/i);
      if (isbnMatch) {
        result.isbn = isbnMatch[0].replace(/[^\dX]/gi, '');
      }
    }

    // Check subject field as fallback
    if (!result.isbn && subject) {
      const isbnMatch = subject.match(/(?:ISBN[:\s-]*)?(?:97[89])?\d{9}[\dX]/i);
      if (isbnMatch) {
        result.isbn = isbnMatch[0].replace(/[^\dX]/gi, '');
      }
    }

    // For PDFs, we rely more on AI for language detection
    // since PDF metadata rarely includes language info
  } catch (error) {
    console.error("Error extracting PDF metadata:", error);
  }

  // Use AI to detect genre and language
  if (result.title || result.description) {
    const aiResult = await detectWithAI(
      result.title,
      result.author,
      result.description,
      null
    );
    
    if (aiResult.genreSlug) {
      result.genreSlug = aiResult.genreSlug;
    }
    if (aiResult.language) {
      result.detectedLanguage = aiResult.language;
    }
  }

  return result;
}

// File validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = [".epub", ".pdf"];
const ALLOWED_MIME_TYPES = [
  "application/epub+zip",
  "application/pdf",
  "application/x-pdf",
  "application/octet-stream", // Some browsers send this for EPUB files
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client (simple config, no global headers)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // Extract JWT from "Bearer <token>" format
    const jwt = authHeader.replace(/^Bearer\s+/i, '');

    // CRITICAL FIX: Pass JWT directly to getUser(jwt)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);

    if (authError) {
      console.error("JWT verification failed:", authError);
      return new Response(JSON.stringify({
        error: "Invalid JWT",
        details: authError.message
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user) {
      console.error("No user returned from JWT");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: "File too large. Maximum size is 50MB" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileName = file.name.toLowerCase();
    
    // File extension validation
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) {
      return new Response(JSON.stringify({ error: "Invalid file type. Only EPUB and PDF files are allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MIME type validation (allow octet-stream for browser compatibility)
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ error: "Invalid file MIME type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileBuffer = await file.arrayBuffer();

    let metadata: ExtractedMetadata;

    if (fileName.endsWith(".epub")) {
      metadata = await extractEpubMetadata(fileBuffer);
    } else if (fileName.endsWith(".pdf")) {
      metadata = await extractPdfMetadata(fileBuffer);
    } else {
      metadata = {
        title: null,
        author: null,
        description: null,
        year: null,
        coverBase64: null,
        genreSlug: null,
        detectedLanguage: null,
      };
    }

    return new Response(JSON.stringify(metadata), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing file:", error);
    return new Response(JSON.stringify({ error: "Failed to process file" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
