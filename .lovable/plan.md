
# Plano: Completar Traduções da Aplicação

## Resumo
A aplicação tem um sistema de internacionalização (i18n) implementado, mas muitas páginas e componentes ainda usam texto em português diretamente no código em vez de usar as traduções. Este plano vai completar a implementação para que toda a aplicação mude de idioma quando o utilizador escolhe português ou inglês.

## O Que Será Traduzido

### Páginas Principais
- **Detalhes do Livro** (BookDetails.tsx) - Botões, labels, diálogos de confirmação
- **Upload de Livro** (UploadBook.tsx) - Formulários, labels, mensagens
- **Amigos** (Friends.tsx) - Títulos, badges, ações
- **Convites** (Invites.tsx) - Diálogos, botões, labels
- **Login** (Login.tsx) - Formulário de entrada
- **Registo** (Register.tsx) - Formulário de criação de conta
- **Onboarding** (OnboardingChoice.tsx) - Escolha inicial
- **Aceitar Convite** (JoinInvite.tsx) - Página de convite partilhado

### Componentes
- **BookVersionsList** - Lista de versões/idiomas do livro
- **FriendsScoreboard** - Placar de leitura dos amigos
- **FileUpload** - Área de upload de ficheiros

## Novas Traduções Necessárias

Serão adicionadas aproximadamente 60 novas chaves de tradução, incluindo:

| Secção | Exemplos |
|--------|----------|
| **Detalhes do Livro** | "Livro não encontrado", "Voltar à biblioteca", "Versões Disponíveis", "Progresso de Leitura", "Livro concluído" |
| **Upload** | "Tipo de Upload", "Adicionar a livro existente", "Metadados extraídos", "A língua é detetada automaticamente" |
| **Amigos** | "A Minha Biblioteca", "Ainda sem membros", "Atividade Recente", "Dono", "Admin", "Membro" |
| **Convites** | "Novo Convite", "Convites Ativos", "Expirados/Inativos", "Criar Link" |
| **Scoreboard** | "Scoreboard dos Amigos", "Convida amigos para comparar leituras" |
| **JoinInvite** | "Convite para Biblioteca", "Precisas de ter conta" |

---

## Detalhes Técnicos

### Ficheiros a Modificar

1. **src/lib/i18n/translations.ts** - Adicionar ~60 novas chaves de tradução

2. **src/pages/BookDetails.tsx** - Usar `useLanguage()` e substituir textos hardcoded

3. **src/pages/UploadBook.tsx** - Traduzir formulário, labels e toasts

4. **src/pages/Friends.tsx** - Traduzir títulos, badges e ações

5. **src/pages/Invites.tsx** - Traduzir diálogo de criação e lista

6. **src/pages/Login.tsx** - Traduzir formulário de login

7. **src/pages/Register.tsx** - Traduzir formulário de registo

8. **src/components/auth/OnboardingChoice.tsx** - Traduzir opções de onboarding

9. **src/pages/JoinInvite.tsx** - Traduzir página de convite

10. **src/components/books/BookVersionsList.tsx** - Traduzir lista de versões

11. **src/components/books/FriendsScoreboard.tsx** - Traduzir scoreboard

12. **src/components/upload/FileUpload.tsx** - Traduzir mensagens de erro

### Padrão de Implementação

Cada componente seguirá este padrão:

```typescript
// Adicionar import
import { useLanguage } from '@/contexts/LanguageContext';

// No componente
const { t } = useLanguage();

// Substituir texto hardcoded
// Antes: <h1>Título em Português</h1>
// Depois: <h1>{t('chave.traducao')}</h1>
```

### Notas Importantes

- Os toasts (notificações) também serão traduzidos
- Datas continuarão a usar o formato local (pt-PT ou en-GB)
- Nomes de géneros literários vêm da base de dados e não serão traduzidos nesta fase
