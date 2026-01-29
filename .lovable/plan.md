

## Scoreboard da Jamigaz (Friends Scoreboard)

Vou adicionar um scoreboard dentro da pagina de detalhes de cada livro que mostra quais amigos ja leram (ou nao) e quanto tempo demoraram.

---

### O que vai mostrar

O scoreboard apresenta uma lista de amigos com:

1. **Avatar e nome** do amigo
2. **Estado de leitura**: Para Ler, A Ler, ou Lido
3. **Tempo de leitura** (se ja terminou): calculado entre `started_at` e `finished_at`
4. **Barra de progresso** (se esta a ler)

---

### Exemplo visual

```text
+-----------------------------------------------+
| Scoreboard da Jamigaz                  Trophy |
+-----------------------------------------------+
| [Avatar] Maria        Lido em 12 dias    1o   |
| [Avatar] Joao         Lido em 18 dias    2o   |
| [Avatar] Pedro        A Ler - 45%             |
| [Avatar] Ana          Para Ler                |
+-----------------------------------------------+
| Nenhum amigo tem este livro? Convida-os!      |
+-----------------------------------------------+
```

---

### Alteracoes na Base de Dados

**Nova RLS Policy necessaria:**

A policy atual so permite ver progresso de amigos em livros onde o dono e amigo. Precisamos de uma policy que permita ver o progresso de leitura dos nossos amigos em qualquer livro que tenhamos em comum:

```sql
-- Users can view friends' reading progress on shared books
CREATE POLICY "Users can view friends reading progress on shared books"
  ON reading_progress FOR SELECT
  USING (
    -- Check if the user viewing is friends with the user who has the progress
    are_friends(auth.uid(), user_id)
  );
```

---

### Implementacao Frontend

**1. Novo Hook: `useFriendsBookProgress`**

```text
src/hooks/useFriendsBookProgress.ts

- Recebe bookId como parametro
- Busca lista de amigos do utilizador atual
- Busca progresso de leitura de cada amigo para este livro
- Combina com informacoes de perfil (avatar, nome)
- Calcula tempo de leitura para quem ja terminou
- Ordena: Lidos primeiro (por tempo), depois A Ler, depois Para Ler
```

**2. Novo Componente: `FriendsScoreboard`**

```text
src/components/books/FriendsScoreboard.tsx

- Recebe bookId como prop
- Usa o hook useFriendsBookProgress
- Mostra lista de amigos com estado e tempo
- Icone de trofeu para os primeiros lugares
- Estados visuais diferenciados com cores/badges
- Mensagem amigavel se nao houver amigos com o livro
```

**3. Integracao em BookDetails**

Adicionar o componente FriendsScoreboard na pagina de detalhes, apos o card de progresso pessoal.

---

### Calculo do Tempo de Leitura

```typescript
function calculateReadingTime(startedAt: string, finishedAt: string): string {
  const start = new Date(startedAt);
  const end = new Date(finishedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'menos de 1 dia';
  if (diffDays === 1) return '1 dia';
  return `${diffDays} dias`;
}
```

---

### Ordenacao do Scoreboard

1. **Lidos** - ordenados por tempo (mais rapido primeiro = 1o lugar)
2. **A Ler** - ordenados por progresso (maior primeiro)
3. **Para Ler** - ordenados por nome

---

### Ficheiros a criar/modificar

```text
Criar:
  src/hooks/useFriendsBookProgress.ts
  src/components/books/FriendsScoreboard.tsx

Modificar:
  src/pages/BookDetails.tsx (adicionar FriendsScoreboard)
  
Migracao SQL:
  Nova RLS policy para reading_progress
```

---

### Detalhes Tecnicos

**Interface do Hook:**

```typescript
interface FriendProgress {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  status: 'to_read' | 'reading' | 'read' | null;
  progress: number;
  started_at: string | null;
  finished_at: string | null;
  reading_time_days: number | null;
}

function useFriendsBookProgress(bookId: string): {
  friendsProgress: FriendProgress[];
  isLoading: boolean;
}
```

**Query Strategy:**

1. Buscar amigos do utilizador atual
2. Buscar progresso de leitura para este livro para todos os amigos
3. Left join para incluir amigos que nao tem progresso (estado implicitamente "nao tem o livro")
4. Combinar com dados de perfil

