import { BadRequestException, Injectable } from '@nestjs/common';
import {
	DataSignatureDto,
	GenerateLoginCodeDto,
	LoginCodeDto,
	LoginDto,
	TokenDto,
} from './auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { LoginCode, User } from './auth.entity';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
	COSEKey,
	COSESign1,
	Label,
	Int,
	BigNum,
} from '@emurgo/cardano-message-signing-nodejs';
import {
	Address,
	Ed25519Signature,
	PublicKey,
	RewardAddress,
} from '@emurgo/cardano-serialization-lib-nodejs';

@Injectable()
export class AuthService {
	constructor(
		@InjectRepository(LoginCode)
		private readonly loginCodeRepository: Repository<LoginCode>,
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		private readonly configService: ConfigService,
		private readonly jwtService: JwtService,
	) {}
	async generateLoginCode({
		address,
		chainID
	}: GenerateLoginCodeDto): Promise<LoginCodeDto> {
		const oldCode = await this.loginCodeRepository.findOneBy({
			address: address.toLowerCase(),
			chainID: chainID
		});
		if (oldCode !== null) {
			await this.loginCodeRepository.delete(oldCode);
		}
		const code = this.loginCodeRepository.create({
			address: address.toLowerCase(),
			code: randomUUID(),
		});

		await this.loginCodeRepository.save(code);
		return new LoginCodeDto(code);
	}

	async login(model: LoginDto): Promise<TokenDto> {
		const loginCode = await this.loginCodeRepository.findOneBy({
			address: model.address.toLowerCase(),
			chainID: model.chainID
		});
		if (!loginCode) {
			throw new BadRequestException();
		}

		if (
			!this.verifySignedCode(
				loginCode.address,
				loginCode.code,
				model.signedLoginCode,
			)
		) {
			throw new BadRequestException();
		}

		let user = await this.userRepository.findOneBy({
			address: loginCode.address.toLowerCase(),
			chainID: model.chainID
		});

		if (!user) {
			user = this.userRepository.create({
				address: loginCode.address.toLowerCase(),
				createdAt: new Date(),
				chainID: loginCode.chainID
			});
			await this.userRepository.save(user);
		}

		await this.loginCodeRepository.remove(loginCode);

		const response = new TokenDto();
		response.address = user.address;
		const tokenValidHours = +this.configService.get<number>(
			'APP_ACCESS_TOKEN_VALIDITY_HOURS',
		)!;
		const currentDate = new Date();
		const expiresIn = currentDate.setHours(
			currentDate.getHours() + tokenValidHours,
		);
		const secret = this.configService.get('APP_SECRET');
		response.token = this.jwtService.sign({ user }, { secret, expiresIn });
		response.expiresAt = new Date(expiresIn);

		return response;
	}

	private verifySignedCode(
		bech32Address: string,
		code: string,
		signedCode: DataSignatureDto,
	) {
		const decoded = COSESign1.from_bytes(
			Buffer.from(signedCode.signature, 'hex'),
		);
		const headermap = decoded.headers().protected().deserialized_headers();
		const addressHex = Buffer.from(
			headermap.header(Label.new_text('address'))!.to_bytes(),
		)
			.toString('hex')
			.substring(4);
		const address = Address.from_bytes(Buffer.from(addressHex, 'hex'));
		const key = COSEKey.from_bytes(Buffer.from(signedCode.key, 'hex'));
		const pubKeyBytes = key
			.header(Label.new_int(Int.new_negative(BigNum.from_str('2'))))!
			.as_bytes();
		const publicKey = PublicKey.from_bytes(pubKeyBytes!);

		const payload = decoded.payload();
		const signature = Ed25519Signature.from_bytes(decoded.signature());
		const receivedData = decoded.signed_data().to_bytes();

		const signerStakeAddrBech32 = RewardAddress.from_address(address)!
			.to_address()!
			.to_bech32();
		const utf8Payload = Buffer.from(payload!).toString('utf8');

		const isVerified = publicKey.verify(receivedData, signature);
		const payloadAsExpected = utf8Payload == code;
		const isAddressEqual = signerStakeAddrBech32 === bech32Address;

		return isVerified && payloadAsExpected && isAddressEqual;
	}
}
