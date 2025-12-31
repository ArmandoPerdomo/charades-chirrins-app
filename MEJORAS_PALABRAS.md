# Mejoras Realizadas - Sistema de Palabras

## 📋 Resumen de Cambios

Se ha reestructurado el sistema de palabras del juego de charadas, separando las palabras en archivos JSON independientes para mejorar la mantenibilidad y escalabilidad del proyecto.

---

## 🗂️ Archivos Creados

### Carpeta `src/assets/words/`

Se crearon los siguientes archivos JSON:

1. **`animales.json`** - 195+ animales
2. **`profesiones.json`** - 100+ profesiones (corregido: removida palabra inapropiada)
3. **`actividades.json`** - 185+ actividades deportivas y recreativas
4. **`emociones.json`** - 100+ estados emocionales
5. **`partes-del-cuerpo.json`** - 105+ partes anatómicas
6. **`casa.json`** - 80+ objetos del hogar
7. **`ligadito.json`** - Configuración especial que combina todas las categorías

---

## 🔧 Archivos Modificados

### 1. [`src/app/words.service.ts`](src/app/words.service.ts)

**Cambios principales:**
- **Antes**: Palabras hardcodeadas en el servicio (~250 líneas de datos)
- **Ahora**: Carga dinámica desde archivos JSON usando `HttpClient`

**Nuevas características:**
```typescript
- Observable<string[]> getWords(category: string)
- Caché de palabras por categoría
- Manejo especial de "ligadito" que combina todas las categorías
- Uso de RxJS operators (switchMap, forkJoin, shareReplay)
```

### 2. [`src/app/app.config.ts`](src/app/app.config.ts)

**Agregado:**
```typescript
import { provideHttpClient } from '@angular/common/http';

providers: [
  provideRouter(routes),
  provideHttpClient()  // ← NUEVO
]
```

### 3. [`src/app/game/game.component.ts`](src/app/game/game.component.ts)

**Métodos modificados:**

#### `loadWords()`
```typescript
// ANTES
loadWords() {
  this.hasSelectedCategory = true;
  this.words = this.wordsService.getWords(this.selectedCategory);
  this.nextCouple();
}

// AHORA
loadWords() {
  this.hasSelectedCategory = true;
  this.wordsService.getWords(this.selectedCategory).subscribe(words => {
    this.words = words;
    this.nextCouple();
  });
}
```

#### `dropWord()`
```typescript
// ANTES
private dropWord() {
  if (this.words.length === 1) {
    this.words = this.wordsService.getWords(this.selectedCategory);
    return;
  }
  this.words.shift();
}

// AHORA
private dropWord() {
  if (this.words.length === 1) {
    this.wordsService.getWords(this.selectedCategory).subscribe(words => {
      this.words = words;
    });
    return;
  }
  this.words.shift();
}
```

---

## ✅ Ventajas de los Cambios

### **Mantenimiento**
- ✅ Editar palabras sin tocar código TypeScript
- ✅ Fácil agregar/eliminar categorías
- ✅ Menos conflictos en Git al editar palabras

### **Rendimiento**
- ✅ Carga lazy opcional (aunque actualmente se precarga todo)
- ✅ Caché de palabras para evitar peticiones duplicadas
- ✅ Bundle inicial más pequeño

### **Escalabilidad**
- ✅ Fácil agregar nuevas categorías (solo crear archivo JSON)
- ✅ Posibilidad de internacionalización futura
- ✅ Permite contribuciones sin conocer Angular

### **Flexibilidad**
- ✅ Palabras pueden cargarse desde backend en el futuro
- ✅ Formato JSON permite agregar metadatos (dificultad, tags, etc.)
- ✅ Categoría "ligadito" se construye dinámicamente

---

## 🚀 Cómo Usar

### Agregar Nueva Categoría

1. Crear archivo `src/assets/words/mi-categoria.json`:
```json
[
  "Palabra 1",
  "Palabra 2",
  "Palabra 3"
]
```

2. Agregar al array de categorías en `words.service.ts`:
```typescript
private categories: string[] = [
  'animales',
  'profesiones',
  // ...
  'mi-categoria'  // ← NUEVO
];
```

3. Opcionalmente, incluir en "ligadito" editando `ligadito.json`:
```json
{
  "type": "combined",
  "categories": [
    "animales",
    "profesiones",
    // ...
    "mi-categoria"  // ← NUEVO
  ]
}
```

### Editar Palabras Existentes

Simplemente edita el archivo JSON correspondiente en `src/assets/words/`.

---

## 🧪 Testing

Para probar los cambios:

```bash
# Si las dependencias no están instaladas
npm install

# Iniciar servidor de desarrollo
npm start

# Navegar a http://localhost:4200
```

**Nota**: Si encuentras problemas con `node-sass`, puedes ignorarlos ya que el proyecto usa Sass nativo de Angular.

---

## 📝 Próximas Mejoras Sugeridas

1. **Estructura de datos mejorada**:
```typescript
interface Word {
  text: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}
```

2. **Panel de administración** para gestionar palabras desde la UI

3. **Backend** para gestión centralizada (Firebase, Supabase)

4. **Más categorías**: películas, países, marcas, tecnología, etc.

5. **Normalización de datos**: capitalización consistente, sin duplicados

---

## 🔍 Cambios en Detalle

### Formato del archivo ligadito.json

En lugar de duplicar todas las palabras, usa una configuración que indica qué categorías combinar:

```json
{
  "type": "combined",
  "categories": [
    "animales",
    "profesiones",
    "actividades",
    "emociones",
    "partes-del-cuerpo",
    "casa"
  ]
}
```

El servicio detecta este formato y carga todas las categorías dinámicamente usando `forkJoin`.

### Caché de Palabras

```typescript
private wordsCache: Map<string, Observable<string[]>> = new Map();
```

Evita cargar el mismo archivo JSON múltiples veces. La primera vez se carga desde el servidor, las siguientes desde caché.

---

## ⚠️ Consideraciones

- Las palabras se barajan cada vez que se llaman con `shuffle()`
- El Observable usa `shareReplay(1)` para multicast
- La categoría "ligadito" carga todas las palabras de una vez (puede ser pesado con muchas categorías)
- Los archivos JSON deben estar en `src/assets/words/` para ser incluidos en el build

---

**Fecha**: 31 de diciembre de 2024  
**Cambios por**: Kilo Code  
**Versión Angular**: 17.0.8
