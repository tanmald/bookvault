

# Plano: Corrigir Campo de Código de Convite (Uppercase Bug)

## Resumo do Problema

O utilizador reporta que o campo de código de convite na página de onboarding está a converter automaticamente o texto para maiúsculas. Os códigos de convite são **case-sensitive** (ex: `BTVYqUXF`), por isso esta conversão causa erros de validação.

## Análise Realizada

Após uma revisão completa do código, **não encontrei nenhum `toUpperCase()` aplicado ao campo de convite**:

| Ficheiro | Linha | Código Atual |
|----------|-------|--------------|
| `OnboardingChoice.tsx` | 173 | `onChange={(e) => setInviteCode(e.target.value)}` |
| `Input.tsx` | 10-11 | Sem transformação de texto |
| `index.css` | - | Sem `text-transform` |

O código já inclui protecções CSS contra transformação:
```tsx
className="font-mono tracking-wider normal-case"
style={{ textTransform: 'none' }}
```

## Possíveis Causas

1. **Browser autocomplete/autofill** - O browser pode estar a preencher com um valor guardado anteriormente (em maiúsculas)
2. **Cache de versão anterior** - Pode haver uma versão cached do JavaScript que tinha a transformação
3. **Extensão do browser** - Alguma extensão pode estar a modificar inputs

## Solução Proposta

Para garantir que o problema está resolvido definitivamente:

### 1. Desativar completamente o autocomplete
Adicionar atributos extra para prevenir interferência do browser.

### 2. Usar inputMode apropriado
Configurar o input para texto verbatim sem correções automáticas.

```text
+-------------------------------------------+
|  Campo de Código de Convite               |
+-------------------------------------------+
|  autoComplete="off"                       |
|  autoCorrect="off"                        |
|  autoCapitalize="none"                    |
|  spellCheck="false"                       |
|  inputMode="text"                         |
|  data-form-type="other"                   |
+-------------------------------------------+
```

## Ficheiros a Modificar

### `src/components/auth/OnboardingChoice.tsx`

Atualizar o Input do código de convite com atributos completos anti-autocomplete:

```tsx
<Input
  id="inviteCode"
  type="text"
  placeholder={t('onboarding.inviteCodePlaceholder')}
  value={inviteCode}
  onChange={(e) => setInviteCode(e.target.value)}
  className="font-mono tracking-wider"
  style={{ textTransform: 'none' }}
  autoComplete="off"
  autoCorrect="off"
  autoCapitalize="none"
  spellCheck={false}
  inputMode="text"
  data-form-type="other"
  data-lpignore="true"
/>
```

## Detalhes Técnicos

Os atributos adicionados fazem o seguinte:

| Atributo | Propósito |
|----------|-----------|
| `autoComplete="off"` | Desativa preenchimento automático |
| `autoCorrect="off"` | Desativa correção automática (mobile) |
| `autoCapitalize="none"` | Impede capitalização automática (mobile) |
| `spellCheck={false}` | Desativa verificação ortográfica |
| `inputMode="text"` | Garante teclado de texto normal |
| `data-form-type="other"` | Previne detecção automática de tipo |
| `data-lpignore="true"` | Ignora extensões como LastPass |

## Passos de Implementação

1. Abrir `src/components/auth/OnboardingChoice.tsx`
2. Localizar o Input do campo `inviteCode` (linhas 168-178)
3. Adicionar os atributos anti-autocomplete
4. Testar com um código case-sensitive como `BTVYqUXF`

## Testes Recomendados

- [ ] Digitar um código com letras minúsculas e maiúsculas misturadas
- [ ] Colar um código com case misto
- [ ] Verificar que não há autocomplete a interferir
- [ ] Testar em mobile (se aplicável)

