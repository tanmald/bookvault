
# Plano: Sistema de Roles de Admin para Bibliotecas

## Resumo

Atualmente, a tua biblioteca não tem um sistema formal de administradores. O dono da biblioteca é implicitamente quem criou os livros, mas não existe uma forma de:
- Dar permissões de admin a outros utilizadores
- Expulsar utilizadores da biblioteca

Este plano implementa um sistema de roles onde o criador da biblioteca é automaticamente admin, podendo depois promover outros amigos a admin ou removê-los.

---

## Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────┐
│                    library_members                       │
├─────────────────────────────────────────────────────────┤
│  id          │ UUID (PK)                                │
│  library_owner_id │ UUID (o dono original da biblioteca)│
│  user_id     │ UUID (o membro)                          │
│  role        │ ENUM ('admin', 'member')                 │
│  created_at  │ TIMESTAMP                                │
│  invited_by  │ UUID (quem convidou)                     │
└─────────────────────────────────────────────────────────┘
```

---

## Alterações Necessárias

### 1. Base de Dados

**Criar enum de roles:**
```sql
CREATE TYPE public.library_role AS ENUM ('admin', 'member');
```

**Criar tabela `library_members`:**
- `library_owner_id` - identifica a biblioteca (pertence ao utilizador original)
- `user_id` - o membro da biblioteca
- `role` - 'admin' ou 'member'
- O dono original é automaticamente inserido como 'admin' quando aceita o primeiro convite

**Função de segurança para verificar role:**
```sql
CREATE FUNCTION public.has_library_role(
  _library_owner_id UUID, 
  _user_id UUID, 
  _role library_role
) RETURNS BOOLEAN
```

**Atualizar a função `use_invite_link`:**
- Além de criar a amizade, também adiciona o utilizador como 'member' na tabela `library_members`
- Se for o primeiro membro, adiciona o dono como 'admin'

**Políticas RLS:**
- Admins podem ver todos os membros da sua biblioteca
- Admins podem alterar roles de outros membros
- Admins podem remover membros
- Membros só podem ver os outros membros

### 2. Frontend

**Novo hook `useLibraryMembers`:**
- Listar membros da biblioteca
- Promover/despromover admins
- Remover membros

**Nova página ou secção em `/friends`:**
- Lista de membros da tua biblioteca
- Badge indicando role (Admin/Membro)
- Ações para admins:
  - Promover a admin
  - Remover da biblioteca

**Atualizar página Amigos:**
- Mostrar o role de cada amigo
- Adicionar controlos de gestão para admins

---

## Detalhes Técnicos

### Migração SQL

```sql
-- 1. Criar enum
CREATE TYPE public.library_role AS ENUM ('admin', 'member');

-- 2. Criar tabela de membros
CREATE TABLE public.library_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_owner_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role library_role NOT NULL DEFAULT 'member',
  invited_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(library_owner_id, user_id)
);

-- 3. Ativar RLS
ALTER TABLE public.library_members ENABLE ROW LEVEL SECURITY;

-- 4. Função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_library_admin(
  _library_owner_id UUID, 
  _user_id UUID
) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.library_members
    WHERE library_owner_id = _library_owner_id
      AND user_id = _user_id
      AND role = 'admin'
  ) OR _library_owner_id = _user_id
$$;

-- 5. Políticas RLS para library_members
CREATE POLICY "Users can view library members"
  ON public.library_members FOR SELECT
  USING (
    user_id = auth.uid() 
    OR library_owner_id = auth.uid()
    OR is_library_admin(library_owner_id, auth.uid())
  );

CREATE POLICY "Library owner and admins can manage members"
  ON public.library_members FOR ALL
  USING (is_library_admin(library_owner_id, auth.uid()));
```

### Migração de Dados Existentes

Os utilizadores que já são amigos serão migrados:
- O dono de cada biblioteca torna-se 'admin'
- Os amigos existentes tornam-se 'member'

```sql
-- Migrar amizades existentes para library_members
INSERT INTO public.library_members (library_owner_id, user_id, role)
SELECT DISTINCT user_id, user_id, 'admin' FROM friendships
UNION
SELECT user_id, friend_id, 'member' FROM friendships
ON CONFLICT DO NOTHING;
```

### Componentes React

**`useLibraryMembers.ts`:**
```typescript
// Listar membros
// Promover/despromover
// Remover membro
```

**Página de Gestão (nova secção em Amigos ou página separada):**
- Tabela/lista de membros
- Ações contextuais baseadas no role do utilizador atual

---

## Fluxo de Utilização

1. **Criar convite** → Quando alguém aceita, é adicionado como 'member'
2. **Ver membros** → Admins veem todos os membros da sua biblioteca
3. **Promover admin** → Admin pode tornar um membro em admin
4. **Remover membro** → Admin pode expulsar (remove de `library_members` e `friendships`)
5. **O dono original** → Sempre é admin e não pode ser removido

---

## Considerações de Segurança

- O dono original da biblioteca (`library_owner_id = user_id`) nunca pode ser removido ou despromovido
- Apenas admins podem gerir outros membros
- As funções usam `SECURITY DEFINER` para evitar recursão infinita no RLS
- Os roles são armazenados numa tabela separada (não no perfil) para prevenir ataques de escalação de privilégios

---

## Estimativa

- **Base de dados**: 1 enum, 1 tabela, 2-3 funções, políticas RLS, migração de dados
- **Frontend**: 1 novo hook, atualizações na página de Amigos, UI de gestão
- **Complexidade**: Média-alta devido à lógica de permissões
