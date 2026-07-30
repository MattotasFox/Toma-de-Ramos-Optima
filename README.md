# Creador de Toma de Ramos

Necesito que crees una aplicación web en React que resuelva el problema de armar un horario 

universitario óptimo a partir de asignaturas, secciones y horarios disponibles.

## CONTEXTO DEL PROBLEMA

La universidad organiza las clases en bloques de 45 minutos, y cada "sesión" de una asignatura 

puede ocupar uno o más bloques consecutivos (sin cortes entre ellos, solo con 10 minutos de 

receso entre sesiones distintas). Por ejemplo:

- Un bloque simple: "Miércoles 9:40-10:25 / 10:25-11:10" = una clase de 9:40 a 11:10 (1h30, 

  aunque se muestre como 2 sub-bloques de 45 min)

- Un bloque doble: "Lunes 8:00-8:45 / 8:45-9:30 / 9:40-10:25 / 10:25-11:10" = una clase corrida 

  de 8:00 a 11:10 (con un receso interno de 10 min entre 9:30-9:40, pero es LA MISMA clase, 

  no se puede partir)

Una misma asignatura puede tener varias secciones, cada una con día(s) y horario(s) distintos 

(a veces una sección tiene clases en más de un día). El usuario debe tomar TODAS las asignaturas 

que ingrese (son obligatorias), eligiendo UNA sección por asignatura, de forma que no se crucen 

horarios entre sí.

## FUNCIONALIDAD REQUERIDA

### 1. Ingreso de datos (formulario)

- Permitir agregar múltiples asignaturas (nombre + código opcional)

- Por cada asignatura, agregar múltiples secciones

- Por cada sección, agregar uno o más bloques horarios: día de la semana + hora de inicio + 

  hora de término (o bien permitir ingresar los sub-bloques de 45 min consecutivos y que la 

  app los fusione automáticamente si son contiguos el mismo día)

- Días válidos: Lunes a Viernes (excluir sábado y domingo)

- Opción de importar/pegar datos en formato texto o tabla para carga rápida

### 2. Configuración de reglas/preferencias (deben ser ajustables por el usuario, con estos 

valores por defecto)

- Hora mínima de inicio de clases: 09:30 (configurable)

- Hora máxima de término de clases: 16:20 (configurable)

- Ventana de almuerzo: debe existir un bloque libre de 1h30 ubicado completamente dentro del 

  rango 12:00-14:40 (configurable), en cada día que el usuario tenga clases

- Preferencia opcional: minimizar la cantidad de días de asistencia (dejar días completos libres 

  si es posible)

- Todas estas reglas son "deseables" pero NO bloqueantes: si no existe ninguna combinación que 

  las cumpla todas, la app debe generar igual la mejor combinación posible y señalar 

  explícitamente qué reglas no se pudieron cumplir y por qué (ej: "Lunes inicia a las 8:00 

  porque ambas secciones de Metodología tienen ese horario fijo")

### 3. Motor de optimización

- Generar todas las combinaciones posibles (una sección por asignatura) que no tengan cruces 

  de horario entre sí

- Puntuar cada combinación según cuántas reglas cumple (hora mínima, hora máxima, almuerzo por 

  día, minimizar días si aplica)

- Mostrar la mejor combinación (o top 3 mejores) ordenadas por puntaje, indicando claramente 

  qué reglas cumple y cuáles no cada una

- Si dos combinaciones tienen el mismo puntaje, priorizar la que tenga menos "huecos" muertos 

  entre clases en un mismo día

### 4. Visualización del resultado

- Mostrar el horario resultante como una tabla semanal (Lunes a Viernes en columnas, bloques 

  horarios en filas), similar a un horario académico tradicional

- Resaltar visualmente (color distinto) los bloques que violan alguna regla, con un tooltip o 

  nota explicando por qué

- Mostrar debajo un resumen: sección elegida por cada asignatura, profesor si aplica, y lista 

  de excepciones/advertencias

- Permitir exportar o guardar el horario generado con un nombre (para comparar varias versiones, 

  ej: "Opción 1", "Opción 2")

- Permitir guardar varias versiones y compararlas lado a lado

## REQUISITOS TÉCNICOS

- React con componentes funcionales y hooks (useState, useEffect)

- No usar localStorage ni sessionStorage (usar estado en memoria/React state)

- Diseño limpio, responsive, tipo dashboard universitario

- Manejo de errores: si el usuario ingresa horarios mal formados o hay una asignatura sin 

  ninguna sección viable, mostrar un mensaje claro

Empieza generando la estructura de componentes y el motor de optimización de horarios primero, 

luego la interfaz de ingreso de datos y finalmente la visualización.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/88177889-0a71-4410-baf3-a137b5a1ee03).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
