// State variables
let provider;
let signer;
let userAddress;
let tokenAContract;
let tokenBContract;
let exchangeContract;
let isAForB = true; // true: TKNA -> TKNB, false: TKNB -> TKNA

// Elements
const connectBtn = document.getElementById("connectBtn");
const networkBadge = document.getElementById("networkBadge");
const networkName = document.getElementById("networkName");
const actionBtn = document.getElementById("actionBtn");

const fromBalanceEl = document.getElementById("fromBalance");
const toBalanceEl = document.getElementById("toBalance");
const fromAmountInput = document.getElementById("fromAmount");
const toAmountInput = document.getElementById("toAmount");
const fromTokenNameEl = document.getElementById("fromTokenName");
const toTokenNameEl = document.getElementById("toTokenName");
const fromTokenLogoEl = document.getElementById("fromTokenLogo");
const toTokenLogoEl = document.getElementById("toTokenLogo");

const toggleDirectionBtn = document.getElementById("toggleDirectionBtn");
const exchangeRateText = document.getElementById("exchangeRateText");
const feeText = document.getElementById("feeText");

const dexBalanceAEl = document.getElementById("dexBalanceA");
const dexBalanceBEl = document.getElementById("dexBalanceB");
const allowanceAEl = document.getElementById("allowanceA");
const allowanceBEl = document.getElementById("allowanceB");

const faucetABtn = document.getElementById("faucetABtn");
const faucetBBtn = document.getElementById("faucetBBtn");
const toastContainer = document.getElementById("toastContainer");

// Toast Notification Helper
function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconClass = "fa-circle-info";
    if (type === "success") iconClass = "fa-circle-check";
    if (type === "error") iconClass = "fa-circle-xmark";
    
    toast.innerHTML = `
        <span class="toast-icon"><i class="fa-solid ${iconClass}"></i></span>
        <div class="toast-content">${message}</div>
        <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Bind close button
    toast.querySelector(".toast-close").addEventListener("click", () => {
        toast.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 5000);
}

// Initial Configuration Check
window.addEventListener("load", async () => {
    // Check if configuration script loaded successfully
    if (typeof CONTRACT_ADDRESSES === "undefined") {
        showToast("Error: Deploy configuration (config.js) not found. Run 'npm run deploy' first!", "error");
        actionBtn.innerText = "Deploy Contracts First";
        return;
    }
    
    initMetaMask();
});

// Helper to get MetaMask specifically, even if other extensions (like OKX, Phantom, Coinbase Wallet) are installed in Chrome.
function getMetaMaskProvider() {
    if (typeof window.ethereum === "undefined") return undefined;
    
    // If multiple providers are injected, search for MetaMask specifically
    if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
        const metamask = window.ethereum.providers.find(p => p.isMetaMask);
        if (metamask) return metamask;
    }
    
    // Otherwise return default ethereum object
    return window.ethereum;
}

// Initialize Metamask listeners
async function initMetaMask() {
    const rawProvider = getMetaMaskProvider();
    if (typeof rawProvider !== "undefined") {
        provider = new ethers.BrowserProvider(rawProvider);
        
        // Listen for accounts change
        rawProvider.on("accountsChanged", (accounts) => {
            if (accounts.length > 0) {
                handleAccountConnected();
            } else {
                handleDisconnect();
            }
        });

        // Listen for chain change
        rawProvider.on("chainChanged", () => {
            window.location.reload();
        });
        
        // Auto connect if already authorized
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
            handleAccountConnected();
        }
    } else {
        showToast("MetaMask is not installed. Please install it to use this DEX.", "info");
    }
}

// Connect Wallet handler
connectBtn.addEventListener("click", async () => {
    const rawProvider = getMetaMaskProvider();
    if (typeof rawProvider === "undefined") {
        showToast("MetaMask not detected!", "error");
        return;
    }
    try {
        connectBtn.innerHTML = '<i class="fa-solid fa-spinner spinner"></i> Connecting...';
        await provider.send("eth_requestAccounts", []);
        await handleAccountConnected();
        showToast("Wallet connected successfully!", "success");
    } catch (err) {
        console.error(err);
        showToast("Connection rejected or failed.", "error");
        connectBtn.innerHTML = '<i class="fa-solid fa-wallet"></i> Connect Wallet';
    }
});

// Perform account setup
async function handleAccountConnected() {
    const rawProvider = getMetaMaskProvider();
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    
    // Check and switch network programmatically
    let network = await provider.getNetwork();
    if (network.chainId !== 31337n && network.chainId !== 31337) {
        try {
            showToast("Switching MetaMask to Hardhat Local network...", "info");
            await rawProvider.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: "0x7a69" }] // 31337 in hex
            });
            // Re-instantiate provider and signer after switch
            provider = new ethers.BrowserProvider(rawProvider);
            signer = await provider.getSigner();
            network = await provider.getNetwork();
        } catch (switchError) {
            // Error code 4902 indicates the chain has not been added to MetaMask.
            if (switchError.code === 4902) {
                try {
                    showToast("Adding Hardhat Local network to MetaMask...", "info");
                    await rawProvider.request({
                        method: "wallet_addEthereumChain",
                        params: [{
                            chainId: "0x7a69",
                            chainName: "Hardhat Localhost",
                            rpcUrls: ["http://127.0.0.1:8545"],
                            nativeCurrency: {
                                name: "ETH",
                                symbol: "ETH",
                                decimals: 18
                            }
                        }]
                    });
                    provider = new ethers.BrowserProvider(rawProvider);
                    signer = await provider.getSigner();
                    network = await provider.getNetwork();
                } catch (addError) {
                    console.error("Failed to add network:", addError);
                    showToast("Could not add Hardhat Local network automatically.", "error");
                }
            } else {
                console.error("Failed to switch network:", switchError);
                showToast("Could not switch to Hardhat Local network automatically.", "error");
            }
        }
    }
    
    // Format button text
    const truncatedAddress = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
    connectBtn.innerHTML = `<i class="fa-solid fa-wallet"></i> ${truncatedAddress}`;
    connectBtn.classList.remove("btn-primary");
    connectBtn.classList.add("btn-outline");
    
    // Show network badge
    networkName.innerText = network.name === "unknown" ? "Hardhat Localhost" : network.name;
    networkBadge.style.display = "flex";
    
    if (network.chainId !== 31337n && network.chainId !== 31337) {
        showToast("Caution: You are not on Hardhat network (Chain ID: 31337). Check configuration.", "warning");
    }

    // Initialize contracts
    tokenAContract = new ethers.Contract(CONTRACT_ADDRESSES.tokenA, TOKEN_ABI, signer);
    tokenBContract = new ethers.Contract(CONTRACT_ADDRESSES.tokenB, TOKEN_ABI, signer);
    exchangeContract = new ethers.Contract(CONTRACT_ADDRESSES.exchange, EXCHANGE_ABI, signer);
    
    // Enable faucet buttons
    faucetABtn.disabled = false;
    faucetBBtn.disabled = false;
    
    // Load balances
    await refreshState();
}

function handleDisconnect() {
    userAddress = null;
    signer = null;
    connectBtn.innerHTML = '<i class="fa-solid fa-wallet"></i> Connect Wallet';
    connectBtn.classList.remove("btn-outline");
    connectBtn.classList.add("btn-primary");
    networkBadge.style.display = "none";
    
    actionBtn.disabled = true;
    actionBtn.innerText = "Connect Wallet";
    
    faucetABtn.disabled = true;
    faucetBBtn.disabled = true;
    
    // Clear values
    fromBalanceEl.innerText = "0.00";
    toBalanceEl.innerText = "0.00";
    dexBalanceAEl.innerText = "0.00";
    dexBalanceBEl.innerText = "0.00";
    allowanceAEl.innerText = "0.00";
    allowanceBEl.innerText = "0.00";
}

// Refresh state variables and update UI
async function refreshState() {
    if (!userAddress) return;
    
    try {
        // User balances
        const balA = await tokenAContract.balanceOf(userAddress);
        const balB = await tokenBContract.balanceOf(userAddress);
        
        // Exchange balances
        const dexA = await tokenAContract.balanceOf(CONTRACT_ADDRESSES.exchange);
        const dexB = await tokenBContract.balanceOf(CONTRACT_ADDRESSES.exchange);
        
        // User allowances
        const allowanceA = await tokenAContract.allowance(userAddress, CONTRACT_ADDRESSES.exchange);
        const allowanceB = await tokenBContract.allowance(userAddress, CONTRACT_ADDRESSES.exchange);
        
        // Update user balances in inputs
        if (isAForB) {
            fromBalanceEl.innerText = Number(ethers.formatUnits(balA, 18)).toFixed(4);
            toBalanceEl.innerText = Number(ethers.formatUnits(balB, 18)).toFixed(4);
        } else {
            fromBalanceEl.innerText = Number(ethers.formatUnits(balB, 18)).toFixed(4);
            toBalanceEl.innerText = Number(ethers.formatUnits(balA, 18)).toFixed(4);
        }
        
        // Update dashboard details
        dexBalanceAEl.innerText = Number(ethers.formatUnits(dexA, 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        dexBalanceBEl.innerText = Number(ethers.formatUnits(dexB, 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        allowanceAEl.innerText = Number(ethers.formatUnits(allowanceA, 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        allowanceBEl.innerText = Number(ethers.formatUnits(allowanceB, 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        // Recalculate output amounts and button status based on current inputs
        updateSwapCalculation(balA, balB, allowanceA, allowanceB, dexA, dexB);
        
    } catch (err) {
        console.error("Error refreshing state:", err);
        showToast("Error updating balances from chain.", "error");
    }
}

// Perform calculations when inputs change
async function updateSwapCalculation(balA, balB, allowanceA, allowanceB, dexA, dexB) {
    const fromValString = fromAmountInput.value;
    
    if (!fromValString || isNaN(fromValString) || parseFloat(fromValString) <= 0) {
        toAmountInput.value = "";
        feeText.innerText = `0.00 ${isAForB ? 'TKNA' : 'TKNB'}`;
        
        if (userAddress) {
            actionBtn.disabled = true;
            actionBtn.innerText = "Enter an amount";
        }
        return;
    }
    
    try {
        const amountIn = ethers.parseUnits(fromValString, 18);
        
        // Call contract's getAmountOut view function
        const [amountOut, fee] = await exchangeContract.getAmountOut(amountIn, isAForB);
        
        toAmountInput.value = Number(ethers.formatUnits(amountOut, 18)).toFixed(6);
        feeText.innerText = `${Number(ethers.formatUnits(fee, 18)).toFixed(6)} ${isAForB ? 'TKNA' : 'TKNB'}`;
        
        // Determine button state
        actionBtn.disabled = false;
        
        const activeBalance = isAForB ? balA : balB;
        const activeAllowance = isAForB ? allowanceA : allowanceB;
        const activeDexLiquidity = isAForB ? dexB : dexA;
        const activeTokenName = isAForB ? "TKNA" : "TKNB";
        
        if (activeBalance < amountIn) {
            actionBtn.disabled = true;
            actionBtn.innerText = "Insufficient Balance";
        } else if (activeDexLiquidity < amountOut) {
            actionBtn.disabled = true;
            actionBtn.innerText = "Insufficient Liquidity in DEX";
        } else if (activeAllowance < amountIn) {
            actionBtn.innerText = `Approve ${activeTokenName}`;
        } else {
            actionBtn.innerText = "Swap";
        }
    } catch (err) {
        console.error("Error calculating swap output:", err);
        toAmountInput.value = "Error";
        actionBtn.disabled = true;
        actionBtn.innerText = "Calculation Error";
    }
}

// Event Listeners for inputs
fromAmountInput.addEventListener("input", async () => {
    if (tokenAContract) {
        // Fetch current states directly to feed logic
        const balA = await tokenAContract.balanceOf(userAddress);
        const balB = await tokenBContract.balanceOf(userAddress);
        const dexA = await tokenAContract.balanceOf(CONTRACT_ADDRESSES.exchange);
        const dexB = await tokenBContract.balanceOf(CONTRACT_ADDRESSES.exchange);
        const allowanceA = await tokenAContract.allowance(userAddress, CONTRACT_ADDRESSES.exchange);
        const allowanceB = await tokenBContract.allowance(userAddress, CONTRACT_ADDRESSES.exchange);
        updateSwapCalculation(balA, balB, allowanceA, allowanceB, dexA, dexB);
    }
});

// Set Max balance
fromBalanceEl.parentNode.addEventListener("click", async () => {
    if (!userAddress) return;
    const balA = await tokenAContract.balanceOf(userAddress);
    const balB = await tokenBContract.balanceOf(userAddress);
    const currentBalance = isAForB ? balA : balB;
    
    fromAmountInput.value = ethers.formatUnits(currentBalance, 18);
    // Trigger update
    fromAmountInput.dispatchEvent(new Event('input'));
});

// Direction Toggle Event
toggleDirectionBtn.addEventListener("click", () => {
    isAForB = !isAForB;
    
    // Rotate indicator
    const icon = toggleDirectionBtn.querySelector("i");
    icon.style.transform = isAForB ? "rotate(0deg)" : "rotate(180deg)";
    
    // Swap Labels
    if (isAForB) {
        fromTokenNameEl.innerText = "TKNA";
        toTokenNameEl.innerText = "TKNB";
        
        // Swap Logos Colors (visual micro-animation helper)
        fromTokenLogoEl.innerHTML = '<i class="fa-solid fa-coins text-primary"></i>';
        toTokenLogoEl.innerHTML = '<i class="fa-solid fa-coins text-secondary"></i>';
        
        exchangeRateText.innerText = "1 TKNA = 2 TKNB";
    } else {
        fromTokenNameEl.innerText = "TKNB";
        toTokenNameEl.innerText = "TKNA";
        
        fromTokenLogoEl.innerHTML = '<i class="fa-solid fa-coins text-secondary"></i>';
        toTokenLogoEl.innerHTML = '<i class="fa-solid fa-coins text-primary"></i>';
        
        exchangeRateText.innerText = "2 TKNB = 1 TKNA";
    }
    
    // Swap/Clear Inputs
    fromAmountInput.value = "";
    toAmountInput.value = "";
    feeText.innerText = `0.00 ${isAForB ? 'TKNA' : 'TKNB'}`;
    
    refreshState();
});

// Action button Swap/Approval handler
actionBtn.addEventListener("click", async () => {
    const actionText = actionBtn.innerText;
    const amountIn = ethers.parseUnits(fromAmountInput.value, 18);
    
    if (actionText.startsWith("Approve")) {
        const tokenContract = isAForB ? tokenAContract : tokenBContract;
        const tokenName = isAForB ? "TKNA" : "TKNB";
        
        try {
            actionBtn.disabled = true;
            actionBtn.innerHTML = `<i class="fa-solid fa-spinner spinner"></i> Approving ${tokenName}...`;
            
            showToast(`Requesting allowance approval for ${tokenName}...`, "info");
            
            // Send transaction
            const tx = await tokenContract.approve(CONTRACT_ADDRESSES.exchange, amountIn);
            showToast("Approval transaction submitted. Waiting for validation...", "info");
            
            await tx.wait();
            showToast(`Approval confirmed for ${tokenName}!`, "success");
            
            await refreshState();
        } catch (err) {
            console.error(err);
            showToast("Approval transaction failed or was rejected.", "error");
            await refreshState();
        }
    } else if (actionText === "Swap") {
        try {
            actionBtn.disabled = true;
            actionBtn.innerHTML = '<i class="fa-solid fa-spinner spinner"></i> Swapping...';
            
            showToast("Submitting swap transaction...", "info");
            
            let tx;
            if (isAForB) {
                tx = await exchangeContract.swapAForB(amountIn);
            } else {
                tx = await exchangeContract.swapBForA(amountIn);
            }
            
            showToast("Swap transaction submitted. Waiting for confirmation...", "info");
            await tx.wait();
            
            showToast("Swap executed successfully!", "success");
            
            // Clear inputs
            fromAmountInput.value = "";
            toAmountInput.value = "";
            
            await refreshState();
        } catch (err) {
            console.error(err);
            showToast("Swap transaction failed. See console for details.", "error");
            await refreshState();
        }
    }
});

// Faucet TKNA Trigger
faucetABtn.addEventListener("click", async () => {
    try {
        faucetABtn.disabled = true;
        faucetABtn.innerHTML = '<i class="fa-solid fa-spinner spinner"></i> Minting...';
        
        showToast("Requesting 100 TKNA from Faucet...", "info");
        
        const mintAmount = ethers.parseUnits("100", 18);
        const tx = await tokenAContract.faucet(userAddress, mintAmount);
        await tx.wait();
        
        showToast("Successfully minted 100 TKNA!", "success");
        await refreshState();
    } catch (err) {
        console.error(err);
        showToast("Faucet minting failed.", "error");
    } finally {
        faucetABtn.disabled = false;
        faucetABtn.innerHTML = "Mint 100 TKNA";
    }
});

// Faucet TKNB Trigger
faucetBBtn.addEventListener("click", async () => {
    try {
        faucetBBtn.disabled = true;
        faucetBBtn.innerHTML = '<i class="fa-solid fa-spinner spinner"></i> Minting...';
        
        showToast("Requesting 100 TKNB from Faucet...", "info");
        
        const mintAmount = ethers.parseUnits("100", 18);
        const tx = await tokenBContract.faucet(userAddress, mintAmount);
        await tx.wait();
        
        showToast("Successfully minted 100 TKNB!", "success");
        await refreshState();
    } catch (err) {
        console.error(err);
        showToast("Faucet minting failed.", "error");
    } finally {
        faucetBBtn.disabled = false;
        faucetBBtn.innerHTML = "Mint 100 TKNB";
    }
});

// Info details toast clicker
document.getElementById("infoBtn").addEventListener("click", () => {
    showToast("This DEX swaps TKNA for TKNB at a fixed 1:2 ratio. Swaps have a 0.3% LP fee.", "info");
});
