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
