

## Agrupar Livros por Língua numa Unica Obra

Vou implementar um sistema que permite ter varias versoes linguisticas do mesmo livro agrupadas, para que na biblioteca apareca apenas uma entrada por obra, com opcao de escolher qual ficheiro descarregar.

---

### Como vai funcionar

1. **Na biblioteca**: Cada livro aparece apenas uma vez, mesmo que tenhas versoes em PT, EN, FR, etc.
2. **Ao abrir um livro**: Ves todas as versoes disponiveis e escolhes qual descarregar
3. **Ao fazer upload**: Podes adicionar um novo ficheiro a um livro existente, indicando a lingua
4. **Detecao automatica**: O sistema tenta detetar a lingua do ficheiro automaticamente

---

### Nova estrutura da base de dados

```text
books (obra principal - sem ficheiro diretamente)
  - id, owner_id, title, author, description
  - genre_id, year, cover_url
  - created_at, updated_at

book_files (ficheiros por lingua)
  - id, book_id, language (ex: "pt", "en", "es")
  - file_url, file_type, file_size
  - created_at
```

O livro passa a ser o "conceito" da obra, e os ficheiros sao as versoes concretas em cada lingua.

---

### Alteracoes no Upload

**Duas opcoes ao fazer upload:**

1. **Novo livro**: Cria obra nova + primeiro ficheiro
2. **Adicionar versao**: Adiciona ficheiro a um livro existente

**Interface atualizada:**
- Dropdown para selecionar lingua do ficheiro (PT, EN, ES, FR, DE, IT, etc.)
- Opcao "Adicionar a livro existente" que mostra lista dos teus livros
- AI tenta detetar lingua automaticamente a partir do conteudo

---

### Alteracoes na Biblioteca

- Cada card mostra o livro uma so vez
- Badge com numero de versoes disponiveis (ex: "3 linguas")
- Ao clicar, vai para detalhes onde podes escolher qual versao

---

### Alteracoes nos Detalhes do Livro

Nova seccao "Versoes Disponiveis":
```text
+----------------------------------+
| Versoes Disponiveis              |
+----------------------------------+
| PT  Portugues    EPUB  [Download]|
| EN  English      PDF   [Download]|
| ES  Espanol      EPUB  [Download]|
+----------------------------------+
| + Adicionar nova versao          |
+----------------------------------+
```

---

### Implementacao Tecnica

**1. Migracao da Base de Dados**

Criar tabela `book_files`:
```sql
CREATE TABLE book_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'pt',
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Migrar dados existentes:
```sql
INSERT INTO book_files (book_id, language, file_url, file_type, file_size)
SELECT id, 'pt', file_url, file_type, file_size FROM books;
```

Remover colunas file_* da tabela books (apos migracao).

**2. Detecao de Lingua com AI**

Adicionar a edge function `extract-metadata`:
- Analisa primeiras paginas do conteudo
- Retorna codigo ISO da lingua (pt, en, es, etc.)
- Campo `detectedLanguage` no retorno

**3. Alteracoes Frontend**

Ficheiros a modificar:
- `src/hooks/useBooks.ts` - incluir `book_files` nas queries
- `src/pages/UploadBook.tsx` - selector de lingua + opcao adicionar a existente
- `src/pages/BookDetails.tsx` - lista de versoes com downloads
- `src/components/books/BookCard.tsx` - badge de linguas
- `src/pages/Library.tsx` - agrupamento automatico

**4. Novas RLS Policies**

```sql
-- Users can view their book files
CREATE POLICY "Users can view their book files"
  ON book_files FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM books 
    WHERE books.id = book_files.book_id 
    AND books.owner_id = auth.uid()
  ));

-- Users can insert files for their books
CREATE POLICY "Users can insert their book files"
  ON book_files FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM books 
    WHERE books.id = book_files.book_id 
    AND books.owner_id = auth.uid()
  ));
```

---

### Linguas Suportadas

| Codigo | Nome        |
|--------|-------------|
| pt     | Portugues   |
| en     | English     |
| es     | Espanol     |
| fr     | Francais    |
| de     | Deutsch     |
| it     | Italiano    |
| nl     | Nederlands  |
| ru     | Russkiy     |
| zh     | Zhongwen    |
| ja     | Nihongo     |

---

### Ficheiros a criar/modificar

```text
Criar:
  (migracao SQL via ferramenta)

Modificar:
  supabase/functions/extract-metadata/index.ts  (detecao lingua)
  src/hooks/useBooks.ts                         (incluir book_files)
  src/pages/UploadBook.tsx                      (UI lingua + adicionar)
  src/pages/BookDetails.tsx                     (lista versoes)
  src/components/books/BookCard.tsx             (badge linguas)
```

