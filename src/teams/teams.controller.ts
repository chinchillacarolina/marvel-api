import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { AssignCharactersDto, CreateTeamDto, TeamDto } from './dto/team.dto';

@Controller('teams')
export class TeamsController {
  constructor(private readonly service: TeamsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(':id/characters')
  findCharacters(@Param('id', ParseIntPipe) id: number) {
    return this.service.findCharacters(id);
  }

  @Post()
  create(@Body() dto: CreateTeamDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  replace(@Param('id', ParseIntPipe) id: number, @Body() dto: TeamDto) {
    return this.service.replace(id, dto);
  }

  @Patch(':id/characters')
  assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignCharactersDto) {
    return this.service.assignCharacters(id, dto.characterIds);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}