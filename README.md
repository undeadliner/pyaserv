# PyaServ — clasificados de servicios para Paraguay

Dos lados, una misma tarifa: PyaServ conecta a quien **ofrece** un servicio con quien lo **necesita**.

- `/specialists` — listado de profesionales y oficios que ofrecen su trabajo.
- `/clients` — listado de pedidos: clientes que buscan a alguien con qué resolver algo concreto.

Sin comisiones por contacto. Sin pagos en plataforma. Solo encuentros.

## Status

MVP estático. Sirve para reservar la marca y mostrar el concepto mientras el backend se construye sobre [`pya-platform`](https://github.com/undeadliner/pya-platform) (auth, perfiles, mensajería, reseñas reusables del motor compartido con [`pyaeats-app`](https://github.com/undeadliner/pyaeats-app)).

## Local dev

```bash
nvm use            # node 22
bun install
bun run dev        # http://127.0.0.1:4321
bun run build      # output → dist/
```

## Deployment

GitHub Pages, vía `.github/workflows/deploy.yml`. Cada push a `main` reconstruye el sitio.

- **Mientras pyaserv.com no esté delegado**: el sitio responde en `https://undeadliner.github.io/pyaserv/`. El workflow exporta `BASE_PATH=/pyaserv/` para que las rutas internas funcionen bajo ese prefijo. El archivo `CNAME` queda en la raíz del repo y Astro lo ignora — no afecta nada.
- **Cuando pyaserv.com esté listo**, son tres cambios:
  1. Mové `CNAME` desde la raíz a `public/CNAME` para que Astro lo copie a `dist/`.
  2. Borrá el bloque `env: BASE_PATH=/pyaserv/` del workflow (las rutas vuelven a ser absolutas).
  3. En **Settings → Pages → Custom domain** pegá `pyaserv.com` y marcá "Enforce HTTPS".

### Configuración DNS para pyaserv.com (cuando lo compres)

En el registrador, agregá:

```
Tipo    Nombre    Valor
A       @         185.199.108.153
A       @         185.199.109.153
A       @         185.199.110.153
A       @         185.199.111.153
AAAA    @         2606:50c0:8000::153
AAAA    @         2606:50c0:8001::153
AAAA    @         2606:50c0:8002::153
AAAA    @         2606:50c0:8003::153
CNAME   www       undeadliner.github.io.
```

Propagación: 15 min — 24 h. Verificá con `dig pyaserv.com +short`.
