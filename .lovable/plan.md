
# Plano: Fluxo de Onboarding com Opção de Biblioteca

## Resumo

O registo atual cria uma conta e redireciona para a biblioteca vazia. Este plano adiciona um passo de onboarding após o registo, onde o utilizador escolhe entre:

1. **Criar biblioteca nova** - Começa do zero com uma biblioteca vazia
2. **Juntar-se a uma biblioteca** - Introduz um código de convite para aceder a uma biblioteca existente

---

## Fluxo Proposto

```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Formulário    │     │   Escolha de    │     │   Biblioteca    │
│   de Registo    │ --> │   Onboarding    │ --> │   ou Amigos     │
│   (nome,email,  │     │  (Nova/Juntar)  │     │                 │
│    password)    │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Interface de Utilizador

### Passo 1: Registo (existente)
Mantém o formulário atual com nome, email e password.

### Passo 2: Escolha de Biblioteca (novo)
Após criar conta com sucesso, em vez de redirecionar para `/`:

```text
┌─────────────────────────────────────────────┐
│          Como queres começar?               │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  📚 Criar biblioteca nova           │   │
│  │  Começa do zero com a tua própria   │   │
│  │  coleção de livros                  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  🔗 Juntar-me a uma biblioteca      │   │
│  │  Tenho um código de convite         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  (Se escolher juntar-se)                   │
│  ┌─────────────────────────────────────┐   │
│  │  Código de convite: [________]      │   │
│  │                                     │   │
│  │  [Validar e Continuar]              │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### 1. Novo Componente: `OnboardingChoice`

Criar componente que apresenta as duas opções:

- **Cards visuais** com ícones para cada opção
- **RadioGroup** para seleção
- **Campo de código** que aparece condicionalmente
- **Validação do código** antes de prosseguir
- **Botão de continuar** que processa a escolha

### 2. Modificar Página de Registo

Converter para um fluxo multi-step:
- **Step 1**: Formulário de registo (existente)
- **Step 2**: Escolha de biblioteca (novo)

O estado `step` controla qual ecrã mostrar.

### 3. Lógica de Processamento

Quando o utilizador escolhe "Juntar-se":
- Valida o código de convite usando a query existente
- Se válido, chama `use_invite_link` RPC
- Redireciona para `/friends` 

Quando escolhe "Criar nova":
- Simplesmente redireciona para `/` (biblioteca vazia)

### 4. Tratamento de Erros

- Código inválido ou expirado: mostrar mensagem de erro
- Utilizador já é amigo: mostrar aviso e redirecionar
- Erro de rede: permitir tentar novamente

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/Register.tsx` | Adicionar step 2 com escolha de biblioteca |
| (opcional) `src/components/auth/OnboardingChoice.tsx` | Componente separado para o passo de escolha |

---

## Código Exemplo

```tsx
// Estado para controlar o step
const [step, setStep] = useState<'register' | 'onboarding'>('register');
const [libraryChoice, setLibraryChoice] = useState<'new' | 'join'>('new');
const [inviteCode, setInviteCode] = useState('');

// Após registo bem-sucedido
const handleSubmit = async (e: React.FormEvent) => {
  // ... validações e signUp existentes ...
  
  if (!error) {
    setStep('onboarding'); // Em vez de navigate('/')
  }
};

// Processar escolha de biblioteca
const handleOnboardingComplete = async () => {
  if (libraryChoice === 'new') {
    navigate('/');
    return;
  }
  
  // Validar e usar código de convite
  const { data, error } = await supabase.rpc('use_invite_link', {
    invite_code: inviteCode,
    joining_user_id: user.id
  });
  
  if (error || !data?.[0]?.success) {
    toast({ variant: 'destructive', ... });
    return;
  }
  
  toast({ title: 'Juntaste-te à biblioteca!' });
  navigate('/friends');
};
```

---

## Considerações de UX

- O utilizador pode sempre saltar este passo (botão "Saltar" ou "Mais tarde")
- Se tiver um código no URL (`/register?code=ABC123`), pré-preencher e pré-selecionar "Juntar-se"
- Validação em tempo real do código de convite
- Feedback visual claro sobre o estado do código (válido/inválido/a verificar)
