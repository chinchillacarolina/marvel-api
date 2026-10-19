import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Team } from './team.entity';
import { Character } from '../characters/character.entity';
import { CreateTeamDto, TeamDto } from './dto/team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team) private teams: Repository<Team>,
    @InjectRepository(Character) private chars: Repository<Character>,
  ) {}

  findAll() {
    return this.teams.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number) {
    const t = await this.teams.findOne({ where: { id } });
    if (!t) throw new NotFoundException(`El equipo ${id} no existe`);
    return t;
  }

  async findCharacters(id: number) {
    await this.findOne(id);
    return this.chars.find({ where: { team_id: id }, order: { id: 'ASC' } });
  }

  private async assertNameFree(name: string, selfId?: number) {
    const e = await this.teams.findOne({ where: { name } });
    if (e && e.id !== selfId) throw new ConflictException(`Ya existe un equipo con nombre "${name}"`);
  }

  private async assertCharactersExist(ids: number[]) {
    const found = await this.chars.find({ select: { id: true }, where: { id: In(ids) } });
    const missing = ids.filter((i) => !found.some((f) => f.id === i));
    if (missing.length) throw new NotFoundException(`Personajes inexistentes: ${missing.join(', ')}`);
  }

  async create(dto: CreateTeamDto) {
    await this.assertNameFree(dto.name);
    const ids = [...new Set(dto.characterIds ?? [])];
    const active = dto.active ?? true;
    if (ids.length) {
      if (!active) throw new BadRequestException('No se pueden asignar personajes a un equipo inactivo');
      await this.assertCharactersExist(ids);
    }
    const team = await this.teams.save(
      this.teams.create({
        name: dto.name,
        base: dto.base ?? null,
        founded_year: dto.founded_year ?? null,
        active,
      }),
    );
    if (ids.length) await this.chars.update({ id: In(ids) }, { team_id: team.id });
    return team;
  }

  async replace(id: number, dto: TeamDto) {
    await this.findOne(id);
    await this.assertNameFree(dto.name, id);
    await this.teams.update(id, {
      name: dto.name,
      base: dto.base ?? null,
      founded_year: dto.founded_year ?? null,
      active: dto.active ?? true,
    });
    return this.findOne(id);
  }

  async assignCharacters(id: number, characterIds: number[]) {
    const team = await this.findOne(id);
    if (!team.active) throw new BadRequestException('El equipo está inactivo');
    const ids = [...new Set(characterIds)];
    await this.assertCharactersExist(ids);
    await this.chars.update({ id: In(ids) }, { team_id: id }); // reasigna si ya tenían otro equipo
    return this.findCharacters(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    const count = await this.chars.count({ where: { team_id: id } });
    if (count > 0) {
      throw new ConflictException('No se puede eliminar un equipo con personajes asociados; desactívalo con PUT (active: false)');
    }
    await this.teams.delete(id);
    return { message: `Equipo ${id} eliminado` };
  }
}