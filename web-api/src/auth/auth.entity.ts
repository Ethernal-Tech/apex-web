import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('loginCodes')
export class LoginCode {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	address: string;

	@Column()
	code: string;
}

@Entity('users')
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	address: string;

	@Column()
	createdAt: Date;
}
