import { Commitment, Connection, PublicKey } from '@solana/web3.js';
import { getPdaMetadataKey } from '@raydium-io/raydium-sdk';

import { MintLayout } from '@solana/spl-token';
import { TOP_10_MAX_PERCENTAGE } from '../../../config';
const MINT_AUTHORITY = "TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM";

export const checkBurn = async (connection: Connection, lpMint: PublicKey, commitment: Commitment) => {
  try {
    const amount = await connection.getTokenSupply(lpMint, commitment);
    const burned = amount.value.uiAmount === 0;
    return burned
  } catch (error) {
    return false
  }
}

// export const checkMutable = async (connection: Connection, baseMint: PublicKey, ) => {
//   try {
//     const metadataPDA = getPdaMetadataKey(baseMint);
//     const metadataAccount = await connection.getAccountInfo(metadataPDA.publicKey);
//     if (!metadataAccount?.data) {
//       return { ok: false, message: 'Mutable -> Failed to fetch account data' };
//     }
//     const serializer = getMetadataAccountDataSerializer()
//     const deserialize = serializer.deserialize(metadataAccount.data);
//     const mutable = deserialize[0].isMutable;

//     return !mutable
//   } catch (e: any) {
//     return false
//   }
// }

export const checkMintable = async (connection: Connection, vault: PublicKey): Promise<boolean | undefined> => {
  try {
    let { data } = (await connection.getAccountInfo(vault)) || {}
    if (!data) {
      return
    }
    const deserialize = MintLayout.decode(data)
    return deserialize.mintAuthorityOption === 0
  } catch (e) {
    return false
  }
}

export const checkFreezable = async (connection: Connection, vault: PublicKey): Promise<boolean | undefined> => {
  try {
    let { data } = (await connection.getAccountInfo(vault)) || {}
    if (!data) {
      return
    }
    const deserialize = MintLayout.decode(data)
    return deserialize.freezeAuthorityOption === 0
  } catch (e) {
    return false
  }
}

export const isPumpAddress =  async (connection: Connection,  address: string): Promise<boolean | undefined> => {
  let vault = new PublicKey(address);
  let MintAuthority;
    try {
      let { data } = (await connection.getAccountInfo(vault)) || {}
    if (!data) {
      return false
    }
    const deserialize = MintLayout.decode(data)
    MintAuthority = deserialize.mintAuthority.toString()
   if (address.endsWith('pump') && MintAuthority.match(MINT_AUTHORITY)) {
        return true
      }
    } catch (e) {
      return false
    }
    return false
}


export const TopHolderDistributionFilter =  async (connection: Connection,  address: string): Promise<boolean | undefined> => {
    let mint = new PublicKey(address)
    try {

          // Fetch the total supply of the token from its mint account
          const mintAccountInfo = await connection.getAccountInfo(mint);
          let totalSupply = 0;
          let supplyDecimals = 0;
          if (mintAccountInfo && mintAccountInfo.data.length === MintLayout.span) {
              const mintData = MintLayout.decode(mintAccountInfo.data);
              supplyDecimals = mintData.decimals;
              totalSupply = Number(mintData.supply);  // Adjust based on your needs (handle big numbers appropriately)
          }
          const largestAccountsResponse = await connection.getTokenLargestAccounts(mint);
          const addresses = largestAccountsResponse.value.map(account => new PublicKey(account.address));

          // Fetch additional account details for each of the largest accounts
          const accountInfos = await connection.getMultipleAccountsInfo(addresses, { commitment: 'confirmed' });

          const largestAccounts = accountInfos.map((info, index) => ({
              address: addresses[index],
              uiAmount: largestAccountsResponse.value[index].uiAmount ?? 0,
              owner: info ? new PublicKey(info.data.slice(32, 64)) : new PublicKey('11111111111111111111111111111111'), // Use a default or null-like public key
              lamports: info ? info.lamports : 0
          }));

          totalSupply = largestAccounts.reduce((sum, account) => sum + account.uiAmount, 0);
          const excludeAddress = new PublicKey("5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1");
          const filteredAccounts = largestAccounts.filter(account => !account.owner.equals(excludeAddress));
          const percentages = filteredAccounts.slice(0, 10).map(account => ((account.uiAmount / totalSupply) * 100).toFixed(2) + '%');
          
          if( parseFloat(percentages[0]) > TOP_10_MAX_PERCENTAGE){
              return false
          }else{
              return true
          }

    } catch (error) {
          return false
    }

}
