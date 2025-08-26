import { Injectable } from '@nestjs/common';
import { db } from '../db/connection';
import { RegisterDto } from '../auth/auth.dto';

@Injectable()
export class UsersService {
  async findOneByUsername(username: string) {
    return db
      .selectFrom('users')
      .selectAll()
      .where('username', '=', username)
      .limit(1)
      .executeTakeFirst();
  }

  async findOneByAny(value: string) {
    return db
      .selectFrom('users')
      .selectAll()
      .where((eb) =>
        eb.or([eb('username', '=', value), eb('email', '=', value)])
      )
      .limit(1)
      .executeTakeFirst();
  }

  async createOne(user: RegisterDto) {
    return db
      .insertInto('users')
      .values({
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        password: user.password,
      })
      .returning('id')
      .executeTakeFirst();
  }
}
