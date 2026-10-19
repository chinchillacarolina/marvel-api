import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Character } from './character.entity';
import { CharacterStatus } from './character-status.enum';
import { Team } from '../teams/team.entity';
import { CharacterDto } from './dto/character.dto';

@Injectable()
export class CharactersService {
  constructor(
    @InjectRepository(Character) private chars: Repository<Character>,
    @InjectRepository(Team) private teams: Repository<Team>,
  ) {}

  findAll(status?: string, teamId?: number) {
    if (status && !Object.values(CharacterStatus).includes(status as CharacterStatus)) {
      throw new BadRequestException(`status inválido: ${status}`);
    }
    const where: FindOptionsWhere<Character> = {};
    if (status) where.status = status as CharacterStatus;
    if (teamId !== undefined) where.team_id = teamId;
    return this.chars.find({ where, order: { id: 'ASC' } });
  }

  async findOne(id: number) {
    const c = await this.chars.findOne({ where: { id }, relations: { team: true } });
    if (!c) throw new NotFoundException(`El personaje ${id} no existe`);
    return c;
  }

  private async getOrFail(id: number) {
    const c = await this.chars.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`El personaje ${id} no existe`);
    return c;
  }

  private async assertAliasFree(alias: string, selfId?: number) {
    const e = await this.chars.findOne({ where: { alias } });
    if (e && e.id !== selfId) throw new ConflictException(`Ya existe un personaje con alias "${alias}"`);
  }

  private async assertTeamUsable(teamId: number) {
    const t = await this.teams.findOne({ where: { id: teamId } });
    if (!t) throw new NotFoundException(`El equipo ${teamId} no existe`);
    if (!t.active) throw new BadRequestException(`El equipo ${teamId} está inactivo`);
  }

  private assertTransition(from: CharacterStatus, to: CharacterStatus) {
    if (from === CharacterStatus.RETIRED && to === CharacterStatus.INJURED) {
      throw new BadRequestException('Un personaje RETIRED no puede pasar directamente a INJURED');
    }
  }

  async create(dto: CharacterDto) {
    await this.assertAliasFree(dto.alias);
    if (dto.team_id != null) await this.assertTeamUsable(dto.team_id);
    const saved = await this.chars.save(
      this.chars.create({
        real_name: dto.real_name,
        alias: dto.alias,
        main_power: dto.main_power,
        power_level: dto.power_level,
        status: dto.status ?? CharacterStatus.ACTIVE,
        is_villain: dto.is_villain ?? false,
        team_id: dto.team_id ?? null,
      }),
    );
    return this.findOne(saved.id);
  }

  async replace(id: number, dto: CharacterDto) {
    const current = await this.getOrFail(id);
    await this.assertAliasFree(dto.alias, id);
    if (dto.team_id != null) await this.assertTeamUsable(dto.team_id);
    const status = dto.status ?? CharacterStatus.ACTIVE;
    this.assertTransition(current.status, status);
    await this.chars.update(id, {
      real_name: dto.real_name,
      alias: dto.alias,
      main_power: dto.main_power,
      power_level: dto.power_level,
      status,
      is_villain: dto.is_villain ?? false,
      team_id: dto.team_id ?? null,
    });
    return this.findOne(id);
  }

  async updateStatus(id: number, status: CharacterStatus) {
    const current = await this.getOrFail(id);
    this.assertTransition(current.status, status);
    await this.chars.update(id, { status });
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.getOrFail(id);
    await this.chars.delete(id);
    return { message: `Personaje ${id} eliminado` };
  }
}