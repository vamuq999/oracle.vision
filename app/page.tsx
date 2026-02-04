"use client";

import React, { useEffect, useMemo, useState } from "react";
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

function shortAddr(a?: string) {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function formatEth(wei?: bigint) {
  if (wei === undefined) return "—";
  try {
    return Number(ethers.formatEther(wei)).toFixed(4);
  } catch {
    return "—";
  }
}

export default function Page() {
  const [hasMM, setHasMM] = useState(false);
  const [acct, setAcct] = useState<string>("");
  const [chainId, setChainId] = useState<string>("");
  const [status, setStatus] = useState<string>("Idle");
  const [txHash, setTxHash] = useState<string>("");

  const [priceWei, setPriceWei] = useState<bigint | undefined>(undefined);
  const [meta, setMeta] = useState<{ name?: string; symbol?: string; owner?: string }>({});

  const isMainnet = useMemo(() => chainId?.toLowerCase() === "0x1", [chainId]);
  const canMint = !!acct && isMainnet;

  async function connect() {
    try {
      if (!window.ethereum) {
        setStatus("MetaMask not found.");
        return;
      }
      setStatus("Connecting…");
      const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAcct(accounts?.[0] || "");
      const cid = await window.ethereum.request({ method: "eth_chainId" });
      setChainId(cid || "");
      setStatus("Connected.");
    } catch (e: any) {
      setStatus(e?.message || "Connect failed.");
    }
  }

  async function loadContractData() {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const c = new ethers.Contract(CONTRACT, ABI, provider);

      const [p, n, s, o] = await Promise.allSettled([
        c.MINT_PRICE(),
        c.name(),
        c.symbol(),
        c.owner(),
      ]);

      if (p.status === "fulfilled") setPriceWei(p.value as bigint);
      setMeta({
        name: n.status === "fulfilled" ? (n.value as string) : undefined,
        symbol: s.status === "fulfilled" ? (s.value as string) : undefined,
        owner: o.status === "fulfilled" ? (o.value as string) : undefined,
      });
    } catch {
      // ignore
    }
  }

  async function mint() {
    setTxHash("");
    try {
      if (!window.ethereum) {
        setStatus("MetaMask not found.");
        return;
      }
      if (!acct) {
        setStatus("Connect wallet first.");
        return;
      }
      if (!isMainnet) {
        setStatus("Wrong network. Switch MetaMask to Ethereum Mainnet.");
        return;
      }

      setStatus("Preparing mint…");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const c = new ethers.Contract(CONTRACT, ABI, signer);

      const p: bigint = await c.MINT_PRICE();

      setStatus("Confirm in wallet…");
      const tx = await c.mintOracleVision({ value: p });

      setStatus("Awaiting confirmation…");
      const receipt = await tx.wait();

      setTxHash(receipt?.hash || tx.hash);
      setStatus("Mint complete ✅");

      loadContractData();
    } catch (e: any) {
      const msg = e?.shortMessage || e?.reason || e?.message || "Mint failed.";
      setStatus(msg);
    }
  }

  useEffect(() => {
    setHasMM(!!window.ethereum);
    if (!window.ethereum) return;

    const handleAccounts = (a: string[]) => setAcct(a?.[0] || "");
    const handleChain = (c: string) => setChainId(c || "");

    window.ethereum.request({ method: "eth_accounts" })
      .then((a: string[]) => setAcct(a?.[0] || ""))
      .catch(() => {});
    window.ethereum.request({ method: "eth_chainId" })
      .then((c: string) => setChainId(c || ""))
      .catch(() => {});

    window.ethereum.on?.("accountsChanged", handleAccounts);
    window.ethereum.on?.("chainChanged", handleChain);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccounts);
      window.ethereum?.removeListener?.("chainChanged", handleChain);
    };
  }, []);

  useEffect(() => {
    loadContractData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acct, chainId]);

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <div className="orb" />
          <div>
            <p className="h1">{meta.name || "Oracle Vision Minter"}</p>
            <p className="sub">One click. One spark. The chain remembers.</p>
          </div>
        </div>

        <div className="row">
          <span className="pill">
            Network: <span className={isMainnet ? "good" : "warn"}>{isMainnet ? "Ethereum Mainnet" : chainId ? "Not Mainnet" : "—"}</span>
          </span>
          <button className="btn" onClick={connect}>
            {acct ? `Connected ${shortAddr(acct)}` : "Connect MetaMask"}
          </button>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="kpis">
            <div className="kpi">
              <div className="label">Token</div>
              <div className="value">{meta.symbol || "VISION"}</div>
            </div>
            <div className="kpi">
              <div className="label">Mint Price (ETH)</div>
              <div className="value">{formatEth(priceWei)}</div>
            </div>
            <div className="kpi">
              <div className="label">Contract</div>
              <div className="value mono">{shortAddr(CONTRACT)}</div>
            </div>
          </div>

          <div className="hr" />

          <button className="btn btnPrimary" onClick={mint} disabled={!canMint || !hasMM}>
            Mint Oracle Vision
          </button>

          <div className="hr" />

          <div className="small">
            Status:{" "}
            <span className={status.includes("✅") ? "good" : status.toLowerCase().includes("fail") ? "bad" : "warn"}>
              {status}
            </span>
          </div>

          {txHash ? (
            <>
              <div className="small" style={{ marginTop: 10 }}>Transaction Hash</div>
              <div className="mono">{txHash}</div>
            </>
          ) : null}

          <div className="hr" />

          <div className="small">
            Owner: <span className="mono">{meta.owner ? shortAddr(meta.owner) : "—"}</span>
          </div>
        </div>

        <div className="card">
          <p className="h1" style={{ marginBottom: 8 }}>Oracle Drop</p>
          <p className="small">
            This is the cleanest ship: connect → read price → mint → confirmed.
            <br /><br />
            Contract:
            <br />
            <span className="mono">{CONTRACT}</span>
          </p>
        </div>
      </div>
    </div>
  );
                                                }
