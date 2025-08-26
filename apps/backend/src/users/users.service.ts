import { Injectable } from '@nestjs/common';
import { db } from '../db/connection';
import { RegisterDto } from '../auth/auth.dto';
import { hashPassword } from '../utils/crypto';
import { DB } from '../db/generated/db';
import { UpdateObjectExpression } from 'node_modules/kysely/dist/cjs/parser/update-set-parser';

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
    if (user?.password) {
      user.password = await hashPassword(user.password);
    }
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

  async updateOne(
    userId: string,
    data: UpdateObjectExpression<DB, 'users', 'users'>
  ) {
    const u = await db
      .updateTable('users')
      .set(data)
      .where('id', '=', userId)
      .executeTakeFirst();

    return u.numUpdatedRows;
  }
}
