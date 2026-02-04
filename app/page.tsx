// app/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const CONTRACT = "0x15545833cFCe7579D967D02A1183114d7e554889";
const ABI = [
  "function MINT_PRICE() view returns (uint256)",
  "function mintOracleVision() payable",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function owner() view returns (address)",
];

function shortAddr(addr?: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function toHexChainId(chainId: bigint | number) {
  const n = typeof chainId === "bigint" ? chainId : BigInt(chainId);
  return "0x" + n.toString(16);
}

export default function Page() {
  const [hasMM, setHasMM] = useState(false);
  const [acct, setAcct] = useState<string>("");
  const [chainId, setChainId] = useState<string>("");
  const [status, setStatus] = useState<string>("Idle.");
  const [busy, setBusy] = useState(false);

  const [meta, setMeta] = useState<{
    name?: string;
    symbol?: string;
    owner?: string;
    priceWei?: bigint;
  }>({});

  const styles = useMemo(() => {
    const card: React.CSSProperties = {
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      borderRadius: 18,
      padding: 16,
      boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
      backdropFilter: "blur(10px)",
    };
    return {
      page: {
        minHeight: "100vh",
        color: "rgba(255,255,255,0.92)",
        background:
          "radial-gradient(1200px 700px at 20% 10%, rgba(0,170,255,0.22), transparent 55%), radial-gradient(900px 600px at 80% 30%, rgba(120,90,255,0.18), transparent 50%), linear-gradient(180deg, #070A12 0%, #04060B 100%)",
        padding: 18,
      } as React.CSSProperties,
      container: { maxWidth: 980, margin: "0 auto" } as React.CSSProperties,
      topbar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "14px 10px",
        marginBottom: 12,
      } as React.CSSProperties,
      brand: { display: "flex", alignItems: "center", gap: 12 } as React.CSSProperties,
      orb: {
        width: 36,
        height: 36,
        borderRadius: 999,
        background:
          "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(0,180,255,0.45) 35%, rgba(120,90,255,0.35) 70%, rgba(0,0,0,0.2) 100%)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.14), 0 0 40px rgba(0,170,255,0.25)",
      } as React.CSSProperties,
      h1: { fontSize: 20, fontWeight: 800, letterSpacing: 0.2, margin: 0 } as React.CSSProperties,
      small: { fontSize: 13, opacity: 0.85, lineHeight: 1.45 } as React.CSSProperties,
      grid: {
        display: "grid",
        gridTemplateColumns: "1.2fr 0.8fr",
        gap: 12,
      } as React.CSSProperties,
      card,
      mono: {
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        fontSize: 12,
        opacity: 0.92,
        wordBreak: "break-all",
      } as React.CSSProperties,
      row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 } as React.CSSProperties,
      pill: {
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.06)",
        fontSize: 12,
      } as React.CSSProperties,
      btn: {
        height: 40,
        padding: "0 14px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.92)",
        cursor: "pointer",
        fontWeight: 700,
      } as React.CSSProperties,
      btnPrimary: {
        height: 40,
        padding: "0 14px",
        borderRadius: 12,
        border: "1px solid rgba(0,180,255,0.35)",
        background: "linear-gradient(180deg, rgba(0,180,255,0.22), rgba(0,120,255,0.12))",
        color: "rgba(255,255,255,0.95)",
        cursor: "pointer",
        fontWeight: 800,
        boxShadow: "0 10px 30px rgba(0,170,255,0.12)",
      } as React.CSSProperties,
      note: { fontSize: 12, opacity: 0.72, marginTop: 10 } as React.CSSProperties,
    };
  }, []);

  const getProvider = useCallback(() => {
    if (!window.ethereum) return null;
    return new ethers.BrowserProvider(window.ethereum);
  }, []);

  const getContract = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return null;
    return new ethers.Contract(CONTRACT, ABI, provider);
  }, [getProvider]);

  const refreshMeta = useCallback(async () => {
    try {
      const c = await getContract();
      if (!c) return;
      const [name, symbol, owner, price] = await Promise.all([
        c.name(),
        c.symbol(),
        c.owner(),
        c.MINT_PRICE(),
      ]);
      // ethers v6 returns bigint for uint256
      setMeta({ name, symbol, owner, priceWei: price as bigint });
    } catch (e: any) {
      // don’t spam, just keep it quiet
      console.log(e?.message || e);
    }
  }, [getContract]);

  const syncWalletState = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return;

    try {
      const accounts: string[] = await provider.send("eth_accounts", []);
      setAcct(accounts?.[0] || "");

      const net = await provider.getNetwork();
      setChainId(net?.chainId ? String(net.chainId) : "");
    } catch (e: any) {
      console.log(e?.message || e);
    }
  }, [getProvider]);

  useEffect(() => {
    const ok = typeof window !== "undefined" && !!window.ethereum;
    setHasMM(ok);

    if (!ok) return;

    // initial load
    refreshMeta();
    syncWalletState();

    const onAccounts = (accs: string[]) => setAcct(accs?.[0] || "");
    const onChain = () => syncWalletState();

    window.ethereum.on?.("accountsChanged", onAccounts);
    window.ethereum.on?.("chainChanged", onChain);

    const t = setInterval(() => {
      refreshMeta();
      syncWalletState();
    }, 20000);

    return () => {
      clearInterval(t);
      window.ethereum?.removeListener?.("accountsChanged", onAccounts);
      window.ethereum?.removeListener?.("chainChanged", onChain);
    };
  }, [refreshMeta, syncWalletState]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setStatus("No wallet found. Install MetaMask to continue.");
      return;
    }
    try {
      setBusy(true);
      setStatus("Requesting wallet connection…");

      const provider = getProvider()!;
      const accounts: string[] = await provider.send("eth_requestAccounts", []);
      setAcct(accounts?.[0] || "");

      const net = await provider.getNetwork();
      setChainId(net?.chainId ? String(net.chainId) : "");

      setStatus("Connected. Ready to mint.");
    } catch (e: any) {
      setStatus(e?.message || "Connection cancelled.");
    } finally {
      setBusy(false);
    }
  }, [getProvider]);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied to clipboard.");
      setTimeout(() => setStatus("Ready."), 1200);
    } catch {
      setStatus("Couldn’t copy (browser blocked clipboard).");
    }
  }, []);

  const mint = useCallback(async () => {
    if (!window.ethereum) {
      setStatus("MetaMask missing.");
      return;
    }
    try {
      setBusy(true);
      setStatus("Preparing mint…");

      const provider = getProvider()!;
      await provider.send("eth_requestAccounts", []);

      const signer = await provider.getSigner();
      const c = new ethers.Contract(CONTRACT, ABI, signer);

      // Pull on-chain price (authoritative)
      const price: bigint = (await c.MINT_PRICE()) as bigint;

      setStatus("Sending transaction… confirm in MetaMask.");
      const tx = await c.mintOracleVision({ value: price });

      setStatus("Broadcasted. Waiting for confirmation…");
      const receipt = await tx.wait();

      setStatus(`Mint confirmed ✅ (block ${receipt?.blockNumber ?? "?"})`);
      refreshMeta();
    } catch (e: any) {
      const msg = e?.shortMessage || e?.reason || e?.message || "Mint failed.";
      setStatus(String(msg));
    } finally {
      setBusy(false);
    }
  }, [getProvider, refreshMeta]);

  const priceLabel = useMemo(() => {
    if (!meta.priceWei && meta.priceWei !== 0n) return "—";
    try {
      return `${ethers.formatEther(meta.priceWei)} ETH`;
    } catch {
      return "—";
    }
  }, [meta.priceWei]);

  const chainLabel = useMemo(() => {
    if (!chainId) return "—";
    return `${chainId} (${toHexChainId(BigInt(chainId))})`;
  }, [chainId]);

  return (
    <div style={styles.page}>
      <div style={styles.container} className="container">
        <div style={styles.topbar} className="topbar">
          <div style={styles.brand} className="brand">
            <div style={styles.orb} className="orb" />
            <div>
              <p style={styles.h1} className="h1">
                {meta.name || "Oracle Vision Minter"}
              </p>
              <div style={styles.small} className="small">
                Clean ship: connect → read price → mint → confirmed.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={styles.pill}>
              {acct ? `Wallet: ${shortAddr(acct)}` : "Wallet: not connected"}
            </span>
            <button style={styles.btnPrimary} onClick={connect} disabled={busy || !hasMM}>
              {hasMM ? (acct ? "Connected" : "Connect") : "MetaMask required"}
            </button>
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.card} className="card">
            <div style={styles.row}>
              <div>
                <div style={styles.small} className="small">
                  Contract
                </div>
                <div style={styles.mono} className="mono">
                  {CONTRACT}
                </div>
              </div>
              <button style={styles.btn} onClick={() => copy(CONTRACT)} disabled={!hasMM}>
                Copy
              </button>
            </div>

            <div style={{ height: 10 }} />

            <div style={styles.row}>
              <div>
                <div style={styles.small} className="small">
                  Mint price
                </div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{priceLabel}</div>
              </div>
              <button style={styles.btn} onClick={refreshMeta} disabled={busy}>
                Refresh
              </button>
            </div>

            <div style={{ height: 12 }} />

            <button
              style={{ ...styles.btnPrimary, width: "100%", height: 46 }}
              onClick={mint}
              disabled={busy || !acct || !hasMM}
              title={!acct ? "Connect wallet first" : "Mint"}
            >
              {busy ? "Working…" : acct ? "Mint Oracle Vision" : "Connect to Mint"}
            </button>

            <div style={styles.note}>
              Status: <span style={{ opacity: 0.95 }}>{status}</span>
            </div>
          </div>

          <div style={styles.card} className="card">
            <div style={{ display: "grid", gap: 10 }}>
              <div style={styles.row}>
                <div style={styles.small} className="small">
                  Symbol
                </div>
                <div style={{ fontWeight: 900 }}>{meta.symbol || "—"}</div>
              </div>

              <div style={styles.row}>
                <div style={styles.small} className="small">
                  Chain ID
                </div>
                <div style={styles.mono} className="mono">
                  {chainLabel}
                </div>
              </div>

              <div>
                <div style={styles.small} className="small">
                  Owner
                </div>
                <div style={styles.mono} className="mono">
                  {meta.owner ? shortAddr(meta.owner) : "—"}
                </div>
                {meta.owner ? (
                  <button style={{ ...styles.btn, marginTop: 10, width: "100%" }} onClick={() => copy(meta.owner!)}>
                    Copy owner
                  </button>
                ) : null}
              </div>

              <div style={styles.note}>
                If mint fails, it’s usually one of: wrong network, insufficient ETH, or contract paused/limited.
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, opacity: 0.65, fontSize: 12 }}>
          Tip: If you’re on mobile, open this site inside MetaMask’s in-app browser for the smoothest flow.
        </div>
      </div>
    </div>
  );
}
