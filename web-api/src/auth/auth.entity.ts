import { ChainEnum } from 'src/common/enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('loginCodes')
export class LoginCode {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	address: string;

	@Column()
	code: string;

	@Column({ type: 'enum', enum: ChainEnum, default: ChainEnum.Prime })
	chainID: ChainEnum;
}

@Entity('users')
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	address: string;

	@Column()
	createdAt: Date;

	@Column({ type: 'enum', enum: ChainEnum, default: ChainEnum.Prime })
	chainID: ChainEnum;
}
