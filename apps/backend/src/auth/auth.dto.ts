import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty()
  username!: string;

  @ApiProperty()
  password!: string;
}

export class RegisterDto {
  @ApiProperty()
  username!: string;

  @ApiProperty()
  fullname!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  password!: string;
}

export class ConfirmUserDto {
  @ApiProperty()
  otp!: string;
}

export class ForgotPwdUserDto {
  @ApiProperty()
  email!: string;
}

export class ResetPwdUserDto {
  @ApiProperty()
  newPassword!: string;
}
