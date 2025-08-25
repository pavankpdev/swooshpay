import { Injectable } from '@nestjs/common';
import { db } from '../db/connection';

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
}
