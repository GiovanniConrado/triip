# 🎨 Triip Design System

## Cores

### Paleta Principal
```
terracotta-50:  #fdf4f2  (Backgrounds sutis)
terracotta-100: #fbe7e2  (Borders, dividers)
terracotta-200: #f8d2c9  (Borders hover)
terracotta-300: #f1b1a3  (Accents leves)
terracotta-400: #e68571  (Elementos secundários)
terracotta-500: #d95f47  (Cor primária - botões, CTAs)
terracotta-600: #c44b36  (Hover states)
terracotta-700: #a43c2a  (Pressed states)
```

### Cores de Apoio
```
warm-cream:   #faf7f2  (Background principal do app)
sunset-dark:  #4a3733  (Textos principais)
sunset-muted: #8c7a76  (Textos secundários)
```

### Cores Semânticas
```
Sucesso:  emerald-500  (#10b981)
Erro:     red-500      (#ef4444)
Warning:  amber-500    (#f59e0b)
Info:     blue-500     (#3b82f6)
```

---

## Tipografia

### Fontes
- **Sans-serif**: Plus Jakarta Sans (corpo, UI)
- **Serif**: Playfair Display (títulos decorativos - quando necessário)

### Tamanhos
```
text-[8px]   - Micro labels
text-[9px]   - Tags compactas
text-[10px]  - Labels, badges, timestamps
text-xs      - Textos auxiliares (12px)
text-sm      - Corpo secundário (14px)
text-base    - Corpo padrão (16px)
text-lg      - Subtítulos (18px)
text-xl      - Títulos de seção (20px)
text-2xl     - Títulos de página (24px)
text-3xl     - Títulos hero (30px)
```

### Pesos
```
font-medium - Textos de corpo
font-bold   - Botões, labels
font-black  - Títulos grandes, destaques
```

---

## Espaçamentos

### Padding/Margin Scale
```css
--space-1:  0.25rem  (4px)
--space-2:  0.5rem   (8px)
--space-3:  0.75rem  (12px)
--space-4:  1rem     (16px)
--space-5:  1.25rem  (20px)
--space-6:  1.5rem   (24px)
--space-8:  2rem     (32px)
--space-10: 2.5rem   (40px)
--space-12: 3rem     (48px)
--space-16: 4rem     (64px)
```

### Padrões de Layout
- **Padding horizontal de páginas**: `px-6` (24px)
- **Padding top de headers**: `pt-14` (56px)
- **Padding bottom com BottomNav**: `pb-32` (128px)
- **Gap entre cards**: `gap-4` ou `gap-6`

---

## Border Radius

### Escala Oficial
```
rounded-lg:     12px  - Inputs pequenos
rounded-xl:     16px  - Botões, chips
rounded-2xl:    24px  - Cards médios, inputs
rounded-3xl:    32px  - Cards grandes
rounded-[32px]: 32px  - Cards de conteúdo (alias)
rounded-[40px]: 40px  - Hero cards, containers principais
rounded-full:   9999px - Avatares, badges circulares
```

---

## Sombras

```css
--shadow-sm:  0 2px 8px rgba(74, 55, 51, 0.08)   - Cards sutis
--shadow-md:  0 4px 16px rgba(74, 55, 51, 0.12)  - Cards elevados
--shadow-lg:  0 12px 30px rgba(74, 55, 51, 0.15) - Modals, dropdowns
--shadow-xl:  0 20px 40px rgba(74, 55, 51, 0.20) - Overlays
```

### Sombras de Botões
```
shadow-terracotta-500/30 - Botões primários
shadow-red-500/30        - Botões de perigo
shadow-emerald-500/30    - Botões de sucesso
```

---

## Componentes

### Botões

**Primary** (Ação principal)
```tsx
className="h-12 px-6 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg shadow-terracotta-500/30 active:scale-[0.98] transition-all"
```

**Secondary** (Ação secundária)
```tsx
className="h-12 px-6 bg-white border-2 border-terracotta-100 text-sunset-dark font-bold rounded-2xl active:scale-[0.98] transition-all"
```

**Danger** (Ação destrutiva)
```tsx
className="h-12 px-6 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 active:scale-[0.98] transition-all"
```

**Ghost** (Ação terciária)
```tsx
className="h-12 px-6 bg-transparent text-terracotta-500 font-bold rounded-2xl active:scale-[0.98] transition-all"
```

### Inputs

```tsx
className="w-full h-14 px-5 bg-white border border-terracotta-100 rounded-2xl text-sunset-dark placeholder:text-sunset-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
```

### Cards

**Card Padrão**
```tsx
className="bg-white rounded-[32px] p-6 border border-terracotta-100 shadow-sm"
```

**Card de Destaque**
```tsx
className="bg-white rounded-[40px] overflow-hidden border border-terracotta-50/50 shadow-lg"
```

### Modais

**Bottom Sheet**
```tsx
className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto"
// Overlay
className="absolute inset-0 bg-black/50 backdrop-blur-sm"
// Content
className="relative w-full bg-white rounded-t-[32px] shadow-2xl max-h-[85vh] overflow-hidden animate-slide-up"
```

**Center Modal**
```tsx
className="fixed inset-0 z-[200] flex items-center justify-center p-6"
// Content
className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-scale-in"
```

---

## Animações

### Classes Disponíveis
```css
animate-fade-in    - Fade in com leve movimento para cima
animate-slide-down - Slide de cima para baixo (toasts)
animate-slide-up   - Slide de baixo para cima (bottom sheets)
animate-scale-in   - Scale de 95% para 100% (modais)
animate-spin       - Rotação infinita (loading)
```

### Transições Padrão
```
transition-all      - Transição geral
transition-colors   - Apenas cores
transition-transform - Apenas transform
```

---

## Ícones

### Biblioteca
Material Symbols Outlined (Google Fonts)

### Uso
```tsx
// Ícone padrão (outline)
<span className="material-symbols-outlined">icon_name</span>

// Ícone preenchido
<span className="material-symbols-outlined fill">icon_name</span>
```

### Tamanhos
```
text-sm   - 14px (ícones inline com texto pequeno)
text-base - 16px (ícones padrão com texto)
text-lg   - 18px (ícones em botões)
text-xl   - 20px (ícones em cards)
text-2xl  - 24px (ícones de destaque)
text-3xl  - 30px (ícones hero)
text-4xl  - 36px (ícones empty states)
text-5xl  - 48px (ícones de ilustração)
```

---

## Responsividade

### Container Principal
```tsx
className="min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream"
```

O app é otimizado para mobile-first com largura máxima de 480px, centralizado em telas maiores.

---

## Z-Index Scale

```
z-10  - Elementos elevados na página
z-30  - Headers sticky
z-40  - BottomNav
z-50  - Modais padrão
z-60  - Sidebar overlay
z-70  - Sidebar content
z-[80] - Modais de confirmação secundários
z-[90] - QuickActions backdrop
z-[100] - QuickActions menu, Toasts
z-[200] - Modais críticos (ConfirmModal)
```

---

## Padrões de Página

### Estrutura Base
```tsx
<div className="relative min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream pb-32">
    <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    
    <header className="sticky top-0 z-30 bg-warm-cream/95 backdrop-blur-md px-6 pt-14 pb-4">
        {/* Header content */}
    </header>
    
    <main className="flex-1 px-6 space-y-6">
        {/* Page content */}
    </main>
    
    <BottomNav />
</div>
```

---

## Changelog

### v1.0.0 (Janeiro 2026)
- Design system inicial
- Paleta terracotta definida
- Componentes base criados
- Documentação inicial
