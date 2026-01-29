

## Extração Automática de Metadados de Ebooks

Vou adicionar a funcionalidade de extrair automaticamente título, autor, descrição e capa dos ficheiros quando fazes upload de um ebook.

---

### Como vai funcionar

1. **Selecionas um ficheiro** (EPUB, PDF, etc.)
2. **O sistema analisa o ficheiro** e tenta extrair os metadados
3. **Os campos são preenchidos automaticamente** com a informação encontrada
4. **Podes editar** qualquer campo antes de guardar

Um indicador de "A extrair metadados..." aparece enquanto o ficheiro está a ser analisado.

---

### Formatos suportados

| Formato | Título | Autor | Descrição | Capa |
|---------|--------|-------|-----------|------|
| **EPUB** | Sim | Sim | Sim | Sim |
| **PDF** | Sim* | Sim* | Nao | Nao |
| **MOBI/AZW** | Nao** | Nao** | Nao | Nao |

*PDFs podem ter metadados limitados ou ausentes dependendo de como foram criados

**Formatos Kindle requerem parsing especializado - podem ser adicionados futuramente

---

### Implementacao Tecnica

**1. Edge Function `extract-metadata`**
- Recebe o ficheiro via FormData
- Detecta o tipo de ficheiro pela extensao
- Para EPUB: usa JSZip para descomprimir e ler o ficheiro `content.opf` (XML com metadados Dublin Core)
- Para PDF: usa a biblioteca `pdf-lib` para ler metadados do documento
- Extrai capa embutida do EPUB quando disponivel
- Retorna JSON com os metadados encontrados

**2. Alteracoes no Frontend**
- Novo estado `isExtractingMetadata` para mostrar loading
- Funcao `extractMetadata(file)` que chama a edge function
- Quando um ficheiro e selecionado, dispara a extracao automaticamente
- Os campos do formulario sao preenchidos com os valores extraidos
- Campos ja preenchidos nao sao sobrescritos (permite editar antes de selecionar ficheiro)
- A capa extraida e mostrada como preview e usada no upload se nenhuma outra for selecionada

**3. UX/Feedback**
- Spinner e texto "A extrair metadados..." durante o processamento
- Toast de sucesso quando metadados sao encontrados
- Toast informativo quando nao ha metadados disponiveis
- Campos preenchidos automaticamente ficam destacados brevemente

---

### Ficheiros a criar/modificar

```text
Criar:
  supabase/functions/extract-metadata/index.ts

Modificar:
  src/pages/UploadBook.tsx
  src/components/upload/FileUpload.tsx (opcional - adicionar callback)
```

---

### Fluxo da Edge Function

```text
1. Receber ficheiro via POST (FormData)
2. Ler bytes do ficheiro
3. Verificar extensao (.epub, .pdf, etc.)
4. Se EPUB:
   - Descomprimir com JSZip
   - Localizar container.xml para encontrar OPF
   - Ler content.opf (XML)
   - Extrair dc:title, dc:creator, dc:description, dc:date
   - Procurar imagem de capa referenciada no OPF
   - Converter capa para base64 (para preview temporario)
5. Se PDF:
   - Usar pdf-lib para carregar documento
   - Ler Title, Author, Subject do metadata
6. Retornar JSON:
   {
     title: string | null,
     author: string | null,
     description: string | null,
     year: number | null,
     coverBase64: string | null
   }
```

