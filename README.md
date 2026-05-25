# MiniDEX

Un mini exchange descentralizado (DEX) diseñado para intercambiar dos tokens ERC-20 (**Token A** y **Token B**) usando una tasa de cambio fija con cobro de comisión de proveedor de liquidez (LP fee) y un frontend.

<img src="fotito2.png" width="250"/>
<img src="fotito.png" width="250"/>


---

## Qué es el proyecto
**MiniDEX** es una plataforma de intercambio descentralizada simplificada. Permite a los usuarios realizar swaps automáticos e instantáneos de tokens ERC-20 directamente desde su billetera Web3 (como MetaMask) sin depender de intermediarios ni de libros de órdenes centralizados.

---

## Problema que resuelve
Los intercambios tradicionales y las casas de cambio centralizadas actúan como custodios de tus fondos, cobran comisiones elevadas, requieren procesos de registro (KYC) y son vulnerables a hackeos y censura. 
**MiniDEX** resuelve esto al:
- **Mantener la custodia del usuario**: Las transacciones ocurren directamente de billetera a billetera mediante contratos inteligentes.
- **Eliminar intermediarios**: Las reglas de intercambio y las tasas se auto-ejecutan en la blockchain.
- **Garantizar transparencia**: El código del contrato y el balance de la liquidez son auditables públicamente en tiempo real.

---

## Cómo funciona
1. **Tokens ERC-20 personalizados**: El proyecto implementa dos tokens: **Token A (TKNA)** y **Token B (TKNB)**. Ambos tokens incluyen una función pública de grifo (Faucet) para facilitar las pruebas locales.
2. **Contrato de Intercambio (Exchange)**:
   - Administra la liquidez de ambos tokens.
   - Aplica una **tasa de conversión fija** (1 Token A = 2 Token B).
   - Simula un Uniswap básico cobrando un **0.3% de comisión (Fee)** sobre el token de entrada.
   - Emite un evento `Swap` para cada transacción exitosa.
3. **Mecánica del Swap**:
   - **Token A por Token B**: Si envías `100 TKNA`, se deduce la comisión del 0.3% (`0.3 TKNA`). El remanente (`99.7 TKNA`) se multiplica por 2, entregándote exactamente `199.4 TKNB`.
   - **Token B por Token A**: Si envías `200 TKNB`, se deduce la comisión del 0.3% (`0.6 TKNB`). El remanente (`199.4 TKNB`) se divide entre 2, entregándote exactamente `99.7 TKNA`.

---

## Cómo correrlo

Sigue estos pasos para compilar, testear y correr la aplicación localmente.

### 1. Clonar el repositorio e instalar dependencias:
```bash
npm install
```

### 2. Compilar los contratos inteligentes de Solidity:
```bash
npx hardhat compile
```

### 3. Ejecutar la suite de pruebas unitarias:
```bash
npx hardhat test
```
*Las pruebas comprueban el funcionamiento del swap, la correcta deducción de comisiones, los cambios en los balances del usuario/contrato y el rechazo de transacciones inválidas.*

### 4. Iniciar un nodo de desarrollo local:
```bash
npx hardhat node
```
*Este comando iniciará una blockchain local de prueba en `http://127.0.0.1:8545` con 20 cuentas pre-fondeadas con 10000 ETH cada una.*

### 5. Desplegar los contratos en la red local:
En otra pestaña de la terminal, ejecuta:
```bash
npx hardhat run scripts/deploy.js --network localhost
```
*Este script desplegará `TokenA`, `TokenB` y `Exchange`, transferirá 500,000 tokens de cada tipo al Exchange como liquidez inicial, y autogenerará el archivo `frontend/config.js` con las direcciones de los contratos.*

---

## Frontend Web3
El proyecto incluye una interfaz de usuario minimalista y futurista con diseño **Glassmorphism** y soporte para MetaMask.

Para abrir la interfaz:
1. Abre el archivo `frontend/index.html` directamente en tu navegador
2. Conecta tu billetera **MetaMask** a la red local de Hardhat:
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Símbolo**: `ETH`
3. Importa una de las llaves privadas provistas por `npx hardhat node` en MetaMask para tener ETH local.
4. Utiliza el **Token Faucet** en la interfaz para reclamar tus primeros `100 TKNA` o `100 TKNB`.
5. ¡Aprueba y realiza tus swaps!

---

## Stack Tecnológico
- **Solidity (v0.8.20)**: Lenguaje para escribir los Smart Contracts.
- **Hardhat**: Entorno de desarrollo profesional para compilar, probar y desplegar contratos.
- **OpenZeppelin Contracts**: Estándar de la industria para implementaciones seguras de ERC-20 y control de acceso.
- **Ethers.js (v6)**: Librería para interactuar con la blockchain de Ethereum desde Javascript.
- **HTML5, Vanilla CSS3 & Vanilla JavaScript**: Para la interfaz Web3 responsiva con efectos de glassmorphic y notificaciones Toast en tiempo real.
