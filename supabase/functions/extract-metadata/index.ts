import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ExtractedMetadata {
  title: string | null;
  author: string | null;
  description: string | null;
  year: number | null;
  coverBase64: string | null;
}

// Parse XML and extract text content from a tag
function getTagContent(xml: string, tagName: string): string | null {
  // Handle namespaced tags like dc:title
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

// Extract year from date string
function extractYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
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
  };

  try {
    const zip = await JSZip.loadAsync(fileBuffer);

    // Find container.xml to locate the OPF file
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

    // Extract Dublin Core metadata
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

    // Try to find cover image
    // Look for meta tag with name="cover"
    const coverIdMatch = opfContent.match(
      /<meta[^>]*name="cover"[^>]*content="([^"]+)"/i
    );
    let coverId = coverIdMatch ? coverIdMatch[1] : null;

    // Alternative: look for item with id containing "cover"
    if (!coverId) {
      const coverItemMatch = opfContent.match(
        /<item[^>]*id="([^"]*cover[^"]*)"[^>]*href="([^"]+)"/i
      );
      if (coverItemMatch) {
        coverId = coverItemMatch[1];
      }
    }

    if (coverId) {
      // Find the href for this cover id
      const itemMatch = opfContent.match(
        new RegExp(`<item[^>]*id="${coverId}"[^>]*href="([^"]+)"`, "i")
      );
      if (itemMatch) {
        const coverHref = itemMatch[1];
        // Resolve path relative to OPF file
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

    // Alternative cover search: look for any image with "cover" in the name
    if (!result.coverBase64) {
      const files = Object.keys(zip.files);
      const coverFile = files.find(
        (f) =>
          /cover/i.test(f) &&
          /\.(jpg|jpeg|png|gif)$/i.test(f)
      );
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
  } catch (error) {
    console.error("Error extracting PDF metadata:", error);
  }

  return result;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileName = file.name.toLowerCase();
    const fileBuffer = await file.arrayBuffer();

    let metadata: ExtractedMetadata;

    if (fileName.endsWith(".epub")) {
      metadata = await extractEpubMetadata(fileBuffer);
    } else if (fileName.endsWith(".pdf")) {
      metadata = await extractPdfMetadata(fileBuffer);
    } else {
      // Unsupported format
      metadata = {
        title: null,
        author: null,
        description: null,
        year: null,
        coverBase64: null,
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
