
# Lista de Verificación Final - TuSet

## 1. Google Cloud Platform (Paso a Producción) 🟢
*(Para que los tokens no expiren cada 7 días)*
- [ ] Entrar a [Google Cloud Console > OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent).
- [ ] Verificar que el **Publishing status** sea **"In production"** (En producción).
- [ ] Si dice "Testing", hacer clic en el botón **"PUBLISH APP"**.
- [ ] Revisar si hay advertencias de "Verification required" (si usas dominios sensibles o scopes restringidos).

## 2. Sistema de Referidos 🤝
*(Para confirmar que los créditos y enlaces funcionen)*
- [ ] **Usuario A (Referente)**:
    - [ ] Ir a Dashboard > Referidos.
    - [ ] Copiar enlace de referido.
- [ ] **Usuario B (Referido)**:
    - [ ] Abrir enlace de referido en ventana incógnito (nueva sesión).
    - [ ] Registrarse con el enlace.
- [ ] **Verificación**:
    - [ ] Verificar que Usuario B aparezca en la lista de "Mis Referidos" de Usuario A.
    - [ ] Confirmar si se asignó el crédito/comisión correspondiente (según la regla configurada: registro o pago).

## 3. Stripe - Pagos de Suscripción (Planes) 💳
*(Para asegurar que los usuarios puedan pagar la plataforma)*
- [ ] Usar tarjeta de prueba de Stripe (`4242 4242...`).
- [ ] Ir a la página de **Pricing** y elegir un plan (ej. Pro).
- [ ] Completar flujo de pago en Stripe Checkout.
- [ ] **Verificación**:
    - [ ] El usuario debe ser redirigido a la página de éxito.
    - [ ] El Dashboard debe mostrar el plan actualizado inmediatamente.
    - [ ] En Stripe Dashboard (modo Test), debe aparecer el pago exitoso.

## 4. Stripe Connect - Pagos de Clientes (Galerías) 💸
*(Para asegurar que los fotógrafos cobren a sus clientes)*
- [ ] **Fotógrafo**:
    - [ ] Conectar cuenta de Stripe (Onboarding) en modo test.
    - [ ] Verificar que aparezca "Conectado" en la configuración de la galería.
- [ ] **Cliente Final**:
    - [ ] Ir a una Galería pública con venta activada.
    - [ ] Comprar una foto/descarga usando tarjeta de prueba.
- [ ] **Verificación**:
    - [ ] El dinero debe dividirse correctamente (Comisión plataforma vs. Fotógrafo).
    - [ ] El cliente recibe su descarga.
    - [ ] El fotógrafo ve el saldo en su Stripe Express Dashboard.
