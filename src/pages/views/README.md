# Estrutura Modular - Views de Gerenciamento

Este diretório contém todos os componentes de visualização do painel de gerenciamento, agora organizados de forma modular para melhor manutenibilidade e escalabilidade.

## 📁 Estrutura de Arquivos

```
src/pages/views/
├── index.js                  # Exporta todos os módulos
├── ClientsView.jsx           # Gerenciamento de clientes
├── ServicesView.jsx          # Catálogo de serviços e pacotes
├── ProductsView.jsx          # Controle de produtos e estoque
├── ProfessionalsView.jsx     # Gestão de profissionais
├── ReportsView.jsx           # Geração de relatórios
├── AgendaView.jsx            # Sistema de agendamento
├── SettingsView.jsx          # Configurações do sistema
└── HelpView.jsx              # Central de ajuda
```

## 🎯 Componentes

### ClientsView
**Responsabilidade:** Gerenciamento completo de clientes
- Cadastro e edição de clientes
- Sistema de anamnese
- Galeria de fotos
- Bloqueio de clientes (lista negra)
- Importação de contatos do dispositivo

**Dependências:**
- Firebase (Firestore, Storage)
- Lucide Icons
- UI Components (Card, Button, Input, DataTable, Modal)

---

### ServicesView
**Responsabilidade:** Catálogo de serviços e pacotes
- Gerenciamento de serviços individuais
- Criação de pacotes promocionais
- Controle de preços e duração

**Dependências:**
- Firebase (Firestore)
- UI Components

---

### ProductsView
**Responsabilidade:** Controle de produtos e estoque
- Cadastro de produtos
- Gestão de categorias
- Controle de estoque
- Alertas de estoque baixo

**Dependências:**
- Firebase (Firestore)
- UI Components

---

### ProfessionalsView
**Responsabilidade:** Gestão de profissionais
- Cadastro de profissionais
- Definição de funções
- Configuração de comissões

**Dependências:**
- Firebase (Firestore)
- UI Components

---

### ReportsView
**Responsabilidade:** Geração de relatórios
- Fluxo de caixa
- Melhores clientes
- Alerta de estoque
- Relatório de comissões
- Geração de PDFs

**Dependências:**
- Firebase (Firestore)
- @react-pdf/renderer
- Componentes de relatório PDF
- UI Components

---

### AgendaView
**Responsabilidade:** Sistema de agendamento
- Navegação por datas
- Visualização de horários
- Criação de agendamentos
- Integração com horários de trabalho
- Indicador de dias fechados

**Dependências:**
- Firebase (Firestore)
- UI Components

---

### SettingsView
**Responsabilidade:** Configurações do sistema
- Dados da empresa
- Horários de funcionamento
- Dias de atendimento

**Dependências:**
- UI Components

---

### HelpView
**Responsabilidade:** Central de ajuda
- Guia do sistema
- Documentação de funcionalidades

**Dependências:**
- UI Components

---

## 🔧 Como Usar

### Importação Individual
```javascript
import { ClientsView } from './pages/views/ClientsView';
```

### Importação Múltipla
```javascript
import { 
  ClientsView, 
  AgendaView, 
  SettingsView 
} from './pages/views';
```

### Importação via ManagementViews (Compatibilidade)
```javascript
import { ClientsView } from './pages/ManagementViews';
```

## 🎨 Padrões de Código

### Props Comuns
Todos os componentes de visualização seguem um padrão de props:

```javascript
{
  db,          // Instância do Firestore
  user,        // Objeto do usuário autenticado
  appId,       // ID da aplicação
  searchTerm   // Termo de busca (opcional)
}
```

### Estado Local
Cada componente gerencia seu próprio estado usando hooks do React:
- `useState` para dados locais
- `useEffect` para sincronização com Firebase

### Estilo
- Utiliza Tailwind CSS para estilização
- Segue o design system com cores azuri
- Componentes responsivos (mobile-first)

## 🚀 Benefícios da Modularização

1. **Manutenibilidade:** Cada componente em seu próprio arquivo
2. **Reusabilidade:** Fácil importação e reutilização
3. **Testabilidade:** Testes unitários mais simples
4. **Performance:** Code splitting automático
5. **Colaboração:** Múltiplos desenvolvedores podem trabalhar simultaneamente
6. **Organização:** Estrutura clara e intuitiva

## 📝 Notas de Desenvolvimento

- Todos os componentes são exportados como named exports
- Mantém compatibilidade retroativa via `ManagementViews.jsx`
- Cada arquivo é independente e auto-contido
- Imports são organizados por categoria (React, Firebase, UI, etc.)

## 🔄 Migração

A modularização foi feita mantendo 100% de compatibilidade com o código existente. Não é necessário alterar imports em outros arquivos, pois `ManagementViews.jsx` agora funciona como um proxy para os módulos individuais.
