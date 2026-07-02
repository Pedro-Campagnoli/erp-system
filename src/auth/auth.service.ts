import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { AppConfig } from '../config/configuration';
import { parseDurationToMs } from '../common/utils/duration.util';
import { sha256Hex } from '../common/utils/hash.util';
import { PrismaService } from '../prisma/prisma.service';
import { AuthResponseDto, UsuarioPerfilDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (!usuario || usuario.deletedAt) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(dto.senha, usuario.senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!usuario.ativo) {
      throw new UnauthorizedException('Usuário inativo');
    }

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLoginEm: new Date() },
    });

    return this.issueTokens(usuario.id);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const jwtConfig = this.configService.get<AppConfig['jwt']>('jwt')!;

    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(
        refreshToken,
        {
          secret: jwtConfig.refreshSecret,
        },
      );
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });
    if (!usuario || !usuario.ativo || usuario.deletedAt) {
      throw new UnauthorizedException('Usuário inválido ou inativo');
    }

    const tokenArmazenado = await this.prisma.refreshToken.findFirst({
      where: {
        usuarioId: usuario.id,
        tokenHash: sha256Hex(refreshToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!tokenArmazenado) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenArmazenado.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(usuario.id);
  }

  async logout(usuarioId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: {
          usuarioId,
          tokenHash: sha256Hex(refreshToken),
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      return;
    }

    await this.prisma.refreshToken.updateMany({
      where: { usuarioId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(usuarioId: string): Promise<AuthResponseDto> {
    const jwtConfig = this.configService.get<AppConfig['jwt']>('jwt')!;

    // jti garante que cada token seja único mesmo quando emitido para o mesmo
    // usuário dentro do mesmo segundo (JWTs são determinísticos: mesmo
    // payload + secret + timestamp geram a mesma assinatura).
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: usuarioId, jti: randomUUID() },
        {
          secret: jwtConfig.accessSecret,
          expiresIn: jwtConfig.accessExpiresIn as StringValue,
        },
      ),
      this.jwtService.signAsync(
        { sub: usuarioId, jti: randomUUID() },
        {
          secret: jwtConfig.refreshSecret,
          expiresIn: jwtConfig.refreshExpiresIn as StringValue,
        },
      ),
    ]);

    const tokenHash = sha256Hex(refreshToken);
    const expiresAt = new Date(
      Date.now() + parseDurationToMs(jwtConfig.refreshExpiresIn),
    );

    await this.prisma.refreshToken.create({
      data: { usuarioId, tokenHash, expiresAt },
    });

    const usuario = await this.carregarPerfil(usuarioId);

    return { accessToken, refreshToken, usuario };
  }

  private async carregarPerfil(usuarioId: string): Promise<UsuarioPerfilDto> {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
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
      nome: usuario.nome,
      email: usuario.email,
      empresaId: usuario.empresaId,
      superAdmin: usuario.superAdmin,
      lojas,
      permissoes: Array.from(permissoes),
    };
  }
}
