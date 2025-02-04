import {TypedDataUtils} from 'eth-sig-util';

import {
    EIP_2612_PERMIT_ABI,
    EIP_2612_PERMIT_SELECTOR,
    ERC_20_NONCES_ABI,
} from './eip-2612-permit.const';
import {
    buildPermitTypedData,
    getPermitContractCallParams,
} from './eip-2612-permit.helper';
import {ChainId} from './model/chain.model';
import {ProviderConnector} from './connector/provider.connector';
import {PermitParams} from './model/permit.model';

export class Eip2612PermitUtils {
    constructor(private connector: ProviderConnector) {}

    async buildPermitSignature(
        permitParams: PermitParams,
        chainId: ChainId,
        tokenName: string,
        tokenAddress: string
    ): Promise<string> {
        const permitData = buildPermitTypedData(
            chainId,
            tokenName,
            tokenAddress,
            permitParams
        );
        const dataHash = TypedDataUtils.hashStruct(
            permitData.primaryType,
            permitData.message,
            permitData.types,
            true
        ).toString('hex');

        return this.connector.signTypedData(
            permitParams.owner,
            permitData,
            dataHash
        );
    }

    async buildPermitCallData(
        permitParams: PermitParams,
        chainId: ChainId,
        tokenName: string,
        tokenAddress: string
    ): Promise<string> {
        const permitSignature = await this.buildPermitSignature(
            permitParams,
            chainId,
            tokenName,
            tokenAddress
        );
        const permitCallData = this.connector.contractEncodeABI(
            EIP_2612_PERMIT_ABI,
            tokenAddress,
            'permit',
            getPermitContractCallParams(permitParams, permitSignature)
        );

        return permitCallData.replace(EIP_2612_PERMIT_SELECTOR, '0x');
    }

    getTokenNonce(
        tokenAddress: string,
        walletAddress: string
    ): Promise<number> {
        const callData = this.connector.contractEncodeABI(
            ERC_20_NONCES_ABI,
            tokenAddress,
            'nonces',
            [walletAddress]
        );

        return this.connector.ethCall(tokenAddress, callData).then((res) => {
            return Number(res);
        });
    }
}
