import { Metaplex } from "@metaplex-foundation/js";
import { solanaConnection } from "../config";
import { poolModel } from "../model"
import { pools } from "../sockets"
import { logger } from "../utils"
import { PublicKey } from "@solana/web3.js";

import { promises as fs } from 'fs';
import * as path from 'path';
const filePath = path.join(__dirname, '../FoundSymbol.txt');

export const saveNewPool = async (poolId: string, poolState: string) : Promise<string | null>  => {
    try {
        let name: string | undefined;
        let symbol: string | undefined;
        let image: string | undefined;
        const metaplex = Metaplex.make(solanaConnection);
        const metadataAccount = metaplex
            .nfts()
            .pdas()
            .metadata({ mint: new PublicKey(poolState) });

        const metadataAccountInfo = await solanaConnection.getAccountInfo(metadataAccount);

        if (metadataAccountInfo) {
            const token = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(poolState) });
            name = token.name;
            symbol = token.symbol;
            image = token.json?.image;
        }
        const res = await poolModel.findOneAndUpdate({ poolId }, { poolId, poolState, name, symbol, image }, { upsert: true, new: true })
        pools()
        if (symbol) {
            try {
                let fileContent: string = '';
                try {
                    fileContent = await fs.readFile(filePath, 'utf8');
                } catch (err) {
                    if (err.code !== 'ENOENT') throw err; // ENOENT means the file doesn't exist, which is fine
                }
    
                const separator = '\n';
                const symbols = fileContent.split(separator).map(s => s.trim()).filter(Boolean);
    
                if (!symbols.includes(symbol)) {
                    await fs.appendFile(filePath, `${symbol}${separator}`);
                    console.log(`Symbol "${symbol}" added to file.`);
                    return symbol; // Return the new symbol
                } else {
                    console.log(`Symbol "${symbol}" already exists in the file.`);
                    return null; // Return null since the symbol already exists
                }
            } catch (error) {
                console.error('Error handling the file:', error);
                return null;
            }
        } else {
            console.log('Symbol not found for the token.');
            return null;
        }

    } catch (e) {
        logger.warn('db duplicated')
        return null;
    }
}

export const returnPools = async () => {
    try {
        return await poolModel.find().sort({ _id: -1 }).limit(30)
    } catch (e) {
        console.log(e)
    }
}

export const buyStatus = async (poolId: string, status: number, signature: string) => {
    try {
        const res = await poolModel.findOneAndUpdate({ poolId }, { poolId, buy: status, buyTx: signature }, { upsert: true, new: true })
        pools()
    } catch (e) {
        console.log(e)
    }
}

export const sellStatus = async (poolId: string, status: number, signature: string) => {
    try {
        const res = await poolModel.findOneAndUpdate({ poolId }, { poolId, sell: status, sellTx: signature }, { upsert: true, new: true })
        pools()
    } catch (e) {
        console.log(e)
    }
}

