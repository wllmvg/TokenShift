# TokenShift

TokenShift es una aplicación web desarrollada en React y Supabase para gestionar el uso compartido de Claude entre varios usuarios mediante turnos dinámicos.

La aplicación permite evitar que varias personas usen la misma cuenta al mismo tiempo, controlando quién tiene el turno activo, cuánto tiempo queda disponible y quién apartó el siguiente turno.

## Descripción del problema

Cuando varias personas comparten una misma cuenta de Claude, puede ocurrir que dos o más usuarios la utilicen al mismo tiempo, consumiendo rápidamente los tokens disponibles.

Además, como los tokens se reinician cada cierto tiempo, se necesita una forma organizada de distribuir el uso entre los usuarios, evitando conflictos y permitiendo que cada persona sepa cuándo puede usar Claude.

## Objetivo

Crear una aplicación web que permita administrar turnos de uso de Claude, mostrando en tiempo real:

- Quién está usando Claude actualmente.
- Cuánto tiempo queda del turno activo.
- Si el turno fue liberado y puede ser tomado por otra persona.
- Quién tiene reservado el siguiente turno.
- Un historial público de actividad.

## Funcionalidades principales

- Registro e inicio de sesión de usuarios.
- Configuración inicial de nombre y color identificador.
- Inicio de turno de 4 horas.
- Bloqueo de Claude mientras un usuario tiene el turno activo.
- Liberación del uso sin reiniciar el contador.
- Posibilidad de tomar el tiempo restante de un turno liberado.
- Reserva del siguiente turno.
- Cancelación de la reserva del siguiente turno.
- Vencimiento automático de una reserva si el usuario no inicia en 20 minutos.
- Historial público de movimientos.
- Identificación visual de usuarios mediante colores personalizados.
- Actualización de estado en tiempo real usando Supabase.

## Tecnologías utilizadas

- React
- Vite
- Supabase Auth
- Supabase Database
- Supabase Realtime
- CSS personalizado

## Reglas de negocio

- Un usuario puede iniciar un turno si Claude está disponible.
- Cada turno tiene una duración fija de 4 horas.
- Una vez iniciado un turno, la cuenta regresiva no se puede deshacer ni reiniciar.
- El usuario que inició el turno puede liberar el uso, pero el tiempo sigue corriendo.
- Si un turno es liberado, otro usuario puede tomar el tiempo restante.
- El usuario que toma un turno liberado puede apartar el siguiente turno.
- El siguiente turno siempre inicia cuando termina el turno actual.
- Si una persona aparta el siguiente turno, tiene 20 minutos para iniciarlo cuando esté disponible.
- Si no lo inicia dentro de esos 20 minutos, la reserva se libera.
- El historial de actividad es visible para todos los usuarios.

## Instalación del proyecto

Clonar el repositorio:

```bash
git clone https://github.com/TU_USUARIO/token-shift.git
cd token-shift
```

Instalar dependencias:

```bash
npm install
```

Crear un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=TU_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
```

Ejecutar el proyecto en local:

```bash
npm run dev
```

## Variables de entorno

El proyecto requiere las siguientes variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Estas variables se obtienen desde el panel de Supabase en:

```txt
Project Settings > API
```

## Estructura general

```txt
src/
├── lib/
│   └── supabaseClient.js
├── App.jsx
├── App.css
└── main.jsx
```

## Base de datos

El proyecto utiliza Supabase como backend. Las principales tablas son:

- `profiles`: almacena el nombre, color e información básica del usuario.
- `turns`: almacena los turnos activos y finalizados.
- `turn_reservations`: almacena las reservas del siguiente turno.
- `turn_events`: almacena el historial público de actividad.

## Flujo de uso

1. El usuario se registra o inicia sesión.
2. En el primer ingreso, completa su nombre y elige un color.
3. Si Claude está disponible, puede iniciar un turno.
4. Si Claude está en uso, puede apartar el siguiente turno.
5. Si el turno actual fue liberado, puede tomar el tiempo restante.
6. Todos los movimientos quedan registrados en el historial público.

## Scripts disponibles

Ejecutar en desarrollo:

```bash
npm run dev
```

Construir para producción:

```bash
npm run build
```

Previsualizar build:

```bash
npm run preview
```

## Despliegue

El proyecto puede desplegarse en plataformas de hosting estático como GitHub Pages, Vercel o Netlify.

Para producción, es importante configurar correctamente las variables de entorno y las URLs permitidas en Supabase Auth.

## Estado del proyecto

Proyecto funcional en versión MVP.

Incluye autenticación, turnos dinámicos, reservas, cancelación de reservas, historial público y actualización en tiempo real.

## Autor

Desarrollado como proyecto web para organizar el uso compartido de Claude entre varios usuarios.
