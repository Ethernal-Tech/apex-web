import { submitTransactionAction } from "../pages/Transactions/action";
import { ChainEnum, CreateTransactionDto, CreateTransactionResponseDto, SubmitTransactionDto } from "../swagger/apexBridgeApiService";
import { tryCatchJsonByAction } from "../utils/fetchUtils";
import { Dispatch, UnknownAction } from 'redux';
import walletHandler from "../features/WalletHandler";
import evmWalletHandler from "../features/EvmWalletHandler";
import web3 from "web3";
import {isAddress} from "web3-validator"

import {
    TransactionBuilder, TransactionBuilderConfigBuilder, LinearFee,
    BigNum, TransactionUnspentOutput, TransactionOutput,
    TransactionWitnessSet, Transaction, Address, Value,
    GeneralTransactionMetadata, AuxiliaryData, TransactionMetadatum,
    MetadataMap
  } from '@emurgo/cardano-serialization-lib-browser';


export const signAndSubmitTx = async (
    values: CreateTransactionDto,
    createResponse: CreateTransactionResponseDto,
    dispatch: Dispatch<UnknownAction>,
) => {
    return await signAndSubmitTxUsingWallet(values, createResponse, dispatch);
}

const signAndSubmitTxUsingWallet = async (
    values: CreateTransactionDto,
    createResponse: CreateTransactionResponseDto,
    dispatch: Dispatch<UnknownAction>,
) => {
    if (!walletHandler.checkWallet()) {
        throw new Error('Wallet not connected.');
    }

    const signedTxRaw = await walletHandler.signTx(createResponse.txRaw);

    const amount = createResponse.bridgingFee
        + values.receivers.map(x => x.amount).reduce((acc, cv) => acc + cv, 0);

    const bindedSubmitAction = submitTransactionAction.bind(null, new SubmitTransactionDto({
        originChain: values.originChain,
        senderAddress: values.senderAddress,
        destinationChain: values.destinationChain,
        receiverAddrs: values.receivers.map(x => x.address),
        amount,
        originTxHash: createResponse.txHash,
        signedTxRaw: signedTxRaw,
    }));

    const response = await tryCatchJsonByAction(bindedSubmitAction, dispatch);
    if ((response as any).err) {
        throw new Error((response as any).err)
    }
    /*
    await walletHandler.submitTx(signedTxRaw!);

    const amount = createResponse.bridgingFee
        + values.receivers.map(x => x.amount).reduce((acc, cv) => acc + cv, 0);

    const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(null, new TransactionSubmittedDto({
        originChain: values.originChain,
        senderAddress: values.senderAddress,
        destinationChain: values.destinationChain,
        receiverAddrs: values.receivers.map(x => x.address),
        amount,
        originTxHash: createResponse.txHash,
    }));

    await tryCatchJsonByAction(bindedSubmittedAction, dispatch);
    */
    return response;
}

/*
const signAndSubmitTxUsingPrivateKey = async (
    values: CreateTransactionDto,
    createResponse: CreateTransactionResponseDto,
    dispatch: Dispatch<UnknownAction>,
) => {
    const privateKey = store.getState().pkLogin.pkLogin!.privateKey

    const bindedSignAction = signTransactionAction.bind(null, new SignTransactionDto({
        signingKeyHex: privateKey,
        txRaw: createResponse.txRaw,
        txHash: createResponse.txHash,
    }));
    const signResponse = await tryCatchJsonByAction(bindedSignAction, dispatch);

    const amount = createResponse.bridgingFee
        + values.receivers.map(x => x.amount).reduce((acc, cv) => acc + cv, 0);

    const bindedSubmitAction = submitTransactionAction.bind(null, new SubmitTransactionDto({
        originChain: values.originChain,
        senderAddress: values.senderAddress,
        destinationChain: values.destinationChain,
        receiverAddrs: values.receivers.map(x => x.address),
        amount,
        originTxHash: createResponse.txHash,
        signedTxRaw: signResponse.txRaw,
    }));

    await tryCatchJsonByAction(bindedSubmitAction, dispatch);

    return true;
}
*/

export const signAndSubmitNexusToPrimeFallbackTx = async (amount:number, destinationChain: ChainEnum, destinationAddress:string) => {
    if (!evmWalletHandler.checkWallet()) {
        throw new Error('Wallet not connected.');
    }

    // TODO - validate address when from nexus to prime

    // Bridge destination address for fallback
    const bridgeNexusAddress = '0xEe639cDA5D46Bd32D0013bB75f60F3E691D9839f' // the fallback bridge address
    
    if(amount <= 0){
        throw new Error("Invalid amount.")
    }

    const addressFrom = await evmWalletHandler.getChangeAddress()

    const calldata = web3.utils.asciiToHex(JSON.stringify(
        {
            destinationChain: destinationChain,
            destnationAddress: destinationAddress
        }
    ));					
    
    const tx = {
        from: addressFrom,
        to: bridgeNexusAddress,
        value: amount,
        data: calldata,
        gas: 30000, // TODO nick - Adjust gas limit as necessary - not sure about this
        gasPrice: 1000000000 // TODO - adjust gas price
    };
    
    return await evmWalletHandler.submitTx(tx)
    
}

// TODO - implement, work in progress. Not All utxos are being fetched
export const signAndSubmitPrimeToNexusFallbackTx = async (amount:number, destinationChain: ChainEnum, destinationAddress:string) => {
    if (amount <= 0) {
      throw new Error('Invalid amount.');
    }
  
    if (!isAddress(destinationAddress)) {
      throw new Error('Invalid destination address.');
    }
  
    // Replace with the actual Cardano address
    const primeFallbackAddress = 'addr_test1qq3n87wdc70dm5ug4d6p7gcfs8r7c36egkkc2jw65qxeqarjk0m0plrf2nqhmyw7rn03k2mygux6rzwxeglx2jdperzqf7ym55';
  
    // Check if the wallet is connected
    if (!walletHandler.checkWallet()) {
      console.error('Eternl Wallet is not connected');
      throw new Error('Supported wallet not connected.');
    }
  
    try {
      const cardanoNativeApi = walletHandler.getNativeAPI();
  
      // Fetch protocol parameters from a reliable source or hardcode them if you know them
      const linearFee = LinearFee.new(BigNum.from_str("47"), BigNum.from_str("158298")); // Example values
      const poolDeposit = BigNum.from_str("0");
      const keyDeposit = BigNum.from_str("0");
      const coinsPerUtxoByte = BigNum.from_str("4310");
  
      // Initialize TransactionBuilder
      const txBuilder = TransactionBuilder.new(
        TransactionBuilderConfigBuilder.new()
          .fee_algo(linearFee)
          .pool_deposit(poolDeposit)
          .key_deposit(keyDeposit)
          .max_value_size(5000)
          .max_tx_size(16384)
          .coins_per_utxo_byte(coinsPerUtxoByte)
          .build()
      );
  
      // Fetch UTXOs from the wallet
      const utxosHex = await cardanoNativeApi.getUtxos();
      let totalInputValue = BigNum.from_str('0');
      utxosHex.forEach((utxoHex: WithImplicitCoercion<string> | { [Symbol.toPrimitive](hint: "string"): string; }) => {
        const utxo = TransactionUnspentOutput.from_bytes(Buffer.from(utxoHex, 'hex'));
        txBuilder.add_input(
          utxo.output().address(),
          utxo.input(),
          utxo.output().amount()
        );
        totalInputValue = totalInputValue.checked_add(utxo.output().amount().coin());
      });
  
      // Add the output (amount to the recipient address)
      const recipientAddress = Address.from_bech32(primeFallbackAddress);
      const outputValue = Value.new(BigNum.from_str(amount.toString()));
      txBuilder.add_output(TransactionOutput.new(recipientAddress, outputValue));
  
      // Add metadata
      const metadata = GeneralTransactionMetadata.new();
      const metadataMap = MetadataMap.new();
      metadataMap.insert(
        TransactionMetadatum.new_text("destinationChain"),
        TransactionMetadatum.new_text(destinationChain)
      );
      metadataMap.insert(
        TransactionMetadatum.new_text("destinationAddress"),
        TransactionMetadatum.new_text(destinationAddress)
      );
      metadata.insert(BigNum.from_str("0"), TransactionMetadatum.new_map(metadataMap));
  
      const auxiliaryData = AuxiliaryData.new();
      auxiliaryData.set_metadata(metadata);
      txBuilder.set_auxiliary_data(auxiliaryData);
  
      // Calculate fee and add change address
      const changeAddress = Address.from_bech32(await walletHandler.getChangeAddress());
      txBuilder.add_change_if_needed(changeAddress);
  
      // Build the transaction
      const txBody = txBuilder.build();
      const transaction = Transaction.new(txBody, TransactionWitnessSet.new(), auxiliaryData);
  
      // Sign the transaction using Eternl Wallet
      const txHex = Buffer.from(transaction.to_bytes()).toString('hex');
      const signedTxHex = await cardanoNativeApi.signTx(txHex);
  
      // Submit the transaction
      const txHash = await cardanoNativeApi.submitTx(signedTxHex);
      console.log('Transaction submitted with hash:', txHash);
      return txHash;
    } catch (error) {
      console.error('Error creating or signing transaction:', error);
    }
  }