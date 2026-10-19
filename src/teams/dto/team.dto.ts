import { ArrayNotEmpty, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class TeamDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsOptional() @IsString() @MaxLength(150) base?: string;
  @IsOptional() @IsInt() @Min(1900) @Max(2100) founded_year?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateTeamDto extends TeamDto {
  @IsOptional() @IsArray() @IsInt({ each: true }) characterIds?: number[];
}

export class AssignCharactersDto {
  @IsArray() @ArrayNotEmpty() @IsInt({ each: true }) characterIds: number[];
}