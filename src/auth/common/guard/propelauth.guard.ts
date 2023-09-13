import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { propelauth } from 'src/auth/common/lib/propelauth';
import { IS_PUBLIC_KEY } from '../decorator/public.decorator';
import { Reflector } from '@nestjs/core';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { IS_API_KEY } from '../decorator/apiKey.decorator';

@Injectable()
export class PropelauthGuard implements CanActivate {
  private readonly logger = new Logger(PropelauthGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectKysely() private readonly pgsql: DB,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const isApiKey = this.reflector.getAllAndOverride<boolean>(IS_API_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isApiKey) {
      const apiKey = this.extractApiKeyFromHeader(request);

      this.logger.log('api_key: ' + apiKey);

      return true;
    }

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await propelauth.validateAccessTokenAndGetUser(token);

      const userMetadata = await propelauth.fetchUserMetadataByUserId(
        payload.userId,
        true,
      );

      const result = Object.values(userMetadata.orgIdToOrgInfo).map(
        (orgMemberInfo) => ({
          orgId: orgMemberInfo.orgId,
          orgName: orgMemberInfo.orgName,
          userAssignedRole: orgMemberInfo.assignedRole,
          usersPermission: orgMemberInfo.permissions,
        }),
      );

      const userFromDb = await this.pgsql
        .selectFrom('users')
        .select([
          'users.user_id',
          'users.full_name',
          'users.hrbp_approver_email',
        ])
        .where('users.propelauth_user_id', '=', payload.userId)
        .executeTakeFirst();

      request.user = payload;

      if (userFromDb) {
        request.user.original_user_id = userFromDb.user_id;
        request.user.hrbp_approver_email = userFromDb.hrbp_approver_email;
        request.user.full_name = userFromDb.full_name;
      }

      if (result.length) {
        const assigned_role = result[0].userAssignedRole.toLowerCase();
        const assigned_permissions = result[0].usersPermission;

        request.user.user_assigned_role = assigned_role;
        request.user.permissions = assigned_permissions;
      }
    } catch (error: any) {
      this.logger.error(error);
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractApiKeyFromHeader(request: Request): string | undefined {
    const apiKey = request.headers['x-api-key'] as string;

    return apiKey ? apiKey : undefined;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    return type === 'Bearer' ? `${type} ${token}` : undefined;
  }
}
