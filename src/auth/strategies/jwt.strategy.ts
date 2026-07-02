import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfig } from '../../config/configuration';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<AppConfig['jwt']>('jwt')!.accessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: {
        usuarioLojas: {
          where: { ativo: true },
          include: {
            loja: true,
            papel: {
              include: { permissoes: { include: { permissao: true } } },
            },
          },
        },
      },
    });

    if (!usuario || !usuario.ativo || usuario.deletedAt) {
      throw new UnauthorizedException('Usuário inválido ou inativo');
    }

    const permissoes = new Set<string>();
    const lojas = usuario.usuarioLojas.map((acesso) => {
      acesso.papel.permissoes.forEach((p) =>
        permissoes.add(p.permissao.codigo),
      );
      return {
        lojaId: acesso.lojaId,
        lojaNome: acesso.loja.nome,
        papel: acesso.papel.nome,
      };
    });

    return {
      id: usuario.id,
      empresaId: usuario.empresaId,
      nome: usuario.nome,
      email: usuario.email,
      superAdmin: usuario.superAdmin,
      lojas,
      permissoes: Array.from(permissoes),
    };
  }
}
