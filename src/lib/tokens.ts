/**
 * Logo sources. All served from public CDNs allow-listed in next.config.ts.
 * `bg` is used behind the mark so a transparent PNG still reads as a coin.
 */
export type TokenMeta = {
  symbol: string;
  name: string;
  logo: string;
  bg: string;
};

const TW = (chain: string, address: string) =>
  `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/assets/${address}/logo.png`;

const TW_INFO = (chain: string) =>
  `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/info/logo.png`;

export const TOKENS: Record<string, TokenMeta> = {
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    logo: TW_INFO("bitcoin"),
    bg: "#F7931A",
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    logo: TW_INFO("ethereum"),
    bg: "#627EEA",
  },
  SOL: {
    symbol: "SOL",
    name: "Solana",
    logo: TW_INFO("solana"),
    bg: "#111111",
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    logo: TW("ethereum", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"),
    bg: "#2775CA",
  },
  BASE: {
    symbol: "BASE",
    name: "Base",
    logo: TW_INFO("base"),
    bg: "#0052FF",
  },
};

export function tokenFor(symbol: string): TokenMeta {
  return (
    TOKENS[symbol.toUpperCase()] ?? {
      symbol: symbol.toUpperCase(),
      name: symbol,
      logo: "",
      bg: "#71717A",
    }
  );
}

export const PROTOCOLS = {
  aave: {
    name: "Aave v3",
    logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9/logo.png",
    bg: "#B6509E",
    url: "https://app.aave.com",
  },
  limitless: {
    name: "Limitless",
    logo: "",
    bg: "#111111",
    url: "https://limitless.exchange",
  },
} as const;
