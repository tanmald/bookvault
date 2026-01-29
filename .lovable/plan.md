

## 📚 BookVault - Biblioteca Digital Social

Uma aplicação web para gerir a tua coleção de ebooks, partilhar com amigos através de links privados, e acompanhar o que todos estão a ler.

---

### 🏠 Páginas Principais

**1. Página de Login/Registo**
- Autenticação por email/password
- Design minimalista com ilustração de livros

**2. Dashboard / Biblioteca Pessoal**
- Vista em grelha das capas dos livros
- Filtros por categorias/tags
- Barra de pesquisa por título, autor ou género
- Indicador de "A ler" vs "Lido" vs "Para ler"
- Botão flutuante para adicionar novos livros

**3. Página de Detalhes do Livro**
- Capa do livro em destaque
- Metadados: título, autor, género, ano, descrição
- Tags personalizadas
- Botão de download do ficheiro
- Secção de reviews e rating (1-5 estrelas)
- Ver quem está a ler este livro

**4. Upload de Livro**
- Arrastar e largar ficheiros (PDF, EPUB, MOBI, etc.)
- Formulário de metadados (título, autor, género, ano)
- Upload de capa (ou opção de capa gerada automaticamente)
- Adicionar a estantes/categorias

**5. Página de Amigos / Atividade**
- Lista de amigos na tua biblioteca
- Feed de atividade: quem está a ler o quê
- Progressos de leitura dos amigos
- Reviews recentes dos amigos

**6. Gestão de Convites**
- Gerar links de convite únicos
- Ver convites ativos e expirados
- Revogar acesso a amigos

**7. Perfil do Utilizador**
- Estatísticas: livros lidos, páginas lidas
- Livros favoritos
- Reviews publicadas
- Editar informações do perfil

---

### ✨ Funcionalidades Chave

**Gestão de Livros**
- Upload de múltiplos formatos (PDF, EPUB, MOBI, AZW3)
- Extração automática de metadados quando possível
- Organização por estantes virtuais e tags
- Status de leitura: Para ler → A ler → Lido

**Sistema Social**
- Convites por link privado único
- Ver biblioteca dos amigos
- Descarregar livros partilhados
- Ver quem está a ler cada livro
- Sistema de reviews com texto e rating (1-5 estrelas)

**Tracking de Leitura**
- Marcar livro como "A ler"
- Atualizar progresso de leitura (%)
- Data de início e fim de leitura
- Histórico de leituras

---

### 🗄️ Backend (Supabase)

**Base de dados para:**
- Utilizadores e perfis
- Livros com metadados completos
- Categorias/tags
- Relações de amizade via convites
- Status e progresso de leitura
- Reviews e ratings

**Storage para:**
- Ficheiros dos livros (PDF, EPUB, etc.)
- Capas dos livros
- Avatares dos utilizadores

**Segurança:**
- Apenas amigos aprovados podem ver e descarregar livros
- Links de convite com expiração configurável

---

### 🎨 Design

**Estilo Minimalista**
- Cores neutras: brancos, cinzas, com um accent color subtil
- Tipografia limpa e legível
- Espaço em branco generoso
- Foco nas capas dos livros como elemento visual principal
- Ícones simples e funcionais

