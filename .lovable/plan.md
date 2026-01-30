
# Plano: Implementar Dark Mode com Opções Light/Dark/System

## Resumo

Adicionar suporte completo para dark mode com três opções de tema (claro, escuro, sistema) na página de Perfil/Settings, utilizando a biblioteca `next-themes` que já está instalada.

## Arquitetura da Solução

```text
+----------------------------------+
|         ThemeProvider            |
|  (next-themes - raiz da app)     |
+----------------------------------+
              |
              v
+----------------------------------+
|          useTheme()              |
|  (hook para aceder/mudar tema)   |
+----------------------------------+
              |
              v
+----------------------------------+
|        Profile.tsx               |
|  [Light] [Dark] [System]         |
+----------------------------------+
```

## Ficheiros a Modificar

### 1. `src/App.tsx`
Envolver a aplicação com o `ThemeProvider` do next-themes:

```tsx
import { ThemeProvider } from 'next-themes';

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    {/* resto da app */}
  </ThemeProvider>
);
```

### 2. `src/lib/i18n/translations.ts`
Adicionar traduções para as opções de tema:

**Português:**
- `settings.theme`: 'Tema'
- `settings.themeDesc`: 'Escolhe o tema da aplicação'
- `settings.themeLight`: 'Claro'
- `settings.themeDark`: 'Escuro'
- `settings.themeSystem`: 'Sistema'

**English:**
- `settings.theme`: 'Theme'
- `settings.themeDesc`: 'Choose the application theme'
- `settings.themeLight`: 'Light'
- `settings.themeDark`: 'Dark'
- `settings.themeSystem`: 'System'

### 3. `src/pages/Profile.tsx`
Adicionar secção de seleção de tema usando `RadioGroup`:

```tsx
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

// Dentro do componente:
const { theme, setTheme } = useTheme();

// Nova secção no Card de Settings:
<div className="space-y-3">
  <Label>{t('settings.theme')}</Label>
  <RadioGroup
    value={theme}
    onValueChange={setTheme}
    className="flex gap-4"
  >
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="light" id="theme-light" />
      <Label htmlFor="theme-light">
        <Sun className="inline mr-1 h-4 w-4" />
        {t('settings.themeLight')}
      </Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="dark" id="theme-dark" />
      <Label htmlFor="theme-dark">
        <Moon className="inline mr-1 h-4 w-4" />
        {t('settings.themeDark')}
      </Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="system" id="theme-system" />
      <Label htmlFor="theme-system">
        <Monitor className="inline mr-1 h-4 w-4" />
        {t('settings.themeSystem')}
      </Label>
    </div>
  </RadioGroup>
</div>
```

### 4. `index.html`
Adicionar script para prevenir flash de tema incorreto:

```html
<script>
  (function() {
    const theme = localStorage.getItem('theme') || 'system';
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (theme === 'system' && systemDark)) {
      document.documentElement.classList.add('dark');
    }
  })();
</script>
```

## Detalhes Técnicos

| Componente | Função |
|------------|--------|
| `ThemeProvider` | Gere o estado do tema e sincroniza com localStorage |
| `attribute="class"` | Aplica o tema via classe CSS (compatível com Tailwind) |
| `enableSystem` | Permite deteção automática do tema do sistema |
| `defaultTheme="system"` | Começa com preferência do sistema operativo |

## CSS Existente

O projeto já tem todas as variáveis CSS definidas para dark mode em `src/index.css`:
- Cores de background, foreground, cards, borders
- Cores de accent e destructive
- Cores do sidebar

Não é necessário alterar o CSS, apenas ativar a classe `.dark` no `<html>`.

## Fluxo de Funcionamento

1. Utilizador abre a app -> ThemeProvider lê tema do localStorage (ou usa "system")
2. Se tema = "system" -> deteta preferência do SO
3. Aplica classe `.dark` ao `<html>` se necessário
4. Utilizador muda tema em Settings -> atualiza localStorage e classe
5. Todas as cores mudam automaticamente via variáveis CSS

## Passos de Implementação

1. Atualizar `src/App.tsx` com ThemeProvider
2. Adicionar traduções em `src/lib/i18n/translations.ts`
3. Atualizar `src/pages/Profile.tsx` com seletor de tema
4. Adicionar script anti-flash em `index.html`
5. Testar as três opções de tema

## Testes Recomendados

- [ ] Mudar para dark mode e verificar todas as páginas
- [ ] Mudar para light mode e confirmar que reverte
- [ ] Testar opção "Sistema" mudando preferências do SO
- [ ] Recarregar a página e confirmar que o tema persiste
- [ ] Verificar traduções em PT e EN
