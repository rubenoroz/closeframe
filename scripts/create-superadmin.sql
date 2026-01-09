-- =================================================
-- Script para crear el primer Super Administrador
-- Compatible con SQLite y PostgreSQL (Supabase)
-- =================================================

-- INSTRUCCIONES:
-- 1. Primero, inicia sesión en la aplicación con tu cuenta de Google
-- 2. Copia tu email registrado
-- 3. Reemplaza 'tu-email@ejemplo.com' con tu email real
-- 4. Ejecuta este script en tu base de datos

-- Para SQLite (desarrollo local):
--   Ejecutar: sqlite3 prisma/dev.db < scripts/create-superadmin.sql

-- Para Supabase (producción):
--   Ir a: SQL Editor → New Query → Pegar y ejecutar

-- =================================================
-- EJECUTA ESTO (reemplaza el email):
-- =================================================

UPDATE "User" 
SET role = 'SUPERADMIN', 
    "updatedAt" = CURRENT_TIMESTAMP
WHERE email = 'tu-email@ejemplo.com';

-- =================================================
-- Verificar el cambio:
-- =================================================

SELECT id, name, email, role, "createdAt" 
FROM "User" 
WHERE role = 'SUPERADMIN';

-- =================================================
-- NOTA: Después de ejecutar este script:
-- 1. Cierra sesión en la aplicación
-- 2. Vuelve a iniciar sesión
-- 3. Ahora tendrás acceso a /superadmin
-- =================================================
