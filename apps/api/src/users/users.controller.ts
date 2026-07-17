import { Controller, Get } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { UsersRepository } from "./users.repository";

@Controller("me")
export class UsersController {
  constructor(private readonly users: UsersRepository) {}

  /** GET /api/v1/me — the authenticated user's profile. */
  @Get()
  me(@CurrentUser() user: AuthUser) {
    return this.users.findProfileById(user.id);
  }
}
