import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginCode, User } from './auth.entity';
import { JwtService } from '@nestjs/jwt';

@Module({
	imports: [TypeOrmModule.forFeature([LoginCode, User])],
	controllers: [AuthController],
	providers: [AuthService, JwtService],
})
export class AuthModule {}
